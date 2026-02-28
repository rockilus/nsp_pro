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
}
