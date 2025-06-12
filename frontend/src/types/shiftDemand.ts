/**
 * TypeScript types and interfaces for NEW shift demand management feature
 * Provides type safety for the NSP Pro enhanced shift demand feature
 * Note: This is separate from the legacy shift-demand.ts types
 *
 * Types aligned with backend DTOs for proper API integration
 */

/**
 * Shift demand source types matching backend enum exactly
 */
export type ShiftDemandSource = "manual" | "template" | "solver" | "import";

/**
 * Base interface for shift demand data (matches backend ShiftDemandNewBaseDTO)
 */
export interface ShiftDemandBase {
  date: number; // Unix timestamp
  shiftId: string; // MongoDB ObjectId pattern
  teamId: string; // MongoDB ObjectId pattern
  count: number; // Non-negative integer, max 1000
  notes: string | null; // Max 1000 characters, sanitized
  source: ShiftDemandSource;
  sourceId: string | null;
}

/**
 * Interface for creating new shift demands (matches ShiftDemandNewCreateDTO)
 * Excludes server-managed fields (id, createdAt, updatedAt)
 */
export interface ShiftDemandCreateDTO extends ShiftDemandBase {}

/**
 * Interface for updating existing shift demands (matches ShiftDemandNewUpdateDTO)
 * All fields optional to support partial updates
 */
export interface ShiftDemandUpdateDTO extends Partial<ShiftDemandBase> {}

/**
 * Complete shift demand DTO (matches ShiftDemandNewDTO)
 * Includes all fields including server-generated ones
 */
export interface ShiftDemandDTO extends ShiftDemandBase {
  id: string; // MongoDB ObjectId
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

/**
 * Validation constraints (aligned with backend validation)
 */
export const SHIFT_DEMAND_CONSTRAINTS = {
  MAX_COUNT: 1000,
  MAX_NOTES_LENGTH: 1000,
  OBJECTID_PATTERN: /^[a-fA-F0-9]{24}$/,
  MIN_DATE: new Date("2000-01-01").getTime() / 1000,
  MAX_DATE: new Date("2100-01-01").getTime() / 1000,
} as const;

/**
 * Matrix structure for grid display
 * Format: { shiftId: { dateString: count } }
 */
export interface ShiftDemandMatrix {
  [shiftId: string]: {
    [dateStr: string]: number;
  };
}

/**
 * Period navigation types
 */
export type PeriodType = "week" | "month" | "custom";

/**
 * API response for bulk upsert operations (matches ShiftDemandsResultDTO)
 */
export interface BulkUpsertResponse {
  created: ShiftDemandDTO[];
  updated: ShiftDemandDTO[];
}

/**
 * Enhanced error response structure from backend
 */
export interface ShiftDemandErrorResponse {
  error: string;
  operation: string;
  message: string;
  context?: Record<string, any>;
}

/**
 * Legacy API error interface for backward compatibility
 */
export interface APIError {
  detail: string;
  status_code: number;
}

/**
 * Hook return type for shift demand operations
 */
export interface UseShiftDemandsResult {
  demands: ShiftDemandDTO[];
  demandsById: Map<string, ShiftDemandDTO>;
  matrix: ShiftDemandMatrix;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook return type for mutations with enhanced typing
 */
export interface UseShiftDemandMutationsResult {
  create: {
    mutate: (params: { demand: Omit<ShiftDemandCreateDTO, "teamId"> }) => void;
    mutateAsync: (params: {
      demand: Omit<ShiftDemandCreateDTO, "teamId">;
    }) => Promise<ShiftDemandDTO>;
    isLoading: boolean;
    error: Error | null;
  };
  update: {
    mutate: (params: {
      demandId: string;
      demand: ShiftDemandUpdateDTO;
    }) => void;
    mutateAsync: (params: {
      demandId: string;
      demand: ShiftDemandUpdateDTO;
    }) => Promise<ShiftDemandDTO>;
    isLoading: boolean;
    error: Error | null;
  };
  delete: {
    mutate: (demandId: string) => void;
    mutateAsync: (demandId: string) => Promise<void>;
    isLoading: boolean;
    error: Error | null;
  };
  bulkUpsert: {
    mutate: (demands: Omit<ShiftDemandCreateDTO, "teamId">[]) => void;
    mutateAsync: (
      demands: Omit<ShiftDemandCreateDTO, "teamId">[]
    ) => Promise<BulkUpsertResponse>;
    isLoading: boolean;
    error: Error | null;
  };
}
