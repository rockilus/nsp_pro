/**
 * Summary-only confirmation dialog for custom partial solve scope.
 *
 * Displays a summary of selected cells (workers/shifts + dates) that were
 * chosen via the interactive custom solve mode in the table. The user confirms
 * or cancels; no interactive selection happens here.
 */
import React, { useMemo } from "react";
import dayjs from "dayjs";
import { useTranslation } from "../../../app/i18n/client";
// MUI
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
// lucide-react
import { Sparkle } from "lucide-react";
// Types
import { WorkerT } from "../../../types/worker";
import { ShiftT } from "../../../types/shift";
import {
  SolveScope,
  WorkerDateCell,
  ShiftDateCell,
} from "../../../types/solveTaskStatus";
import { SelectedScheduleCell } from "../../../types/scheduleSelection";

interface CustomSolveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (scope: SolveScope) => void;
  workers: WorkerT[];
  shifts: ShiftT[];
  customSolveSelectedCells: SelectedScheduleCell[];
  groupBy: "worker" | "shift";
  lng: string;
}

export default function CustomSolveDialog({
  open,
  onClose,
  onConfirm,
  workers,
  shifts,
  customSolveSelectedCells,
  groupBy,
  lng,
}: CustomSolveDialogProps) {
  const { t } = useTranslation(lng, "schedule-page");

  // Derive unique row names from selected cells
  const selectedRowNames = useMemo(() => {
    const rowIds = new Set(customSolveSelectedCells.map((c) => c.rowId));
    if (groupBy === "worker") {
      return workers.filter((w) => rowIds.has(w.id)).map((w) => w.name);
    }
    return shifts.filter((s) => rowIds.has(s.id)).map((s) => s.name);
  }, [customSolveSelectedCells, groupBy, workers, shifts]);

  // Derive unique dates from selected cells (sorted)
  const selectedDates = useMemo(() => {
    const dateSet = new Set(customSolveSelectedCells.map((c) => c.date));
    return [...dateSet].sort();
  }, [customSolveSelectedCells]);

  // Build SolveScope from the selected cells
  const handleConfirm = () => {
    const scope: SolveScope = { scope_type: "CUSTOM" };

    if (groupBy === "worker") {
      const cells: WorkerDateCell[] = customSolveSelectedCells.map((c) => ({
        worker_id: c.rowId,
        date: c.date,
      }));
      scope.worker_cells = cells.length > 0 ? cells : undefined;
    } else {
      const cells: ShiftDateCell[] = customSolveSelectedCells.map((c) => ({
        shift_id: c.rowId,
        date: c.date,
      }));
      scope.shift_cells = cells.length > 0 ? cells : undefined;
    }

    onConfirm(scope);
  };

  const isEmpty = customSolveSelectedCells.length === 0;
  const rowCount = new Set(customSolveSelectedCells.map((c) => c.rowId)).size;
  const dateCount = selectedDates.length;

  const rowCountKey =
    groupBy === "worker"
      ? "solve_custom_summary_workers_count"
      : "solve_custom_summary_shifts_count";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Sparkle size={16} />
        {t("solve_custom_dialog_title")}
      </DialogTitle>
      <DialogContent dividers>
        {isEmpty ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            {t("solve_custom_summary_empty")}
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Chip
                label={t(rowCountKey, { count: rowCount })}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={t("solve_custom_summary_dates_count", {
                  count: dateCount,
                })}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>

            {/* Row names */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {groupBy === "worker"
                  ? t("solve_custom_workers")
                  : t("solve_custom_shifts")}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.5,
                  maxHeight: 120,
                  overflowY: "auto",
                }}
              >
                {selectedRowNames.map((name) => (
                  <Chip key={name} label={name} size="small" variant="filled" />
                ))}
              </Box>
            </Box>

            {/* Dates */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t("solve_custom_dates")}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.5,
                  maxHeight: 160,
                  overflowY: "auto",
                }}
              >
                {selectedDates.map((date) => (
                  <Chip
                    key={date}
                    label={dayjs(date).format("ddd DD MMM")}
                    size="small"
                    variant="filled"
                  />
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t("cancel")}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={isEmpty}
          startIcon={<Sparkle size={14} />}
        >
          {t("solve_custom_confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
