/**
 * Optimized shift demand grid wrapper
 * Integrates all performance optimizations, error handling, and state management
 */

"use client";

import React, {
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
} from "react";
import { Box, Alert, Button } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import {
  ShiftDemandMatrix,
  GridDisplayOptions,
  CellChange,
  ConflictResolution,
} from "@/types/shiftDemand";
import {
  ShiftDemandProvider,
  useShiftDemandContext,
} from "../context/ShiftDemandContext";
import {
  ShiftDemandErrorBoundary,
  ErrorFallback,
} from "../errorHandling/ShiftDemandErrorBoundary";
import {
  ConnectionStatusMonitor,
  NetworkStatusIndicator,
  useConnectionStatus,
} from "../connectionStatus/ConnectionStatusMonitor";
import { ConflictResolutionPanel } from "../conflictResolution/ConflictResolutionPanel";
import { PerformanceMonitor } from "../performance/PerformanceMonitor";
import {
  VirtualizedDemandGrid,
  useMemoizedMatrix,
  usePerformanceMonitoring,
  useDebouncedCallback,
  useThrottledCallback,
  useMemoizedCellChangeHandler,
} from "../performance/PerformanceOptimizations";

interface OptimizedShiftDemandGridProps {
  matrix: ShiftDemandMatrix;
  dates: string[];
  shifts: Array<{ id: string; name: string }>;
  onCellChange: (
    shiftId: string,
    date: string,
    value: number | undefined
  ) => void;
  onBulkUpdate?: (changes: CellChange[]) => Promise<void>;
  displayOptions?: Partial<GridDisplayOptions>;
  teamId: string;
  enableVirtualization?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableOfflineSupport?: boolean;
  className?: string;
  // Grid configuration
  containerWidth?: number;
  containerHeight?: number;
  cellWidth?: number;
  cellHeight?: number;
  // Performance thresholds
  virtualizationThreshold?: number;
  debounceMs?: number;
  throttleMs?: number;
}

// Inner grid component that uses the context
const OptimizedGridInner: React.FC<
  Omit<OptimizedShiftDemandGridProps, "teamId">
> = ({
  matrix,
  dates,
  shifts,
  onCellChange,
  onBulkUpdate,
  displayOptions = {},
  enableVirtualization = true,
  enablePerformanceMonitoring = process.env.NODE_ENV === "development",
  enableOfflineSupport = true,
  className,
  containerWidth = 800,
  containerHeight = 600,
  cellWidth = 80,
  cellHeight = 40,
  virtualizationThreshold = 1000,
  debounceMs = 300,
  throttleMs = 100,
}) => {
  const {
    matrix: contextMatrix,
    optimisticUpdates,
    conflicts,
    displayOptions: contextDisplayOptions,
    setMatrix,
    applyOptimisticUpdate,
    confirmUpdate,
    revertUpdate,
    setConflict,
    resolveConflict,
    updateDisplayOptions,
  } = useShiftDemandContext();

  const [updateCount, setUpdateCount] = useState(0);
  const connectionStatus = useConnectionStatus();
  const { startRender, endRender, getMetrics } = usePerformanceMonitoring();

  // Merge display options
  const finalDisplayOptions = useMemo(
    () => ({
      showWeekends: true,
      showEmptyCells: true,
      highlightChanges: true,
      compactView: false,
      showShiftTotals: true,
      showDateTotals: true,
      ...displayOptions,
      ...contextDisplayOptions,
    }),
    [displayOptions, contextDisplayOptions]
  );

  // Initialize context matrix
  useEffect(() => {
    if (Object.keys(contextMatrix).length === 0) {
      setMatrix(matrix);
    }
  }, [matrix, contextMatrix, setMatrix]);

  // Sync display options
  useEffect(() => {
    updateDisplayOptions(displayOptions);
  }, [displayOptions, updateDisplayOptions]);

  // Memoized matrix calculations
  const matrixData = useMemoizedMatrix(contextMatrix, dates, shifts);

  // Determine if virtualization should be used
  const shouldUseVirtualization = useMemo(() => {
    return (
      enableVirtualization && matrixData.totalCells > virtualizationThreshold
    );
  }, [enableVirtualization, matrixData.totalCells, virtualizationThreshold]);

  // Performance monitoring
  useEffect(() => {
    startRender();
    const cleanup = () => {
      endRender(matrixData.totalCells, matrixData.filledCells);
    };

    // Use setTimeout to measure after render
    setTimeout(cleanup, 0);
  }, [contextMatrix, dates, shifts, startRender, endRender, matrixData]);

  // Optimistic cell change handler
  const handleCellChange = useMemoizedCellChangeHandler(
    useCallback(
      async (shiftId: string, date: string, value: number | undefined) => {
        // Create optimistic update
        const changes: CellChange[] = [
          {
            shiftId,
            date,
            newValue: value ?? 0,
            oldValue: contextMatrix[shiftId]?.[date] ?? 0,
          },
        ];

        const updateId = applyOptimisticUpdate(changes);
        setUpdateCount((prev) => prev + 1);

        try {
          // Attempt to save changes
          await onCellChange(shiftId, date, value);
          confirmUpdate(updateId);
        } catch (error) {
          console.error("Failed to save cell change:", error);

          // Check if it's a conflict error
          if (error instanceof Error && error.message.includes("conflict")) {
            const conflict: ConflictResolution = {
              id: `conflict-${Date.now()}`,
              type: "data_conflict",
              detectedAt: Date.now(),
              affectedCells: changes.map((change) => ({
                ...change,
                serverValue: contextMatrix[change.shiftId]?.[change.date], // This would come from the error
              })),
              localChanges: changes,
              serverChanges: [], // This would come from the error
            };
            setConflict(conflict);
          } else {
            // Revert optimistic update on other errors
            revertUpdate(updateId);
          }
        }
      },
      [
        contextMatrix,
        onCellChange,
        applyOptimisticUpdate,
        confirmUpdate,
        revertUpdate,
        setConflict,
      ]
    )
  );

  // Debounced bulk update handler
  const handleBulkUpdate = useDebouncedCallback(
    useCallback(
      async (changes: CellChange[]) => {
        if (!onBulkUpdate) return;

        const updateId = applyOptimisticUpdate(changes);
        setUpdateCount((prev) => prev + 1);

        try {
          await onBulkUpdate(changes);
          confirmUpdate(updateId);
        } catch (error) {
          console.error("Failed to save bulk changes:", error);
          revertUpdate(updateId);
        }
      },
      [onBulkUpdate, applyOptimisticUpdate, confirmUpdate, revertUpdate]
    ),
    debounceMs
  );

  // Conflict resolution handlers
  const handleResolveConflict = useCallback(
    (conflictId: string, resolution: "local" | "server" | "merge") => {
      const conflict = conflicts.get(conflictId);
      if (!conflict) return;

      if (resolution === "local") {
        // Keep local changes, reapply them
        const updateId = applyOptimisticUpdate(conflict.localChanges);
        // In a real implementation, this would force save to server
        setTimeout(() => confirmUpdate(updateId), 100);
      } else if (resolution === "server") {
        // Use server data, revert local changes
        conflict.localChanges.forEach((change) => {
          const originalValue = change.originalValue;
          handleCellChange(change.shiftId, change.date, originalValue);
        });
      }
      // TODO: Implement merge resolution

      resolveConflict(conflictId);
    },
    [
      conflicts,
      applyOptimisticUpdate,
      confirmUpdate,
      resolveConflict,
      handleCellChange,
    ]
  );

  const handleResolveAllConflicts = useCallback(
    (resolution: "local" | "server") => {
      conflicts.forEach((_, conflictId) => {
        handleResolveConflict(conflictId, resolution);
      });
    },
    [conflicts, handleResolveConflict]
  );

  // Connection retry handler
  const handleRetryConnection = useCallback(async () => {
    // Simulate connection retry
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
  }, []);

  // Offline data sync handler
  const handleOfflineDataSync = useCallback(async () => {
    const pendingUpdates = Array.from(optimisticUpdates.values());
    if (pendingUpdates.length === 0) return;

    try {
      // Sync pending updates
      for (const update of pendingUpdates) {
        if (onBulkUpdate) {
          await onBulkUpdate(update.changes);
        }
        confirmUpdate(update.id);
      }
    } catch (error) {
      console.error("Failed to sync offline data:", error);
      throw error;
    }
  }, [optimisticUpdates, onBulkUpdate, confirmUpdate]);

  // Performance metrics
  const performanceMetrics = getMetrics();

  return (
    <Box className={className}>
      {/* Connection Status */}
      {enableOfflineSupport && (
        <>
          <Box sx={{ position: "fixed", top: 16, right: 16, zIndex: 1300 }}>
            <NetworkStatusIndicator
              isOnline={connectionStatus.isOnline}
              isConnecting={connectionStatus.isConnecting}
              hasOfflineData={connectionStatus.hasOfflineData}
              onRetry={handleRetryConnection}
            />
          </Box>

          <ConnectionStatusMonitor
            onRetryConnection={handleRetryConnection}
            onOfflineDataSync={handleOfflineDataSync}
          />
        </>
      )}

      {/* Conflict Resolution */}
      {conflicts.size > 0 && (
        <ConflictResolutionPanel
          conflicts={conflicts}
          onResolveConflict={handleResolveConflict}
          onResolveAll={handleResolveAllConflicts}
          shifts={shifts}
        />
      )}

      {/* Main Grid */}
      <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
        {shouldUseVirtualization ? (
          <VirtualizedDemandGrid
            matrix={contextMatrix}
            dates={dates}
            shifts={shifts}
            onCellChange={handleCellChange}
            displayOptions={finalDisplayOptions}
            config={{
              containerWidth,
              containerHeight,
              rowHeight: cellHeight,
              columnWidth: cellWidth,
            }}
          />
        ) : (
          // Regular grid implementation would go here
          <Box sx={{ p: 2 }}>
            <Alert severity="info">
              Regular grid view - Virtual grid threshold not reached (
              {matrixData.totalCells} &lt; {virtualizationThreshold} cells)
            </Alert>
          </Box>
        )}
      </Box>

      {/* Performance Monitor */}
      {enablePerformanceMonitoring && (
        <PerformanceMonitor
          matrixSize={matrixData.totalCells}
          cellCount={matrixData.filledCells}
          updateCount={updateCount}
          onPerformanceIssue={(issue) => {
            console.warn("Performance issue:", issue);
          }}
        />
      )}
    </Box>
  );
};

// Main wrapper component with error boundary and context provider
export const OptimizedShiftDemandGrid: React.FC<
  OptimizedShiftDemandGridProps
> = ({ teamId, ...props }) => {
  const handleError = useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      console.error("ShiftDemandGrid error:", error, errorInfo);
      // In production, send to error reporting service
    },
    []
  );

  return (
    <ShiftDemandErrorBoundary
      onError={handleError}
      level="component"
      showRetry={true}
    >
      <ShiftDemandProvider teamId={teamId} initialMatrix={props.matrix}>
        <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
          <OptimizedGridInner {...props} />
        </ErrorBoundary>
      </ShiftDemandProvider>
    </ShiftDemandErrorBoundary>
  );
};

export default OptimizedShiftDemandGrid;
