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
import { useTranslation } from "@/app/i18n/client";
import styles from "./TimeNavigation.module.css";

export type TimeFrame = "week" | "month";

interface TimeNavigationProps {
  // Language code for translations
  lng: string;

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
}

/**
 * Formats period label based on start and end dates and the selected time frame.
 * For week view we display the month/year corresponding to the middle of the
 * week (so a week spanning two months will show a single "MMMM YYYY" label).
 * Examples:
 * - Week view (any cross-month week): "October 2025"
 * - Same month/year (month view): "January 2025"
 * - Different months, same year (month view spanning months): "Jan - Feb 2025"
 * - Different years: "Dec 2024 - Jan 2025"
 */
function formatPeriodLabel(
  start: Dayjs,
  end: Dayjs,
  timeFrame: TimeFrame
): string {
  // Week view: show the month/year of the middle day of the week to avoid
  // labels like "Oct - Nov 2025" when a week spans months.
  if (timeFrame === "week") {
    // Week is 7 days; use the middle day to pick a representative month/year
    const middle = start.add(3, "day");
    return middle.format("MMMM YYYY");
  }

  if (start.month() === end.month() && start.year() === end.year()) {
    return start.format("MMMM YYYY");
  } else if (start.month() !== end.month() && start.year() === end.year()) {
    return start.format("MMM") + " - " + end.format("MMM YYYY");
  } else {
    return start.format("MMM YYYY") + " - " + end.format("MMM YYYY");
  }
}

export const TimeNavigation: React.FC<TimeNavigationProps> = ({
  lng,
  currentPeriodStart,
  currentPeriodEnd,
  timeFrame,
  onToday,
  onPreviousPeriod,
  onNextPeriod,
  onTimeFrameChange,
  isLoading = false,
}) => {
  const { t } = useTranslation(lng, "common");

  return (
    <div className={styles.container}>
      {/* Today Button */}
      <button
        onClick={onToday}
        disabled={isLoading}
        className={styles.todayButton}
        data-testid="time-nav-today"
        aria-label="Navigate to today"
      >
        {t("today")}
      </button>

      {/* Previous Period Button */}
      <button
        onClick={onPreviousPeriod}
        disabled={isLoading}
        className={styles.previousButton}
        data-testid="time-nav-previous"
        aria-label="Navigate to previous period"
      >
        <NavigateBeforeIcon />
      </button>

      {/* Next Period Button */}
      <button
        onClick={onNextPeriod}
        disabled={isLoading}
        className={styles.nextButton}
        data-testid="time-nav-next"
        aria-label="Navigate to next period"
      >
        <NavigateNextIcon />
      </button>

      {/* Period Label */}
      <span
        className={styles.periodLabel}
        data-testid="time-nav-label"
        aria-label={`Current period: ${formatPeriodLabel(
          currentPeriodStart,
          currentPeriodEnd,
          timeFrame
        )}`}
      >
        {formatPeriodLabel(currentPeriodStart, currentPeriodEnd, timeFrame)}
      </span>

      {/* Period Type Selector */}
      <select
        value={timeFrame}
        onChange={(e) => onTimeFrameChange(e.target.value as TimeFrame)}
        disabled={isLoading}
        className={styles.select}
        data-testid="time-nav-select"
        aria-label="Select time frame"
      >
        <option value="week">{t("week")}</option>
        <option value="month">{t("month")}</option>
      </select>
    </div>
  );
};
