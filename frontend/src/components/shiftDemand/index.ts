/**
 * Shift Demand Management - Component Exports
 * Main entry point for all shift demand management components
 */

// Main components
export { default as ShiftDemandTab } from "./ShiftDemandTab";

// Core grid components
export { PeriodNavigation } from "./PeriodNavigation";

// Re-export types for convenience
export type {
  ShiftDemandMatrix,
  CellChange,
  CellSelection,
  GridDisplayOptions,
  BulkOperation,
  DemandTemplate,
  DemandPattern,
  PeriodType,
  OptimisticUpdate,
  ConflictResolution,
  ShiftDemandContextState,
  ShiftDemandContextActions,
  PerformanceMetrics,
} from "@/types/shiftDemand";

// Re-export hooks for convenience
export {
  useShiftDemands,
  useShiftDemandMutations,
  useDemandTemplates,
  useDemandTemplateMutations,
  useDemandPatterns,
  useDemandPatternMutations,
} from "@/app/lib/hooks/useShiftDemands";

// Re-export utilities
export {
  DateUtils,
  ValidationUtils,
  CalculationUtils,
  TransformUtils,
} from "@/app/lib/utils/shiftDemandUtils";
