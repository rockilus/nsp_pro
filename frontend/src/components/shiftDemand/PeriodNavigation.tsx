/**
 * Period navigation component for shift demand management
 * Allows users to navigate between different time periods and change period types
 */

"use client";

import React, { useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";
import { PeriodType } from "@/types/shiftDemand";
import { DateUtils } from "@/app/lib/utils/shiftDemandUtils";
import styles from "./PeriodNavigation.module.css";

interface PeriodNavigationProps {
  currentPeriod: { start: Dayjs; end: Dayjs };
  onPeriodChange: (start: Dayjs, end: Dayjs) => void;
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
  isLoading?: boolean;
}

export const PeriodNavigation: React.FC<PeriodNavigationProps> = ({
  currentPeriod,
  onPeriodChange,
  periodType,
  onPeriodTypeChange,
  isLoading = false,
}) => {
  // Handle period navigation
  const handlePrevious = () => {
    if (isLoading) return;
    const { start, end } = DateUtils.getPreviousPeriod(
      currentPeriod.start.toDate(),
      currentPeriod.end.toDate(),
      periodType
    );
    onPeriodChange(dayjs(start), dayjs(end));
  };

  const handleNext = () => {
    if (isLoading) return;
    const { start, end } = DateUtils.getNextPeriod(
      currentPeriod.start.toDate(),
      currentPeriod.end.toDate(),
      periodType
    );
    onPeriodChange(dayjs(start), dayjs(end));
  };

  const handleToday = () => {
    if (isLoading) return;
    const today = dayjs();
    let start: Dayjs, end: Dayjs;

    switch (periodType) {
      case "week":
        start = dayjs(DateUtils.getStartOfWeek(today.toDate()));
        end = dayjs(DateUtils.getEndOfWeek(today.toDate()));
        break;
      case "month":
        start = dayjs(DateUtils.getStartOfMonth(today.toDate()));
        end = dayjs(DateUtils.getEndOfMonth(today.toDate()));
        break;
      default:
        // Keep current period length for custom
        const periodLength = currentPeriod.end.diff(currentPeriod.start);
        start = today;
        end = today.add(periodLength, "millisecond");
    }

    onPeriodChange(start, end);
  };

  // Handle period type change
  const handlePeriodTypeChange = (newType: PeriodType) => {
    if (newType && newType !== periodType) {
      onPeriodTypeChange(newType);

      // Adjust current period to match new type
      if (newType === "week") {
        const start = dayjs(
          DateUtils.getStartOfWeek(currentPeriod.start.toDate())
        );
        const end = dayjs(DateUtils.getEndOfWeek(currentPeriod.start.toDate()));
        onPeriodChange(start, end);
      } else if (newType === "month") {
        const start = dayjs(
          DateUtils.getStartOfMonth(currentPeriod.start.toDate())
        );
        const end = dayjs(
          DateUtils.getEndOfMonth(currentPeriod.start.toDate())
        );
        onPeriodChange(start, end);
      }
    }
  };

  // Format period display - similar to TimeViewSelector's getPeriodLabel
  const getPeriodLabel = (): string => {
    const start = currentPeriod.start;
    const end = currentPeriod.end;

    if (periodType === "week") {
      if (start.month() === end.month() && start.year() === end.year()) {
        return start.format("MMMM YYYY");
      } else if (start.month() !== end.month() && start.year() === end.year()) {
        return start.format("MMM") + " - " + end.format("MMM YYYY");
      } else {
        return start.format("MMM YYYY") + " - " + end.format("MMM YYYY");
      }
    } else if (periodType === "month") {
      return start.format("MMMM YYYY");
    } else {
      // Custom period
      if (start.month() === end.month() && start.year() === end.year()) {
        return start.format("MMMM YYYY");
      } else if (start.month() !== end.month() && start.year() === end.year()) {
        return start.format("MMM") + " - " + end.format("MMM YYYY");
      } else {
        return start.format("MMM YYYY") + " - " + end.format("MMM YYYY");
      }
    }
  };

  return (
    <div className={`${styles.container} ${styles.containerWithCustom}`}>
      {/* Today Button */}
      <button
        onClick={handleToday}
        disabled={isLoading}
        className={styles.todayButton}
      >
        Today
      </button>

      {/* Previous Period Button */}
      <button
        onClick={handlePrevious}
        disabled={isLoading}
        className={styles.previousButton}
      >
        <NavigateBeforeIcon />
      </button>

      {/* Next Period Button */}
      <button
        onClick={handleNext}
        disabled={isLoading}
        className={styles.nextButton}
      >
        <NavigateNextIcon />
      </button>

      {/* Period Label */}
      <span className={styles.periodLabel}>{getPeriodLabel()}</span>

      {/* Period Type Selector */}
      <select
        value={periodType === "custom" ? "week" : periodType} // Default to week for custom to avoid issues
        onChange={(e) => handlePeriodTypeChange(e.target.value as PeriodType)}
        disabled={isLoading}
        className={styles.select}
      >
        <option value="week">Week</option>
        <option value="month">Month</option>
      </select>
    </div>
  );
};
