/**
 * API client for admin operations
 */

import { UserT, toUserT } from "../../../types/user";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class AdminApi extends BaseApi {
  /**
   * List all users in the system (admin only)
   */
  static async listUsers(apiClient: AuthenticatedApiClient): Promise<UserT[]> {
    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      "/admin/users",
    );
    return responseData.map((u) => toUserT(u) as UserT);
  }

  /**
   * Start accessing a user's account as a super-admin.
   * Writes impersonating_user_id on the admin's own user record so that
   * subsequent requests resolve effective_user_id to the target user.
   */
  static async startImpersonation(
    apiClient: AuthenticatedApiClient,
    targetUserId: string,
  ): Promise<UserT> {
    if (!targetUserId) throw new Error("Target user ID is required");

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/admin/users/${targetUserId}/impersonate`,
    );
    return toUserT(responseData) as UserT;
  }

  /**
   * Stop impersonating and restore the admin's own session.
   * Clears impersonating_user_id on the admin's user record.
   */
  static async stopImpersonation(
    apiClient: AuthenticatedApiClient,
  ): Promise<void> {
    await this.makeRequest<void>(
      apiClient,
      "delete",
      "/admin/users/impersonate",
    );
  }
}
