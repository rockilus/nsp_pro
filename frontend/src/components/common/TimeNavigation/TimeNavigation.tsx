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
export function formatPeriodLabel(
  start: Dayjs,
  end: Dayjs,
  timeFrame: TimeFrame,
  lng: string,
): string {
  // Helper: short month (3 letters), remove dots and capitalize
  const shortMonth = (d: Dayjs) => {
    const raw = d.locale(lng).format("MMM").replace(/\./g, "");
    const short = raw.slice(0, 3);
    return short.charAt(0).toUpperCase() + short.slice(1);
  };

  // Both week and month views use the same formatting logic
  if (start.month() === end.month() && start.year() === end.year()) {
    const full = start.locale(lng).format("MMMM YYYY");
    return full.charAt(0).toUpperCase() + full.slice(1);
  } else if (start.month() !== end.month() && start.year() === end.year()) {
    return `${shortMonth(start)} - ${shortMonth(end)} ${end.year()}`;
  } else {
    return `${shortMonth(start)} ${start.year()} - ${shortMonth(end)} ${end.year()}`;
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
          lng,
        )}`}
      >
        {formatPeriodLabel(
          currentPeriodStart,
          currentPeriodEnd,
          timeFrame,
          lng,
        )}
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
