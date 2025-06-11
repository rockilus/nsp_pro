/**
 * TypeScript types and interfaces for NEW shift demand management feature
 * Provides type safety for the NSP Pro enhanced shift demand feature
 * Note: This is separate from the legacy shift-demand.ts types
 */

/**
 * Shift demand source types matching backend enum
 */
export type ShiftDemandSource =
  | "manual"
  | "template"
  | "duplicated"
  | "recurrence";

/**
 * Shift demand DTO matching backend structure
 */
export interface ShiftDemandDTO {
  id: string | null;
  date: number; // Unix timestamp
  shiftId: string;
  teamId: string;
  count: number;
  notes: string | null;
  source: ShiftDemandSource;
  sourceId: string | null;
  createdAt: number;
  updatedAt: number;
}

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
 * API response for bulk upsert operations
 */
export interface BulkUpsertResponse {
  created: ShiftDemandDTO[];
  updated: ShiftDemandDTO[];
}

/**
 * Error response from API
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
  refetch: () => void;
}

/**
 * Hook return type for mutations
 */
export interface UseShiftDemandMutationsResult {
  create: {
    mutate: (
      demand: Omit<ShiftDemandDTO, "id" | "createdAt" | "updatedAt">
    ) => void;
    mutateAsync: (
      demand: Omit<ShiftDemandDTO, "id" | "createdAt" | "updatedAt">
    ) => Promise<ShiftDemandDTO>;
    isLoading: boolean;
    error: Error | null;
  };
  update: {
    mutate: (params: {
      demandId: string;
      demand: Partial<ShiftDemandDTO>;
    }) => void;
    mutateAsync: (params: {
      demandId: string;
      demand: Partial<ShiftDemandDTO>;
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
    mutate: (demands: Partial<ShiftDemandDTO>[]) => void;
    mutateAsync: (
      demands: Partial<ShiftDemandDTO>[]
    ) => Promise<BulkUpsertResponse>;
    isLoading: boolean;
    error: Error | null;
  };
}
