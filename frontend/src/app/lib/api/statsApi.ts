/**
 * API client for stats operations
 */

import { StatsT, StatsHeaderT, StatsOptionsT } from "../../../types/stats";
import { ShiftWorkerOptionT } from "../../../types/constraint";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class StatsApi extends BaseApi {
  /**
   * Get stats for a team (authenticated)
   */
  static async getStats(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    statsOptions: StatsOptionsT,
  ): Promise<StatsT> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!statsOptions) {
      throw new Error("Stats options are required");
    }

    const responseData = await this.makeRequest<StatsT>(
      apiClient,
      "post",
      `/stats/teams/${teamId}`,
      statsOptions,
    );
    return responseData;
  }

  /**
   * Add stats header (authenticated)
   */
  static async addHeader(
    apiClient: AuthenticatedApiClient,
    header: StatsHeaderT,
  ): Promise<StatsHeaderT> {
    // Security: Input validation
    if (!header || !header.teamId) {
      throw new Error("Invalid header data provided");
    }

    const responseData = await this.makeRequest<StatsHeaderT>(
      apiClient,
      "post",
      `/stats/stats-headers/teams/${header.teamId}`,
      header,
    );
    return responseData;
  }

  /**
   * Delete stats header (authenticated)
   */
  static async deleteHeader(
    apiClient: AuthenticatedApiClient,
    headerId: string,
    teamId: string,
  ): Promise<void> {
    // Security: Input validation
    if (!headerId) {
      throw new Error("Header ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "delete",
      `/stats/stats-headers/${headerId}/teams/${teamId}`,
    );
  }

  /**
   * Get shift options for a team (authenticated)
   */
  static async getShiftOptions(
    apiClient: AuthenticatedApiClient,
    teamId: string,
  ): Promise<ShiftWorkerOptionT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<ShiftWorkerOptionT[]>(
      apiClient,
      "get",
      `/stats/shift-options/teams/${teamId}`,
    );
    return responseData;
  }
}
