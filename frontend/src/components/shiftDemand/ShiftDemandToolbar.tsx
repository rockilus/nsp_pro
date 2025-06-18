import React from "react";
import { Box, Paper, Button } from "@mui/material";
import { Description, Group } from "@mui/icons-material";
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

  // Mode selection props - only one can be active at a time
  bulkModeActive: boolean;
  multitaskingModeActive: boolean;
  onToggleBulkMode: () => void;
  onToggleMultitaskingMode: () => void;

  // Template management props
  onOpenTemplates: () => void;
}

export function ShiftDemandToolbar({
  lng,
  currentPeriod,
  onPeriodChange,
  periodType,
  onPeriodTypeChange,
  isLoading,
  bulkModeActive,
  multitaskingModeActive,
  onToggleBulkMode,
  onToggleMultitaskingMode,
  onOpenTemplates,
}: ShiftDemandToolbarProps) {
  const { t } = useTranslation(lng, "shift-demands");

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 1,
        width: "100%",
        margin: 0,
        padding: "3px 16px",
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
        height="40px"
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

        {/* Right side - Template Management, Bulk Select, Multitasking */}
        <Box display="flex" gap={1} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<Description />}
            onClick={onOpenTemplates}
            disabled={isLoading}
            sx={{
              height: "35px",
              fontSize: "0.9rem",
              fontWeight: 550,
              textTransform: "none",
              minWidth: "auto",
              px: 2,
            }}
          >
            {t("templates")}
          </Button>

          {/* Bulk Select Button */}
          <button
            onClick={onToggleBulkMode}
            disabled={isLoading || multitaskingModeActive}
            style={{
              borderRadius: "4px",
              border: "1px solid #e5e7eb",
              height: "35px",
              padding: "0 15px",
              fontSize: "0.9rem",
              fontWeight: 550,
              color: bulkModeActive ? "white" : "#616161",
              backgroundColor: bulkModeActive ? "#1976d2" : "white",
              cursor:
                isLoading || multitaskingModeActive ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
              opacity: multitaskingModeActive ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !bulkModeActive && !multitaskingModeActive) {
                e.currentTarget.style.backgroundColor = "#f0f0f0";
              }
            }}
            onMouseLeave={(e) => {
              if (!bulkModeActive && !multitaskingModeActive) {
                e.currentTarget.style.backgroundColor = "white";
              }
            }}
          >
            {t("select")}
          </button>

          {/* Multitasking Button */}
          <button
            onClick={onToggleMultitaskingMode}
            disabled={isLoading || bulkModeActive}
            style={{
              borderRadius: "4px",
              border: "1px solid #e5e7eb",
              height: "35px",
              padding: "0 15px",
              fontSize: "0.9rem",
              fontWeight: 550,
              color: multitaskingModeActive ? "white" : "#616161",
              backgroundColor: multitaskingModeActive ? "#1976d2" : "white",
              cursor: isLoading || bulkModeActive ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
              opacity: bulkModeActive ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !multitaskingModeActive && !bulkModeActive) {
                e.currentTarget.style.backgroundColor = "#f0f0f0";
              }
            }}
            onMouseLeave={(e) => {
              if (!multitaskingModeActive && !bulkModeActive) {
                e.currentTarget.style.backgroundColor = "white";
              }
            }}
          >
            <Group style={{ fontSize: "16px" }} />
            Multitasking
          </button>
        </Box>
      </Box>
    </Paper>
  );
}
