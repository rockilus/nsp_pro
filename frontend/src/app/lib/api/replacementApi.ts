/**
 * API client for replacement operations
 */

import {
  ReplacementCandidateT,
  toReplacementCandidateT,
} from "../../../types/replacement";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class ReplacementApi extends BaseApi {
  /**
   * Get replacement candidates for an assignment (authenticated)
   */
  static async getReplacementCandidates(
    apiClient: AuthenticatedApiClient,
    assignmentId: string,
    teamId: string,
  ): Promise<ReplacementCandidateT[]> {
    // Security: Input validation
    if (!assignmentId || !teamId) {
      throw new Error("Assignment ID and team ID are required");
    }

    const endpoint = `/assignments/${assignmentId}/replacement-candidates/teams/${teamId}`;

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      endpoint,
    );

    return responseData.map((candidate: any) =>
      toReplacementCandidateT(candidate),
    );
  }
}
