/**
 * API client for team invitation operations
 */

import {
  TeamInvitationT,
  toTeamInvitationT,
  fromTeamInvitationT,
  EnrichedTeamInvitationT,
  toEnrichedTeamInvitationT,
} from "../../../types/team-invitation";
import { TeamWithMembership, toTeamWithMembership } from "../../../types/team";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class TeamInvitationApi extends BaseApi {
  private static readonly baseEndpoint = "/team-invitations";

  /**
   * Create a new team invitation (authenticated)
   */
  static async createTeamInvitation(
    apiClient: AuthenticatedApiClient,
    invitation: TeamInvitationT,
    teamId: string
  ): Promise<TeamInvitationT> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!invitation || !invitation.email) {
      throw new Error("Invalid invitation data provided");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `${this.baseEndpoint}/teams/${teamId}`,
      fromTeamInvitationT(invitation)
    );
    return toTeamInvitationT(responseData);
  }

  /**
   * Get team invitations for a specific team (authenticated)
   */
  static async getTeamInvitations(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<TeamInvitationT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `${this.baseEndpoint}/teams/${teamId}`
    );
    return responseData.map(toTeamInvitationT);
  }

  /**
   * Get user's pending invitations (authenticated)
   */
  static async getUserPendingInvitations(
    apiClient: AuthenticatedApiClient
  ): Promise<EnrichedTeamInvitationT[]> {
    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `${this.baseEndpoint}/pending`
    );
    return responseData.map(toEnrichedTeamInvitationT);
  }

  /**
   * Accept team invitation (authenticated)
   */
  static async acceptTeamInvitation(
    apiClient: AuthenticatedApiClient,
    token: string
  ): Promise<TeamWithMembership> {
    // Security: Input validation
    if (!token) {
      throw new Error("Invitation token is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `${this.baseEndpoint}/accept`,
      { token }
    );
    return toTeamWithMembership(responseData);
  }

  /**
   * Reject team invitation (authenticated)
   */
  static async rejectTeamInvitation(
    apiClient: AuthenticatedApiClient,
    token: string
  ): Promise<void> {
    // Security: Input validation
    if (!token) {
      throw new Error("Invitation token is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "post",
      `${this.baseEndpoint}/reject`,
      { token }
    );
  }

  /**
   * Resend team invitation email (authenticated)
   */
  static async resendTeamInvitationEmail(
    apiClient: AuthenticatedApiClient,
    invitationId: string,
    teamId: string
  ): Promise<TeamInvitationT> {
    // Security: Input validation
    if (!invitationId) {
      throw new Error("Invitation ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `${this.baseEndpoint}/${invitationId}/resend/teams/${teamId}`
    );
    return toTeamInvitationT(responseData);
  }

  /**
   * Delete team invitation (authenticated)
   */
  static async deleteTeamInvitation(
    apiClient: AuthenticatedApiClient,
    invitationId: string,
    teamId: string
  ): Promise<{ message: string }> {
    // Security: Input validation
    if (!invitationId) {
      throw new Error("Invitation ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    return await this.makeRequest<{ message: string }>(
      apiClient,
      "delete",
      `${this.baseEndpoint}/${invitationId}/teams/${teamId}`
    );
  }
}
