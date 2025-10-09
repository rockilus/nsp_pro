import React from "react";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
// MUI
import { Box, Paper } from "@mui/material";
// Components
import { TimeNavigation } from "../common/TimeNavigation";

dayjs.extend(isoWeek);

interface RequestCalendarToolbarProps {
  lng: string;
  // Period Navigation props
  currentPeriod: { start: Dayjs; end: Dayjs };
  onPeriodChange: (start: Dayjs, end: Dayjs) => void;
  timeFrame: "week" | "month";
  onTimeFrameChange: (timeFrame: "week" | "month") => void;
  isLoading?: boolean;
}

export function RequestCalendarToolbar({
  lng,
  currentPeriod,
  onPeriodChange,
  timeFrame,
  onTimeFrameChange,
  isLoading = false,
}: RequestCalendarToolbarProps) {
  // Handlers for TimeNavigation
  const handleToday = () => {
    // Calculate today's period based on timeFrame
    const today = dayjs();
    let start: Dayjs, end: Dayjs;

    if (timeFrame === "week") {
      start = today.startOf("isoWeek");
      end = today.endOf("isoWeek");
    } else {
      // month
      start = today.startOf("month");
      end = today.endOf("month");
    }

    onPeriodChange(start, end);
  };

  const handlePreviousPeriod = () => {
    if (isLoading) return;

    let start: Dayjs, end: Dayjs;

    if (timeFrame === "week") {
      start = currentPeriod.start.subtract(1, "week");
      end = currentPeriod.end.subtract(1, "week");
    } else {
      // month
      start = currentPeriod.start.subtract(1, "month").startOf("month");
      end = currentPeriod.start.subtract(1, "month").endOf("month");
    }

    onPeriodChange(start, end);
  };

  const handleNextPeriod = () => {
    if (isLoading) return;

    let start: Dayjs, end: Dayjs;

    if (timeFrame === "week") {
      start = currentPeriod.start.add(1, "week");
      end = currentPeriod.end.add(1, "week");
    } else {
      // month
      start = currentPeriod.start.add(1, "month").startOf("month");
      end = currentPeriod.start.add(1, "month").endOf("month");
    }

    onPeriodChange(start, end);
  };

  const handleTimeFrameChangeInternal = (newTimeFrame: "week" | "month") => {
    onTimeFrameChange(newTimeFrame);

    // Adjust current period to match new time frame
    let start: Dayjs, end: Dayjs;

    if (newTimeFrame === "week") {
      start = currentPeriod.start.startOf("isoWeek");
      end = currentPeriod.start.endOf("isoWeek");
    } else {
      // month
      start = currentPeriod.start.startOf("month");
      end = currentPeriod.start.endOf("month");
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
        padding: "3px 24px",
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
        <TimeNavigation
          lng={lng}
          currentPeriodStart={currentPeriod.start}
          currentPeriodEnd={currentPeriod.end}
          timeFrame={timeFrame}
          onToday={handleToday}
          onPreviousPeriod={handlePreviousPeriod}
          onNextPeriod={handleNextPeriod}
          onTimeFrameChange={handleTimeFrameChangeInternal}
          isLoading={isLoading}
          testIdPrefix="request-calendar-time-nav"
        />

        {/* Right side - placeholder for future features */}
        <Box display="flex" gap={1} alignItems="center">
          {/* Future features like filters, export, etc. can go here */}
        </Box>
      </Box>
    </Paper>
  );
}
