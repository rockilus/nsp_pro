/**
 * Shift Demand Management - Component Exports
 * Main entry point for all shift demand management components
 */

// Main components
// export { ShiftDemandPage } from "./ShiftDemandPage"; // Temporarily disabled due to hook issues
export { default as ShiftDemandTab } from "./ShiftDemandTab";
export { ShiftDemandGrid } from "./ShiftDemandGrid";
// export { OptimizedShiftDemandGrid } from "./OptimizedShiftDemandGrid"; // Temporarily disabled due to build issues

// Core grid components
export { DemandCell } from "./DemandCell";
export { GridHeader } from "./GridHeader";
export { GridSidebar } from "./GridSidebar";
export { PeriodNavigation } from "./PeriodNavigation";

// Advanced features
export { TemplateManager } from "./templates/TemplateManager";
export { TemplatePreview } from "./templates/TemplatePreview";
export { CreateTemplateDialog } from "./templates/CreateTemplateDialog";

export { BulkOperationsToolbar } from "./bulkOperations/BulkOperationsToolbar";
export { BulkOperationsManager } from "./bulkOperations/BulkOperationsManager";

export { PatternLibrary } from "./patterns/PatternLibrary";
export { PatternApplication } from "./patterns/PatternApplication";

// State management
export {
  ShiftDemandProvider,
  useShiftDemandContext,
  useShiftDemandPerformance,
} from "./context/ShiftDemandContext";

// Error handling
export {
  ShiftDemandErrorBoundary,
  ErrorFallback,
} from "./errorHandling/ShiftDemandErrorBoundary";

// Connection and performance
export {
  ConnectionStatusMonitor,
  NetworkStatusIndicator,
  useConnectionStatus,
} from "./connectionStatus/ConnectionStatusMonitor";
export { PerformanceMonitor } from "./performance/PerformanceMonitor";

// Performance optimizations
export {
  VirtualizedDemandGrid,
  useMemoizedMatrix,
  usePerformanceMonitoring,
  useDebouncedCallback,
  useThrottledCallback,
  useMemoizedCellChangeHandler,
  useVisibilityTracking,
} from "./performance/PerformanceOptimizations";

// Conflict resolution
export {
  ConflictResolutionPanel,
  ConflictResolutionDialog,
} from "./conflictResolution/ConflictResolutionPanel";

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
