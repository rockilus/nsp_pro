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
 * Examples:
 * - Week view, same month: "January 2026"
 * - Week view, different months, same year: "Jan - Feb 2026"
 * - Week view, different years: "Dec 2025 - Jan 2026"
 * - Month view, same month: "January 2026"
 * - Month view, different months, same year: "Jan - Feb 2026"
 * - Month view, different years: "Dec 2025 - Jan 2026"
 */
function formatPeriodLabel(
  start: Dayjs,
  end: Dayjs,
  timeFrame: TimeFrame,
): string {
  // Both week and month views use the same formatting logic
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

  const todayTooltip = dayjs().format("DD/MM/YYYY");
  const previousTooltip =
    timeFrame === "week" ? t("previous_week") : t("previous_month");
  const nextTooltip = timeFrame === "week" ? t("next_week") : t("next_month");

  return (
    <div className={styles.container}>
      {/* Today Button */}
      <button
        onClick={onToday}
        disabled={isLoading}
        className={styles.todayButton}
        data-testid="time-nav-today"
        aria-label="Navigate to today"
        title={todayTooltip}
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
        title={previousTooltip}
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
        title={nextTooltip}
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
          timeFrame,
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
