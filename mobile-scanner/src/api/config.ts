export const DEFAULT_API_BASE_URL = 'http://localhost:8080/api';

let apiBaseUrl = DEFAULT_API_BASE_URL;

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export function setApiBaseUrl(baseUrl: string) {
  apiBaseUrl = baseUrl.replace(/\/+$/, '');
}
