/**
 * Common time navigation component for calendar views
 * Replaces TimeViewSelector (schedule) and PeriodNavigation (shift demand)
 *
 * Provides:
 * - Today button for quick navigation to current period
 * - Previous/Next period navigation
 * - Period label display (formatted based on period type)
 * - Period type selector (week/month)
 */

"use client";

import React from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import styles from "./TimeNavigation.module.css";

export type TimeFrame = "week" | "month";

interface TimeNavigationProps {
  // Current period boundaries
  currentPeriodStart: Dayjs;
  currentPeriodEnd: Dayjs;

  // Time frame (week or month)
  timeFrame: TimeFrame;

  // Navigation callbacks
  onToday: () => void;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onTimeFrameChange: (timeFrame: TimeFrame) => void;

  // Optional props
  isLoading?: boolean;
  todayLabel?: string;
  weekLabel?: string;
  monthLabel?: string;

  // Optional styling
  className?: string;

  // Test IDs for testing
  testIdPrefix?: string;
}

/**
 * Formats period label based on start and end dates
 * Examples:
 * - Same month/year: "January 2025"
 * - Different months, same year: "Jan - Feb 2025"
 * - Different years: "Dec 2024 - Jan 2025"
 */
function formatPeriodLabel(start: Dayjs, end: Dayjs): string {
  if (start.month() === end.month() && start.year() === end.year()) {
    return start.format("MMMM YYYY");
  } else if (start.month() !== end.month() && start.year() === end.year()) {
    return start.format("MMM") + " - " + end.format("MMM YYYY");
  } else {
    return start.format("MMM YYYY") + " - " + end.format("MMM YYYY");
  }
}

export const TimeNavigation: React.FC<TimeNavigationProps> = ({
  currentPeriodStart,
  currentPeriodEnd,
  timeFrame,
  onToday,
  onPreviousPeriod,
  onNextPeriod,
  onTimeFrameChange,
  isLoading = false,
  todayLabel = "Today",
  weekLabel = "Week",
  monthLabel = "Month",
  className = "",
  testIdPrefix = "time-nav",
}) => {
  return (
    <div className={`${styles.container} ${className}`}>
      {/* Today Button */}
      <button
        onClick={onToday}
        disabled={isLoading}
        className={styles.todayButton}
        data-testid={`${testIdPrefix}-today`}
        aria-label="Navigate to today"
      >
        {todayLabel}
      </button>

      {/* Previous Period Button */}
      <button
        onClick={onPreviousPeriod}
        disabled={isLoading}
        className={styles.previousButton}
        data-testid={`${testIdPrefix}-previous`}
        aria-label="Navigate to previous period"
      >
        <NavigateBeforeIcon />
      </button>

      {/* Next Period Button */}
      <button
        onClick={onNextPeriod}
        disabled={isLoading}
        className={styles.nextButton}
        data-testid={`${testIdPrefix}-next`}
        aria-label="Navigate to next period"
      >
        <NavigateNextIcon />
      </button>

      {/* Period Label */}
      <span
        className={styles.periodLabel}
        data-testid={`${testIdPrefix}-label`}
        aria-label={`Current period: ${formatPeriodLabel(
          currentPeriodStart,
          currentPeriodEnd
        )}`}
      >
        {formatPeriodLabel(currentPeriodStart, currentPeriodEnd)}
      </span>

      {/* Period Type Selector */}
      <select
        value={timeFrame}
        onChange={(e) => onTimeFrameChange(e.target.value as TimeFrame)}
        disabled={isLoading}
        className={styles.select}
        data-testid={`${testIdPrefix}-select`}
        aria-label="Select time frame"
      >
        <option value="week">{weekLabel}</option>
        <option value="month">{monthLabel}</option>
      </select>
    </div>
  );
};
