import React, { useState, useMemo } from "react";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputAdornment from "@mui/material/InputAdornment";
import Chip from "@mui/material/Chip";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
interface SelectedCell {
  shiftId: string;
  date: string;
}

interface BulkChangeState {
  isActive: boolean;
  selectedCells: SelectedCell[];
  bulkValue: string;
}
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
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
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
import { PeriodNavigation } from "./PeriodNavigation";
// Styles
import "../../styles/tab-container-styles.css";

// Extend dayjs with the required plugins
dayjs.extend(isSameOrBefore);
dayjs.extend(isoWeek);

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
          (selected) => selected.shiftId === cell.shiftId && selected.date === cell.date
        )
      );
      if (allSelected) {
        return {
          ...prev,
          selectedCells: prev.selectedCells.filter(
            (selected) =>
              !rowCells.some(
                (cell) =>
                  selected.shiftId === cell.shiftId && selected.date === cell.date
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
          (selected) => selected.shiftId === cell.shiftId && selected.date === cell.date
        )
      );
      if (allSelected) {
        return {
          ...prev,
          selectedCells: prev.selectedCells.filter(
            (selected) =>
              !columnCells.some(
                (cell) =>
                  selected.shiftId === cell.shiftId && selected.date === cell.date
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
      const allSelected = allCells.length === prev.selectedCells.length && allCells.length > 0;
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
          (edit) => edit.shiftId === newEdit.shiftId && edit.date === newEdit.date
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
    const deleteEdits: CellEdit[] = bulkChangeState.selectedCells.map((cell) => ({
      shiftId: cell.shiftId,
      date: cell.date,
      value: 0,
    }));
    setPendingEdits((prev) => {
      const updatedEdits = [...prev];
      deleteEdits.forEach((deleteEdit) => {
        const existingIndex = updatedEdits.findIndex(
          (edit) => edit.shiftId === deleteEdit.shiftId && edit.date === deleteEdit.date
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
        (selected) => selected.shiftId === cell.shiftId && selected.date === cell.date
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
        (selected) => selected.shiftId === cell.shiftId && selected.date === cell.date
      )
    );
  };

  const isAllSelected = (): boolean => {
    const totalCells = shifts.length * dates.length;
    return bulkChangeState.selectedCells.length === totalCells && totalCells > 0;
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
    summary,
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

  // Debug logging
  React.useEffect(() => {
    if (selectedTeamId) {
      console.log("ShiftDemandTab: Team selected", selectedTeamId);
      console.log("ShiftDemandTab: Date range", { startDate, endDate });
      console.log("ShiftDemandTab: Loading states", {
        isLoadingDemands,
        isLoadingShifts,
      });
      if (demandsError) {
        console.error("ShiftDemandTab: Demands error", demandsError);
      }
      if (matrix) {
        console.log(
          "ShiftDemandTab: Matrix loaded",
          Object.keys(matrix).length,
          "shifts"
        );
      }
    }
  }, [
    selectedTeamId,
    startDate,
    endDate,
    isLoadingDemands,
    isLoadingShifts,
    demandsError,
    matrix,
  ]);

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
      <Paper elevation={1} sx={{ p: 3, mb: 2 }}>
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          {/* Actions */}
          <Box display="flex" gap={1} alignItems="center">
            {/* Bulk Mode Toggle */}
            <Button
              variant={bulkChangeState.isActive ? "contained" : "outlined"}
              startIcon={<SelectAllIcon />}
              onClick={toggleBulkMode}
              size="small"
            >
              {bulkChangeState.isActive ? t("exit_bulk_mode") : t("bulk_select")}
            </Button>
            {pendingEdits.length > 0 && !bulkChangeState.isActive && (
              <Box display="flex" gap={1}>
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
            <IconButton onClick={refetchDemands} disabled={isLoadingDemands}>
              <RefreshIcon />
            </IconButton>
          </Box>
        {/* Bulk Action Bar */}
        {bulkChangeState.isActive && (
          <Paper elevation={2} sx={{ p: 2, mb: 2, backgroundColor: "primary.50" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <Chip
                  label={t("bulk_mode_active")}
                  color="primary"
                  variant="outlined"
                />
                <Typography variant="body2">
                  {t("selected_cells", { count: bulkChangeState.selectedCells.length })}
                </Typography>
              </Box>
              {bulkChangeState.selectedCells.length > 0 && (
                <Box display="flex" alignItems="center" gap={2}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>{t("set_value")}</InputLabel>
                    <OutlinedInput
                      type="number"
                      value={bulkChangeState.bulkValue}
                      onChange={(e) =>
                        setBulkChangeState((prev) => ({
                          ...prev,
                          bulkValue: e.target.value,
                        }))
                      }
                      inputProps={{ min: 0 }}
                      label={t("set_value")}
                      endAdornment={
                        <InputAdornment position="end">
                          <Button
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={applyBulkChange}
                            disabled={!bulkChangeState.bulkValue}
                          >
                            {t("apply")}
                          </Button>
                        </InputAdornment>
                      }
                    />
                  </FormControl>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={deleteBulkSelection}
                    size="small"
                  >
                    {t("delete")}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={toggleBulkMode}
                    size="small"
                  >
                    {t("cancel")}
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>
        )}
        </Box>

        {/* Period Navigation */}
        <Box display="flex" justifyContent="center" alignItems="center" mb={3}>
          <PeriodNavigation
            currentPeriod={{ start: startDate, end: endDate }}
            onPeriodChange={handlePeriodChange}
            periodType={periodType}
            onPeriodTypeChange={handlePeriodTypeChange}
            isLoading={isLoadingDemands || bulkUpsert.isLoading}
          />
        </Box>

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
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", minWidth: 120 }}>
                  {bulkChangeState.isActive ? (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Checkbox
                        checked={isAllSelected()}
                        indeterminate={
                          bulkChangeState.selectedCells.length > 0 && !isAllSelected()
                        }
                        onChange={selectAllCells}
                        size="small"
                      />
                      <Typography variant="body2">{t("shift")}</Typography>
                    </Box>
                  ) : (
                    t("shift")
                  )}
                </TableCell>
                {dates.map((date) => (
                  <TableCell
                    key={date.toISOString()}
                    align="center"
                    sx={{
                      fontWeight: "bold",
                      minWidth: 60,
                      backgroundColor:
                        date.day() === 0 || date.day() === 6
                          ? "grey.50"
                          : "inherit",
                    }}
                  >
                    <Box>
                      {bulkChangeState.isActive && (
                        <Checkbox
                          checked={isColumnSelected(date)}
                          onChange={() => selectAllColumnCells(date)}
                          size="small"
                        />
                      )}
                      <Typography variant="caption" display="block">
                        {date.format("ddd")}
                      </Typography>
                      <Typography variant="body2">
                        {date.format("D")}
                      </Typography>
                    </Box>
                  </TableCell>
                ))}
                <TableCell
                  align="center"
                  sx={{ fontWeight: "bold", minWidth: 80 }}
                >
                  {t("total")}
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {shifts.map((shift) => {
                const shiftTotal = dates.reduce(
                  (sum, date) => sum + getDemandValue(shift.id, date),
                  0
                );
                return (
                  <TableRow key={shift.id} hover>
                    <TableCell sx={{ fontWeight: "medium" }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {bulkChangeState.isActive && (
                          <Checkbox
                            checked={isRowSelected(shift.id)}
                            onChange={() => selectAllRowCells(shift.id)}
                            size="small"
                          />
                        )}
                        <Tooltip title={shift.name}>
                          <Box>
                            <Typography variant="body2" noWrap>
                              {shift.acronym || shift.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {shift.startTime.format("HH:mm")} -{" "}
                              {shift.endTime.format("HH:mm")}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    {dates.map((date) => {
                      const value = getDemandValue(shift.id, date);
                      const isWeekend = date.day() === 0 || date.day() === 6;
                      const isSelected = isCellSelected(shift.id, date);
                      return (
                        <TableCell
                          key={date.toISOString()}
                          sx={{
                            p: 0.5,
                            backgroundColor: isWeekend ? "grey.50" : "inherit",
                          }}
                        >
                          {bulkChangeState.isActive ? (
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              sx={{
                                backgroundColor: isSelected ? "primary.50" : "transparent",
                                borderRadius: 1,
                                p: 0.5,
                              }}
                            >
                              <Checkbox
                                checked={isSelected}
                                onChange={() => toggleCellSelection(shift.id, date)}
                                size="small"
                              />
                              <Typography variant="caption" sx={{ ml: 0.5 }}>
                                {value}
                              </Typography>
                            </Box>
                          ) : (
                            <TextField
                              size="small"
                              type="number"
                              value={value}
                              onChange={(e) =>
                                handleCellChange(shift.id, date, e.target.value)
                              }
                              inputProps={{
                                min: 0,
                                style: {
                                  textAlign: "center",
                                  padding: "4px 8px",
                                  fontSize: "0.875rem",
                                },
                              }}
                              sx={{
                                "& .MuiOutlinedInput-root": {
                                  "& fieldset": {
                                    border: "1px solid",
                                    borderColor: pendingEdits.some(
                                      (edit) =>
                                        edit.shiftId === shift.id &&
                                        edit.date === date.format("YYYY-MM-DD")
                                    )
                                      ? "primary.main"
                                      : "grey.300",
                                  },
                                },
                              }}
                            />
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      {shiftTotal}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Daily totals row */}
              <TableRow sx={{ backgroundColor: "grey.100" }}>
                <TableCell sx={{ fontWeight: "bold" }}>
                  {t("daily_total")}
                </TableCell>
                {dates.map((date) => {
                  const dailyTotal = shifts.reduce(
                    (sum, shift) => sum + getDemandValue(shift.id, date),
                    0
                  );
                  return (
                    <TableCell
                      key={date.toISOString()}
                      align="center"
                      sx={{ fontWeight: "bold" }}
                    >
                      {dailyTotal}
                    </TableCell>
                  );
                })}
                <TableCell align="center" sx={{ fontWeight: "bold" }}>
                  {shifts.reduce(
                    (sum, shift) =>
                      sum +
                      dates.reduce(
                        (dateSum, date) =>
                          dateSum + getDemandValue(shift.id, date),
                        0
                      ),
                    0
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
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
