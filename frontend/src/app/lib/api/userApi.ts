/**
 * API client for user operations
 */

import { UserT, toUserT, fromUserT } from "../../../types/user";
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
}
