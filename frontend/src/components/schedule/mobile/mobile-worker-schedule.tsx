import React, { useEffect, useMemo } from "react";
import dayjs from "dayjs";
// Local components
import PortraitScheduleList from "./portrait-schedule-list";
import LandscapeWeeklyCalendar from "./landscape-weekly-calendar";

interface MobileWorkerScheduleProps {
  weeks: { start: dayjs.Dayjs; end: dayjs.Dayjs }[];
  currentWeek: { start: dayjs.Dayjs; end: dayjs.Dayjs };
  assignmentsByDate: Map<string, any[]>;
  periodDates: dayjs.Dayjs[];
  shifts: any[];
  selectedWorkerId: string | null;
  today: dayjs.Dayjs;
  isLandscape: boolean;
  setActiveAssignment: (assignment: any) => void;
  setSheetOpen: (open: boolean) => void;
  periodStart: dayjs.Dayjs;
  scheduleViewSettings: any;
  updateScheduleViewSettings: (settings: any) => void;
  onVisibleMonthChange: (month: string) => void;
  onScrollToTodayReady: (handler: () => void) => void;
}

export default function MobileWorkerSchedule({
  weeks,
  currentWeek,
  assignmentsByDate,
  periodDates,
  shifts,
  selectedWorkerId,
  today,
  isLandscape,
  setActiveAssignment,
  setSheetOpen,
  periodStart,
  scheduleViewSettings,
  updateScheduleViewSettings,
  onVisibleMonthChange,
  onScrollToTodayReady,
}: MobileWorkerScheduleProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const weekRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const weeksRef = React.useRef(weeks);
  const hasScrolledRef = React.useRef(false);

  // Update weeksRef when weeks change
  React.useEffect(() => {
    weeksRef.current = weeks;
  }, [weeks]);

  // Detect visible month during scroll
  const handleScroll = React.useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerTop = containerRect.top;
    const containerHeight = container.clientHeight;
    const viewportCenter = containerTop + containerHeight / 3; // Use top third for better UX

    // Find which week is most visible (centered in viewport)
    for (let i = 0; i < weekRefs.current.length; i++) {
      const weekEl = weekRefs.current[i];
      if (!weekEl) continue;

      const weekRect = weekEl.getBoundingClientRect();
      const weekTop = weekRect.top;
      const weekBottom = weekRect.bottom;

      // Check if this week contains the viewport center
      if (weekTop <= viewportCenter && weekBottom >= viewportCenter) {
        const week = weeksRef.current[i];
        if (week) {
          const newMonth = week.start.format(
            week.start.year() === dayjs.utc().year() ? "MMMM" : "MMM YYYY"
          );
          onVisibleMonthChange(newMonth);
        }
        break;
      }
    }
  }, [onVisibleMonthChange]);

  // Scroll to today in the assignment list (portrait) or navigate to today's week (landscape)
  const handleScrollToToday = React.useCallback(() => {
    if (isLandscape) {
      // Landscape: update state to jump to today's week
      const todayWeekStart = today.startOf("isoWeek");
      updateScheduleViewSettings({
        ...scheduleViewSettings,
        timeFrame: "week",
        periodStartDate: todayWeekStart,
      });
      // Update visible month label
      const monthLabel = todayWeekStart.format(
        todayWeekStart.year() === dayjs.utc().year() ? "MMMM" : "MMM YYYY"
      );
      onVisibleMonthChange(monthLabel);
    } else {
      // Portrait: existing scroll behavior
      const idx = weeks.findIndex(
        (w) =>
          today.isSameOrAfter(w.start, "day") &&
          today.isSameOrBefore(w.end, "day")
      );
      const target = weekRefs.current[idx >= 0 ? idx : 0];
      if (target && containerRef.current) {
        const container = containerRef.current as HTMLElement;
        const targetEl = target as HTMLElement;
        const top = targetEl.offsetTop - container.offsetTop;
        container.scrollTo({ top, behavior: "smooth" });
      }
    }
  }, [
    isLandscape,
    today,
    updateScheduleViewSettings,
    scheduleViewSettings,
    onVisibleMonthChange,
    weeks,
  ]);

  // Expose the scroll-to-today handler to parent
  React.useEffect(() => {
    onScrollToTodayReady(handleScrollToToday);
  }, [handleScrollToToday, onScrollToTodayReady]);

  // On load, scroll to the week that contains today so current date appears at top
  useEffect(() => {
    if (hasScrolledRef.current) return;
    const idx = weeks.findIndex(
      (w) =>
        today.isSameOrAfter(w.start, "day") &&
        today.isSameOrBefore(w.end, "day")
    );
    const target = weekRefs.current[idx >= 0 ? idx : 0];
    if (target && containerRef.current) {
      try {
        const container = containerRef.current as HTMLElement;
        const targetEl = target as HTMLElement;
        const top = targetEl.offsetTop - container.offsetTop;
        container.scrollTo({ top, behavior: "auto" });
        hasScrolledRef.current = true;
        // Update visible month after initial scroll
        setTimeout(() => handleScroll(), 100);
      } catch (err) {
        // fallback to bounding rect calculation
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const targetTop = target.getBoundingClientRect().top;
        containerRef.current.scrollTo({
          top: containerRef.current.scrollTop + (targetTop - containerTop),
          behavior: "auto",
        });
        hasScrolledRef.current = true;
        // Update visible month after initial scroll
        setTimeout(() => handleScroll(), 100);
      }
    }
  }, [weeks, today, handleScroll]);

  // Handle week navigation in landscape mode
  const handleWeekChange = React.useCallback(
    (direction: number) => {
      // Navigate by whole weeks and ensure the settings use a week boundary so
      // validation doesn't snap the date to a month start.
      const newPeriodStart = periodStart.add(direction, "week");
      const aligned = newPeriodStart.startOf("isoWeek");

      updateScheduleViewSettings({
        ...scheduleViewSettings,
        timeFrame: "week",
        periodStartDate: aligned,
      });

      // Update visible month label based on the new week start
      const monthLabel = aligned.format(
        aligned.year() === dayjs.utc().year() ? "MMMM" : "MMM YYYY"
      );
      onVisibleMonthChange(monthLabel);
    },
    [
      periodStart,
      updateScheduleViewSettings,
      scheduleViewSettings,
      onVisibleMonthChange,
    ]
  );

  if (!isLandscape) {
    return (
      <PortraitScheduleList
        weeks={weeks}
        containerRef={containerRef}
        weekRefs={weekRefs}
        assignmentsByDate={assignmentsByDate}
        periodDates={periodDates}
        shifts={shifts}
        today={today}
        setActiveAssignment={setActiveAssignment}
        setSheetOpen={setSheetOpen}
        onScroll={handleScroll}
      />
    );
  }

  return (
    <LandscapeWeeklyCalendar
      currentWeek={currentWeek}
      assignmentsByDate={assignmentsByDate}
      shifts={shifts}
      selectedWorkerId={selectedWorkerId}
      today={today}
      setActiveAssignment={setActiveAssignment}
      setSheetOpen={setSheetOpen}
      onWeekChange={handleWeekChange}
    />
  );
}
