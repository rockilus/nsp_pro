/**
 * API client for shift demand management
 * Handles all HTTP requests to the shift demand endpoints
 */

import {
  ShiftDemandDTO,
  ShiftDemandMatrix,
  ShiftDemandSummary,
  ShiftDemandSource,
  BulkUpsertResponse,
  DeleteResponse,
  CopyPeriodConfig,
  DemandTemplate,
  DemandPattern,
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
   * Get summary statistics for shift demands
   */
  static async getShiftDemandsSummary(
    teamId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ShiftDemandSummary> {
    const url = new URL(`${SHIFT_DEMANDS_BASE}/teams/${teamId}/summary`);
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

  /**
   * Copy shift demands from one period to another
   */
  static async copyDemandsFromPeriod(
    teamId: string,
    config: CopyPeriodConfig
  ): Promise<ShiftDemandDTO[]> {
    const url = new URL(`${SHIFT_DEMANDS_BASE}/teams/${teamId}/copy-period`);
    url.searchParams.append(
      "source_start",
      formatDateForAPI(config.sourceStart)
    );
    url.searchParams.append("source_end", formatDateForAPI(config.sourceEnd));
    url.searchParams.append(
      "target_start",
      formatDateForAPI(config.targetStart)
    );
    url.searchParams.append("target_end", formatDateForAPI(config.targetEnd));
    url.searchParams.append("source_type", config.sourceType);

    const response = await fetch(url.toString(), {
      method: "POST",
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
   * Delete demands within a date range, optionally filtered by shifts
   */
  static async deleteDemandsInPeriod(
    teamId: string,
    startDate: Date,
    endDate: Date,
    shiftIds?: string[]
  ): Promise<DeleteResponse> {
    const url = new URL(`${SHIFT_DEMANDS_BASE}/teams/${teamId}/period`);
    url.searchParams.append("start_date", formatDateForAPI(startDate));
    url.searchParams.append("end_date", formatDateForAPI(endDate));

    if (shiftIds && shiftIds.length > 0) {
      shiftIds.forEach((shiftId) => {
        url.searchParams.append("shift_ids", shiftId);
      });
    }

    const response = await fetch(url.toString(), {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      await handleAPIError(response);
    }

    return response.json();
  }

  /**
   * Get demands for a specific shift within a date range
   */
  static async getDemandsByShiftAndDateRange(
    teamId: string,
    shiftId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ShiftDemandDTO[]> {
    const url = new URL(
      `${SHIFT_DEMANDS_BASE}/teams/${teamId}/shifts/${shiftId}`
    );
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
   * Get demands by source type and optional source ID
   */
  static async getDemandsBySource(
    teamId: string,
    source: ShiftDemandSource,
    sourceId?: string
  ): Promise<ShiftDemandDTO[]> {
    const url = new URL(
      `${SHIFT_DEMANDS_BASE}/teams/${teamId}/source/${source}`
    );

    if (sourceId) {
      url.searchParams.append("source_id", sourceId);
    }

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
   * Prefetch shift demands for adjacent periods to improve navigation UX
   */
  static async prefetchForNavigation(
    teamId: string,
    currentStart: Date,
    currentEnd: Date,
    prefetchPeriods: number = 2
  ): Promise<void> {
    const url = new URL(`${SHIFT_DEMANDS_BASE}/teams/${teamId}/prefetch`);
    url.searchParams.append("current_start", formatDateForAPI(currentStart));
    url.searchParams.append("current_end", formatDateForAPI(currentEnd));
    url.searchParams.append("prefetch_periods", prefetchPeriods.toString());

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      await handleAPIError(response);
    }
  }

  /**
   * Get all demand templates for a team
   */
  static async getDemandTemplates(teamId: string): Promise<DemandTemplate[]> {
    const response = await fetch(
      `${SHIFT_DEMANDS_BASE}/teams/${teamId}/templates`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }

    return response.json();
  }

  /**
   * Create a new demand template
   */
  static async createDemandTemplate(
    teamId: string,
    template: Omit<DemandTemplate, "id" | "createdAt" | "updatedAt">
  ): Promise<DemandTemplate> {
    const response = await fetch(
      `${SHIFT_DEMANDS_BASE}/teams/${teamId}/templates`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...template,
          teamId, // Ensure teamId is set
        }),
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }

    return response.json();
  }

  /**
   * Update an existing demand template
   */
  static async updateDemandTemplate(
    teamId: string,
    templateId: string,
    template: Partial<DemandTemplate>
  ): Promise<DemandTemplate> {
    const response = await fetch(
      `${SHIFT_DEMANDS_BASE}/teams/${teamId}/templates/${templateId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...template,
          id: templateId,
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
   * Delete a demand template
   */
  static async deleteDemandTemplate(
    teamId: string,
    templateId: string
  ): Promise<void> {
    const response = await fetch(
      `${SHIFT_DEMANDS_BASE}/teams/${teamId}/templates/${templateId}`,
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
   * Get all demand patterns for a team
   */
  static async getDemandPatterns(teamId: string): Promise<DemandPattern[]> {
    const response = await fetch(
      `${SHIFT_DEMANDS_BASE}/teams/${teamId}/patterns`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }

    return response.json();
  }

  /**
   * Create a new demand pattern
   */
  static async createDemandPattern(
    teamId: string,
    pattern: Omit<DemandPattern, "id" | "createdAt" | "updatedAt">
  ): Promise<DemandPattern> {
    const response = await fetch(
      `${SHIFT_DEMANDS_BASE}/teams/${teamId}/patterns`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...pattern,
          teamId, // Ensure teamId is set
        }),
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }

    return response.json();
  }

  /**
   * Update an existing demand pattern
   */
  static async updateDemandPattern(
    teamId: string,
    patternId: string,
    pattern: Partial<DemandPattern>
  ): Promise<DemandPattern> {
    const response = await fetch(
      `${SHIFT_DEMANDS_BASE}/teams/${teamId}/patterns/${patternId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...pattern,
          id: patternId,
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
   * Delete a demand pattern
   */
  static async deleteDemandPattern(
    teamId: string,
    patternId: string
  ): Promise<void> {
    const response = await fetch(
      `${SHIFT_DEMANDS_BASE}/teams/${teamId}/patterns/${patternId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!response.ok) {
      await handleAPIError(response);
    }
  }
}

/**
 * Utility functions for working with shift demand data
 */
export class ShiftDemandUtils {
  /**
   * Convert timestamp to Date object
   */
  static timestampToDate(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }

  /**
   * Convert Date object to timestamp
   */
  static dateToTimestamp(date: Date): number {
    return Math.floor(date.getTime() / 1000);
  }

  /**
   * Generate a unique key for a demand cell
   */
  static getCellKey(shiftId: string, date: string): string {
    return `${shiftId}-${date}`;
  }

  /**
   * Parse cell key back to shift ID and date
   */
  static parseCellKey(cellKey: string): { shiftId: string; date: string } {
    const [shiftId, date] = cellKey.split("-");
    return { shiftId, date };
  }

  /**
   * Validate shift demand count
   */
  static validateDemandCount(count: number): {
    isValid: boolean;
    message?: string;
  } {
    if (count < 0) {
      return { isValid: false, message: "Demand count cannot be negative" };
    }

    if (count > 50) {
      return {
        isValid: false,
        message: "Demand count seems unusually high (>50)",
      };
    }

    if (!Number.isInteger(count)) {
      return { isValid: false, message: "Demand count must be a whole number" };
    }

    return { isValid: true };
  }

  /**
   * Calculate total demands for a period
   */
  static calculatePeriodTotal(demands: ShiftDemandDTO[]): number {
    return demands.reduce((total, demand) => total + demand.count, 0);
  }

  /**
   * Calculate total demands for a specific shift
   */
  static calculateShiftTotal(
    demands: ShiftDemandDTO[],
    shiftId: string
  ): number {
    return demands
      .filter((demand) => demand.shiftId === shiftId)
      .reduce((total, demand) => total + demand.count, 0);
  }

  /**
   * Calculate total demands for a specific date
   */
  static calculateDateTotal(
    demands: ShiftDemandDTO[],
    targetDate: Date
  ): number {
    const targetTimestamp = this.dateToTimestamp(targetDate);
    return demands
      .filter((demand) => demand.date === targetTimestamp)
      .reduce((total, demand) => total + demand.count, 0);
  }
}
