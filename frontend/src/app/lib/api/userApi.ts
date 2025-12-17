/**
 * API client for user operations
 */

import { UserT, toUserT, fromUserT } from "../../../types/user";
import { WorkerT, toWorkerT } from "../../../types/worker";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class UserApi extends BaseApi {
  /**
   * Get current user profile (authenticated)
   */
  static async getCurrentUser(
    apiClient: AuthenticatedApiClient
  ): Promise<UserT> {
    const responseData = await this.makeRequest<any>(
      apiClient,
      "get",
      "/users/me"
    );
    return toUserT(responseData) as UserT;
  }

  /**
   * Update user profile (authenticated)
   */
  static async updateUser(
    apiClient: AuthenticatedApiClient,
    user: UserT
  ): Promise<UserT> {
    // Security: Input validation
    if (!user || !user.id) {
      throw new Error("Invalid user data provided");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "put",
      `/users/${user.id}`,
      fromUserT(user)
    );
    return toUserT(responseData) as UserT;
  }

  /**
   * Update user password (authenticated)
   */
  static async updatePassword(
    apiClient: AuthenticatedApiClient,
    passwordData: {
      currentPassword: string;
      newPassword: string;
      newPasswordConfirm: string;
      accessToken: string;
    },
    userId: string
  ): Promise<void> {
    // Security: Input validation
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.newPasswordConfirm ||
      !passwordData.accessToken
    ) {
      throw new Error("All password fields and access token are required");
    }

    if (!userId) {
      throw new Error("User ID is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "put",
      `/users/${userId}/change-password`,
      passwordData
    );
  }

  /**
   * Get authenticated user's worker for a specific team (authenticated)
   * Returns null if no worker is found for the user in this team
   */
  static async getUserWorker(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<WorkerT | null> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    try {
      const responseData = await this.makeRequest<any>(
        apiClient,
        "get",
        `/users/me/worker/teams/${teamId}`
      );
      return toWorkerT(responseData);
    } catch (error: any) {
      // Return null if worker not found (404)
      if (error?.response?.status === 404) {
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }
}
