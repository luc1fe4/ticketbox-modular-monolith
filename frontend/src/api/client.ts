import axios from 'axios';

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: automatically extract the nested "data" or throw unified errors
api.interceptors.response.use(
  (response) => {
    const resData = response.data;
    if (resData && typeof resData === 'object' && 'code' in resData && 'data' in resData) {
      return resData.data; // Unpack Spring Boot ApiResponse
    }
    return resData;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }

      const errorMessage = data?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.';
      const details = data?.details || null;
      return Promise.reject({ message: errorMessage, code: status, details });
    }
    return Promise.reject({ message: 'Không thể kết nối tới máy chủ.', code: 500 });
  }
);

export async function apiHealthCheck() {
  return api.get('/api/health');
}
