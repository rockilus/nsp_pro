import { User } from "oidc-client-ts";
import { API_URL } from "./env";

class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_URL;
  }

  private getAuthHeaders(user?: User | null): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (user?.access_token) {
      headers["Authorization"] = `Bearer ${user.access_token}`;
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    user?: User | null
  ): Promise<T> {
    const headers = this.getAuthHeaders(user);

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      // Include credentials for backward compatibility with existing session-based auth
      credentials: user?.access_token ? undefined : "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized access
        throw new Error("Unauthorized access. Please sign in again.");
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string, user?: User | null): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" }, user);
  }

  async post<T>(endpoint: string, data?: any, user?: User | null): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      },
      user
    );
  }

  async put<T>(endpoint: string, data?: any, user?: User | null): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
      },
      user
    );
  }

  async delete<T>(endpoint: string, user?: User | null): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" }, user);
  }
}

export const apiClient = new APIClient();
