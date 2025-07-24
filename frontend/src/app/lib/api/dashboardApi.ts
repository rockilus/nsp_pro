/**
 * API client for admin dashboard operations
 */

import { UserDashboardT, toUserDashboardT } from "../../../types/user";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class DashboardApi extends BaseApi {
  private static readonly dashboardBaseUrl = "/admin-dashboard";

  /**
   * Check user authorization for dashboard access (authenticated)
   */
  static async checkUserAuthz(
    apiClient: AuthenticatedApiClient
  ): Promise<boolean> {
    try {
      await this.makeRequest<void>(
        apiClient,
        "get",
        `${this.dashboardBaseUrl}/check-authz`
      );
      return true;
    } catch (error) {
      // If authorization check fails, return false instead of throwing
      console.warn("User authorization check failed:", error);
      return false;
    }
  }

  /**
   * Get all users dashboard data (authenticated)
   */
  static async getUsersDashboard(
    apiClient: AuthenticatedApiClient
  ): Promise<UserDashboardT[]> {
    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `${this.dashboardBaseUrl}/users`
    );
    return responseData.map((user: any) => toUserDashboardT(user));
  }

  /**
   * Get specific user dashboard data (authenticated)
   */
  static async getUserDashboard(
    apiClient: AuthenticatedApiClient,
    userId: string
  ): Promise<UserDashboardT> {
    // Security: Input validation
    if (!userId) {
      throw new Error("User ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "get",
      `${this.dashboardBaseUrl}/users/${userId}`
    );
    return toUserDashboardT(responseData);
  }

  /**
   * Impersonate a user (authenticated)
   */
  static async impersonateUser(
    apiClient: AuthenticatedApiClient,
    userId: string
  ): Promise<boolean> {
    // Security: Input validation
    if (!userId) {
      throw new Error("User ID is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "post",
      `${this.dashboardBaseUrl}/impersonate`,
      { user_id: userId }
    );
    return true;
  }

  /**
   * Stop impersonation and restore original session (authenticated)
   */
  static async stopImpersonation(
    apiClient: AuthenticatedApiClient
  ): Promise<boolean> {
    await this.makeRequest<void>(
      apiClient,
      "post",
      `${this.dashboardBaseUrl}/restore-session`
    );
    return true;
  }

  /**
   * Delete a user (authenticated)
   */
  static async deleteUser(
    apiClient: AuthenticatedApiClient,
    userId: string
  ): Promise<boolean> {
    // Security: Input validation
    if (!userId) {
      throw new Error("User ID is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "delete",
      `${this.dashboardBaseUrl}/users/${userId}`
    );
    return true;
  }
}
