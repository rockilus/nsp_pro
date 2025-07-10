import { useAuth } from "../contexts/auth-context";
import { apiClient } from "../app/lib/api-client";

export function useAuthenticatedAPI() {
  const { user } = useAuth();

  return {
    get: <T>(endpoint: string) => apiClient.get<T>(endpoint, user),
    post: <T>(endpoint: string, data?: any) =>
      apiClient.post<T>(endpoint, data, user),
    put: <T>(endpoint: string, data?: any) =>
      apiClient.put<T>(endpoint, data, user),
    delete: <T>(endpoint: string) => apiClient.delete<T>(endpoint, user),
  };
}
