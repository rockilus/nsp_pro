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

  // Legacy methods for backward compatibility (discouraged)
  static async createTeamInvitationLegacy(
    invitation: TeamInvitationT,
    teamId: string
  ): Promise<TeamInvitationT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const data = await this.makeFetchRequest<any>(
      `${this.baseEndpoint}/teams/${teamId}`,
      {
        method: "POST",
        body: JSON.stringify(fromTeamInvitationT(invitation)),
      }
    );
    return toTeamInvitationT(data);
  }

  static async getTeamInvitationsLegacy(
    teamId: string
  ): Promise<TeamInvitationT[]> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const data = await this.makeFetchRequest<any[]>(
      `${this.baseEndpoint}/teams/${teamId}`
    );
    return data.map(toTeamInvitationT);
  }

  static async getUserPendingInvitationsLegacy(): Promise<
    EnrichedTeamInvitationT[]
  > {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const data = await this.makeFetchRequest<any[]>(
      `${this.baseEndpoint}/pending`
    );
    return data.map(toEnrichedTeamInvitationT);
  }

  static async acceptTeamInvitationLegacy(
    token: string
  ): Promise<TeamWithMembership> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const data = await this.makeFetchRequest<any>(
      `${this.baseEndpoint}/accept`,
      {
        method: "POST",
        body: JSON.stringify({ token }),
      }
    );
    return toTeamWithMembership(data);
  }

  static async rejectTeamInvitationLegacy(token: string): Promise<boolean> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    try {
      await this.makeFetchRequest<void>(`${this.baseEndpoint}/reject`, {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      return true;
    } catch (error) {
      console.error("Legacy reject team invitation failed:", error);
      return false;
    }
  }

  static async resendTeamInvitationEmailLegacy(
    invitationId: string,
    teamId: string
  ): Promise<TeamInvitationT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const data = await this.makeFetchRequest<any>(
      `${this.baseEndpoint}/${invitationId}/resend/teams/${teamId}`,
      {
        method: "POST",
      }
    );
    return toTeamInvitationT(data);
  }

  static async deleteTeamInvitationLegacy(
    invitationId: string,
    teamId: string
  ): Promise<{ message: string }> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    return await this.makeFetchRequest<{ message: string }>(
      `${this.baseEndpoint}/${invitationId}/teams/${teamId}`,
      {
        method: "DELETE",
      }
    );
  }
}
