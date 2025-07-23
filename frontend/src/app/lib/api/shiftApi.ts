/**
 * API client for shift operations
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ShiftT, LinkShiftT } from "../../../types/shift";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

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
export const toShiftT = (data: any): ShiftT => {
  return {
    ...data,
    startTime: dayjs.unix(data.startTime).utc(),
    endTime: dayjs.unix(data.endTime).utc(),
  };
};

/**
 * Transform ShiftT to API data format
 */
export const fromShiftT = (data: ShiftT): any => {
  return {
    ...data,
    startTime: data.startTime.unix(),
    endTime: data.endTime.unix(),
  };
};

export class ShiftApi extends BaseApi {
  /**
   * Add a new shift (authenticated)
   */
  static async addShift(
    apiClient: AuthenticatedApiClient,
    shift: ShiftT
  ): Promise<ShiftT> {
    // Security: Input validation
    if (!shift || !shift.teamId) {
      throw new Error("Invalid shift data provided");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/shifts/teams/${shift.teamId}`,
      fromShiftT(shift)
    );
    return toShiftT(responseData);
  }

  /**
   * Get shifts for a team (authenticated)
   */
  static async getShifts(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<ShiftT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `/shifts/teams/${teamId}`
    );
    return responseData.map(toShiftT);
  }

  /**
   * Get work shifts for a team (authenticated)
   */
  static async getWorkShifts(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<ShiftT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `/shifts/work/teams/${teamId}`
    );
    return responseData.map(toShiftT);
  }

  /**
   * Get all shifts for a team (authenticated)
   */
  static async getAllShifts(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<ShiftT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `/shifts/all/teams/${teamId}`
    );
    return responseData.map(toShiftT);
  }

  /**
   * Update a shift (authenticated)
   */
  static async updateShift(
    apiClient: AuthenticatedApiClient,
    updatedShift: ShiftT
  ): Promise<ShiftUpdateResponse> {
    // Security: Input validation
    if (!updatedShift || !updatedShift.id || !updatedShift.teamId) {
      throw new Error("Invalid shift data provided");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "put",
      `/shifts/${updatedShift.id}/teams/${updatedShift.teamId}`,
      fromShiftT(updatedShift)
    );

    return {
      shiftUpdated: toShiftT(responseData.shift),
      linkShiftsUpdated: responseData.linkShifts.updated
        ? (responseData.linkShifts.updated as LinkShiftT[])
        : [],
      linkShiftsIdsDeleted: responseData.linkShifts.deleted
        ? responseData.linkShifts.deleted
        : [],
    };
  }

  /**
   * Delete a shift (authenticated)
   */
  static async deleteShift(
    apiClient: AuthenticatedApiClient,
    shiftId: string,
    teamId: string
  ): Promise<ShiftDeleteResponse> {
    // Security: Input validation
    if (!shiftId) {
      throw new Error("Shift ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "delete",
      `/shifts/${shiftId}/teams/${teamId}`
    );

    return {
      linkShiftsUpdated: responseData.linkShifts.updated
        ? (responseData.linkShifts.updated as LinkShiftT[])
        : [],
      linkShiftsIdsDeleted: responseData.linkShifts.deleted
        ? responseData.linkShifts.deleted
        : [],
    };
  }

  /**
   * Get shifts tab data (authenticated)
   * Note: This method will need to be updated once dimension, specialty, and link-shift APIs are refactored
   */
  static async getShiftsTabData(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<ShiftsTabDataResponse> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    // For now, we'll make individual calls since other APIs haven't been refactored yet
    // This should be updated when dimension, specialty, and link-shift APIs are refactored
    const shifts = await this.getShifts(apiClient, teamId);

    // TODO: Replace these with authenticated API calls once refactored
    const { getDimensions } = await import("../dimension");
    const { getSpecialties } = await import("../specialty");
    const { getLinkShifts } = await import("../link-shift");

    const [dimensions, specialties, linkShifts] = await Promise.all([
      getDimensions(teamId),
      getSpecialties(teamId),
      getLinkShifts(teamId),
    ]);

    return {
      shifts,
      dimensions: dimensions.dimensions,
      dimEntries: dimensions.dimEntries,
      specialties,
      linkShifts,
    };
  }

  // Legacy methods for backward compatibility (discouraged)
  static async addShiftLegacy(shift: ShiftT): Promise<ShiftT> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const responseData = await this.makeFetchRequest<any>(
      `/shifts/teams/${shift.teamId}`,
      {
        method: "POST",
        body: JSON.stringify(fromShiftT(shift)),
      }
    );
    return toShiftT(responseData);
  }

  static async getShiftsLegacy(teamId: string): Promise<ShiftT[]> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const responseData = await this.makeFetchRequest<any[]>(
      `/shifts/teams/${teamId}`
    );
    return responseData.map(toShiftT);
  }

  static async getWorkShiftsLegacy(teamId: string): Promise<ShiftT[]> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const responseData = await this.makeFetchRequest<any[]>(
      `/shifts/work/teams/${teamId}`
    );
    return responseData.map(toShiftT);
  }

  static async getAllShiftsLegacy(teamId: string): Promise<ShiftT[]> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const responseData = await this.makeFetchRequest<any[]>(
      `/shifts/all/teams/${teamId}`
    );
    return responseData.map(toShiftT);
  }

  static async updateShiftLegacy(
    updatedShift: ShiftT
  ): Promise<ShiftUpdateResponse> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const responseData = await this.makeFetchRequest<any>(
      `/shifts/${updatedShift.id}/teams/${updatedShift.teamId}`,
      {
        method: "PUT",
        body: JSON.stringify(fromShiftT(updatedShift)),
      }
    );

    return {
      shiftUpdated: toShiftT(responseData.shift),
      linkShiftsUpdated: responseData.linkShifts.updated
        ? (responseData.linkShifts.updated as LinkShiftT[])
        : [],
      linkShiftsIdsDeleted: responseData.linkShifts.deleted
        ? responseData.linkShifts.deleted
        : [],
    };
  }

  static async deleteShiftLegacy(
    shiftId: string,
    teamId: string
  ): Promise<ShiftDeleteResponse> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const responseData = await this.makeFetchRequest<any>(
      `/shifts/${shiftId}/teams/${teamId}`,
      {
        method: "DELETE",
      }
    );

    return {
      linkShiftsUpdated: responseData.linkShifts.updated
        ? (responseData.linkShifts.updated as LinkShiftT[])
        : [],
      linkShiftsIdsDeleted: responseData.linkShifts.deleted
        ? responseData.linkShifts.deleted
        : [],
    };
  }
}
