/**
 * Main shift demand grid component
 * Displays shift demands in a matrix format with inline editing capabilities
 * Now integrates with optimized performance features and state management
 */

"use client";

import React, { useMemo, useState, useCallback, useRef } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  Box,
  Paper,
  Typography,
  Skeleton,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  ShiftDemandMatrix,
  CellChange,
  GridDisplayOptions,
  CellSelection,
  BulkOperation,
  DemandTemplate,
  DemandPattern,
} from "@/types/shiftDemand";
import { ShiftT } from "@/types/shift";
import { DateUtils } from "@/app/lib/utils/shiftDemandUtils";
// import { DemandCell } from "./DemandCell";
// import { GridHeader } from "./GridHeader";
// import { GridSidebar } from "./GridSidebar";
// import { BulkOperationsToolbar } from "./bulkOperations/BulkOperationsToolbar";
import {
  BulkOperationsManager,
  BulkOperationsManagerRef,
} from "./bulkOperations/BulkOperationsManager";
import { TemplateManager } from "./templates/TemplateManager";
import { PatternApplication } from "./patterns/PatternApplication";
// import { OptimizedShiftDemandGrid } from "./OptimizedShiftDemandGrid"; // Temporarily disabled

const GridContainer = styled(Paper)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  overflow: "hidden",
}));

const GridContent = styled(Box)(({ theme }) => ({
  display: "flex",
  flex: 1,
  overflow: "hidden",
}));

const GridTable = styled(Box)(({ theme }) => ({
  display: "grid",
  flex: 1,
  overflow: "auto",
  backgroundColor: theme.palette.background.default,
  gap: 1,
  padding: theme.spacing(1),
}));

const GridRow = styled(Box)(({ theme }) => ({
  display: "contents",
}));

const ShiftLabel = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.background.paper,
  borderRight: `1px solid ${theme.palette.divider}`,
  fontWeight: 500,
  minWidth: 120,
  position: "sticky",
  left: 0,
  zIndex: 2,
}));

const DateHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  fontWeight: 500,
  fontSize: "0.875rem",
  position: "sticky",
  top: 0,
  zIndex: 2,
}));

interface ShiftDemandGridProps {
  teamId: string;
  startDate: Dayjs;
  endDate: Dayjs;
  matrix: ShiftDemandMatrix;
  shifts: ShiftT[];
  onCellChange: (shiftId: string, date: string, count: number) => void;
  onBulkChange?: (changes: CellChange[]) => void;
  readonly?: boolean;
  isLoading?: boolean;
  displayOptions?: GridDisplayOptions;
  // Advanced features
  templates?: DemandTemplate[];
  patterns?: DemandPattern[];
  onTemplateApply?: (template: DemandTemplate) => void;
  onTemplateSave?: (
    template: Omit<DemandTemplate, "id" | "createdAt" | "updatedAt">
  ) => void;
  onTemplateUpdate?: (template: DemandTemplate) => void;
  onTemplateDelete?: (templateId: string) => void;
  onPatternApply?: (pattern: DemandPattern, options: any) => void;
  onPatternCreate?: (
    pattern: Omit<DemandPattern, "name"> & { name: string }
  ) => void;
  onPatternUpdate?: (pattern: DemandPattern) => void;
  onPatternDelete?: (patternName: string) => void;
  onExport?: () => void;
  onImport?: () => void;
}

export const ShiftDemandGrid: React.FC<ShiftDemandGridProps> = ({
  teamId,
  startDate,
  endDate,
  matrix,
  shifts,
  onCellChange,
  onBulkChange,
  readonly = false,
  isLoading = false,
  displayOptions = {
    showWeekends: true,
    showEmptyCells: true,
    highlightChanges: true,
    compactView: false,
    showShiftTotals: true,
    showDateTotals: true,
  },
  templates = [],
  patterns = [],
  onTemplateApply,
  onTemplateSave,
  onTemplateUpdate,
  onTemplateDelete,
  onPatternApply,
  onPatternCreate,
  onPatternUpdate,
  onPatternDelete,
  onExport,
  onImport,
}) => {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showPatternApplication, setShowPatternApplication] = useState(false);
  const [copiedData, setCopiedData] = useState<CellSelection[] | null>(null);
  const [hiddenShifts, setHiddenShifts] = useState<Set<string>>(new Set());
  const bulkOperationsRef = useRef<BulkOperationsManagerRef>(null);

  // Performance optimization states
  const [useOptimizations, setUseOptimizations] = useState(true);
  const [enableVirtualization, setEnableVirtualization] = useState(false);
  const [enablePerformanceMonitoring, setEnablePerformanceMonitoring] =
    useState(process.env.NODE_ENV === "development");

  // Generate date range for the grid
  const dateRange = useMemo(() => {
    const dates = DateUtils.generateDateRange(
      startDate.toDate(),
      endDate.toDate()
    );
    if (!displayOptions.showWeekends) {
      return dates.filter((date) => !DateUtils.isWeekend(date));
    }
    return dates;
  }, [startDate, endDate, displayOptions.showWeekends]);

  // Filter shifts based on display options
  const visibleShifts = useMemo(() => {
    return shifts.filter((shift) => !shift.deleted);
  }, [shifts]);

  // Calculate grid dimensions
  const gridStyle = useMemo(() => {
    const dateColumns = dateRange.length;
    const totalColumns =
      1 + dateColumns + (displayOptions.showShiftTotals ? 1 : 0); // +1 for shift labels, +1 for totals

    return {
      gridTemplateColumns: `120px repeat(${dateColumns}, minmax(60px, 1fr))${
        displayOptions.showShiftTotals ? " 80px" : ""
      }`,
      gridTemplateRows: `auto repeat(${
        visibleShifts.length
      }, minmax(40px, auto))${displayOptions.showDateTotals ? " auto" : ""}`,
    };
  }, [dateRange.length, visibleShifts.length, displayOptions]);

  // Convert shifts to the format expected by OptimizedShiftDemandGrid
  const shiftsForOptimization = useMemo(
    () => visibleShifts.map((shift) => ({ id: shift.id, name: shift.name })),
    [visibleShifts]
  );

  // Calculate total cells for optimization threshold
  const totalCells = useMemo(
    () => visibleShifts.length * dateRange.length,
    [visibleShifts.length, dateRange.length]
  );

  // Auto-enable virtualization for large grids
  const shouldAutoVirtualize = totalCells > 500;

  // Handle bulk changes with proper error handling
  const handleBulkChangeWithOptimization = useCallback(
    async (changes: CellChange[]) => {
      try {
        if (onBulkChange) {
          await onBulkChange(changes);
        }
      } catch (error) {
        console.error("Bulk change failed:", error);
        throw error;
      }
    },
    [onBulkChange]
  );

  // Handle cell value changes
  const handleCellChange = useCallback(
    (shiftId: string, date: string, newValue: number) => {
      const oldValue = matrix[shiftId]?.[date] || 0;

      if (oldValue !== newValue) {
        onCellChange(shiftId, date, newValue);
      }
    },
    [matrix, onCellChange]
  );

  // Handle cell selection for bulk operations
  const handleCellSelect = useCallback(
    (shiftId: string, date: string, selected: boolean) => {
      const cellKey = `${shiftId}-${date}`;
      setSelectedCells((prev) => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(cellKey);
        } else {
          newSet.delete(cellKey);
        }
        return newSet;
      });
    },
    []
  );

  // Get selected cell data for bulk operations
  const selectedCellData = useMemo(() => {
    return Array.from(selectedCells).map((cellKey) => {
      const [shiftId, date] = cellKey.split("-");
      const value = matrix[shiftId]?.[date] || 0;
      return { shiftId, date, value };
    });
  }, [selectedCells, matrix]);

  // Bulk operations handlers
  const handleBulkOperation = useCallback(
    (operation: BulkOperation, value?: number) => {
      if (selectedCells.size === 0) return;

      const changes: CellChange[] = [];

      selectedCells.forEach((cellKey) => {
        const [shiftId, date] = cellKey.split("-");
        const oldValue = matrix[shiftId]?.[date] || 0;
        let newValue = oldValue;

        switch (operation) {
          case "set":
            newValue = value || 0;
            break;
          case "increment":
            newValue = oldValue + (value || 1);
            break;
          case "decrement":
            newValue = Math.max(0, oldValue - (value || 1));
            break;
          case "clear":
            newValue = 0;
            break;
        }

        if (newValue !== oldValue) {
          changes.push({ shiftId, date, oldValue, newValue });
          onCellChange(shiftId, date, newValue);
        }
      });

      // Record operation in bulk manager
      if (changes.length > 0 && bulkOperationsRef.current) {
        bulkOperationsRef.current.addOperation(operation, changes);
      }
    },
    [selectedCells, matrix, onCellChange]
  );

  const handleCopySelection = useCallback(() => {
    setCopiedData(selectedCellData);
  }, [selectedCellData]);

  const handlePasteSelection = useCallback(() => {
    if (!copiedData || selectedCells.size === 0) return;

    const changes: CellChange[] = [];
    const selectedArray = Array.from(selectedCells);

    selectedArray.forEach((cellKey, index) => {
      const [shiftId, date] = cellKey.split("-");
      const oldValue = matrix[shiftId]?.[date] || 0;
      const sourceData = copiedData[index % copiedData.length]; // Repeat pattern if needed
      const newValue = sourceData.value;

      if (newValue !== oldValue) {
        changes.push({ shiftId, date, oldValue, newValue });
        onCellChange(shiftId, date, newValue);
      }
    });

    if (changes.length > 0 && bulkOperationsRef.current) {
      bulkOperationsRef.current.addOperation("paste", changes);
    }
  }, [copiedData, selectedCells, matrix, onCellChange]);

  // Template operations
  const handleTemplateApply = useCallback(
    (template: DemandTemplate) => {
      // Convert template demands to matrix changes
      const changes: CellChange[] = [];

      template.demands.forEach((demand) => {
        const date = new Date(demand.date * 1000).toISOString().split("T")[0];
        const oldValue = matrix[demand.shiftId]?.[date] || 0;

        if (demand.count !== oldValue) {
          changes.push({
            shiftId: demand.shiftId,
            date,
            oldValue,
            newValue: demand.count,
          });
          onCellChange(demand.shiftId, date, demand.count);
        }
      });

      if (changes.length > 0 && bulkOperationsRef.current) {
        bulkOperationsRef.current.addOperation(
          "paste",
          changes,
          `Applied template: ${template.name}`
        );
      }

      setShowTemplateManager(false);
    },
    [matrix, onCellChange]
  );

  // Pattern operations
  const handlePatternApply = useCallback(
    (pattern: DemandPattern, options: any) => {
      if (selectedCells.size === 0) return;

      const changes: CellChange[] = [];

      selectedCells.forEach((cellKey) => {
        const [shiftId, date] = cellKey.split("-");
        const targetDate = new Date(date);
        const dayOfWeek = options.startFromMonday
          ? (targetDate.getDay() + 6) % 7
          : targetDate.getDay();

        if (!options.selectedDays.includes(dayOfWeek)) return;

        const oldValue = matrix[shiftId]?.[date] || 0;
        const patternValue = pattern.pattern[dayOfWeek] || 0;
        let newValue = oldValue;

        switch (options.applicationMode) {
          case "replace":
            newValue = Math.round(patternValue * options.scaleFactor);
            break;
          case "add":
            newValue =
              oldValue + Math.round(patternValue * options.scaleFactor);
            break;
          case "multiply":
            newValue = Math.round(
              oldValue * patternValue * options.scaleFactor
            );
            break;
        }

        newValue = Math.max(0, newValue);

        if (newValue !== oldValue) {
          changes.push({ shiftId, date, oldValue, newValue });
          onCellChange(shiftId, date, newValue);
        }
      });

      if (changes.length > 0 && bulkOperationsRef.current) {
        bulkOperationsRef.current.addOperation(
          "paste",
          changes,
          `Applied pattern: ${pattern.name}`
        );
      }

      setShowPatternApplication(false);
    },
    [selectedCells, matrix, onCellChange]
  );

  // Calculate totals
  const calculateShiftTotal = useCallback(
    (shiftId: string) => {
      return dateRange.reduce((total, date) => {
        const dateStr = DateUtils.formatDateForAPI(date);
        return total + (matrix[shiftId]?.[dateStr] || 0);
      }, 0);
    },
    [matrix, dateRange]
  );

  const calculateDateTotal = useCallback(
    (date: Date) => {
      const dateStr = DateUtils.formatDateForAPI(date);
      return visibleShifts.reduce((total, shift) => {
        return total + (matrix[shift.id]?.[dateStr] || 0);
      }, 0);
    },
    [matrix, visibleShifts]
  );

  // Undo/Redo handlers
  const handleUndo = useCallback(
    (record: any) => {
      record.changes.forEach((change: CellChange) => {
        onCellChange(change.shiftId, change.date, change.oldValue);
      });
    },
    [onCellChange]
  );

  const handleRedo = useCallback(
    (record: any) => {
      record.changes.forEach((change: CellChange) => {
        onCellChange(change.shiftId, change.date, change.newValue);
      });
    },
    [onCellChange]
  );

  // Render loading state
  if (isLoading) {
    return (
      <GridContainer>
        <Box p={2}>
          <Skeleton variant="rectangular" height={400} />
        </Box>
      </GridContainer>
    );
  }

  // Render optimized version if enabled and beneficial
  if (useOptimizations && (enableVirtualization || shouldAutoVirtualize)) {
    return (
      <Box>
        {/* Optimization Controls */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={useOptimizations}
                  onChange={(e) => setUseOptimizations(e.target.checked)}
                />
              }
              label="Use Performance Optimizations"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={enableVirtualization}
                  onChange={(e) => setEnableVirtualization(e.target.checked)}
                />
              }
              label="Enable Virtualization"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={enablePerformanceMonitoring}
                  onChange={(e) =>
                    setEnablePerformanceMonitoring(e.target.checked)
                  }
                />
              }
              label="Performance Monitor"
            />
            <Typography variant="body2" color="text.secondary">
              Grid size: {totalCells} cells ({visibleShifts.length} shifts ×{" "}
              {dateRange.length} dates)
              {shouldAutoVirtualize && " - Auto-virtualization recommended"}
            </Typography>
          </Box>
        </Paper>

        {/* Optimized Grid - Temporarily disabled */}
        {/* 
        <OptimizedShiftDemandGrid
          matrix={matrix}
          dates={dateRange.map((date) => date.toISOString().split("T")[0])}
          shifts={shiftsForOptimization}
          onCellChange={onCellChange}
          onBulkUpdate={handleBulkChangeWithOptimization}
          displayOptions={displayOptions}
          teamId={teamId}
          enableVirtualization={enableVirtualization || shouldAutoVirtualize}
          enablePerformanceMonitoring={enablePerformanceMonitoring}
          enableOfflineSupport={true}
          containerWidth={1200}
          containerHeight={600}
          cellWidth={80}
          cellHeight={40}
          virtualizationThreshold={500}
          debounceMs={300}
          throttleMs={100}
        />
        */}
        <Box>
          <Typography variant="h6" sx={{ p: 2 }}>
            Optimized Grid Temporarily Disabled - Using Standard Grid
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <GridContainer>
      <GridHeader
        startDate={startDate}
        endDate={endDate}
        totalDemands={Object.values(matrix).reduce(
          (total, shiftDates) =>
            total +
            Object.values(shiftDates).reduce((sum, count) => sum + count, 0),
          0
        )}
        selectedCells={selectedCells}
        onClearSelection={() => setSelectedCells(new Set())}
        onCopySelection={handleCopySelection}
        onPasteSelection={handlePasteSelection}
        onExport={onExport}
        onImport={onImport}
        displayOptions={displayOptions}
        onDisplayOptionsChange={(options: Partial<GridDisplayOptions>) => {
          // Handle display options change if needed
        }}
      />

      {/* Bulk Operations Toolbar */}
      <BulkOperationsToolbar
        selectedCells={selectedCells}
        selectedData={selectedCellData}
        onBulkOperation={handleBulkOperation}
        onClearSelection={() => setSelectedCells(new Set())}
        onCopySelection={handleCopySelection}
        onPasteSelection={handlePasteSelection}
        onApplyPattern={
          patterns.length > 0
            ? () => setShowPatternApplication(true)
            : undefined
        }
        onOpenSettings={() => setShowSidebar(true)}
        copiedData={copiedData}
        readonly={readonly}
        patterns={patterns}
      />

      {/* Bulk Operations Manager */}
      <BulkOperationsManager
        isProcessing={false}
        onUndo={(record) => handleUndo(record)}
        onRedo={(record) => handleRedo(record)}
        onClearHistory={() => {}}
      />

      <GridContent>
        <GridTable style={gridStyle}>
          {/* Empty corner cell */}
          <Box />

          {/* Date headers */}
          {dateRange.map((date) => (
            <DateHeader
              key={date.toISOString()}
              sx={{
                color: DateUtils.isWeekend(date)
                  ? "text.secondary"
                  : "text.primary",
                backgroundColor: DateUtils.isToday(date)
                  ? "primary.light"
                  : "background.paper",
              }}
            >
              {DateUtils.formatDateShort(date)}
            </DateHeader>
          ))}

          {/* Shift totals header */}
          {displayOptions.showShiftTotals && <DateHeader>Total</DateHeader>}

          {/* Grid rows for each shift */}
          {visibleShifts.map((shift) => (
            <GridRow key={shift.id}>
              {/* Shift label */}
              <ShiftLabel>
                <Typography variant="body2" noWrap>
                  {shift.name}
                </Typography>
              </ShiftLabel>

              {/* Demand cells */}
              {dateRange.map((date) => {
                const dateStr = DateUtils.formatDateForAPI(date);
                const cellKey = `${shift.id}-${dateStr}`;
                const value = matrix[shift.id]?.[dateStr] || 0;
                const isSelected = selectedCells.has(cellKey);

                return (
                  <DemandCell
                    key={cellKey}
                    shiftId={shift.id}
                    date={dateStr}
                    value={value}
                    onChange={handleCellChange}
                    onSelect={handleCellSelect}
                    readonly={readonly}
                    isSelected={isSelected}
                    isWeekend={DateUtils.isWeekend(date)}
                    isToday={DateUtils.isToday(date)}
                    showEmpty={displayOptions.showEmptyCells}
                    compact={displayOptions.compactView}
                  />
                );
              })}

              {/* Shift total */}
              {displayOptions.showShiftTotals && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "background.paper",
                    border: 1,
                    borderColor: "divider",
                    fontWeight: "bold",
                    fontSize: "0.875rem",
                  }}
                >
                  {calculateShiftTotal(shift.id)}
                </Box>
              )}
            </GridRow>
          ))}

          {/* Date totals row */}
          {displayOptions.showDateTotals && (
            <GridRow>
              <DateHeader>Total</DateHeader>
              {dateRange.map((date) => (
                <Box
                  key={date.toISOString()}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "background.paper",
                    border: 1,
                    borderColor: "divider",
                    fontWeight: "bold",
                    fontSize: "0.875rem",
                  }}
                >
                  {calculateDateTotal(date)}
                </Box>
              ))}
              {displayOptions.showShiftTotals && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "primary.light",
                    border: 1,
                    borderColor: "divider",
                    fontWeight: "bold",
                    fontSize: "0.875rem",
                  }}
                >
                  {Object.values(matrix).reduce(
                    (total, shiftDates) =>
                      total +
                      Object.values(shiftDates).reduce(
                        (sum, count) => sum + count,
                        0
                      ),
                    0
                  )}
                </Box>
              )}
            </GridRow>
          )}
        </GridTable>

        {/* Grid Sidebar */}
        <GridSidebar
          shifts={visibleShifts}
          summary={{}} // TODO: Calculate summary from matrix
          hiddenShifts={hiddenShifts}
          onToggleShiftVisibility={(shiftId: string) => {
            setHiddenShifts((prev) => {
              const newSet = new Set(prev);
              if (newSet.has(shiftId)) {
                newSet.delete(shiftId);
              } else {
                newSet.add(shiftId);
              }
              return newSet;
            });
          }}
          open={showSidebar}
        />
      </GridContent>

      {/* Template Manager Dialog */}
      <TemplateManager
        open={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        templates={templates}
        shifts={shifts}
        currentMatrix={matrix}
        teamId={teamId}
        onApplyTemplate={handleTemplateApply}
        onSaveTemplate={onTemplateSave || (() => {})}
        onUpdateTemplate={onTemplateUpdate || (() => {})}
        onDeleteTemplate={onTemplateDelete || (() => {})}
        onExportTemplate={onExport}
      />

      {/* Pattern Application Dialog */}
      <PatternApplication
        open={showPatternApplication}
        onClose={() => setShowPatternApplication(false)}
        patterns={patterns}
        selectedCells={selectedCellData}
        onApplyPattern={handlePatternApply}
        onCreatePattern={onPatternCreate}
        onUpdatePattern={onPatternUpdate}
        onDeletePattern={onPatternDelete}
      />
    </GridContainer>
  );
};
