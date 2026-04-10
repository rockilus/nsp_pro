import { User } from 'oidc-client-ts';
import { env } from '../../config/env';
import { useAuth } from '../../contexts/auth-context';
import { useMemo } from 'react';
import { getImpersonationToken } from './impersonation-storage';

interface ApiClientOptions extends RequestInit {
  requireAuth?: boolean;
}

class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = env.apiUrl;
  }

  private getAuthHeaders(user?: User | null): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (env.isDevelopment) {
      // Development mode: use simple headers
      headers['X-Dev-User-ID'] = env.devUserId;
      headers['X-API-Key'] = env.devApiKey;

      // Debug logging for development
      if (typeof window !== 'undefined') {
        console.log('Development API call with user:', env.devUserId);
      }
    } else {
      // Production mode: use existing Cognito auth
      if (typeof window !== 'undefined' && env.isDevelopment) {
        console.log('API Client Auth Debug:', {
          hasUser: !!user,
          hasIdToken: !!user?.id_token,
          tokenLength: user?.id_token?.length || 0,
          // Only log first 20 chars for security
          tokenPreview: user?.id_token ? `${user.id_token.substring(0, 20)}...` : 'none',
        });
      }

      // Use ID token for AWS API Gateway with Cognito User Pool authorizer
      if (user?.id_token) {
        headers['Authorization'] = `Bearer ${user.id_token}`;
      }
    }

    // Attach the impersonation JWT when an admin has an active session
    const impersonationToken = getImpersonationToken();
    if (impersonationToken) {
      headers['X-Impersonation-Token'] = impersonationToken;
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options: ApiClientOptions = {},
    user?: User | null,
  ): Promise<T> {
    const { requireAuth = true, ...restOptions } = options;
    const headers = this.getAuthHeaders(user);

    // In development mode, be more lenient with auth requirements
    if (requireAuth && !env.isDevelopment && !user?.id_token) {
      throw new Error('User not authenticated');
    }

    // Debug logging for request details
    if (typeof window !== 'undefined' && env.isDevelopment) {
      console.log('API Request Debug:', {
        endpoint,
        method: restOptions.method || 'GET',
        baseURL: this.baseURL,
        isDevelopment: env.isDevelopment,
        hasAuthHeader: 'Authorization' in headers || 'X-Dev-User-ID' in headers,
        requireAuth,
      });
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...restOptions,
      headers: {
        ...headers,
        ...restOptions.headers,
      },
      // In development, don't include credentials to avoid CORS issues
      credentials: env.isDevelopment ? undefined : user?.id_token ? undefined : 'include',
    });

    if (!response.ok) {
      const responseData = await response.json().catch(() => ({}));
      const errorMessage = responseData.detail || `${response.status} ${response.statusText}`;

      if (response.status === 401) {
        throw new Error('Unauthorized access. Please sign in again.');
      }
      throw new Error(`API request failed: ${errorMessage}`);
    }

    // Return null for 204 No Content responses
    if (response.status === 204) {
      return null as any;
    }

    // Otherwise, parse as JSON
    return response.json();
  }

  /**
   * Low-level request that returns the raw Response for cases like file downloads
   */
  async requestRaw(
    endpoint: string,
    options: ApiClientOptions = {},
    user?: User | null,
  ): Promise<Response> {
    const { requireAuth = true, ...restOptions } = options;
    const headers = this.getAuthHeaders(user);

    if (requireAuth && !env.isDevelopment && !user?.id_token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...restOptions,
      headers: {
        ...headers,
        ...restOptions.headers,
      },
      credentials: env.isDevelopment ? undefined : user?.id_token ? undefined : 'include',
    });

    return response;
  }

  async get<T>(endpoint: string, user?: User | null, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' }, user);
  }

  async post<T>(
    endpoint: string,
    data?: any,
    user?: User | null,
    options?: ApiClientOptions,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      user,
    );
  }

  /**
   * Post that returns a raw Response (useful for blob downloads)
   */
  async postRaw(
    endpoint: string,
    data?: any,
    user?: User | null,
    options?: ApiClientOptions,
  ): Promise<Response> {
    return this.requestRaw(
      endpoint,
      {
        ...options,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      user,
    );
  }

  async put<T>(
    endpoint: string,
    data?: any,
    user?: User | null,
    options?: ApiClientOptions,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      user,
    );
  }

  async delete<T>(
    endpoint: string,
    user?: User | null,
    options?: ApiClientOptions,
    data?: any,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'DELETE',
        body: data ? JSON.stringify(data) : undefined,
      },
      user,
    );
  }
}

export const apiClient = new APIClient();

// React hook for using the API client with authentication
export function useApiClient() {
  const { user, isAuthenticated, loading } = useAuth();

  // CRITICAL: Memoize the API client to prevent infinite loops
  return useMemo(() => {
    // Reduce debug logging spam in production
    if (env.isDevelopment && typeof window !== 'undefined') {
      console.log('useApiClient Debug:', {
        isAuthenticated,
        loading,
        hasUser: !!user,
        hasIdToken: !!user?.id_token,
        isDevelopment: env.isDevelopment,
      });
    }

    return {
      get: <T>(endpoint: string, options?: ApiClientOptions) =>
        apiClient.get<T>(endpoint, user, options),
      post: <T>(endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.post<T>(endpoint, data, user, options),
      // Raw methods for blobs
      getRaw: (endpoint: string, options?: ApiClientOptions) =>
        apiClient.requestRaw(endpoint, options, user),
      postRaw: (endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.postRaw(endpoint, data, user, options),
      put: <T>(endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.put<T>(endpoint, data, user, options),
      delete: <T>(endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.delete<T>(endpoint, user, options, data),
    };
  }, [user, isAuthenticated, loading]); // Stable dependencies
}

// Simplified API client for development mode (no auth required)
export function useSimpleApiClient() {
  return useMemo(
    () => ({
      get: <T>(endpoint: string, options?: ApiClientOptions) =>
        apiClient.get<T>(endpoint, null, options),
      post: <T>(endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.post<T>(endpoint, data, null, options),
      // Raw methods for blobs in simple client
      getRaw: (endpoint: string, options?: ApiClientOptions) =>
        apiClient.requestRaw(endpoint, options, null),
      postRaw: (endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.postRaw(endpoint, data, null, options),
      put: <T>(endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.put<T>(endpoint, data, null, options),
      delete: <T>(endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.delete<T>(endpoint, null, options, data),
    }),
    [],
  );
}
