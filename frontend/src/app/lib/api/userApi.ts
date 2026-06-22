/**
 * API client for user operations
 */

import { UserT, toUserT, fromUserT } from '../../../types/user';
import { WorkerT, toWorkerT } from '../../../types/worker';
import { BaseApi, AuthenticatedApiClient } from './baseApi';

export class UserApi extends BaseApi {
  /**
   * Get current user profile (authenticated)
   */
  static async getCurrentUser(apiClient: AuthenticatedApiClient): Promise<UserT> {
    const responseData = await this.makeRequest<any>(apiClient, 'get', '/users/me');
    return toUserT(responseData) as UserT;
  }

  /**
   * Update user profile (authenticated)
   */
  static async updateUser(apiClient: AuthenticatedApiClient, user: UserT): Promise<UserT> {
    // Security: Input validation
    if (!user || !user.id) {
      throw new Error('Invalid user data provided');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'put',
      `/users/${user.id}`,
      fromUserT(user),
    );
    return toUserT(responseData) as UserT;
  }

  /**
   * Update user password (authenticated)
   */
  static async updatePassword(
    apiClient: AuthenticatedApiClient,
    passwordData: {
      currentPassword: string;
      newPassword: string;
      newPasswordConfirm: string;
      accessToken: string;
    },
    userId: string,
  ): Promise<void> {
    // Security: Input validation
    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.newPasswordConfirm ||
      !passwordData.accessToken
    ) {
      throw new Error('All password fields and access token are required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    await this.makeRequest<void>(
      apiClient,
      'put',
      `/users/${userId}/change-password`,
      passwordData,
    );
  }

    /**
     * Get authenticated user's worker for a specific team (authenticated)
     * Returns null if no worker is found for the user in this team
     */
    static async getUserWorker(
      apiClient: AuthenticatedApiClient,
      teamId: string,
    ): Promise<WorkerT | null> {
      // Security: Input validation
      if (!teamId) {
        throw new Error('Team ID is required');
      }

      const responseData = await this.makeRequest<any>(
        apiClient,
        'get',
        `/users/me/worker/teams/${teamId}`,
      );

      // Backend returns null if no worker is associated with the user
      if (responseData === null) {
        return null;
      }

      return toWorkerT(responseData);
    }

    /**
     * Verify email with Cognito verification code and sync DB (authenticated)
     */
    static async verifyEmailSync(
      apiClient: AuthenticatedApiClient,
      data: { code: string },
    ): Promise<{ status: string; email: string }> {
      if (!data.code) {
        throw new Error('Verification code is required');
      }
      return this.makeRequest<{ status: string; email: string }>(
        apiClient,
        'post',
        '/users/verify-email',
        data,
      );
    }
  }
