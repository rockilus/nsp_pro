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
import SaveIcon from "@mui/icons-material/Save";
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
import { ShiftDemandDTO, PeriodType } from "../../types/shiftDemand";
import { usePeriodState } from "../../app/lib/hooks/usePeriodState";
// Components
import { ShiftDemandToolbar } from "./ShiftDemandToolbar";
import { BulkSelectToolbar } from "./BulkSelectToolbar";
import ShiftDemandTable from "./ShiftDemandTable";
// Styles
import "../../styles/tab-container-styles.css";

// Extend dayjs with the required plugins
dayjs.extend(isSameOrBefore);
dayjs.extend(isoWeek);

interface SelectedCell {
  shiftId: string;
  date: string;
}

interface BulkChangeState {
  isActive: boolean;
  selectedCells: SelectedCell[];
  bulkValue: string;
}

interface CellEdit {
  shiftId: string;
  date: string;
  value: number;
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

  // Centralized period state (with localStorage persistence)
  const { currentDate, periodType, setCurrentDate, setPeriodType, isHydrated } =
    usePeriodState();
  const [shifts, setShifts] = useState<ShiftT[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [pendingEdits, setPendingEdits] = useState<CellEdit[]>([]);

  // Calculate date range for current period based on period type
  // Bulk change state
  const [bulkChangeState, setBulkChangeState] = useState<BulkChangeState>({
    isActive: false,
    selectedCells: [],
    bulkValue: "",
  });

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
    const columnCells = shifts.map((shift) => ({
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
    const allCells = shifts.flatMap((shift) =>
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

  const applyBulkChange = () => {
    if (bulkChangeState.selectedCells.length === 0) return;
    const value = parseInt(bulkChangeState.bulkValue) || 0;
    console.log("Applying bulk change:", {
      selectedCells: bulkChangeState.selectedCells,
      value,
    });
    const newEdits: CellEdit[] = bulkChangeState.selectedCells.map((cell) => ({
      shiftId: cell.shiftId,
      date: cell.date,
      value: Math.max(0, value),
    }));
    setPendingEdits((prev) => {
      const updatedEdits = [...prev];
      newEdits.forEach((newEdit) => {
        const existingIndex = updatedEdits.findIndex(
          (edit) =>
            edit.shiftId === newEdit.shiftId && edit.date === newEdit.date
        );
        if (existingIndex >= 0) {
          updatedEdits[existingIndex] = newEdit;
        } else {
          updatedEdits.push(newEdit);
        }
      });
      return updatedEdits;
    });
    setBulkChangeState({
      isActive: false,
      selectedCells: [],
      bulkValue: "",
    });
  };

  const deleteBulkSelection = () => {
    if (bulkChangeState.selectedCells.length === 0) return;
    console.log("Deleting bulk selection:", bulkChangeState.selectedCells);
    const deleteEdits: CellEdit[] = bulkChangeState.selectedCells.map(
      (cell) => ({
        shiftId: cell.shiftId,
        date: cell.date,
        value: 0,
      })
    );
    setPendingEdits((prev) => {
      const updatedEdits = [...prev];
      deleteEdits.forEach((deleteEdit) => {
        const existingIndex = updatedEdits.findIndex(
          (edit) =>
            edit.shiftId === deleteEdit.shiftId && edit.date === deleteEdit.date
        );
        if (existingIndex >= 0) {
          updatedEdits[existingIndex] = deleteEdit;
        } else {
          updatedEdits.push(deleteEdit);
        }
      });
      return updatedEdits;
    });
    setBulkChangeState({
      isActive: false,
      selectedCells: [],
      bulkValue: "",
    });
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
    const columnCells = shifts.map((shift) => ({
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
    const totalCells = shifts.length * dates.length;
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
  const { bulkUpsert } = useShiftDemandMutations(selectedTeamId || "");

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
    setPendingEdits([]); // Clear pending edits when navigating
  };

  const handlePeriodTypeChange = (newType: PeriodType) => {
    setPeriodType(newType);
    setPendingEdits([]); // Clear pending edits when changing period type
  };

  // Get demand value for a specific shift and date
  const getDemandValue = (shiftId: string, date: Dayjs): number => {
    const dateStr = date.format("YYYY-MM-DD");
    // Check pending edits first
    const pendingEdit = pendingEdits.find(
      (edit) => edit.shiftId === shiftId && edit.date === dateStr
    );
    if (pendingEdit) {
      return pendingEdit.value;
    }
    // Check matrix data
    return matrix[shiftId]?.[dateStr] || 0;
  };

  // Handle cell value change
  const handleCellChange = (shiftId: string, date: Dayjs, value: string) => {
    const dateStr = date.format("YYYY-MM-DD");
    const numValue = Math.max(0, parseInt(value) || 0);
    setPendingEdits((prev) => {
      const existingIndex = prev.findIndex(
        (edit) => edit.shiftId === shiftId && edit.date === dateStr
      );
      if (existingIndex >= 0) {
        // Update existing edit
        const newEdits = [...prev];
        newEdits[existingIndex] = { shiftId, date: dateStr, value: numValue };
        return newEdits;
      } else {
        // Add new edit
        return [...prev, { shiftId, date: dateStr, value: numValue }];
      }
    });
  };

  // Save pending changes
  const savePendingChanges = async () => {
    if (!selectedTeamId || pendingEdits.length === 0) return;

    console.log("ShiftDemandTab: Saving pending changes", pendingEdits.length);

    const demands: Partial<ShiftDemandDTO>[] = pendingEdits.map((edit) => ({
      shiftId: edit.shiftId,
      teamId: selectedTeamId,
      date: Math.floor(new Date(edit.date).getTime() / 1000),
      count: edit.value,
      source: "manual" as const,
      notes: null,
    }));

    console.log("ShiftDemandTab: Demands to save", demands);

    // Use mutate instead of mutateAsync - the mutation handles success/error internally
    bulkUpsert.mutate(demands);

    // Clear pending edits immediately - if mutation fails, user can retry
    setPendingEdits([]);
  };

  // Cancel pending changes
  const cancelPendingChanges = () => {
    setPendingEdits([]);
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
        isLoading={isLoadingDemands || bulkUpsert.isLoading}
        bulkModeActive={bulkChangeState.isActive}
        onToggleBulkMode={toggleBulkMode}
        selectedCellsCount={bulkChangeState.selectedCells.length}
        onRefresh={refetchDemands}
        isRefreshing={isLoadingDemands}
      />

      {/* Bulk Select Toolbar - appears when bulk mode is active */}
      {bulkChangeState.isActive && (
        <BulkSelectToolbar
          lng={lng}
          selectedCellsCount={bulkChangeState.selectedCells.length}
          bulkValue={bulkChangeState.bulkValue}
          onBulkValueChange={(value) =>
            setBulkChangeState((prev) => ({ ...prev, bulkValue: value }))
          }
          onApplyBulkChange={applyBulkChange}
          onDeleteBulkSelection={deleteBulkSelection}
          onCancelBulkMode={toggleBulkMode}
        />
      )}

      <Paper elevation={1} sx={{ p: 3, mb: 2 }}>
        {/* Save/cancel actions for pending edits */}
        {pendingEdits.length > 0 && !bulkChangeState.isActive && (
          <Box display="flex" justifyContent="flex-end" gap={1} mb={2}>
            <Button
              variant="outlined"
              onClick={cancelPendingChanges}
              size="small"
            >
              {t("cancel")}
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={savePendingChanges}
              disabled={bulkUpsert.isLoading}
              size="small"
            >
              {t("save_changes")} ({pendingEdits.length})
            </Button>
          </Box>
        )}

        {/* Pending changes indicator */}
        {pendingEdits.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t("pending_changes_message", { count: pendingEdits.length })}
          </Alert>
        )}

        {/* Save operation error */}
        {bulkUpsert.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {t("save_error_message")}:{" "}
            {bulkUpsert.error.message || "Unknown error"}
          </Alert>
        )}

        {/* Loading indicator during save */}
        {bulkUpsert.isLoading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Saving changes...
          </Alert>
        )}

        {/* Shift Demand Grid */}
        <ShiftDemandTable
          lng={lng}
          shifts={shifts}
          dates={dates}
          bulkChangeState={bulkChangeState}
          pendingEdits={pendingEdits}
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
        />
      </Paper>
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
