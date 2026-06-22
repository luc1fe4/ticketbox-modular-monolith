import axios, { AxiosError } from 'axios';

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function isRequestCanceled(error: unknown): boolean {
  return axios.isCancel(error) ||
    (error instanceof DOMException && error.name === 'AbortError');
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'code' in body && 'data' in body) {
      return (body as ApiEnvelope<unknown>).data;
    }
    return body;
  },
  (error: AxiosError<{ message?: string; details?: unknown }>) => {
    if (isRequestCanceled(error)) {
      throw error;
    }

    const status = error.response?.status ?? 500;
    if (status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.assign('/login');
      }
    }
    throw new ApiClientError(
      error.response?.data?.message ??
        (error.response ? 'Đã có lỗi xảy ra, vui lòng thử lại.' : 'Không thể kết nối tới máy chủ.'),
      status,
      error.response?.data?.details,
    );
  },
);

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return api.get<unknown, T>(path, { signal });
}

export async function apiHealthCheck() {
  return apiGet<{ status: string; service: string }>('/api/health');
}
