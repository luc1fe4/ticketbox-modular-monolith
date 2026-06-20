export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new ApiClientError(`Request failed with status ${response.status}`, response.status);
  }

  const body = (await response.json()) as ApiResponse<T>;
  return body.data;
}

export async function apiHealthCheck() {
  return apiGet<{ status: string; service: string }>('/api/health');
}
