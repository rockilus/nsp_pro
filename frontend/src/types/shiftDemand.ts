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
 * Template for saving and applying shift demand patterns
 */
export interface DemandTemplate {
  id: string;
  name: string;
  description?: string;
  category: "normal" | "holiday" | "emergency" | "weekend";
  demands: ShiftDemandDTO[];
  isPublic: boolean;
  createdBy: string;
  teamId: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Period configuration for shift demand management
 */
export interface ShiftDemandPeriod {
  startDate: Date;
  endDate: Date;
  demands: ShiftDemandDTO[];
  matrix: ShiftDemandMatrix;
  summary: ShiftDemandSummary;
}

/**
 * Summary statistics for shift demands
 */
export interface ShiftDemandSummary {
  [shiftId: string]: {
    total: number;
    days_with_demand: number;
    max_per_day: number;
    avg_per_day: number;
  };
}

/**
 * Cell change for bulk operations
 */
export interface CellChange {
  shiftId: string;
  date: string;
  oldValue: number;
  newValue: number;
}

/**
 * Cell selection for bulk operations
 */
export interface CellSelection {
  shiftId: string;
  date: string;
  value: number;
}

/**
 * Period navigation types
 */
export type PeriodType = "week" | "month" | "custom";

/**
 * Bulk operation types
 */
export type BulkOperation =
  | "set"
  | "increment"
  | "decrement"
  | "clear"
  | "copy"
  | "paste";

/**
 * Validation result for shift demand values
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  severity: "error" | "warning" | "info";
}

/**
 * Pattern for applying structured demand increases
 */
export interface DemandPattern {
  name: string;
  description: string;
  pattern: number[]; // 7-day pattern (Monday to Sunday)
  category: "weekday" | "weekend" | "holiday" | "custom";
}

/**
 * Copy operation configuration
 */
export interface CopyPeriodConfig {
  sourceStart: Date;
  sourceEnd: Date;
  targetStart: Date;
  targetEnd: Date;
  sourceType: ShiftDemandSource;
  overwriteExisting: boolean;
}

/**
 * Grid display options
 */
export interface GridDisplayOptions {
  showWeekends: boolean;
  showEmptyCells: boolean;
  highlightChanges: boolean;
  compactView: boolean;
  showShiftTotals: boolean;
  showDateTotals: boolean;
}

/**
 * API response for bulk upsert operations
 */
export interface BulkUpsertResponse {
  created: ShiftDemandDTO[];
  updated: ShiftDemandDTO[];
}

/**
 * API response for delete operations
 */
export interface DeleteResponse {
  deleted_count: number;
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
  matrix: ShiftDemandMatrix;
  summary: ShiftDemandSummary;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook return type for mutations
 */
export interface UseShiftDemandMutationsResult {
  bulkUpsert: {
    mutate: (demands: Partial<ShiftDemandDTO>[]) => void;
    isLoading: boolean;
    error: Error | null;
  };
  copyPeriod: {
    mutate: (config: CopyPeriodConfig) => void;
    isLoading: boolean;
    error: Error | null;
  };
  deletePeriod: {
    mutate: (config: {
      startDate: Date;
      endDate: Date;
      shiftIds?: string[];
    }) => void;
    isLoading: boolean;
    error: Error | null;
  };
}

/**
 * Optimistic update state
 */
export interface OptimisticState {
  demands: ShiftDemandDTO[];
  pendingChanges: Map<string, number>;
  conflictResolution: "merge" | "overwrite" | "prompt";
}

/**
 * Optimistic update tracking
 */
export interface OptimisticUpdate {
  id: string;
  timestamp: number;
  changes: CellChange[];
  metadata?: any;
  status: "pending" | "confirmed" | "failed";
}

/**
 * Conflict resolution for competing updates
 */
export interface ConflictResolution {
  id: string;
  conflictType: "concurrent_edit" | "stale_data" | "validation_error";
  description: string;
  localChanges: CellChange[];
  serverChanges: CellChange[];
  suggestedResolution: "keep_local" | "keep_server" | "merge" | "manual";
  timestamp: number;
}

/**
 * Context state for shift demand management
 */
export interface ShiftDemandContextState {
  matrix: ShiftDemandMatrix;
  optimisticUpdates: Map<string, OptimisticUpdate>;
  conflicts: Map<string, ConflictResolution>;
  loadingStates: Map<string, boolean>;
  errors: Map<string, string>;
  displayOptions: GridDisplayOptions;
  isOptimisticUpdating: boolean;
  conflictCount: number;
}

/**
 * Context actions for shift demand management
 */
export interface ShiftDemandContextActions {
  setMatrix: (matrix: ShiftDemandMatrix) => void;
  applyOptimisticUpdate: (changes: CellChange[], metadata?: any) => string;
  confirmUpdate: (updateId: string) => void;
  revertUpdate: (updateId: string) => void;
  batchOptimisticUpdates: (
    updates: { changes: CellChange[]; metadata?: any }[]
  ) => string[];
  clearAllOptimistic: () => void;
  setConflict: (conflict: ConflictResolution) => void;
  resolveConflict: (conflictId: string) => void;
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  updateDisplayOptions: (options: Partial<GridDisplayOptions>) => void;
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
  optimisticUpdatesCount: number;
  conflictsCount: number;
  errorsCount: number;
  loadingOperationsCount: number;
  isHealthy: boolean;
  needsAttention: boolean;
}
