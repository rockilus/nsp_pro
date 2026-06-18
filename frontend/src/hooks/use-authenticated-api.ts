import { apiClient } from '../app/lib/api-client';

export function useAuthenticatedAPI() {
  return {
    get: <T>(endpoint: string) => apiClient.get<T>(endpoint),
    post: <T>(endpoint: string, data?: any) => apiClient.post<T>(endpoint, data),
    put: <T>(endpoint: string, data?: any) => apiClient.put<T>(endpoint, data),
    delete: <T>(endpoint: string, data?: any) =>
      apiClient.delete<T>(endpoint, null, undefined, data),
  };
}
