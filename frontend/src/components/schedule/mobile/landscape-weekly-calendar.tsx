import React from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import WeekCarousel from "./week-carousel";

dayjs.extend(utc);

interface WeekData {
  week: { start: dayjs.Dayjs; end: dayjs.Dayjs };
  assignmentsByDate: Map<string, any[]>;
}

interface LandscapeWeeklyCalendarProps {
  weeks: [WeekData, WeekData, WeekData]; // [prev, current, next]
  shifts: any[];
  selectedWorkerId: string | null;
  today: dayjs.Dayjs;
  setActiveAssignment: (assignment: any) => void;
  setSheetOpen: (open: boolean) => void;
  onWeekChange: (direction: number) => void;
}

export default function LandscapeWeeklyCalendar({
  weeks,
  shifts,
  selectedWorkerId,
  today,
  setActiveAssignment,
  setSheetOpen,
  onWeekChange,
}: LandscapeWeeklyCalendarProps) {
  return (
    <WeekCarousel
      weeks={weeks}
      shifts={shifts}
      today={today}
      setActiveAssignment={setActiveAssignment}
      setSheetOpen={setSheetOpen}
      onWeekChange={onWeekChange}
    />
  );
}
