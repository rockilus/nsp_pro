import dayjs from "dayjs";
import { ScheduleViewSettingsT } from "@/types/schedule";

export interface SerializedScheduleViewSettings {
  timeFrame: "week" | "month";
  groupBy: "shift" | "worker";
  showBreaches: boolean;
  showAssignments: boolean;
  showDailyShiftDemands: boolean;
  showRequests: boolean;
  periodStartDate: string; // ISO string
}

/**
 * Computes the period end date from the start date and timeFrame
 */
export function computePeriodEndDate(
  periodStartDate: dayjs.Dayjs,
  timeFrame: "week" | "month"
): dayjs.Dayjs {
  console.log(
    `Computing period end date for start: ${periodStartDate.format()} and timeFrame: ${timeFrame}`
  );

  return periodStartDate.endOf(timeFrame === "month" ? "month" : "isoWeek");
}

export function validateScheduleViewSettings(
  settings: Partial<ScheduleViewSettingsT>,
  teamUseSolver: boolean
): ScheduleViewSettingsT {
  const now = dayjs.utc();

  // Validate timeFrame
  const timeFrame = ["week", "month"].includes(settings.timeFrame as string)
    ? (settings.timeFrame as "week" | "month")
    : "week";

  // Validate groupBy
  const groupBy = ["shift", "worker"].includes(settings.groupBy as string)
    ? (settings.groupBy as "shift" | "worker")
    : "shift";

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
      periodStartDate = parsed.isValid() ? parsed : now.startOf("isoWeek");
    } catch {
      periodStartDate = now.startOf("isoWeek");
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

  // Ensure final date is UTC
  periodStartDate = periodStartDate.utc();

  return {
    timeFrame,
    groupBy,
    showBreaches:
      typeof settings.showBreaches === "boolean" ? settings.showBreaches : true,
    showAssignments:
      typeof settings.showAssignments === "boolean"
        ? settings.showAssignments
        : true,
    showDailyShiftDemands:
      typeof settings.showDailyShiftDemands === "boolean"
        ? settings.showDailyShiftDemands
        : teamUseSolver,
    showRequests:
      typeof settings.showRequests === "boolean" ? settings.showRequests : true,
    periodStartDate,
  };
}

export function getDefaultScheduleViewSettings(
  teamUseSolver: boolean
): ScheduleViewSettingsT {
  const now = dayjs.utc();

  return {
    timeFrame: "week",
    groupBy: "shift",
    showBreaches: true,
    showAssignments: true,
    showDailyShiftDemands: teamUseSolver,
    showRequests: true,
    periodStartDate: now.startOf("isoWeek"),
  };
}
