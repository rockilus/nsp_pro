import React from "react";
import { Box, Paper, Button, IconButton } from "@mui/material";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import RefreshIcon from "@mui/icons-material/Refresh";
import { PeriodNavigation } from "./PeriodNavigation";
import { useTranslation } from "../../app/i18n/client";
import { Dayjs } from "dayjs";
import { PeriodType } from "../../types/shiftDemand";

interface ShiftDemandToolbarProps {
  lng: string;
  // Period Navigation props
  currentPeriod: { start: Dayjs; end: Dayjs };
  onPeriodChange: (start: Dayjs, end: Dayjs) => void;
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
  isLoading: boolean;

  // Bulk operations props
  bulkModeActive: boolean;
  onToggleBulkMode: () => void;
  selectedCellsCount: number;

  // Other actions
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function ShiftDemandToolbar({
  lng,
  currentPeriod,
  onPeriodChange,
  periodType,
  onPeriodTypeChange,
  isLoading,
  bulkModeActive,
  onToggleBulkMode,
  selectedCellsCount,
  onRefresh,
  isRefreshing,
}: ShiftDemandToolbarProps) {
  const { t } = useTranslation(lng, "shift-demands");

  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        mb: 1,
        width: "100%",
        position: "sticky",
        top: 0,
        zIndex: 10,
        backgroundColor: "background.paper",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
      >
        {/* Left side - Period Navigation (centered) */}
        <Box flex={1} display="flex" justifyContent="center">
          <PeriodNavigation
            currentPeriod={currentPeriod}
            onPeriodChange={onPeriodChange}
            periodType={periodType}
            onPeriodTypeChange={onPeriodTypeChange}
            isLoading={isLoading}
          />
        </Box>

        {/* Right side - Bulk Select and Actions */}
        <Box display="flex" gap={1} alignItems="center">
          <Button
            variant={bulkModeActive ? "contained" : "outlined"}
            startIcon={<SelectAllIcon />}
            onClick={onToggleBulkMode}
            size="small"
          >
            {bulkModeActive ? t("exit_bulk_mode") : t("bulk_select")}
            {bulkModeActive &&
              selectedCellsCount > 0 &&
              ` (${selectedCellsCount})`}
          </Button>

          <IconButton
            onClick={onRefresh}
            disabled={isRefreshing}
            size="small"
            aria-label="refresh"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}
