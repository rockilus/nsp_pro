import dayjs from "dayjs";
import { RequestCalendarViewSettingsT } from "@/types/request";

export interface SerializedRequestCalendarViewSettings {
  timeFrame: "week" | "month";
  periodStartDate: string; // ISO string
}

/**
 * Computes the period end date from the start date and timeFrame
 */
export function computePeriodEndDate(
  periodStartDate: dayjs.Dayjs,
  timeFrame: "week" | "month",
): dayjs.Dayjs {
  return periodStartDate.endOf(timeFrame === "month" ? "month" : "isoWeek");
}

/**
 * Validates and normalizes request calendar view settings
 */
export function validateRequestCalendarViewSettings(
  settings: Partial<RequestCalendarViewSettingsT>,
): RequestCalendarViewSettingsT {
  const now = dayjs.utc();

  // Validate timeFrame
  const timeFrame = ["week", "month"].includes(settings.timeFrame as string)
    ? (settings.timeFrame as "week" | "month")
    : "month";

  // Validate periodStartDate - ensure it's valid and not too far in the past/future
  let periodStartDate: dayjs.Dayjs;

  // Check if periodStartDate is a valid dayjs object
  if (
    dayjs.isDayjs(settings.periodStartDate) &&
    settings.periodStartDate.isValid()
  ) {
    // Ensure it's UTC
    periodStartDate = settings.periodStartDate.utc();
  } else {
    // Try to parse as string if it's not a dayjs object
    try {
      const parsed = dayjs.utc(settings.periodStartDate);
      periodStartDate = parsed.isValid() ? parsed : now.startOf("month");
    } catch {
      periodStartDate = now.startOf("month");
    }
  }

  // Ensure dates are reasonable (not more than 2 years in past/future)
  const twoYearsAgo = now.subtract(2, "years");
  const twoYearsFromNow = now.add(2, "years");

  if (
    periodStartDate.isBefore(twoYearsAgo) ||
    periodStartDate.isAfter(twoYearsFromNow)
  ) {
    periodStartDate = now.startOf(timeFrame === "month" ? "month" : "isoWeek");
  }

  // Validate that periodStartDate aligns with the timeFrame boundary
  const expectedStartBoundary = timeFrame === "month" ? "month" : "isoWeek";
  const alignedStartDate = periodStartDate.startOf(expectedStartBoundary).utc();

  // If the periodStartDate is not at the correct boundary, adjust it
  if (!periodStartDate.isSame(alignedStartDate, "day")) {
    console.warn(
      `Period start date ${periodStartDate.format("YYYY-MM-DD")} ` +
        `is not aligned with ${timeFrame} boundary. ` +
        `Adjusting to ${alignedStartDate.format("YYYY-MM-DD")}.`,
    );
    periodStartDate = alignedStartDate;
  }

  // Ensure final date is UTC
  periodStartDate = periodStartDate.utc();

  return {
    timeFrame,
    periodStartDate,
  };
}

/**
 * Returns default request calendar view settings
 */
export function getDefaultRequestCalendarViewSettings(): RequestCalendarViewSettingsT {
  const now = dayjs.utc();

  return {
    timeFrame: "month",
    periodStartDate: now.startOf("month"),
  };
}
