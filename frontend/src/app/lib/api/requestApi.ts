/**
 * API client for request operations
 */

import { RequestT, toRequestT, fromRequestT } from "../../../types/request";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class RequestApi extends BaseApi {
  /**
   * Add a new request (authenticated)
   */
  static async addRequest(
    apiClient: AuthenticatedApiClient,
    request: RequestT,
    teamId: string
  ): Promise<RequestT> {
    // Security: Input validation
    if (!request) {
      throw new Error("Request data is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/requests/teams/${teamId}`,
      fromRequestT(request)
    );
    return toRequestT(responseData);
  }

  /**
   * Get all requests for a team (authenticated)
   */
  static async getRequests(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<RequestT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `/requests/teams/${teamId}`
    );
    return responseData.map(toRequestT);
  }

  /**
   * Update a request (authenticated)
   */
  static async updateRequest(
    apiClient: AuthenticatedApiClient,
    updatedRequest: RequestT,
    teamId: string
  ): Promise<RequestT> {
    // Security: Input validation
    if (!updatedRequest || !updatedRequest.id) {
      throw new Error("Invalid request data provided");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "put",
      `/requests/${updatedRequest.id}/teams/${teamId}`,
      fromRequestT(updatedRequest)
    );
    return toRequestT(responseData);
  }

  /**
   * Accept a request (authenticated)
   */
  static async acceptRequest(
    apiClient: AuthenticatedApiClient,
    requestId: string,
    teamId: string
  ): Promise<RequestT> {
    // Security: Input validation
    if (!requestId?.trim()) {
      throw new Error("Request ID is required");
    }
    if (!teamId?.trim()) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/requests/${requestId}/teams/${teamId}/accept`
    );
    return toRequestT(responseData);
  }

  /**
   * Deny a request (authenticated)
   */
  static async denyRequest(
    apiClient: AuthenticatedApiClient,
    requestId: string,
    teamId: string
  ): Promise<RequestT> {
    // Security: Input validation
    if (!requestId?.trim()) {
      throw new Error("Request ID is required");
    }
    if (!teamId?.trim()) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/requests/${requestId}/teams/${teamId}/deny`
    );
    return toRequestT(responseData);
  }

  /**
   * Rescind a request (revert approved/denied back to pending) (authenticated)
   */
  static async rescindRequest(
    apiClient: AuthenticatedApiClient,
    requestId: string,
    teamId: string
  ): Promise<RequestT> {
    // Security: Input validation
    if (!requestId?.trim()) {
      throw new Error("Request ID is required");
    }
    if (!teamId?.trim()) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/requests/${requestId}/teams/${teamId}/rescind`
    );
    return toRequestT(responseData);
  }

  /**
   * Delete a request (authenticated)
   */
  static async deleteRequest(
    apiClient: AuthenticatedApiClient,
    requestId: string,
    teamId: string
  ): Promise<void> {
    // Security: Input validation
    if (!requestId) {
      throw new Error("Request ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "delete",
      `/requests/${requestId}/teams/${teamId}`
    );
  }

  // Legacy methods for backward compatibility (discouraged)
  static async addRequestLegacy(
    request: RequestT,
    teamId: string
  ): Promise<RequestT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<RequestT>(`/requests/teams/${teamId}`, {
      method: "POST",
      body: JSON.stringify(fromRequestT(request)),
    });
  }

  static async getRequestsLegacy(teamId: string): Promise<RequestT[]> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const data = await this.makeFetchRequest<any[]>(
      `/requests/teams/${teamId}`,
      {
        credentials: "include",
      }
    );
    return data.map(toRequestT);
  }

  static async updateRequestLegacy(
    updatedRequest: RequestT,
    teamId: string
  ): Promise<RequestT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<RequestT>(
      `/requests/${updatedRequest.id}/teams/${teamId}`,
      {
        method: "PUT",
        body: JSON.stringify(fromRequestT(updatedRequest)),
      }
    );
  }

  static async acceptRequestLegacy(
    requestId: string,
    teamId: string
  ): Promise<RequestT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const data = await this.makeFetchRequest<any>(
      `/requests/${requestId}/teams/${teamId}/accept`,
      {
        method: "POST",
        credentials: "include",
      }
    );
    return toRequestT(data);
  }

  static async denyRequestLegacy(
    requestId: string,
    teamId: string
  ): Promise<RequestT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const data = await this.makeFetchRequest<any>(
      `/requests/${requestId}/teams/${teamId}/deny`,
      {
        method: "POST",
        credentials: "include",
      }
    );
    return toRequestT(data);
  }

  static async rescindRequestLegacy(
    requestId: string,
    teamId: string
  ): Promise<RequestT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const data = await this.makeFetchRequest<any>(
      `/requests/${requestId}/teams/${teamId}/rescind`,
      {
        method: "POST",
        credentials: "include",
      }
    );
    return toRequestT(data);
  }

  static async deleteRequestLegacy(
    requestId: string,
    teamId: string
  ): Promise<void> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    await this.makeFetchRequest<void>(
      `/requests/${requestId}/teams/${teamId}`,
      {
        method: "DELETE",
      }
    );
  }
}
