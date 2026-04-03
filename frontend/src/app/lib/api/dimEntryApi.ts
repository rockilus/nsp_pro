/**
 * API client for dim entry operations
 */

import { DimEntryT } from '../../../types/dim-entry';
import { AttributeT } from '../../../types/attribute';
import { BaseApi, AuthenticatedApiClient } from './baseApi';

export class DimEntryApi extends BaseApi {
  /**
   * Add a new dim entry (authenticated)
   */
  static async addDimEntry(
    apiClient: AuthenticatedApiClient,
    dimEntry: DimEntryT,
    teamId: string,
  ): Promise<DimEntryT> {
    // Security: Input validation
    if (!dimEntry) {
      throw new Error('Dim entry data is required');
    }
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/dim-entries/teams/${teamId}`,
      dimEntry,
    );
    return responseData as DimEntryT;
  }

  /**
   * Update a dim entry (authenticated)
   */
  static async updateDimEntry(
    apiClient: AuthenticatedApiClient,
    updatedDimEntry: DimEntryT,
    teamId: string,
  ): Promise<DimEntryT> {
    // Security: Input validation
    if (!updatedDimEntry || !updatedDimEntry.id) {
      throw new Error('Invalid dim entry data provided');
    }
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'put',
      `/dim-entries/${updatedDimEntry.id}/teams/${teamId}`,
      updatedDimEntry,
    );
    return responseData as DimEntryT;
  }

  /**
   * Delete a dim entry (authenticated)
   */
  static async deleteDimEntry(
    apiClient: AuthenticatedApiClient,
    dimEntryId: string,
    teamId: string,
  ): Promise<AttributeT[]> {
    // Security: Input validation
    if (!dimEntryId) {
      throw new Error('Dim entry ID is required');
    }
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'delete',
      `/dim-entries/${dimEntryId}/teams/${teamId}`,
    );
    return responseData as AttributeT[];
  }
}
