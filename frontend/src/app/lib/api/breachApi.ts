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

  // Legacy method for backward compatibility (discouraged)
  static async getBreachesLegacy(teamId: string): Promise<BreachT[]> {
    console.warn("⚠️ Using legacy unauthenticated API call");

    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    try {
      const data = await this.makeFetchRequest<any[]>(
        `/breaches/teams/${teamId}`
      );
      return data.map((breach: any) => toBreachT(breach));
    } catch (error) {
      console.error("Legacy get breaches failed:", error);
      throw new Error("Failed to fetch breaches, please try again later");
    }
  }
}
