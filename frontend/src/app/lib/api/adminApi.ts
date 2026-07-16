/**
 * API client for admin operations
 */

import { UserT, toUserT } from '../../../types/user';
import { BaseApi, AuthenticatedApiClient } from './baseApi';

export interface ImpersonationTokenResponse {
  token: string;
  expires_in: number;
}

export interface AdminTeamSummary {
  id: string;
  name: string;
  role: string;
}

export interface AdminUserDetails {
  user: UserT;
  teams: AdminTeamSummary[];
}

export interface AdminExportSelection {
  teamId: string;
  dataTypes: string[];
}

export class AdminApi extends BaseApi {
  /**
   * List all users in the system (admin only)
   */
  static async listUsers(apiClient: AuthenticatedApiClient): Promise<UserT[]> {
    const responseData = await this.makeRequest<any[]>(apiClient, 'get', '/admin/users');
    return responseData.map((u) => toUserT(u) as UserT);
  }

  /**
   * Get a user's profile and the teams they belong to (admin only)
   */
  static async getUserDetails(
    apiClient: AuthenticatedApiClient,
    targetUserId: string,
  ): Promise<AdminUserDetails> {
    if (!targetUserId) throw new Error('Target user ID is required');

    const responseData = await this.makeRequest<any>(
      apiClient,
      'get',
      `/admin/users/${targetUserId}`,
    );
    return {
      user: toUserT(responseData.user) as UserT,
      teams: responseData.teams as AdminTeamSummary[],
    };
  }

  /**
   * Export the selected data of a user's teams as raw JSON (admin only).
   * The response is keyed by team name and matches the backend test fixture
   * shape (solver_data.json scenarios).
   */
  static async exportUserData(
    apiClient: AuthenticatedApiClient,
    targetUserId: string,
    selections: AdminExportSelection[],
  ): Promise<Record<string, unknown>> {
    if (!targetUserId) throw new Error('Target user ID is required');
    if (selections.length === 0) throw new Error('At least one selection is required');

    return this.makeRequest<Record<string, unknown>>(
      apiClient,
      'post',
      `/admin/users/${targetUserId}/export`,
      { selections },
    );
  }

  /**
   * Start accessing a user's account as a super-admin.
   * Returns a short-lived signed JWT that the frontend sends as
   * X-Impersonation-Token on subsequent requests.
   */
  static async startImpersonation(
    apiClient: AuthenticatedApiClient,
    targetUserId: string,
  ): Promise<ImpersonationTokenResponse> {
    if (!targetUserId) throw new Error('Target user ID is required');

    return this.makeRequest<ImpersonationTokenResponse>(
      apiClient,
      'post',
      `/admin/users/${targetUserId}/impersonate`,
    );
  }

  /**
   * Stop impersonating and restore the admin's own session.
   * The server has no state to clear — the frontend simply discards the token.
   */
  static async stopImpersonation(apiClient: AuthenticatedApiClient): Promise<void> {
    await this.makeRequest<void>(apiClient, 'delete', '/admin/users/impersonate');
  }
}
