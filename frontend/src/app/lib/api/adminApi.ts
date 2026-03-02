/**
 * API client for admin operations
 */

import { UserT, toUserT } from "../../../types/user";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export interface ImpersonationTokenResponse {
  token: string;
  expires_in: number;
}

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
   * Returns a short-lived signed JWT that the frontend sends as
   * X-Impersonation-Token on subsequent requests.
   */
  static async startImpersonation(
    apiClient: AuthenticatedApiClient,
    targetUserId: string,
  ): Promise<ImpersonationTokenResponse> {
    if (!targetUserId) throw new Error("Target user ID is required");

    return this.makeRequest<ImpersonationTokenResponse>(
      apiClient,
      "post",
      `/admin/users/${targetUserId}/impersonate`,
    );
  }

  /**
   * Stop impersonating and restore the admin's own session.
   * The server has no state to clear — the frontend simply discards the token.
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
