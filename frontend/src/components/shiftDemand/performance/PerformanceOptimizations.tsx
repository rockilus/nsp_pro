/**
 * Performance optimization utilities for shift demand grid
 * Includes virtualization, memoization, and render optimization helpers
 */

"use client";

import React, { memo, useMemo, useCallback, useRef, useEffect } from "react";
import { FixedSizeGrid as Grid, VariableSizeGrid } from "react-window";
import { areEqual } from "react-window";
import { ShiftDemandMatrix, GridDisplayOptions } from "@/types/shiftDemand";

// Virtual grid cell renderer props
interface VirtualCellProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    matrix: ShiftDemandMatrix;
    dates: string[];
    shifts: Array<{ id: string; name: string }>;
    onCellChange: (
      shiftId: string,
      date: string,
      value: number | undefined
    ) => void;
    displayOptions: GridDisplayOptions;
  };
}

// Virtual grid configuration
interface VirtualGridConfig {
  containerWidth: number;
  containerHeight: number;
  rowHeight: number;
  columnWidth: number;
  overscanRowCount?: number;
  overscanColumnCount?: number;
}

// Performance metrics interface
interface PerformanceMetrics {
  renderTime: number;
  cellCount: number;
  visibleCells: number;
  memoryUsage: number;
  lastUpdate: Date;
}

// Memoized cell component for virtual grid
export const VirtualDemandCell = memo<VirtualCellProps>(
  ({ columnIndex, rowIndex, style, data }) => {
    const { matrix, dates, shifts, onCellChange, displayOptions } = data;

    const shift = shifts[rowIndex - 1];
    const date = dates[columnIndex - 1];
    const value = matrix[shift?.id]?.[date];
    const isEmpty = value === undefined || value === null;

    const handleChange = useCallback(
      (newValue: number | undefined) => {
        if (shift?.id && date) {
          onCellChange(shift.id, date, newValue);
        }
      },
      [shift?.id, date, onCellChange]
    );

    // Skip header row/column rendering in this component
    if (rowIndex === 0 || columnIndex === 0) {
      return <div style={style} />;
    }

    if (!shift || !date) {
      return <div style={style} />;
    }

    // Skip empty cells if configured
    if (isEmpty && !displayOptions.showEmptyCells) {
      return <div style={style} />;
    }

    return (
      <div
        style={{
          ...style,
          border: "1px solid #e0e0e0",
          backgroundColor: isEmpty ? "#f5f5f5" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "14px",
          cursor: "pointer",
        }}
        onClick={() => {
          // Simple click-to-edit functionality
          const newValue = prompt(
            "Enter demand value:",
            value?.toString() || ""
          );
          if (newValue !== null) {
            const numValue = newValue === "" ? undefined : Number(newValue);
            if (newValue === "" || !isNaN(numValue!)) {
              handleChange(numValue);
            }
          }
        }}
      >
        {value !== undefined && value !== null ? value.toString() : "—"}
      </div>
    );
  },
  areEqual
);

VirtualDemandCell.displayName = "VirtualDemandCell";

// Virtualized grid component
interface VirtualizedGridProps {
  matrix: ShiftDemandMatrix;
  dates: string[];
  shifts: Array<{ id: string; name: string }>;
  onCellChange: (
    shiftId: string,
    date: string,
    value: number | undefined
  ) => void;
  displayOptions: GridDisplayOptions;
  config: VirtualGridConfig;
  className?: string;
}

export const VirtualizedDemandGrid: React.FC<VirtualizedGridProps> = ({
  matrix,
  dates,
  shifts,
  onCellChange,
  displayOptions,
  config,
  className,
}) => {
  const gridRef = useRef<Grid>(null);

  // Memoize grid data to prevent unnecessary re-renders
  const gridData = useMemo(
    () => ({
      matrix,
      dates,
      shifts,
      onCellChange,
      displayOptions,
    }),
    [matrix, dates, shifts, onCellChange, displayOptions]
  );

  // Calculate grid dimensions
  const rowCount = shifts.length + 1; // +1 for header
  const columnCount = dates.length + 1; // +1 for shift names

  useEffect(() => {
    // Invalidate grid cache when data changes
    if (gridRef.current) {
      // Note: resetAfterIndices may not be available on all Grid versions
      // gridRef.current.resetAfterIndices({ columnIndex: 0, rowIndex: 0 });
    }
  }, [matrix, dates, shifts]);

  return (
    <div className={className}>
      <Grid
        ref={gridRef}
        columnCount={columnCount}
        rowCount={rowCount}
        columnWidth={config.columnWidth}
        rowHeight={config.rowHeight}
        width={config.containerWidth}
        height={config.containerHeight}
        itemData={gridData}
        overscanRowCount={config.overscanRowCount || 5}
        overscanColumnCount={config.overscanColumnCount || 5}
      >
        {VirtualDemandCell}
      </Grid>
    </div>
  );
};

// Memoization utilities
export const useMemoizedMatrix = (
  matrix: ShiftDemandMatrix,
  dates: string[],
  shifts: Array<{ id: string; name: string }>
) => {
  return useMemo(() => {
    // Pre-compute commonly accessed data structures
    const shiftIds = shifts.map((s) => s.id);
    const shiftMap = new Map(shifts.map((s) => [s.id, s]));

    // Calculate row and column totals
    const rowTotals = new Map<string, number>();
    const columnTotals = new Map<string, number>();

    shiftIds.forEach((shiftId) => {
      let rowTotal = 0;
      dates.forEach((date) => {
        const value = matrix[shiftId]?.[date];
        if (typeof value === "number") {
          rowTotal += value;
          columnTotals.set(date, (columnTotals.get(date) || 0) + value);
        }
      });
      rowTotals.set(shiftId, rowTotal);
    });

    return {
      shiftIds,
      shiftMap,
      rowTotals,
      columnTotals,
      totalCells: shiftIds.length * dates.length,
      filledCells: shiftIds.reduce((total, shiftId) => {
        return (
          total +
          dates.filter(
            (date) =>
              matrix[shiftId]?.[date] !== undefined &&
              matrix[shiftId]?.[date] !== null
          ).length
        );
      }, 0),
    };
  }, [matrix, dates, shifts]);
};

// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    cellCount: 0,
    visibleCells: 0,
    memoryUsage: 0,
    lastUpdate: new Date(),
  });

  const startRender = useCallback(() => {
    lastRenderTimeRef.current = Date.now();
    renderCountRef.current += 1;
  }, []);

  const endRender = useCallback((cellCount: number, visibleCells: number) => {
    const renderTime = Date.now() - lastRenderTimeRef.current;

    // Estimate memory usage (rough approximation)
    const memoryUsage = (performance as any).memory
      ? (performance as any).memory.usedJSHeapSize / 1024 / 1024
      : 0;

    metricsRef.current = {
      renderTime,
      cellCount,
      visibleCells,
      memoryUsage,
      lastUpdate: new Date(),
    };
  }, []);

  const getMetrics = useCallback((): PerformanceMetrics => {
    return { ...metricsRef.current };
  }, []);

  const getRenderCount = useCallback(() => renderCountRef.current, []);

  return {
    startRender,
    endRender,
    getMetrics,
    getRenderCount,
  };
};

// Debounced callback hook for performance
export const useDebouncedCallback = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

// Throttled callback hook
export const useThrottledCallback = <T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now;
        callbackRef.current(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callbackRef.current(...args);
        }, delay - timeSinceLastCall);
      }
    },
    [delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
};

// Memoized cell change handler
export const useMemoizedCellChangeHandler = (
  onCellChange: (
    shiftId: string,
    date: string,
    value: number | undefined
  ) => void
) => {
  return useCallback(
    (shiftId: string, date: string, value: number | undefined) => {
      onCellChange(shiftId, date, value);
    },
    [onCellChange]
  );
};

// Intersection observer hook for visibility tracking
export const useVisibilityTracking = (threshold: number = 0.1) => {
  const elementRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold]);

  return { elementRef, isVisible };
};

const PerformanceOptimizations = {
  VirtualizedDemandGrid,
  useMemoizedMatrix,
  usePerformanceMonitoring,
  useDebouncedCallback,
  useThrottledCallback,
  useMemoizedCellChangeHandler,
  useVisibilityTracking,
};

export default PerformanceOptimizations;
