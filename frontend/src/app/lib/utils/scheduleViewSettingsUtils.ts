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
  periodEndDate: string; // ISO string
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

  // Validate dates - ensure they're valid and not too far in the past/future
  let periodStartDate: dayjs.Dayjs;
  let periodEndDate: dayjs.Dayjs;

  // Check if periodStartDate is a valid dayjs object
  if (
    dayjs.isDayjs(settings.periodStartDate) &&
    settings.periodStartDate.isValid()
  ) {
    periodStartDate = settings.periodStartDate;
  } else {
    // Try to parse as string if it's not a dayjs object
    try {
      const parsed = dayjs(settings.periodStartDate);
      periodStartDate = parsed.isValid() ? parsed : now.startOf("isoWeek");
    } catch {
      periodStartDate = now.startOf("isoWeek");
    }
  }

  // Check if periodEndDate is a valid dayjs object
  if (
    dayjs.isDayjs(settings.periodEndDate) &&
    settings.periodEndDate.isValid()
  ) {
    periodEndDate = settings.periodEndDate;
  } else {
    // Try to parse as string if it's not a dayjs object
    try {
      const parsed = dayjs(settings.periodEndDate);
      periodEndDate = parsed.isValid() ? parsed : now.endOf("isoWeek");
    } catch {
      periodEndDate = now.endOf("isoWeek");
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

  if (
    periodEndDate.isBefore(twoYearsAgo) ||
    periodEndDate.isAfter(twoYearsFromNow)
  ) {
    periodEndDate = now.endOf(timeFrame === "month" ? "month" : "isoWeek");
  }

  // Ensure start date is before end date
  if (periodEndDate.isBefore(periodStartDate)) {
    periodEndDate = periodStartDate.endOf(
      timeFrame === "month" ? "month" : "isoWeek"
    );
  }

  // Ensure the period isn't too long (max 2 months for performance)
  const maxPeriodDays = 62; // ~2 months
  if (periodEndDate.diff(periodStartDate, "days") > maxPeriodDays) {
    periodEndDate = periodStartDate.add(maxPeriodDays, "days");
  }

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
    periodEndDate,
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
    periodEndDate: now.endOf("isoWeek"),
  };
}
