/**
 * API client for link shift operations
 */

import { LinkShiftT } from '../../../types/shift';
import { BaseApi, AuthenticatedApiClient } from './baseApi';

export class LinkShiftApi extends BaseApi {
  /**
   * Create a new link shift (authenticated)
   */
  static async createLinkShift(
    apiClient: AuthenticatedApiClient,
    linkShift: LinkShiftT,
  ): Promise<LinkShiftT> {
    // Security: Input validation
    if (!linkShift || !linkShift.teamId) {
      throw new Error('Invalid link shift data provided');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/link-shifts/teams/${linkShift.teamId}`,
      linkShift,
    );
    return responseData as LinkShiftT;
  }

  /**
   * Get link shifts for a team (authenticated)
   */
  static async getLinkShifts(
    apiClient: AuthenticatedApiClient,
    teamId: string,
  ): Promise<LinkShiftT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      'get',
      `/link-shifts/teams/${teamId}`,
    );
    return responseData as LinkShiftT[];
  }

  /**
   * Update link shift (authenticated)
   */
  static async updateLinkShift(
    apiClient: AuthenticatedApiClient,
    linkShift: LinkShiftT,
  ): Promise<LinkShiftT> {
    // Security: Input validation
    if (!linkShift || !linkShift.id || !linkShift.teamId) {
      throw new Error('Invalid link shift data provided');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'put',
      `/link-shifts/${linkShift.id}/teams/${linkShift.teamId}`,
      linkShift,
    );
    return responseData as LinkShiftT;
  }

  /**
   * Delete link shift (authenticated)
   */
  static async deleteLinkShift(
    apiClient: AuthenticatedApiClient,
    linkShiftId: string,
    teamId: string,
  ): Promise<void> {
    // Security: Input validation
    if (!linkShiftId) {
      throw new Error('Link shift ID is required');
    }
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    await this.makeRequest<void>(
      apiClient,
      'delete',
      `/link-shifts/${linkShiftId}/teams/${teamId}`,
    );
  }
}
