/**
 * API client for request operations
 */

import { RequestT, toRequestT, fromRequestT } from "../../../types/request";
import { AssignmentT, toAssignmentT } from "../../../types/assignment";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class RequestApi extends BaseApi {
  /**
   * Add a new request (authenticated)
   */
  static async addRequest(
    apiClient: AuthenticatedApiClient,
    request: RequestT,
    teamId: string,
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
      fromRequestT(request),
    );
    return toRequestT(responseData);
  }

  /**
   * Get all requests for a team (authenticated)
   * @param workerId Optional worker ID to filter requests (for team members)
   */
  static async getRequests(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    workerId?: string,
  ): Promise<RequestT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    // Build query string if workerId is provided
    const queryParams = workerId ? `?worker_id=${workerId}` : "";

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `/requests/teams/${teamId}${queryParams}`,
    );
    return responseData.map(toRequestT);
  }

  /**
   * Update a request (authenticated)
   */
  static async updateRequest(
    apiClient: AuthenticatedApiClient,
    updatedRequest: RequestT,
    teamId: string,
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
      fromRequestT(updatedRequest),
    );
    return toRequestT(responseData);
  }

  /**
   * Accept a request (authenticated)
   */
  static async acceptRequest(
    apiClient: AuthenticatedApiClient,
    requestId: string,
    teamId: string,
  ): Promise<{ request: RequestT; assignments: AssignmentT[] }> {
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
      `/requests/${requestId}/teams/${teamId}/accept`,
    );
    return {
      request: toRequestT(responseData.request),
      assignments: (responseData.assignments || []).map((a: any) =>
        toAssignmentT(a),
      ),
    };
  }

  /**
   * Deny a request (authenticated)
   */
  static async denyRequest(
    apiClient: AuthenticatedApiClient,
    requestId: string,
    teamId: string,
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
      `/requests/${requestId}/teams/${teamId}/deny`,
    );
    return toRequestT(responseData);
  }

  /**
   * Rescind a request (revert approved/denied back to pending) (authenticated)
   */
  static async rescindRequest(
    apiClient: AuthenticatedApiClient,
    requestId: string,
    teamId: string,
  ): Promise<{ request: RequestT; assignmentsDeletedIds: string[] }> {
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
      `/requests/${requestId}/teams/${teamId}/rescind`,
    );
    return {
      request: toRequestT(responseData.request),
      assignmentsDeletedIds: responseData.assignmentsDeletedIds || [],
    };
  }

  /**
   * Delete a request (authenticated)
   */
  static async deleteRequest(
    apiClient: AuthenticatedApiClient,
    requestId: string,
    teamId: string,
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
      `/requests/${requestId}/teams/${teamId}`,
    );
  }
}
