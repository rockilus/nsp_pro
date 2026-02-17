import React, { useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
// MUI
import {
  Box,
  Paper,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  IconButton as BackButton,
} from "@mui/material";
import {
  Tune as TuneIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
// Components
import { TimeNavigation } from "../common/TimeNavigation";
import SelectFilter from "../table/filters/SelectFilter";
import DateFilter from "../table/filters/DateFilter";
// Types
import { ColumnDefinition, ColumnFilter } from "../../types/filter";

dayjs.extend(isoWeek);

interface RequestCalendarToolbarProps {
  lng: string;
  // Period Navigation props
  currentPeriod: { start: Dayjs; end: Dayjs };
  onPeriodChange: (start: Dayjs, end: Dayjs) => void;
  timeFrame: "week" | "month";
  onTimeFrameChange: (timeFrame: "week" | "month") => void;
  isLoading?: boolean;

  // Filter props (now using table state)
  columns: ColumnDefinition[];
  filters: ColumnFilter[];
  onFilter: (filter: ColumnFilter) => void;
}

export function RequestCalendarToolbar({
  lng,
  currentPeriod,
  onPeriodChange,
  timeFrame,
  onTimeFrameChange,
  isLoading = false,
  columns,
  filters,
  onFilter,
}: RequestCalendarToolbarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedColumn, setSelectedColumn] = useState<ColumnDefinition | null>(
    null,
  );

  // Handlers for TimeNavigation
  const handleToday = () => {
    // Calculate today's period based on timeFrame
    const today = dayjs.utc();
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
    // The parent's onTimeFrameChange already handles period adjustment
    onTimeFrameChange(newTimeFrame);
  };

  // Filter menu handlers
  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setAnchorEl(null);
    setSelectedColumn(null);
  };

  const handleColumnSelect = (column: ColumnDefinition) => {
    setSelectedColumn(column);
  };

  const handleBackToMenu = () => {
    setSelectedColumn(null);
  };

  const handleFilterApply = (filter: ColumnFilter) => {
    onFilter(filter);
    setSelectedColumn(null);
  };

  // Get filterable columns (exclude workerId since it has its own UI in the table)
  const filterableColumns = columns.filter((col) => col.id !== "workerId");

  const open = Boolean(anchorEl);
  const popoverId = open ? "filter-popover" : undefined;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 1,
        width: "100%",
        margin: 0,
        padding: "3px 0px",
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
        {/* Left side - Period Navigation */}
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
        />

        {/* Right side - Filter button */}
        <IconButton
          onClick={handleFilterMenuOpen}
          size="small"
          aria-describedby={popoverId}
          sx={{
            color: filters.length > 0 ? "primary.main" : "text.secondary",
          }}
          data-testid="calendar-filter-menu-button"
        >
          <TuneIcon />
        </IconButton>

        {/* Filter Popover */}
        <Popover
          id={popoverId}
          open={open}
          anchorEl={anchorEl}
          onClose={handleFilterMenuClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          {!selectedColumn ? (
            // Main menu - show list of filterable columns
            <List sx={{ minWidth: 200 }} data-testid="filter-column-list">
              {filterableColumns.map((column, index) => {
                const hasFilter = filters.some((f) =>
                  f.id.startsWith(column.id),
                );
                return (
                  <React.Fragment key={column.id}>
                    {index > 0 && <Divider />}
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => handleColumnSelect(column)}
                        data-testid={`filter-column-${column.id}`}
                      >
                        <ListItemText
                          primary={column.label}
                          sx={{
                            "& .MuiListItemText-primary": {
                              fontWeight: hasFilter ? 600 : 400,
                              color: hasFilter
                                ? "primary.main"
                                : "text.primary",
                            },
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          ) : (
            // Filter detail - show the appropriate filter component for selected column
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <BackButton size="small" onClick={handleBackToMenu}>
                  <ArrowBackIcon />
                </BackButton>
              </Box>
              {selectedColumn.type === "select" && (
                <SelectFilter
                  onApply={handleFilterApply}
                  onClose={handleFilterMenuClose}
                  columnId={selectedColumn.id}
                  label={selectedColumn.label}
                  options={selectedColumn.getOptions?.() || []}
                  currentValue={
                    filters.find((f) => f.id.startsWith(selectedColumn.id))
                      ?.value
                  }
                />
              )}
              {selectedColumn.type === "date" && (
                <DateFilter
                  onApply={handleFilterApply}
                  onClose={handleFilterMenuClose}
                  columnId={selectedColumn.id}
                  label={selectedColumn.label}
                  currentValue={
                    filters.find((f) => f.id.startsWith(selectedColumn.id))
                      ?.value
                  }
                />
              )}
            </Box>
          )}
        </Popover>
      </Box>
    </Paper>
  );
}
