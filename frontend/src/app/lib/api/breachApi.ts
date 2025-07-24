/**
 * API client for breach operations
 */

import { BreachT, toBreachT } from "../../../types/breach";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class BreachApi extends BaseApi {
  /**
   * Get breaches for a team (authenticated)
   */
  static async getBreaches(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<BreachT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `/breaches/teams/${teamId}`
    );
    return responseData.map((breach: any) => toBreachT(breach));
  }
}
