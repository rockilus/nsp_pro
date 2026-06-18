import { env } from '../../config/env';
import { useAuth } from '../../contexts/auth-context';
import { useMemo } from 'react';
import { getImpersonationToken } from './impersonation-storage';
import { AuthApi } from './api/authApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiClientOptions extends RequestInit {
  requireAuth?: boolean;
}

export interface AuthUserInfo {
  sub: string;
  email?: string;
}

// ---------------------------------------------------------------------------
// Core client
// ---------------------------------------------------------------------------

/** Track whether a refresh is in-flight to avoid concurrent refresh storms. */
let _refreshPromise: Promise<void> | null = null;

async function _refreshIfNeeded(): Promise<boolean> {
  if (_refreshPromise) {
    await _refreshPromise;
    return true;
  }
  _refreshPromise = AuthApi.refresh();
  try {
    await _refreshPromise;
    return true;
  } catch {
    return false;
  } finally {
    _refreshPromise = null;
  }
}

class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = env.apiUrl;
  }

  private getAuthHeaders(user?: AuthUserInfo | null): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (env.isDevelopment) {
      headers['X-Dev-User-ID'] = env.devUserId;
      headers['X-API-Key'] = env.devApiKey;
    }
    // Production: auth via HttpOnly cookies — no Authorization header needed.

    const impersonationToken = getImpersonationToken();
    if (impersonationToken) {
      headers['X-Impersonation-Token'] = impersonationToken;
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options: ApiClientOptions = {},
    user?: AuthUserInfo | null,
    retried = false,
  ): Promise<T> {
    const { requireAuth = true, ...restOptions } = options;
    const headers = this.getAuthHeaders(user);

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...restOptions,
      headers: {
        ...headers,
        ...restOptions.headers,
      },
      credentials: env.isDevelopment ? 'omit' : 'include',
    });

    if (response.status === 401 && !retried) {
      const refreshed = await _refreshIfNeeded();
      if (refreshed) {
        return this.request<T>(endpoint, options, user, true);
      }
    }

    if (!response.ok) {
      const responseData = await response.json().catch(() => ({}));
      const errorMessage = responseData.detail || `${response.status} ${response.statusText}`;

      if (response.status === 401) {
        throw new Error('Unauthorized access. Please sign in again.');
      }
      throw new Error(`API request failed: ${errorMessage}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  async requestRaw(
    endpoint: string,
    options: ApiClientOptions = {},
    user?: AuthUserInfo | null,
  ): Promise<Response> {
    const { requireAuth = true, ...restOptions } = options;
    const headers = this.getAuthHeaders(user);

    return fetch(`${this.baseURL}${endpoint}`, {
      ...restOptions,
      headers: {
        ...headers,
        ...restOptions.headers,
      },
      credentials: env.isDevelopment ? 'omit' : 'include',
    });
  }

  async get<T>(endpoint: string, user?: AuthUserInfo | null, options?: ApiClientOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' }, user);
  }

  async post<T>(
    endpoint: string,
    data?: any,
    user?: AuthUserInfo | null,
    options?: ApiClientOptions,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined },
      user,
    );
  }

  async postRaw(
    endpoint: string,
    data?: any,
    user?: AuthUserInfo | null,
    options?: ApiClientOptions,
  ): Promise<Response> {
    return this.requestRaw(
      endpoint,
      { ...options, method: 'POST', body: data ? JSON.stringify(data) : undefined },
      user,
    );
  }

  async put<T>(
    endpoint: string,
    data?: any,
    user?: AuthUserInfo | null,
    options?: ApiClientOptions,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      { ...options, method: 'PUT', body: data ? JSON.stringify(data) : undefined },
      user,
    );
  }

  async delete<T>(
    endpoint: string,
    user?: AuthUserInfo | null,
    options?: ApiClientOptions,
    data?: any,
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      { ...options, method: 'DELETE', body: data ? JSON.stringify(data) : undefined },
      user,
    );
  }
}

export const apiClient = new APIClient();

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------

export function useApiClient() {
  const { user, isAuthenticated, loading } = useAuth();

  return useMemo(() => {
    const authInfo: AuthUserInfo | null = user
      ? { sub: user.id, email: user.email }
      : null;

    return {
      get: <T>(endpoint: string, options?: ApiClientOptions) =>
        apiClient.get<T>(endpoint, authInfo, options),
      post: <T>(endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.post<T>(endpoint, data, authInfo, options),
      getRaw: (endpoint: string, options?: ApiClientOptions) =>
        apiClient.requestRaw(endpoint, options, authInfo),
      postRaw: (endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.postRaw(endpoint, data, authInfo, options),
      put: <T>(endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.put<T>(endpoint, data, authInfo, options),
      delete: <T>(endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.delete<T>(endpoint, authInfo, options, data),
    };
  }, [user, isAuthenticated, loading]);
}

export function useSimpleApiClient() {
  return useMemo(
    () => ({
      get: <T>(endpoint: string, options?: ApiClientOptions) =>
        apiClient.get<T>(endpoint, null, options),
      post: <T>(endpoint: string, data?: any, options?: ApiClientOptions) =>
        apiClient.post<T>(endpoint, data, null, options),
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
