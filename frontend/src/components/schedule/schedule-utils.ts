import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

export function getPeriodStartEndDates(
  periodType: "week" | "month",
  startDate: Dayjs,
  endDate: Dayjs,
): { firstDate: Dayjs; lastDate: Dayjs } {
  if (periodType === "month") {
    // Use UTC for current-month boundary checks to match stored UTC periodStartDate
    const currentMonthStart = dayjs.utc().startOf("month");
    const currentMonthEnd = dayjs.utc().endOf("month");

    if (
      startDate.isBefore(currentMonthEnd) &&
      endDate.isAfter(currentMonthStart)
    ) {
      return { firstDate: currentMonthStart, lastDate: currentMonthEnd };
    } else {
      return {
        firstDate: startDate.startOf("month"),
        lastDate: startDate.endOf("month"),
      };
    }
  } else if (periodType === "week") {
    // Use UTC for current-week boundary checks to match stored UTC periodStartDate
    const currentWeekStart = dayjs.utc().startOf("isoWeek");
    const currentWeekEnd = dayjs.utc().endOf("isoWeek");

    if (
      startDate.isBefore(currentWeekEnd) &&
      endDate.isAfter(currentWeekStart)
    ) {
      return { firstDate: currentWeekStart, lastDate: currentWeekEnd };
    } else {
      return {
        firstDate: startDate.startOf("isoWeek"),
        lastDate: startDate.endOf("isoWeek"),
      };
    }
  }

  throw new Error('Invalid period type. Must be either "week" or "month".');
}
