/**
 * API client for team operations
 */

import {
  TeamT,
  TeamWithMembership,
  toTeamtT,
  toTeamWithMembership,
  fromTeamT,
} from "../../../types/team";
import { UserWithMembership, toUserWithMembership } from "../../../types/user";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class TeamApi extends BaseApi {
  /**
   * Create a new team (authenticated)
   */
  static async createTeam(
    apiClient: AuthenticatedApiClient,
    teamName: string
  ): Promise<TeamWithMembership> {
    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      "/teams",
      { team_name: teamName }
    );
    return toTeamWithMembership(responseData);
  }

  /**
   * Get team by ID (authenticated)
   */
  static async getTeamById(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<TeamT> {
    const responseData = await this.makeRequest<any>(
      apiClient,
      "get",
      `/teams/${teamId}`
    );
    return toTeamtT(responseData);
  }

  /**
   * Get user's teams with memberships (authenticated)
   */
  static async getUserTeamsWithMemberships(
    apiClient: AuthenticatedApiClient
  ): Promise<TeamWithMembership[]> {
    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      "/teams/with-memberships"
    );
    return responseData.map((team: any) => toTeamWithMembership(team));
  }

  /**
   * Get team users with memberships (authenticated)
   */
  static async getTeamUsersWithMemberships(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<UserWithMembership[]> {
    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `/teams/${teamId}/users`
    );
    return responseData.map((user: any) => toUserWithMembership(user));
  }

  /**
   * Update team by ID (authenticated)
   */
  static async updateTeam(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    teamData: TeamT
  ): Promise<TeamT> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!teamData || !teamData.name) {
      throw new Error("Invalid team data provided");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "put",
      `/teams/${teamId}`,
      fromTeamT(teamData)
    );
    return toTeamtT(responseData);
  }

  /**
   * Leave team (authenticated)
   */
  static async leaveTeam(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<void> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    await this.makeRequest<void>(apiClient, "delete", `/teams/${teamId}/leave`);
  }

  /**
   * Remove user from team (authenticated)
   */
  static async removeUserFromTeam(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    userId: string
  ): Promise<void> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!userId) {
      throw new Error("User ID is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "delete",
      `/teams/${teamId}/users/${userId}`
    );
  }
}
