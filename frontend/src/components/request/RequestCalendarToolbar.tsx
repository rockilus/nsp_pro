import React from "react";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
// MUI
import { Box, Paper, ToggleButtonGroup, ToggleButton } from "@mui/material";
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

  // Status filter props
  showPending: boolean;
  showAccepted: boolean;
  showDenied: boolean;
  onStatusFilterChange: (
    showPending: boolean,
    showAccepted: boolean,
    showDenied: boolean
  ) => void;

  // Request type filter props
  showWorkDemand: boolean;
  showLeave: boolean;
  onRequestTypeFilterChange: (
    showWorkDemand: boolean,
    showLeave: boolean
  ) => void;
}

export function RequestCalendarToolbar({
  lng,
  currentPeriod,
  onPeriodChange,
  timeFrame,
  onTimeFrameChange,
  isLoading = false,
  showPending,
  showAccepted,
  showDenied,
  onStatusFilterChange,
  showWorkDemand,
  showLeave,
  onRequestTypeFilterChange,
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

  // Handler for status filter changes
  const handleStatusFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newStatuses: string[]
  ) => {
    // newStatuses is an array of selected values
    const newShowPending = newStatuses.includes("pending");
    const newShowAccepted = newStatuses.includes("accepted");
    const newShowDenied = newStatuses.includes("denied");

    onStatusFilterChange(newShowPending, newShowAccepted, newShowDenied);
  };

  // Handler for request type filter changes
  const handleRequestTypeFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTypes: string[]
  ) => {
    // newTypes is an array of selected values
    const newShowWorkDemand = newTypes.includes("work_demand");
    const newShowLeave = newTypes.includes("leave");

    onRequestTypeFilterChange(newShowWorkDemand, newShowLeave);
  };

  // Calculate current selected statuses for ToggleButtonGroup
  const selectedStatuses: string[] = [];
  if (showPending) selectedStatuses.push("pending");
  if (showAccepted) selectedStatuses.push("accepted");
  if (showDenied) selectedStatuses.push("denied");

  // Calculate current selected request types for ToggleButtonGroup
  const selectedRequestTypes: string[] = [];
  if (showWorkDemand) selectedRequestTypes.push("work_demand");
  if (showLeave) selectedRequestTypes.push("leave");

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

        {/* Right side - Status filters */}
        <Box display="flex" gap={1} alignItems="center">
          {/* Request Type Filter */}
          <ToggleButtonGroup
            color="primary"
            value={selectedRequestTypes}
            onChange={handleRequestTypeFilterChange}
            aria-label="request type filter"
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                textTransform: "none",
                px: 2,
                py: 0.5,
                fontSize: "0.875rem",
                fontWeight: 500,
              },
            }}
          >
            <ToggleButton
              value="work_demand"
              aria-label="show work demand requests"
              data-testid="request-calendar-filter-work"
            >
              Work
            </ToggleButton>
            <ToggleButton
              value="leave"
              aria-label="show leave requests"
              data-testid="request-calendar-filter-leave"
            >
              Leave
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Status Filter */}
          <ToggleButtonGroup
            color="primary"
            value={selectedStatuses}
            onChange={handleStatusFilterChange}
            aria-label="request status filter"
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                textTransform: "none",
                px: 2,
                py: 0.5,
                fontSize: "0.875rem",
                fontWeight: 500,
              },
            }}
          >
            <ToggleButton
              value="pending"
              aria-label="show pending requests"
              data-testid="request-calendar-filter-pending"
            >
              Pending
            </ToggleButton>
            <ToggleButton
              value="accepted"
              aria-label="show accepted requests"
              data-testid="request-calendar-filter-accepted"
            >
              Accepted
            </ToggleButton>
            <ToggleButton
              value="denied"
              aria-label="show denied requests"
              data-testid="request-calendar-filter-denied"
            >
              Denied
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
    </Paper>
  );
}
