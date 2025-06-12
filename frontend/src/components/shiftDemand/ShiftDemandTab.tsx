import React, { useState, useMemo } from "react";
import { useTranslation } from "../../app/i18n/client";
import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isoWeek from "dayjs/plugin/isoWeek";
// MUI
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
// Icons
import RefreshIcon from "@mui/icons-material/Refresh";
// Skeletons
import TablesSkeleton from "../skeletons/tables-skeleton";
// Providers
import ReactQueryProvider from "../providers/ReactQueryProvider";
// API Hooks
import {
  useShiftDemands,
  useShiftDemandMutations,
} from "../../app/lib/hooks/useShiftDemands";
import { getWorkShifts } from "../../app/lib/shift";
// Types
import { ShiftT, ShiftType } from "../../types/shift";
import {
  ShiftDemandCreateDTO,
  ShiftDemandUpdateDTO,
  PeriodType,
  SHIFT_DEMAND_CONSTRAINTS,
} from "../../types/shiftDemand";
import { usePeriodState } from "../../app/lib/hooks/usePeriodState";
// Components
import { ShiftDemandToolbar } from "./ShiftDemandToolbar";
import { ShiftDemandFilterToolbar } from "./ShiftDemandFilterToolbar";
import ShiftDemandTable from "./ShiftDemandTable";
import ErrorFeedback from "./ErrorFeedback";
// Hooks
import { useTableState } from "../../hooks/useTableState";
// Utils
import { createShiftColumns } from "./shiftColumns";
// Styles
import "../../styles/tab-container-styles.css";

// Extend dayjs with the required plugins
dayjs.extend(isSameOrBefore);
dayjs.extend(isoWeek);

// Hook for dynamic height calculation
const useTableHeight = (isFilterToolbarActive: boolean) => {
  const [tableHeight, setTableHeight] = React.useState("70vh");

  React.useEffect(() => {
    const calculateHeight = () => {
      // Calculate available height based on viewport and other elements
      const viewportHeight = window.innerHeight;
      const headerHeight = 65; // Header height (64px + 1px border)
      const toolbarHeight = 46; // Toolbar height (40px + 6px of padding)
      const filterToolbarHeight = isFilterToolbarActive ? 42 : 0; // Filter toolbar height (35px + 6px padding + 1px border)
      const paddingAndMargins = 29; // Padding and margins (29px padding)

      const availableHeight =
        viewportHeight -
        headerHeight -
        toolbarHeight -
        filterToolbarHeight -
        paddingAndMargins;
      const maxHeight = Math.max(
        300,
        Math.min(availableHeight, viewportHeight)
      );

      setTableHeight(`${maxHeight}px`);
    };

    calculateHeight();
    window.addEventListener("resize", calculateHeight);

    return () => window.removeEventListener("resize", calculateHeight);
  }, [isFilterToolbarActive]);

  return tableHeight;
};

interface SelectedCell {
  shiftId: string;
  date: string;
}

interface BulkChangeState {
  isActive: boolean;
  selectedCells: SelectedCell[];
  bulkValue: string;
}

// Internal component that uses React Query hooks
function ShiftDemandTabInternal({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  const { t } = useTranslation(lng, "shift-demands");

  // Bulk change state
  const [bulkChangeState, setBulkChangeState] = useState<BulkChangeState>({
    isActive: false,
    selectedCells: [],
    bulkValue: "",
  });

  // Centralized period state (with localStorage persistence)
  const { currentDate, periodType, setCurrentDate, setPeriodType, isHydrated } =
    usePeriodState();
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Shift column definitions for filtering/sorting
  const shiftColumns = useMemo(
    () => createShiftColumns(t, shifts),
    [t, shifts]
  );

  // Table state for shift filtering and sorting
  const {
    tableState: shiftTableState,
    filteredAndSortedData: filteredShifts,
    addFilter: addShiftFilter,
    removeFilter: removeShiftFilter,
    updateSort: updateShiftSort,
    resetAll: resetShiftFilters,
  } = useTableState(shifts, shiftColumns, "nsp-pro-shift-demand-table-state");

  // Show filter toolbar when either bulk mode is active OR filters/sorting is applied
  const showFilterToolbar =
    bulkChangeState.isActive ||
    shiftTableState.filters.length > 0 ||
    shiftTableState.sort !== null;

  // Dynamic table height now accounts for filter toolbar
  const tableHeight = useTableHeight(showFilterToolbar);

  // Bulk selection helpers
  const toggleBulkMode = () => {
    setBulkChangeState((prev) => ({
      ...prev,
      isActive: !prev.isActive,
      selectedCells: [],
      bulkValue: "",
    }));
  };

  const isCellSelected = (shiftId: string, date: Dayjs): boolean => {
    const dateStr = date.format("YYYY-MM-DD");
    return bulkChangeState.selectedCells.some(
      (cell) => cell.shiftId === shiftId && cell.date === dateStr
    );
  };

  const toggleCellSelection = (shiftId: string, date: Dayjs) => {
    const dateStr = date.format("YYYY-MM-DD");
    setBulkChangeState((prev) => {
      const isSelected = prev.selectedCells.some(
        (cell) => cell.shiftId === shiftId && cell.date === dateStr
      );
      if (isSelected) {
        return {
          ...prev,
          selectedCells: prev.selectedCells.filter(
            (cell) => !(cell.shiftId === shiftId && cell.date === dateStr)
          ),
        };
      } else {
        return {
          ...prev,
          selectedCells: [...prev.selectedCells, { shiftId, date: dateStr }],
        };
      }
    });
  };

  const selectAllRowCells = (shiftId: string) => {
    const rowCells = dates.map((date) => ({
      shiftId,
      date: date.format("YYYY-MM-DD"),
    }));
    setBulkChangeState((prev) => {
      const allSelected = rowCells.every((cell) =>
        prev.selectedCells.some(
          (selected) =>
            selected.shiftId === cell.shiftId && selected.date === cell.date
        )
      );
      if (allSelected) {
        return {
          ...prev,
          selectedCells: prev.selectedCells.filter(
            (selected) =>
              !rowCells.some(
                (cell) =>
                  selected.shiftId === cell.shiftId &&
                  selected.date === cell.date
              )
          ),
        };
      } else {
        const newCells = rowCells.filter(
          (cell) =>
            !prev.selectedCells.some(
              (selected) =>
                selected.shiftId === cell.shiftId && selected.date === cell.date
            )
        );
        return {
          ...prev,
          selectedCells: [...prev.selectedCells, ...newCells],
        };
      }
    });
  };

  const selectAllColumnCells = (date: Dayjs) => {
    const dateStr = date.format("YYYY-MM-DD");
    const columnCells = filteredShifts.map((shift) => ({
      shiftId: shift.id,
      date: dateStr,
    }));
    setBulkChangeState((prev) => {
      const allSelected = columnCells.every((cell) =>
        prev.selectedCells.some(
          (selected) =>
            selected.shiftId === cell.shiftId && selected.date === cell.date
        )
      );
      if (allSelected) {
        return {
          ...prev,
          selectedCells: prev.selectedCells.filter(
            (selected) =>
              !columnCells.some(
                (cell) =>
                  selected.shiftId === cell.shiftId &&
                  selected.date === cell.date
              )
          ),
        };
      } else {
        const newCells = columnCells.filter(
          (cell) =>
            !prev.selectedCells.some(
              (selected) =>
                selected.shiftId === cell.shiftId && selected.date === cell.date
            )
        );
        return {
          ...prev,
          selectedCells: [...prev.selectedCells, ...newCells],
        };
      }
    });
  };

  const selectAllCells = () => {
    const allCells = filteredShifts.flatMap((shift) =>
      dates.map((date) => ({
        shiftId: shift.id,
        date: date.format("YYYY-MM-DD"),
      }))
    );
    setBulkChangeState((prev) => {
      const allSelected =
        allCells.length === prev.selectedCells.length && allCells.length > 0;
      return {
        ...prev,
        selectedCells: allSelected ? [] : allCells,
      };
    });
  };

  // Enhanced bulk operations with better error handling
  const applyBulkChange = async () => {
    if (bulkChangeState.selectedCells.length === 0) return;

    const value = parseInt(bulkChangeState.bulkValue) || 0;

    // Validate bulk value
    if (value > SHIFT_DEMAND_CONSTRAINTS.MAX_COUNT) {
      setError(`Count cannot exceed ${SHIFT_DEMAND_CONSTRAINTS.MAX_COUNT}`);
      return;
    }

    try {
      const demands: Omit<ShiftDemandCreateDTO, "teamId">[] =
        bulkChangeState.selectedCells.map((cell) => ({
          shiftId: cell.shiftId,
          date: Math.floor(new Date(cell.date).getTime() / 1000),
          count: Math.max(0, value),
          source: "manual" as const,
          sourceId: null,
          notes: null,
        }));

      await bulkUpsert.mutateAsync(demands);

      setBulkChangeState({
        isActive: false,
        selectedCells: [],
        bulkValue: "",
      });

      setError(null);
    } catch (error) {
      console.error("Failed to apply bulk changes:", error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to apply bulk changes. Please try again.");
      }
    }
  };

  const deleteBulkSelection = async () => {
    if (bulkChangeState.selectedCells.length === 0) return;

    try {
      const demands: Omit<ShiftDemandCreateDTO, "teamId">[] =
        bulkChangeState.selectedCells.map((cell) => ({
          shiftId: cell.shiftId,
          date: Math.floor(new Date(cell.date).getTime() / 1000),
          count: 0,
          source: "manual" as const,
          sourceId: null,
          notes: null,
        }));

      await bulkUpsert.mutateAsync(demands);

      setBulkChangeState({
        isActive: false,
        selectedCells: [],
        bulkValue: "",
      });

      setError(null);
    } catch (error) {
      console.error("Failed to delete bulk selection:", error);

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to delete bulk selection. Please try again.");
      }
    }
  };

  const isRowSelected = (shiftId: string): boolean => {
    const rowCells = dates.map((date) => ({
      shiftId,
      date: date.format("YYYY-MM-DD"),
    }));
    return rowCells.every((cell) =>
      bulkChangeState.selectedCells.some(
        (selected) =>
          selected.shiftId === cell.shiftId && selected.date === cell.date
      )
    );
  };

  const isColumnSelected = (date: Dayjs): boolean => {
    const dateStr = date.format("YYYY-MM-DD");
    const columnCells = filteredShifts.map((shift) => ({
      shiftId: shift.id,
      date: dateStr,
    }));
    return columnCells.every((cell) =>
      bulkChangeState.selectedCells.some(
        (selected) =>
          selected.shiftId === cell.shiftId && selected.date === cell.date
      )
    );
  };

  const isAllSelected = (): boolean => {
    const totalCells = filteredShifts.length * dates.length;
    return (
      bulkChangeState.selectedCells.length === totalCells && totalCells > 0
    );
  };
  const { startDate, endDate } = useMemo(() => {
    if (periodType === "month") {
      return {
        startDate: currentDate.startOf("month"),
        endDate: currentDate.endOf("month"),
      };
    } else if (periodType === "week") {
      // For week view, calculate week boundaries (Monday to Sunday, ISO week)
      return {
        startDate: currentDate.startOf("isoWeek"),
        endDate: currentDate.endOf("isoWeek"),
      };
    } else {
      // Custom period - use current date as center, show 2 weeks around it
      const start = currentDate.subtract(7, "day");
      const end = currentDate.add(7, "day");
      return {
        startDate: start,
        endDate: end,
      };
    }
  }, [currentDate, periodType]);

  // Generate array of dates for the period
  const dates = useMemo(() => {
    const dateArray: Dayjs[] = [];
    let current = startDate;
    const end = endDate;
    while (current.isSameOrBefore(end, "day")) {
      dateArray.push(current);
      current = current.add(1, "day");
    }
    return dateArray;
  }, [startDate, endDate]);

  // Fetch shift demands using the React Query hook
  const {
    demands,
    demandsById,
    matrix,
    isLoading: isLoadingDemands,
    error: demandsError,
    refetch: refetchDemands,
  } = useShiftDemands(
    selectedTeamId || "",
    startDate.toDate(),
    endDate.toDate(),
    {
      enabled: !!selectedTeamId,
    }
  );

  // Shift demand mutations
  const { create, update, bulkUpsert } = useShiftDemandMutations(
    selectedTeamId || ""
  );

  // Load shifts when team changes
  React.useEffect(() => {
    const loadShifts = async () => {
      if (!selectedTeamId) {
        setShifts([]);
        return;
      }

      setIsLoadingShifts(true);
      setShiftError(null);

      try {
        const fetchedShifts = await getWorkShifts(selectedTeamId);
        // Filter to only normal and duty shifts for demand planning
        const workShifts = fetchedShifts.filter(
          (shift) =>
            shift.shiftType === ShiftType.NORMAL ||
            shift.shiftType === ShiftType.DUTY
        );
        setShifts(workShifts);
      } catch (error) {
        console.error("Error fetching shifts:", error);
        setShiftError("Failed to load shifts. Please try again.");
      } finally {
        setIsLoadingShifts(false);
      }
    };

    loadShifts();
  }, [selectedTeamId]);

  // Navigation functions for PeriodNavigation component
  const handlePeriodChange = (start: Dayjs, end: Dayjs) => {
    // Calculate the center date of the new period
    const centerDate = dayjs(
      start.valueOf() + (end.valueOf() - start.valueOf()) / 2
    );
    setCurrentDate(centerDate);
  };

  const handlePeriodTypeChange = (newType: PeriodType) => {
    setPeriodType(newType);
  };

  // Get demand value for a specific shift and date
  const getDemandValue = (shiftId: string, date: Dayjs): number => {
    const dateStr = date.format("YYYY-MM-DD");
    // Only use matrix data since changes are saved immediately
    return matrix[shiftId]?.[dateStr] || 0;
  };

  // Enhanced handleCellChange with better validation and error handling
  const handleCellChange = async (
    shiftId: string,
    date: Dayjs,
    value: string
  ) => {
    const dateStr = date.format("YYYY-MM-DD");
    const numValue = Math.max(0, parseInt(value) || 0);
    const cellKey = `${shiftId}-${dateStr}`;

    // Don't save if already saving this cell
    if (savingCells.has(cellKey)) return;

    // Input validation
    if (!selectedTeamId) {
      console.error("No team selected");
      return;
    }

    if (numValue > SHIFT_DEMAND_CONSTRAINTS.MAX_COUNT) {
      // Show user-friendly error
      setError(`Count cannot exceed ${SHIFT_DEMAND_CONSTRAINTS.MAX_COUNT}`);
      return;
    }

    // Mark cell as saving
    setSavingCells((prev) => new Set(prev).add(cellKey));
    setError(null); // Clear any previous errors

    try {
      const existingDemand = demandsById.get(cellKey);
      const timestamp = Math.floor(new Date(dateStr).getTime() / 1000);

      if (existingDemand) {
        // Update existing demand
        const updateData: ShiftDemandUpdateDTO = {
          count: numValue,
          source: "manual" as const,
          notes: null,
        };

        await update.mutateAsync({
          demandId: existingDemand.id,
          demand: updateData,
        });
      } else {
        // Create new demand
        const createData: Omit<ShiftDemandCreateDTO, "teamId"> = {
          shiftId,
          date: timestamp,
          count: numValue,
          source: "manual" as const,
          sourceId: null,
          notes: null,
        };

        await create.mutateAsync({
          demand: createData,
        });
      }
    } catch (error) {
      console.error("Failed to save cell change:", error);

      // Show user-friendly error message
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to save changes. Please try again.");
      }
    } finally {
      // Remove from saving set
      setSavingCells((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    }
  };

  // Wait for hydration of period state before rendering (prevents SSR mismatch)
  if (!isHydrated || isLoadingShifts || isLoadingDemands) {
    return (
      <div className="tab-container-ultrawide">
        <TablesSkeleton numTables={1} numInternalRows={5} />
      </div>
    );
  }

  // No team selected
  if (!selectedTeamId) {
    return (
      <div className="tab-container-ultrawide">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <Typography variant="h6" color="textSecondary">
            {t("select_team_message")}
          </Typography>
        </Box>
      </div>
    );
  }

  // Error states
  if (shiftError || demandsError) {
    return (
      <div className="tab-container-ultrawide">
        <Alert severity="error" sx={{ mb: 2 }}>
          {shiftError || demandsError?.message || t("error_loading_data")}
        </Alert>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={() => {
            refetchDemands();
            window.location.reload(); // Reload to retry shift loading
          }}
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  // No shifts available
  if (shifts.length === 0) {
    return (
      <div className="tab-container-ultrawide">
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t("no_shifts_title")}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {t("no_shifts_message")}
          </Typography>
        </Paper>
      </div>
    );
  }

  return (
    <div className="tab-container-ultrawide">
      {/* Main Toolbar */}
      <ShiftDemandToolbar
        lng={lng}
        currentPeriod={{ start: startDate, end: endDate }}
        onPeriodChange={handlePeriodChange}
        periodType={periodType}
        onPeriodTypeChange={handlePeriodTypeChange}
        isLoading={
          isLoadingDemands ||
          create.isLoading ||
          update.isLoading ||
          bulkUpsert.isLoading
        }
        bulkModeActive={bulkChangeState.isActive}
        onToggleBulkMode={toggleBulkMode}
        selectedCellsCount={bulkChangeState.selectedCells.length}
        onRefresh={refetchDemands}
        isRefreshing={isLoadingDemands}
      />

      {/* Filter/Sort Toolbar - appears when filtering/sorting is active OR bulk mode is active */}
      {showFilterToolbar && (
        <ShiftDemandFilterToolbar
          lng={lng}
          // Filter/Sort props
          filters={shiftTableState.filters}
          sort={shiftTableState.sort}
          onRemoveFilter={removeShiftFilter}
          onRemoveSort={() => updateShiftSort(null)}
          onResetAll={resetShiftFilters}
          showFilters={
            shiftTableState.filters.length > 0 || shiftTableState.sort !== null
          }
          // Bulk select props
          selectedCellsCount={bulkChangeState.selectedCells.length}
          bulkValue={bulkChangeState.bulkValue}
          onBulkValueChange={(value) =>
            setBulkChangeState((prev) => ({ ...prev, bulkValue: value }))
          }
          onApplyBulkChange={applyBulkChange}
          onDeleteBulkSelection={deleteBulkSelection}
          onCancelBulkMode={toggleBulkMode}
          showBulkSelect={bulkChangeState.isActive}
        />
      )}

      <Paper elevation={1} sx={{ p: 3, mb: 2, padding: "5px 24px 24px 24px" }}>
        {/* Save operation error */}
        {(bulkUpsert.error || create.error || update.error) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t("save_error_message")}:{" "}
            {(bulkUpsert.error || create.error || update.error)?.message ||
              "Unknown error"}
          </Alert>
        )}

        {/* Loading indicator during save */}
        {/* {(bulkUpsert.isLoading || create.isLoading || update.isLoading) && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Saving changes...
          </Alert>
        )} */}

        {/* Shift Demand Grid */}
        <ShiftDemandTable
          lng={lng}
          shifts={filteredShifts}
          dates={dates}
          bulkChangeState={bulkChangeState}
          getDemandValue={getDemandValue}
          handleCellChange={handleCellChange}
          isCellSelected={isCellSelected}
          toggleCellSelection={toggleCellSelection}
          selectAllRowCells={selectAllRowCells}
          selectAllColumnCells={selectAllColumnCells}
          selectAllCells={selectAllCells}
          isRowSelected={isRowSelected}
          isColumnSelected={isColumnSelected}
          isAllSelected={isAllSelected}
          savingCells={savingCells}
          maxHeight={tableHeight}
          // Filter/Sort props
          currentSort={shiftTableState.sort || undefined}
          currentFilter={shiftTableState.filters[0]} // Pass first filter if any
          onSort={updateShiftSort}
          onFilter={addShiftFilter}
          shiftColumn={shiftColumns[0]} // Pass first column definition
        />
      </Paper>

      {/* Error Feedback */}
      <ErrorFeedback error={error} onClose={() => setError(null)} />
    </div>
  );
}

// Main export component with React Query provider
export default function ShiftDemandTab({
  lng,
  selectedTeamId,
}: {
  lng: string;
  selectedTeamId: string | null;
}) {
  return (
    <ReactQueryProvider>
      <ShiftDemandTabInternal lng={lng} selectedTeamId={selectedTeamId} />
    </ReactQueryProvider>
  );
}
