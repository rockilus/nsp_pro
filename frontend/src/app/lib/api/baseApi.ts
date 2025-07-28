/**
 * Base API client with authentication handling
 * Provides common functionality for all API clients
 */

export interface AuthenticatedApiClient {
  get: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
  post: <T>(endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  put: <T>(endpoint: string, data?: any, options?: RequestInit) => Promise<T>;
  delete: <T>(endpoint: string, options?: RequestInit) => Promise<T>;
}

export interface ApiErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
}

/**
 * Enhanced error handler for API responses
 */
export const handleApiError = async (response: Response): Promise<never> => {
  try {
    const errorData: ApiErrorResponse = await response.json();

    // Create user-friendly error message based on status
    let userMessage =
      errorData.detail || errorData.message || "An unexpected error occurred";

    switch (response.status) {
      case 401:
        userMessage = "Authentication required. Please sign in again.";
        break;
      case 403:
        userMessage = "You don't have permission to perform this action";
        break;
      case 404:
        userMessage = "The requested resource was not found";
        break;
      case 422:
        userMessage = `Validation failed: ${userMessage}`;
        break;
      case 500:
        userMessage = "A server error occurred. Please try again later.";
        break;
    }

    throw new Error(userMessage);
  } catch (parseError) {
    // Fallback if response is not JSON
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
};

/**
 * Base API client that can be used with or without React hooks
 */
export abstract class BaseApi {
  protected static readonly baseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  /**
   * Make an authenticated request using the provided API client
   */
  protected static async makeRequest<T>(
    apiClient: AuthenticatedApiClient,
    method: "get" | "post" | "put" | "delete",
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    try {
      switch (method) {
        case "get":
          return await apiClient.get<T>(endpoint, options);
        case "post":
          return await apiClient.post<T>(endpoint, data, options);
        case "put":
          return await apiClient.put<T>(endpoint, data, options);
        case "delete":
          return await apiClient.delete<T>(endpoint, options);
      }
    } catch (error) {
      // Log error for debugging while sanitizing sensitive information
      if (process.env.NODE_ENV === "development") {
        console.error(`❌ API ${method.toUpperCase()} ${endpoint} failed:`, {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }

  /**
   * Make a direct fetch request (for non-React contexts)
   * Note: This should be avoided in favor of authenticated requests when possible
   */
  protected static async makeFetchRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // For session-based auth fallback
    });

    if (!response.ok) {
      await handleApiError(response);
    }

    return response.json();
  }

  /**
   * Make a blob request with authentication
   * This is used for endpoints that return binary data (like file downloads)
   */
  protected static async makeBlobRequest(
    authToken: string,
    method: "post" | "get",
    endpoint: string,
    data?: any
  ): Promise<Blob> {
    if (!authToken) {
      throw new Error("Authentication token is required");
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: method.toUpperCase(),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const responseData = await response.json().catch(() => ({}));
        throw new Error(
          `Request failed: ${responseData.detail || response.statusText}`
        );
      }

      return await response.blob();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error(`❌ Blob ${method.toUpperCase()} ${endpoint} failed:`, {
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        });
      }
      throw error;
    }
  }
}
