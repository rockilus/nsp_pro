/**
 * Dialog for configuring a custom partial solve scope.
 *
 * Workers/shifts are toggled via checkboxes pre-populated from the current
 * row selection. Dates can be toggled individually from the campaign period.
 */
import React, { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
// MUI Icons
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
// Types
import { WorkerT } from "../../../types/worker";
import { ShiftT } from "../../../types/shift";
import {
  SolveScope,
  WorkerDateCell,
  ShiftDateCell,
} from "../../../types/solveTaskStatus";
import { ScheduleSelectionState } from "../../../types/scheduleSelection";

interface CustomSolveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (scope: SolveScope) => void;
  workers: WorkerT[];
  shifts: ShiftT[];
  campaignStartDate: dayjs.Dayjs;
  campaignEndDate: dayjs.Dayjs;
  initialSelection?: ScheduleSelectionState;
  groupBy: "worker" | "shift";
  lng: string;
}

/** Generate all ISO date strings in [start, end] inclusive. */
function buildCampaignDates(start: dayjs.Dayjs, end: dayjs.Dayjs): string[] {
  const dates: string[] = [];
  let current = start.startOf("day");
  const last = end.startOf("day");
  while (!current.isAfter(last)) {
    dates.push(current.format("YYYY-MM-DD"));
    current = current.add(1, "day");
  }
  return dates;
}

export default function CustomSolveDialog({
  open,
  onClose,
  onConfirm,
  workers,
  shifts,
  campaignStartDate,
  campaignEndDate,
  initialSelection,
  groupBy,
  lng,
}: CustomSolveDialogProps) {
  const { t } = useTranslation(lng, "schedule-page");

  const allDates = useMemo(
    () => buildCampaignDates(campaignStartDate, campaignEndDate),
    [campaignStartDate, campaignEndDate],
  );

  // ── Initial selection derivation ─────────────────────────────────────────

  const initialSelectedRowIds = useMemo(() => {
    if (!initialSelection?.isActive || !initialSelection.selectedCells.length) {
      // Nothing pre-selected → select all rows by default
      return groupBy === "worker"
        ? new Set(workers.map((w) => w.id))
        : new Set(shifts.map((s) => s.id));
    }
    return new Set(initialSelection.selectedCells.map((c) => c.rowId));
  }, [initialSelection, groupBy, workers, shifts]);

  /**
   * Map: rowId -> Set<date> for the initial selection.
   * An empty map means "all dates selected for this row".
   */
  const initialRowDates = useMemo<Map<string, Set<string>>>(() => {
    if (!initialSelection?.isActive || !initialSelection.selectedCells.length) {
      return new Map();
    }
    const map = new Map<string, Set<string>>();
    for (const cell of initialSelection.selectedCells) {
      if (!map.has(cell.rowId)) map.set(cell.rowId, new Set());
      if (cell.date) map.get(cell.rowId)!.add(cell.date);
    }
    return map;
  }, [initialSelection]);

  // ── Component state ──────────────────────────────────────────────────────

  /** Selected row IDs (worker or shift depending on groupBy). */
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(
    initialSelectedRowIds,
  );

  /**
   * Per-row date selection: rowId -> Set<date>.
   * If a row has no entry, ALL campaign dates are implicitly selected for it.
   */
  const [rowDateSelections, setRowDateSelections] =
    useState<Map<string, Set<string>>>(initialRowDates);

  /** Campaign-level date selection (applies to rows that have no per-row override). */
  const [selectedDates, setSelectedDates] = useState<Set<string>>(
    new Set(allDates),
  );

  // Reset state when the dialog opens with new initial data
  useEffect(() => {
    if (open) {
      setSelectedRowIds(initialSelectedRowIds);
      setRowDateSelections(initialRowDates);
      setSelectedDates(new Set(allDates));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Row toggle helpers ────────────────────────────────────────────────────

  const toggleRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllRows = () => {
    const allIds =
      groupBy === "worker" ? workers.map((w) => w.id) : shifts.map((s) => s.id);
    if (selectedRowIds.size === allIds.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(allIds));
    }
  };

  // ── Date toggle helpers ───────────────────────────────────────────────────

  const toggleDate = (date: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const toggleAllDates = () => {
    if (selectedDates.size === allDates.length) {
      setSelectedDates(new Set());
    } else {
      setSelectedDates(new Set(allDates));
    }
  };

  // ── Scope composition ────────────────────────────────────────────────────

  const handleConfirm = () => {
    const allRowIds =
      groupBy === "worker" ? workers.map((w) => w.id) : shifts.map((s) => s.id);

    const selectedRowArr = [...selectedRowIds];
    const datesAllSelected = selectedDates.size === allDates.length;
    const rowsAllSelected = selectedRowIds.size === allRowIds.length;

    // Determine if we need cell-level granularity.
    // If per-row date overrides exist, we may need worker_cells / shift_cells.
    // Otherwise we use simpler worker_ids/shift_ids + dates arrays.
    const hasPerRowDateOverrides =
      rowDateSelections.size > 0 &&
      [...rowDateSelections.values()].some((s) => s.size > 0);

    const scope: SolveScope = { scope_type: "CUSTOM" };

    if (hasPerRowDateOverrides) {
      // Build cell lists using per-row date selections, falling back to the
      // global date selection for rows without an override.
      if (groupBy === "worker") {
        const cells: WorkerDateCell[] = [];
        for (const workerId of selectedRowArr) {
          const dates =
            rowDateSelections.has(workerId) &&
            rowDateSelections.get(workerId)!.size > 0
              ? [...rowDateSelections.get(workerId)!]
              : [...selectedDates];
          for (const date of dates) {
            cells.push({ worker_id: workerId, date });
          }
        }
        scope.worker_cells = cells.length > 0 ? cells : undefined;
      } else {
        const cells: ShiftDateCell[] = [];
        for (const shiftId of selectedRowArr) {
          const dates =
            rowDateSelections.has(shiftId) &&
            rowDateSelections.get(shiftId)!.size > 0
              ? [...rowDateSelections.get(shiftId)!]
              : [...selectedDates];
          for (const date of dates) {
            cells.push({ shift_id: shiftId, date });
          }
        }
        scope.shift_cells = cells.length > 0 ? cells : undefined;
      }
    } else {
      // Simple mode: worker_ids / shift_ids + dates (undefined = all)
      if (!rowsAllSelected) {
        if (groupBy === "worker") {
          scope.worker_ids = selectedRowArr;
        } else {
          scope.shift_ids = selectedRowArr;
        }
      }
      if (!datesAllSelected) {
        scope.dates = [...selectedDates];
      }
    }

    onConfirm(scope);
  };

  // ── Rendering ─────────────────────────────────────────────────────────────

  const rows =
    groupBy === "worker"
      ? workers.filter((w) => !w.deleted)
      : shifts.filter((s) => !s.deleted);

  const allRowIds = rows.map((r) => r.id);
  const allRowsChecked =
    selectedRowIds.size === allRowIds.length && allRowIds.length > 0;
  const someRowsChecked =
    selectedRowIds.size > 0 && selectedRowIds.size < allRowIds.length;
  const allDatesChecked = selectedDates.size === allDates.length;
  const someDatesChecked =
    selectedDates.size > 0 && selectedDates.size < allDates.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AutoAwesomeIcon fontSize="small" />
        {t("solve_custom_dialog_title")}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          {/* Left column: workers or shifts */}
          <Grid size={{ xs: 12, sm: 5 }}>
            <Typography variant="subtitle2" gutterBottom>
              {groupBy === "worker"
                ? t("solve_custom_workers")
                : t("solve_custom_shifts")}
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={allRowsChecked}
                  indeterminate={someRowsChecked}
                  onChange={toggleAllRows}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" fontWeight={600}>
                  {t("all")}
                </Typography>
              }
            />
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ maxHeight: 320, overflowY: "auto" }}>
              <FormGroup>
                {rows.map((row) => (
                  <FormControlLabel
                    key={row.id}
                    control={
                      <Checkbox
                        checked={selectedRowIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">{row.name}</Typography>}
                  />
                ))}
              </FormGroup>
            </Box>
          </Grid>

          {/* Right column: dates */}
          <Grid size={{ xs: 12, sm: 7 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t("solve_custom_dates")}
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={allDatesChecked}
                  indeterminate={someDatesChecked}
                  onChange={toggleAllDates}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" fontWeight={600}>
                  {t("all")}
                </Typography>
              }
            />
            <Divider sx={{ mb: 1 }} />
            <Box sx={{ maxHeight: 320, overflowY: "auto" }}>
              <FormGroup>
                {allDates.map((date) => (
                  <FormControlLabel
                    key={date}
                    control={
                      <Checkbox
                        checked={selectedDates.has(date)}
                        onChange={() => toggleDate(date)}
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {dayjs(date).format("ddd DD MMM")}
                      </Typography>
                    }
                  />
                ))}
              </FormGroup>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t("cancel")}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={selectedRowIds.size === 0 || selectedDates.size === 0}
          startIcon={<AutoAwesomeIcon fontSize="small" />}
        >
          {t("solve_custom_confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
