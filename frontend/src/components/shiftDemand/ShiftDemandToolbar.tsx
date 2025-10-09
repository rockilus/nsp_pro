import React from "react";
import { useTranslation } from "../../app/i18n/client";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
// MUI
import { Box, Paper, Button } from "@mui/material";
import { Description, Group } from "@mui/icons-material";
// Components
import { TimeNavigation } from "../common/TimeNavigation";
// Types
import { PeriodType } from "../../types/shiftDemand";

dayjs.extend(isoWeek);

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

  // Handlers for TimeNavigation
  const handleToday = () => {
    // Calculate today's period based on periodType
    const today = dayjs();
    let start: Dayjs, end: Dayjs;

    if (periodType === "week") {
      start = today.startOf("isoWeek");
      end = today.endOf("isoWeek");
    } else if (periodType === "month") {
      start = today.startOf("month");
      end = today.endOf("month");
    } else {
      // For custom periods, keep current period length
      const periodLength = currentPeriod.end.diff(currentPeriod.start);
      start = today;
      end = today.add(periodLength, "millisecond");
    }

    onPeriodChange(start, end);
  };

  const handlePreviousPeriod = () => {
    if (isLoading) return;

    let start: Dayjs, end: Dayjs;

    if (periodType === "week") {
      start = currentPeriod.start.subtract(1, "week");
      end = currentPeriod.end.subtract(1, "week");
    } else if (periodType === "month") {
      start = currentPeriod.start.subtract(1, "month").startOf("month");
      end = currentPeriod.start.subtract(1, "month").endOf("month");
    } else {
      // Custom period - maintain the same length
      const periodLength = currentPeriod.end.diff(currentPeriod.start);
      start = currentPeriod.start.subtract(periodLength, "millisecond");
      end = currentPeriod.end.subtract(periodLength, "millisecond");
    }

    onPeriodChange(start, end);
  };

  const handleNextPeriod = () => {
    if (isLoading) return;

    let start: Dayjs, end: Dayjs;

    if (periodType === "week") {
      start = currentPeriod.start.add(1, "week");
      end = currentPeriod.end.add(1, "week");
    } else if (periodType === "month") {
      start = currentPeriod.start.add(1, "month").startOf("month");
      end = currentPeriod.start.add(1, "month").endOf("month");
    } else {
      // Custom period - maintain the same length
      const periodLength = currentPeriod.end.diff(currentPeriod.start);
      start = currentPeriod.start.add(periodLength, "millisecond");
      end = currentPeriod.end.add(periodLength, "millisecond");
    }

    onPeriodChange(start, end);
  };

  const handleTimeFrameChange = (newType: "week" | "month") => {
    // Map TimeNavigation's TimeFrame to PeriodType
    onPeriodTypeChange(newType as PeriodType);

    // Adjust current period to match new type
    let start: Dayjs, end: Dayjs;

    if (newType === "week") {
      start = currentPeriod.start.startOf("isoWeek");
      end = currentPeriod.start.endOf("isoWeek");
    } else if (newType === "month") {
      start = currentPeriod.start.startOf("month");
      end = currentPeriod.start.endOf("month");
    } else {
      start = currentPeriod.start;
      end = currentPeriod.end;
    }

    onPeriodChange(start, end);
  };

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
          <TimeNavigation
            currentPeriodStart={currentPeriod.start}
            currentPeriodEnd={currentPeriod.end}
            timeFrame={periodType === "custom" ? "week" : periodType}
            onToday={handleToday}
            onPreviousPeriod={handlePreviousPeriod}
            onNextPeriod={handleNextPeriod}
            onTimeFrameChange={handleTimeFrameChange}
            isLoading={isLoading}
            todayLabel={t("today") || "Today"}
            weekLabel={t("week") || "Week"}
            monthLabel={t("month") || "Month"}
            testIdPrefix="shift-demand-time-nav"
          />
        </Box>

        {/* Right side - Template Management, Bulk Select, Multitasking */}
        <Box display="flex" gap={1} alignItems="center">
          <Button
            data-testid="shift-demand-template-button"
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
            data-testid="shift-demand-select-button"
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
