/**
 * API client for shift demand management
 * Handles all HTTP requests to the shift demand endpoints
 */

import {
  ShiftDemandDTO,
  ShiftDemandMatrix,
  BulkUpsertResponse,
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
 * Utility function to handle API errors
 */
const handleAPIError = async (response: Response): Promise<never> => {
  const errorData = await response.json().catch(() => ({
    detail: "Unknown error occurred",
  }));

  throw new Error(
    errorData.detail || `HTTP ${response.status}: ${response.statusText}`
  );
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
   * Create a single shift demand
   */
  static async createShiftDemand(
    teamId: string,
    demand: Omit<ShiftDemandDTO, "id" | "createdAt" | "updatedAt">
  ): Promise<ShiftDemandDTO> {
    const response = await fetch(`${SHIFT_DEMANDS_BASE}/teams/${teamId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        ...demand,
        teamId, // Ensure teamId is set
      }),
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    return response.json();
  }

  /**
   * Update an existing shift demand
   */
  static async updateShiftDemand(
    teamId: string,
    demandId: string,
    demand: Partial<ShiftDemandDTO>
  ): Promise<ShiftDemandDTO> {
    const response = await fetch(
      `${SHIFT_DEMANDS_BASE}/${demandId}/teams/${teamId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...demand,
          id: demandId,
          teamId,
        }),
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
   * Bulk upsert (create or update) shift demands
   */
  static async bulkUpsertShiftDemands(
    teamId: string,
    demands: Partial<ShiftDemandDTO>[]
  ): Promise<BulkUpsertResponse> {
    const response = await fetch(
      `${SHIFT_DEMANDS_BASE}/teams/${teamId}/bulk-upsert`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(
          demands.map((demand) => ({
            ...demand,
            teamId,
          }))
        ),
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }

    return response.json();
  }
}
