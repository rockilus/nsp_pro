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
} from "@/types/shiftDemand";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SHIFT_DEMANDS_BASE = `${API_BASE_URL}/shift-demands-new`;

/**
 * Utility function to format dates for API calls
 */
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split("T")[0]; // YYYY-MM-DD format
};

/**
 * Enhanced error handler that extracts structured error information
 */
const handleAPIError = async (response: Response): Promise<never> => {
  try {
    const errorData: ShiftDemandErrorResponse = await response.json();

    // Create user-friendly error message based on error type
    let userMessage = errorData.message || "An unexpected error occurred";

    switch (errorData.error) {
      case "validation_error":
        userMessage = `Validation failed: ${errorData.message}`;
        break;
      case "authorization_error":
        userMessage = "You don't have permission to perform this action";
        break;
      case "team_id_mismatch":
        userMessage = "Team ID mismatch in request";
        break;
      case "team_change_not_allowed":
        userMessage = "Cannot change team through update operation";
        break;
      case "internal_error":
      default:
        userMessage = "A server error occurred. Please try again later.";
        break;
    }

    throw new Error(userMessage);
  } catch (parseError) {
    // Fallback if response is not JSON
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
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
export class ShiftDemandApi {
  /**
   * Get shift demands for a specific period with optional buffering
   */
  static async getShiftDemandsByPeriod(
    teamId: string,
    startDate: Date,
    endDate: Date,
    bufferDays: number = 7
  ): Promise<ShiftDemandDTO[]> {
    const url = new URL(`${SHIFT_DEMANDS_BASE}/teams/${teamId}/period`);
    url.searchParams.append("start_date", formatDateForAPI(startDate));
    url.searchParams.append("end_date", formatDateForAPI(endDate));
    url.searchParams.append("buffer_days", bufferDays.toString());

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include authentication cookies
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    return response.json();
  }

  /**
   * Get shift demands formatted as a matrix for grid display
   */
  static async getShiftDemandsMatrix(
    teamId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ShiftDemandMatrix> {
    const url = new URL(`${SHIFT_DEMANDS_BASE}/teams/${teamId}/matrix`);
    url.searchParams.append("start_date", formatDateForAPI(startDate));
    url.searchParams.append("end_date", formatDateForAPI(endDate));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    return response.json();
  }

  /**
   * Create a single shift demand with validation
   */
  static async createShiftDemand(
    teamId: string,
    demand: Omit<ShiftDemandCreateDTO, "teamId">
  ): Promise<ShiftDemandDTO> {
    const demandWithTeam: ShiftDemandCreateDTO = {
      ...demand,
      teamId,
    };

    // Client-side validation
    validateCreateRequest(demandWithTeam);

    const response = await fetch(`${SHIFT_DEMANDS_BASE}/teams/${teamId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(demandWithTeam),
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    return response.json();
  }

  /**
   * Update an existing shift demand with validation
   */
  static async updateShiftDemand(
    teamId: string,
    demandId: string,
    demand: ShiftDemandUpdateDTO
  ): Promise<ShiftDemandDTO> {
    // Client-side validation
    validateUpdateRequest(demand);

    // Don't include teamId in update body to prevent conflicts
    const updateBody = { ...demand };
    delete updateBody.teamId;

    const response = await fetch(
      `${SHIFT_DEMANDS_BASE}/${demandId}/teams/${teamId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updateBody),
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }

    return response.json();
  }

  /**
   * Delete a single shift demand
   */
  static async deleteShiftDemand(
    teamId: string,
    demandId: string
  ): Promise<void> {
    const response = await fetch(
      `${SHIFT_DEMANDS_BASE}/${demandId}/teams/${teamId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }
  }

  /**
   * Bulk upsert (create or update) shift demands with enhanced validation
   */
  static async bulkUpsertShiftDemands(
    teamId: string,
    demands: Omit<ShiftDemandCreateDTO, "teamId">[]
  ): Promise<BulkUpsertResponse> {
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

    const response = await fetch(
      `${SHIFT_DEMANDS_BASE}/teams/${teamId}/bulk-upsert`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(demandsWithTeam),
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }

    const result = await response.json();

    // Transform backend response to match frontend interface
    return {
      created: result.demandsCreated || [],
      updated: result.demandsUpdated || [],
    };
  }
}
