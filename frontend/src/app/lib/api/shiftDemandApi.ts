/**
 * API client for shift demand management
 * Handles all HTTP requests to the shift demand endpoints with enhanced
 * error handling and validation aligned with backend DTOs
 */

import {
  ShiftDemandDTO,
  ShiftDemandCreateDTO,
  ShiftDemandUpdateDTO,
  ShiftDemandMatrix,
  BulkUpsertResponse,
  ShiftDemandErrorResponse,
  SHIFT_DEMAND_CONSTRAINTS,
} from "../../../types/shiftDemand";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

/**
 * Utility function to format dates for API calls
 */
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD format
};

/**
 * Client-side validation for create requests
 */
const validateCreateRequest = (demand: ShiftDemandCreateDTO): void => {
  if (!SHIFT_DEMAND_CONSTRAINTS.OBJECTID_PATTERN.test(demand.shiftId)) {
    throw new Error("Invalid shift ID format");
  }

  if (!SHIFT_DEMAND_CONSTRAINTS.OBJECTID_PATTERN.test(demand.teamId)) {
    throw new Error("Invalid team ID format");
  }

  if (demand.count < 0 || demand.count > SHIFT_DEMAND_CONSTRAINTS.MAX_COUNT) {
    throw new Error(
      `Count must be between 0 and ${SHIFT_DEMAND_CONSTRAINTS.MAX_COUNT}`
    );
  }

  if (
    demand.date < SHIFT_DEMAND_CONSTRAINTS.MIN_DATE ||
    demand.date > SHIFT_DEMAND_CONSTRAINTS.MAX_DATE
  ) {
    throw new Error("Date is outside valid range");
  }

  if (
    demand.notes &&
    demand.notes.length > SHIFT_DEMAND_CONSTRAINTS.MAX_NOTES_LENGTH
  ) {
    throw new Error(
      `Notes cannot exceed ${SHIFT_DEMAND_CONSTRAINTS.MAX_NOTES_LENGTH} characters`
    );
  }
};

/**
 * Client-side validation for update requests
 */
const validateUpdateRequest = (demand: ShiftDemandUpdateDTO): void => {
  if (
    demand.shiftId &&
    !SHIFT_DEMAND_CONSTRAINTS.OBJECTID_PATTERN.test(demand.shiftId)
  ) {
    throw new Error("Invalid shift ID format");
  }

  if (
    demand.teamId &&
    !SHIFT_DEMAND_CONSTRAINTS.OBJECTID_PATTERN.test(demand.teamId)
  ) {
    throw new Error("Invalid team ID format");
  }

  if (
    demand.count !== undefined &&
    (demand.count < 0 || demand.count > SHIFT_DEMAND_CONSTRAINTS.MAX_COUNT)
  ) {
    throw new Error(
      `Count must be between 0 and ${SHIFT_DEMAND_CONSTRAINTS.MAX_COUNT}`
    );
  }

  if (
    demand.date !== undefined &&
    (demand.date < SHIFT_DEMAND_CONSTRAINTS.MIN_DATE ||
      demand.date > SHIFT_DEMAND_CONSTRAINTS.MAX_DATE)
  ) {
    throw new Error("Date is outside valid range");
  }

  if (
    demand.notes &&
    demand.notes.length > SHIFT_DEMAND_CONSTRAINTS.MAX_NOTES_LENGTH
  ) {
    throw new Error(
      `Notes cannot exceed ${SHIFT_DEMAND_CONSTRAINTS.MAX_NOTES_LENGTH} characters`
    );
  }
};

/**
 * Main API client class for shift demand operations
 */
export class ShiftDemandApi extends BaseApi {
  /**
   * Get shift demands for a specific period with optional buffering (authenticated)
   */
  static async getShiftDemandsByPeriod(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    startDate: Date,
    endDate: Date,
    bufferDays: number = 7
  ): Promise<ShiftDemandDTO[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const params = new URLSearchParams({
      start_date: formatDateForAPI(startDate),
      end_date: formatDateForAPI(endDate),
      buffer_days: bufferDays.toString(),
    });

    const endpoint = `/shift-demands-new/teams/${teamId}/period?${params}`;

    return this.makeRequest<ShiftDemandDTO[]>(apiClient, "get", endpoint);
  }

  /**
   * Get shift demands formatted as a matrix for grid display (authenticated)
   */
  static async getShiftDemandsMatrix(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ShiftDemandMatrix> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const params = new URLSearchParams({
      start_date: formatDateForAPI(startDate),
      end_date: formatDateForAPI(endDate),
    });

    const endpoint = `/shift-demands-new/teams/${teamId}/matrix?${params}`;

    return this.makeRequest<ShiftDemandMatrix>(apiClient, "get", endpoint);
  }

  /**
   * Create a single shift demand with validation (authenticated)
   */
  static async createShiftDemand(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    demand: Omit<ShiftDemandCreateDTO, "teamId">
  ): Promise<ShiftDemandDTO> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const demandWithTeam: ShiftDemandCreateDTO = {
      ...demand,
      teamId,
    };

    // Client-side validation
    validateCreateRequest(demandWithTeam);

    const endpoint = `/shift-demands-new/teams/${teamId}`;

    return this.makeRequest<ShiftDemandDTO>(
      apiClient,
      "post",
      endpoint,
      demandWithTeam
    );
  }

  /**
   * Update an existing shift demand with validation (authenticated)
   */
  static async updateShiftDemand(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    demandId: string,
    demand: ShiftDemandUpdateDTO
  ): Promise<ShiftDemandDTO> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!demandId) {
      throw new Error("Demand ID is required");
    }

    // Client-side validation
    validateUpdateRequest(demand);

    // Don't include teamId in update body to prevent conflicts
    const updateBody = { ...demand };
    delete updateBody.teamId;

    const endpoint = `/shift-demands-new/${demandId}/teams/${teamId}`;

    return this.makeRequest<ShiftDemandDTO>(
      apiClient,
      "put",
      endpoint,
      updateBody
    );
  }

  /**
   * Delete a single shift demand (authenticated)
   */
  static async deleteShiftDemand(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    demandId: string
  ): Promise<void> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!demandId) {
      throw new Error("Demand ID is required");
    }

    const endpoint = `/shift-demands-new/${demandId}/teams/${teamId}`;

    await this.makeRequest<void>(apiClient, "delete", endpoint);
  }

  /**
   * Bulk upsert (create or update) shift demands with enhanced validation (authenticated)
   */
  static async bulkUpsertShiftDemands(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    demands: Omit<ShiftDemandCreateDTO, "teamId">[]
  ): Promise<BulkUpsertResponse> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!demands || demands.length === 0) {
      throw new Error("At least one demand is required");
    }

    const demandsWithTeam: ShiftDemandCreateDTO[] = demands.map((demand) => ({
      ...demand,
      teamId,
    }));

    // Validate all demands
    demandsWithTeam.forEach((demand, index) => {
      try {
        validateCreateRequest(demand);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown validation error";
        throw new Error(
          `Validation failed for demand at index ${index}: ${errorMessage}`
        );
      }
    });

    const endpoint = `/shift-demands-new/teams/${teamId}/bulk-upsert`;

    const result = await this.makeRequest<any>(
      apiClient,
      "post",
      endpoint,
      demandsWithTeam
    );

    // Transform backend response to match frontend interface
    return {
      created: result.demandsCreated || [],
      updated: result.demandsUpdated || [],
    };
  }

  // Legacy methods for backward compatibility (discouraged)
  static async getShiftDemandsByPeriodLegacy(
    teamId: string,
    startDate: Date,
    endDate: Date,
    bufferDays: number = 7
  ): Promise<ShiftDemandDTO[]> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const params = new URLSearchParams({
      start_date: formatDateForAPI(startDate),
      end_date: formatDateForAPI(endDate),
      buffer_days: bufferDays.toString(),
    });

    return this.makeFetchRequest<ShiftDemandDTO[]>(
      `/shift-demands-new/teams/${teamId}/period?${params}`
    );
  }

  static async getShiftDemandsMatrixLegacy(
    teamId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ShiftDemandMatrix> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const params = new URLSearchParams({
      start_date: formatDateForAPI(startDate),
      end_date: formatDateForAPI(endDate),
    });

    return this.makeFetchRequest<ShiftDemandMatrix>(
      `/shift-demands-new/teams/${teamId}/matrix?${params}`
    );
  }

  static async createShiftDemandLegacy(
    teamId: string,
    demand: Omit<ShiftDemandCreateDTO, "teamId">
  ): Promise<ShiftDemandDTO> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const demandWithTeam: ShiftDemandCreateDTO = {
      ...demand,
      teamId,
    };

    validateCreateRequest(demandWithTeam);

    return this.makeFetchRequest<ShiftDemandDTO>(
      `/shift-demands-new/teams/${teamId}`,
      {
        method: "POST",
        body: JSON.stringify(demandWithTeam),
      }
    );
  }

  static async updateShiftDemandLegacy(
    teamId: string,
    demandId: string,
    demand: ShiftDemandUpdateDTO
  ): Promise<ShiftDemandDTO> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    validateUpdateRequest(demand);

    const updateBody = { ...demand };
    delete updateBody.teamId;

    return this.makeFetchRequest<ShiftDemandDTO>(
      `/shift-demands-new/${demandId}/teams/${teamId}`,
      {
        method: "PUT",
        body: JSON.stringify(updateBody),
      }
    );
  }

  static async deleteShiftDemandLegacy(
    teamId: string,
    demandId: string
  ): Promise<void> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    await this.makeFetchRequest<void>(
      `/shift-demands-new/${demandId}/teams/${teamId}`,
      {
        method: "DELETE",
      }
    );
  }

  static async bulkUpsertShiftDemandsLegacy(
    teamId: string,
    demands: Omit<ShiftDemandCreateDTO, "teamId">[]
  ): Promise<BulkUpsertResponse> {
    console.warn("⚠️ Using legacy unauthenticated API call");
    const demandsWithTeam: ShiftDemandCreateDTO[] = demands.map((demand) => ({
      ...demand,
      teamId,
    }));

    demandsWithTeam.forEach((demand, index) => {
      try {
        validateCreateRequest(demand);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown validation error";
        throw new Error(
          `Validation failed for demand at index ${index}: ${errorMessage}`
        );
      }
    });

    const result = await this.makeFetchRequest<any>(
      `/shift-demands-new/teams/${teamId}/bulk-upsert`,
      {
        method: "POST",
        body: JSON.stringify(demandsWithTeam),
      }
    );

    return {
      created: result.demandsCreated || [],
      updated: result.demandsUpdated || [],
    };
  }
}
