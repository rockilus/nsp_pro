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

  // Legacy methods for backward compatibility (discouraged)
  static async createTeamLegacy(teamName: string): Promise<TeamWithMembership> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<TeamWithMembership>("/teams", {
      method: "POST",
      body: JSON.stringify({ team_name: teamName }),
    });
  }

  static async getTeamByIdLegacy(teamId: string): Promise<TeamT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<TeamT>(`/teams/${teamId}`);
  }

  static async getUserTeamsWithMembershipsLegacy(): Promise<
    TeamWithMembership[]
  > {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const data = await this.makeFetchRequest<any[]>("/teams/with-memberships");
    return data.map((team: any) => toTeamWithMembership(team));
  }

  static async getTeamUsersWithMembershipsLegacy(
    teamId: string
  ): Promise<UserWithMembership[]> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const data = await this.makeFetchRequest<any[]>(`/teams/${teamId}/users`);
    return data.map((user: any) => toUserWithMembership(user));
  }

  static async updateTeamLegacy(
    teamId: string,
    teamData: TeamT
  ): Promise<TeamT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return this.makeFetchRequest<TeamT>(`/teams/${teamId}`, {
      method: "PUT",
      body: JSON.stringify(fromTeamT(teamData)),
    });
  }

  static async leaveTeamLegacy(teamId: string): Promise<boolean> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    try {
      await this.makeFetchRequest<void>(`/teams/${teamId}/leave`, {
        method: "DELETE",
      });
      return true;
    } catch (error) {
      console.error("Legacy leave team failed:", error);
      return false;
    }
  }

  static async removeUserFromTeamLegacy(
    teamId: string,
    userId: string
  ): Promise<boolean> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    try {
      await this.makeFetchRequest<void>(`/teams/${teamId}/users/${userId}`, {
        method: "DELETE",
      });
      return true;
    } catch (error) {
      console.error("Legacy remove user from team failed:", error);
      return false;
    }
  }
}
