import dayjs, { Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);

export function getPeriodStartEndDates(
  periodType: "week" | "month",
  startDate: Dayjs,
  endDate: Dayjs
): { firstDate: Dayjs; lastDate: Dayjs } {
  if (periodType === "month") {
    const currentMonthStart = dayjs().startOf("month");
    const currentMonthEnd = dayjs().endOf("month");

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
    const currentWeekStart = dayjs().startOf("isoWeek");
    const currentWeekEnd = dayjs().endOf("isoWeek");

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
