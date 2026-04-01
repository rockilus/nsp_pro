/**
 * API client for shift operations
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ShiftT, LinkShiftT, toShiftT, fromShiftT } from '../../../types/shift';
import { BaseApi, AuthenticatedApiClient } from './baseApi';

dayjs.extend(utc);

export interface ShiftUpdateResponse {
  shiftUpdated: ShiftT;
  linkShiftsUpdated: LinkShiftT[];
  linkShiftsIdsDeleted: string[];
}

export interface ShiftDeleteResponse {
  linkShiftsUpdated: LinkShiftT[];
  linkShiftsIdsDeleted: string[];
}

export interface ShiftsTabDataResponse {
  shifts: ShiftT[];
  dimensions: any[];
  dimEntries: any[];
  specialties: any[];
  linkShifts: LinkShiftT[];
}

/**
 * Transform API data to ShiftT type
 */
// toShiftT and fromShiftT moved to `frontend/src/types/shift.ts`

export class ShiftApi extends BaseApi {
  /**
   * Add a new shift (authenticated)
   */
  static async addShift(apiClient: AuthenticatedApiClient, shift: ShiftT): Promise<ShiftT> {
    // Security: Input validation
    if (!shift || !shift.teamId) {
      throw new Error('Invalid shift data provided');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/shifts/teams/${shift.teamId}`,
      fromShiftT(shift),
    );
    return toShiftT(responseData);
  }

  /**
   * Get shifts for a team (authenticated)
   */
  static async getShifts(apiClient: AuthenticatedApiClient, teamId: string): Promise<ShiftT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any[]>(apiClient, 'get', `/shifts/teams/${teamId}`);
    return responseData.map(toShiftT);
  }

  /**
   * Get work shifts for a team (authenticated)
   */
  static async getWorkShifts(apiClient: AuthenticatedApiClient, teamId: string): Promise<ShiftT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      'get',
      `/shifts/work/teams/${teamId}`,
    );
    return responseData.map(toShiftT);
  }

  /**
   * Get all shifts for a team (authenticated)
   */
  static async getAllShifts(apiClient: AuthenticatedApiClient, teamId: string): Promise<ShiftT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      'get',
      `/shifts/all/teams/${teamId}`,
    );
    return responseData.map(toShiftT);
  }

  /**
   * Update a shift (authenticated)
   */
  static async updateShift(
    apiClient: AuthenticatedApiClient,
    updatedShift: ShiftT,
  ): Promise<ShiftUpdateResponse> {
    // Security: Input validation
    if (!updatedShift || !updatedShift.id || !updatedShift.teamId) {
      throw new Error('Invalid shift data provided');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'put',
      `/shifts/${updatedShift.id}/teams/${updatedShift.teamId}`,
      fromShiftT(updatedShift),
    );

    return {
      shiftUpdated: toShiftT(responseData.shift),
      linkShiftsUpdated: responseData.linkShifts.updated
        ? (responseData.linkShifts.updated as LinkShiftT[])
        : [],
      linkShiftsIdsDeleted: responseData.linkShifts.deleted ? responseData.linkShifts.deleted : [],
    };
  }

  /**
   * Delete a shift (authenticated)
   */
  static async deleteShift(
    apiClient: AuthenticatedApiClient,
    shiftId: string,
    teamId: string,
  ): Promise<ShiftDeleteResponse> {
    // Security: Input validation
    if (!shiftId) {
      throw new Error('Shift ID is required');
    }
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'delete',
      `/shifts/${shiftId}/teams/${teamId}`,
    );

    return {
      linkShiftsUpdated: responseData.linkShifts.updated
        ? (responseData.linkShifts.updated as LinkShiftT[])
        : [],
      linkShiftsIdsDeleted: responseData.linkShifts.deleted ? responseData.linkShifts.deleted : [],
    };
  }

  /**
   * Get shifts tab data (authenticated)
   */
  static async getShiftsTabData(
    apiClient: AuthenticatedApiClient,
    teamId: string,
  ): Promise<ShiftsTabDataResponse> {
    // Security: Input validation
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    // Import the new API classes
    const { DimensionApi } = await import('./dimensionApi');
    const { SpecialtyApi } = await import('./specialtyApi');
    const { LinkShiftApi } = await import('./linkShiftApi');

    // Use authenticated API calls for all data
    const [shifts, dimensionsData, specialties, linkShifts] = await Promise.all([
      this.getShifts(apiClient, teamId),
      DimensionApi.getDimensions(apiClient, teamId),
      SpecialtyApi.getSpecialties(apiClient, teamId),
      LinkShiftApi.getLinkShifts(apiClient, teamId),
    ]);

    return {
      shifts,
      dimensions: dimensionsData.dimensions,
      dimEntries: dimensionsData.dimEntries,
      specialties,
      linkShifts,
    };
  }
}
