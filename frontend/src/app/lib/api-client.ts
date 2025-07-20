import { User } from "oidc-client-ts";
import { API_URL } from "./env";
import { useAuth } from "../../contexts/auth-context";
import { useMemo } from "react";

interface ApiClientOptions extends RequestInit {
  requireAuth?: boolean;
}

class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_URL;
  }

  private getAuthHeaders(user?: User | null): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Debug logging for production troubleshooting (reduced spam)
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      console.log("API Client Auth Debug:", {
        hasUser: !!user,
        hasIdToken: !!user?.id_token,
        tokenLength: user?.id_token?.length || 0,
        // Only log first 20 chars for security
        tokenPreview: user?.id_token
          ? `${user.id_token.substring(0, 20)}...`
          : "none",
      });
    }

    // Use ID token for AWS API Gateway with Cognito User Pool authorizer
    if (user?.id_token) {
      headers["Authorization"] = `Bearer ${user.id_token}`;
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options: ApiClientOptions = {},
    user?: User | null
  ): Promise<T> {
    const { requireAuth = true, ...restOptions } = options;
    const headers = this.getAuthHeaders(user);

    // Check if authentication is required but user is not authenticated
    if (requireAuth && !user?.id_token) {
      throw new Error("User not authenticated");
    }

    // Debug logging for request details (reduced spam)
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      console.log("API Request Debug:", {
        endpoint,
        method: restOptions.method || "GET",
        hasAuthHeader: "Authorization" in headers,
        requireAuth,
      });
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...restOptions,
      headers: {
        ...headers,
        ...restOptions.headers,
      },
      // Include credentials for backward compatibility with existing session-based auth
      credentials: user?.id_token ? undefined : "include",
    });

    if (!response.ok) {
      const responseData = await response.json().catch(() => ({}));
      const errorMessage =
        responseData.detail || `${response.status} ${response.statusText}`;

      if (response.status === 401) {
        throw new Error("Unauthorized access. Please sign in again.");
      }
      throw new Error(`API request failed: ${errorMessage}`);
    }

    return response.json();
  }

  async get<T>(
    endpoint: string,
    user?: User | null,
    options?: ApiClientOptions
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" }, user);
  }

  async post<T>(
    endpoint: string,
    data?: any,
    user?: User | null,
    options?: ApiClientOptions
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      },
      user
    );
  }

  async put<T>(
    endpoint: string,
    data?: any,
    user?: User | null,
    options?: ApiClientOptions
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
      },
      user
    );
  }

  async delete<T>(
    endpoint: string,
    user?: User | null,
    options?: ApiClientOptions
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" }, user);
  }
}

export const apiClient = new APIClient();

// React hook for using the API client with authentication
export function useApiClient() {
  const { user, isAuthenticated, loading } = useAuth();

  // CRITICAL: Memoize the API client to prevent infinite loops
  return useMemo(() => {
    // Reduce debug logging spam in production
    if (
      process.env.NODE_ENV === "development" &&
      typeof window !== "undefined"
    ) {
      console.log("useApiClient Debug:", {
        isAuthenticated,
        loading,
        hasUser: !!user,
        hasIdToken: !!user?.id_token,
      });
    }

    return {
      get: <T>(endpoint: string, options?: ApiClientOptions) =>
        apiClient.get<T>(endpoint, user, options),
      post: <T>(endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.post<T>(endpoint, data, user, options),
      put: <T>(endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.put<T>(endpoint, data, user, options),
      delete: <T>(endpoint: string, options?: ApiClientOptions) =>
        apiClient.delete<T>(endpoint, user, options),
    };
  }, [user, isAuthenticated, loading]); // Stable dependencies
}
