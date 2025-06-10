/**
 * Period navigation component for shift demand management
 * Allows users to navigate between different time periods and change period types
 */

"use client";

import React, { useState } from "react";
import {
  Box,
  Paper,
  IconButton,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Button,
  Tooltip,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  CalendarToday as CalendarIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { styled } from "@mui/material/styles";
import { PeriodType } from "@/types/shiftDemand";
import { DateUtils } from "@/app/lib/utils/shiftDemandUtils";

const NavigationContainer = styled(Paper)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
}));

const NavigationLeft = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

const NavigationCenter = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 16,
});

const NavigationRight = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

const PeriodDisplay = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  minWidth: 200,
});

const CustomDateContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
});

interface PeriodNavigationProps {
  currentPeriod: { start: Date; end: Date };
  onPeriodChange: (start: Date, end: Date) => void;
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
  isLoading?: boolean;
  allowCustomDates?: boolean;
}

export const PeriodNavigation: React.FC<PeriodNavigationProps> = ({
  currentPeriod,
  onPeriodChange,
  periodType,
  onPeriodTypeChange,
  isLoading = false,
  allowCustomDates = true,
}) => {
  const [customStartDate, setCustomStartDate] = useState<Date | null>(
    currentPeriod.start
  );
  const [customEndDate, setCustomEndDate] = useState<Date | null>(
    currentPeriod.end
  );
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  // Handle period navigation
  const handlePrevious = () => {
    const { start, end } = DateUtils.getPreviousPeriod(
      currentPeriod.start,
      currentPeriod.end,
      periodType
    );
    onPeriodChange(start, end);
  };

  const handleNext = () => {
    const { start, end } = DateUtils.getNextPeriod(
      currentPeriod.start,
      currentPeriod.end,
      periodType
    );
    onPeriodChange(start, end);
  };

  const handleToday = () => {
    const today = new Date();
    let start: Date, end: Date;

    switch (periodType) {
      case "week":
        start = DateUtils.getStartOfWeek(today);
        end = DateUtils.getEndOfWeek(today);
        break;
      case "month":
        start = DateUtils.getStartOfMonth(today);
        end = DateUtils.getEndOfMonth(today);
        break;
      default:
        // Keep current period length for custom
        const periodLength =
          currentPeriod.end.getTime() - currentPeriod.start.getTime();
        start = today;
        end = new Date(today.getTime() + periodLength);
    }

    onPeriodChange(start, end);
  };

  // Handle period type change
  const handlePeriodTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newType: PeriodType | null
  ) => {
    if (newType && newType !== periodType) {
      onPeriodTypeChange(newType);

      // Adjust current period to match new type
      if (newType === "week") {
        const start = DateUtils.getStartOfWeek(currentPeriod.start);
        const end = DateUtils.getEndOfWeek(currentPeriod.start);
        onPeriodChange(start, end);
      } else if (newType === "month") {
        const start = DateUtils.getStartOfMonth(currentPeriod.start);
        const end = DateUtils.getEndOfMonth(currentPeriod.start);
        onPeriodChange(start, end);
      }
    }
  };

  // Handle custom date changes
  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate && customStartDate <= customEndDate) {
      onPeriodChange(customStartDate, customEndDate);
      setMenuAnchor(null);
    }
  };

  // Format period display
  const formatPeriodDisplay = () => {
    const start = currentPeriod.start;
    const end = currentPeriod.end;

    if (periodType === "week") {
      const weekStart = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const weekEnd = end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${weekStart} - ${weekEnd}`;
    } else if (periodType === "month") {
      return start.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } else {
      const customStart = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const customEnd = end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${customStart} - ${customEnd}`;
    }
  };

  const getPeriodSubtitle = () => {
    const days =
      DateUtils.getDaysBetween(currentPeriod.start, currentPeriod.end) + 1;
    return `${days} days`;
  };

  return (
    <NavigationContainer>
      <NavigationLeft>
        <Tooltip title="Previous period">
          <IconButton
            onClick={handlePrevious}
            disabled={isLoading}
            size="small"
          >
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Go to today">
          <IconButton
            onClick={handleToday}
            disabled={isLoading}
            size="small"
            color="primary"
          >
            <TodayIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="Next period">
          <IconButton onClick={handleNext} disabled={isLoading} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Tooltip>
      </NavigationLeft>

      <NavigationCenter>
        <PeriodDisplay>
          <Typography variant="h6" component="h2">
            {formatPeriodDisplay()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {getPeriodSubtitle()}
          </Typography>
        </PeriodDisplay>

        <ToggleButtonGroup
          value={periodType}
          exclusive
          onChange={handlePeriodTypeChange}
          size="small"
          disabled={isLoading}
        >
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
          <ToggleButton value="custom">Custom</ToggleButton>
        </ToggleButtonGroup>
      </NavigationCenter>

      <NavigationRight>
        {allowCustomDates && (
          <>
            <Tooltip title="Custom date range">
              <IconButton
                onClick={(event) => setMenuAnchor(event.currentTarget)}
                size="small"
              >
                <CalendarIcon />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              PaperProps={{
                sx: { p: 2, minWidth: 300 },
              }}
            >
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <CustomDateContainer>
                  <DatePicker
                    label="Start Date"
                    value={customStartDate}
                    onChange={setCustomStartDate}
                    slotProps={{
                      textField: { size: "small", sx: { width: 120 } },
                    }}
                  />
                  <Typography variant="body2">to</Typography>
                  <DatePicker
                    label="End Date"
                    value={customEndDate}
                    onChange={setCustomEndDate}
                    minDate={customStartDate || undefined}
                    slotProps={{
                      textField: { size: "small", sx: { width: 120 } },
                    }}
                  />
                </CustomDateContainer>
                <Box
                  sx={{
                    mt: 2,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 1,
                  }}
                >
                  <Button size="small" onClick={() => setMenuAnchor(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleCustomDateApply}
                    disabled={
                      !customStartDate ||
                      !customEndDate ||
                      customStartDate > customEndDate
                    }
                  >
                    Apply
                  </Button>
                </Box>
              </LocalizationProvider>
            </Menu>
          </>
        )}

        <Tooltip title="More options">
          <IconButton size="small">
            <MoreVertIcon />
          </IconButton>
        </Tooltip>
      </NavigationRight>
    </NavigationContainer>
  );
};
