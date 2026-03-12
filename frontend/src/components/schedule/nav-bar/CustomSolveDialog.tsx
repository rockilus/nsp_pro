/**
 * Summary-only confirmation dialog for custom partial solve scope.
 *
 * Shows a per-shift (or per-worker) breakdown: each entity lists either a
 * "Full campaign" badge (when all campaign dates are selected) or individual
 * date chips. The user confirms or cancels; no interactive selection happens here.
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
import { ScheduleT } from "../../../types/schedule";
// Constants
import { ShiftColorMappings } from "../../../constants/constants";

interface CustomSolveDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (scope: SolveScope) => void;
  workers: WorkerT[];
  shifts: ShiftT[];
  scheduleCampaign: ScheduleT;
  workerSolveCells: SelectedScheduleCell[];
  shiftSolveCells: SelectedScheduleCell[];
  groupBy: "worker" | "shift";
  lng: string;
}

export default function CustomSolveDialog({
  open,
  onClose,
  onConfirm,
  workers,
  shifts,
  scheduleCampaign,
  workerSolveCells,
  shiftSolveCells,
  groupBy,
  lng,
}: CustomSolveDialogProps) {
  const { t } = useTranslation(lng, "schedule-page");

  // Derive per-entity breakdown: each selected shift/worker with its dates or "full" flag
  const selectedEntities = useMemo(() => {
    const activeCells =
      groupBy === "worker" ? workerSolveCells : shiftSolveCells;
    // Build all campaign dates
    const campaignDates: string[] = [];
    let current = scheduleCampaign.startDate.startOf("day");
    const end = scheduleCampaign.endDate.startOf("day");
    while (current.isBefore(end) || current.isSame(end, "day")) {
      campaignDates.push(current.format("YYYY-MM-DD"));
      current = current.add(1, "day");
    }
    const campaignDateSet = new Set(campaignDates);

    // Group selected cells by rowId
    const rowMap = new Map<string, Set<string>>();
    for (const cell of activeCells) {
      if (!rowMap.has(cell.rowId)) rowMap.set(cell.rowId, new Set());
      rowMap.get(cell.rowId)!.add(cell.date);
    }

    // Build ordered list matching the workers/shifts order
    const entities: (WorkerT | ShiftT)[] =
      groupBy === "worker" ? workers : shifts;

    return entities
      .filter((e) => rowMap.has(e.id))
      .map((e) => {
        const selectedDates = [...(rowMap.get(e.id) ?? [])]
          .filter((d) => campaignDateSet.has(d))
          .sort();
        const isFull =
          campaignDates.length > 0 &&
          selectedDates.length >= campaignDates.length;
        return {
          rowId: e.id,
          name: e.name,
          isFull,
          dates: selectedDates,
          colorKey: groupBy === "shift" ? (e as ShiftT).color : undefined,
        };
      });
  }, [
    workerSolveCells,
    shiftSolveCells,
    scheduleCampaign,
    groupBy,
    workers,
    shifts,
  ]);

  // Build SolveScope: full rows → shift_ids/worker_ids; partial → shift_cells/worker_cells
  const handleConfirm = () => {
    const scope: SolveScope = { scope_type: "CUSTOM", solve_view: groupBy };
    const fullIds = selectedEntities
      .filter((e) => e.isFull)
      .map((e) => e.rowId);
    const partialEntities = selectedEntities.filter((e) => !e.isFull);

    if (groupBy === "worker") {
      if (fullIds.length > 0) scope.worker_ids = fullIds;
      const cells: WorkerDateCell[] = partialEntities.flatMap((e) =>
        e.dates.map((date) => ({ worker_id: e.rowId, date })),
      );
      if (cells.length > 0) scope.worker_cells = cells;
    } else {
      if (fullIds.length > 0) scope.shift_ids = fullIds;
      const cells: ShiftDateCell[] = partialEntities.flatMap((e) =>
        e.dates.map((date) => ({ shift_id: e.rowId, date })),
      );
      if (cells.length > 0) scope.shift_cells = cells;
    }

    onConfirm(scope);
  };

  const isEmpty = selectedEntities.length === 0;

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
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              maxHeight: 400,
              overflowY: "auto",
            }}
          >
            {selectedEntities.map(
              ({ rowId, name, isFull, dates, colorKey }) => {
                const colorMapping = colorKey
                  ? ShiftColorMappings[colorKey]
                  : undefined;
                return (
                  <Box
                    key={rowId}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Entity name chip (colored for shifts) */}
                    <Chip
                      label={name}
                      size="small"
                      sx={
                        colorMapping
                          ? {
                              backgroundColor: colorMapping.background,
                              color: colorMapping.text,
                              fontWeight: 600,
                              flexShrink: 0,
                            }
                          : { flexShrink: 0 }
                      }
                    />
                    {/* Full campaign badge or individual date chips */}
                    {isFull ? (
                      <Chip
                        label={t("solve_custom_full_campaign")}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    ) : (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {dates.map((date) => (
                          <Chip
                            key={date}
                            label={dayjs(date).format("ddd DD MMM")}
                            size="small"
                            variant="filled"
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              },
            )}
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
