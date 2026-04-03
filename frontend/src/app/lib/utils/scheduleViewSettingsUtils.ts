import dayjs from 'dayjs';
import { ScheduleViewSettingsT } from '@/types/schedule';

export interface SerializedScheduleViewSettings {
  timeFrame: 'week' | 'month';
  groupBy: 'shift' | 'worker';
  showBreaches: boolean;
  showAssignments: boolean;
  showDailyShiftDemands: boolean;
  showRequests: boolean;
  periodStartDate: string; // ISO string
  // Mobile-specific settings
  mobileSelectedView?: 'worker' | 'team';
  mobileSelectedWorkerId?: string | null;
  mobileWeekStart?: string | null; // ISO date string
}

/**
 * Computes the period end date from the start date and timeFrame
 */
export function computePeriodEndDate(
  periodStartDate: dayjs.Dayjs,
  timeFrame: 'week' | 'month',
): dayjs.Dayjs {
  return periodStartDate.endOf(timeFrame === 'month' ? 'month' : 'isoWeek');
}

export function validateScheduleViewSettings(
  settings: Partial<ScheduleViewSettingsT>,
  teamUseSolver: boolean,
): ScheduleViewSettingsT {
  const now = dayjs.utc();

  // Validate timeFrame
  const timeFrame = ['week', 'month'].includes(settings.timeFrame as string)
    ? (settings.timeFrame as 'week' | 'month')
    : 'week';

  // Validate groupBy
  const groupBy = ['shift', 'worker'].includes(settings.groupBy as string)
    ? (settings.groupBy as 'shift' | 'worker')
    : 'shift';

  // Validate periodStartDate - ensure it's valid and not too far in the past/future
  let periodStartDate: dayjs.Dayjs;

  // Check if periodStartDate is a valid dayjs object
  if (dayjs.isDayjs(settings.periodStartDate) && settings.periodStartDate.isValid()) {
    // Ensure it's UTC
    periodStartDate = settings.periodStartDate.utc();
  } else {
    // Try to parse as string if it's not a dayjs object
    try {
      const parsed = dayjs.utc(settings.periodStartDate);
      periodStartDate = parsed.isValid() ? parsed : now.startOf('isoWeek');
    } catch {
      periodStartDate = now.startOf('isoWeek');
    }
  }

  // Ensure dates are reasonable (not more than 2 years in past/future)
  const twoYearsAgo = now.subtract(2, 'years');
  const twoYearsFromNow = now.add(2, 'years');

  if (periodStartDate.isBefore(twoYearsAgo) || periodStartDate.isAfter(twoYearsFromNow)) {
    periodStartDate = now.startOf(timeFrame === 'month' ? 'month' : 'isoWeek');
  }

  // Validate that periodStartDate aligns with the timeFrame boundary
  const expectedStartBoundary = timeFrame === 'month' ? 'month' : 'isoWeek';
  const alignedStartDate = periodStartDate.startOf(expectedStartBoundary).utc();

  // If the periodStartDate is not at the correct boundary, adjust it
  if (!periodStartDate.isSame(alignedStartDate, 'day')) {
    console.warn(
      `Period start date ${periodStartDate.format('YYYY-MM-DD')} ` +
        `is not aligned with ${timeFrame} boundary. ` +
        `Adjusting to ${alignedStartDate.format('YYYY-MM-DD')}.`,
    );
    periodStartDate = alignedStartDate;
  }

  // Ensure final date is UTC
  periodStartDate = periodStartDate.utc();

  // Validate mobile-specific settings
  const mobileSelectedView = ['worker', 'team'].includes(settings.mobileSelectedView as string)
    ? (settings.mobileSelectedView as 'worker' | 'team')
    : 'worker';

  const mobileSelectedWorkerId =
    settings.mobileSelectedWorkerId !== undefined ? settings.mobileSelectedWorkerId : null;

  // Validate mobileWeekStart if present
  let mobileWeekStart: string | null = null;
  if (settings.mobileWeekStart) {
    try {
      const parsed = dayjs.utc(settings.mobileWeekStart);
      if (parsed.isValid()) {
        // Ensure it's aligned to the start of an ISO week
        mobileWeekStart = parsed.startOf('isoWeek').format('YYYY-MM-DD');
      }
    } catch {
      // Invalid date, keep as null
    }
  }

  return {
    timeFrame,
    groupBy,
    showBreaches: typeof settings.showBreaches === 'boolean' ? settings.showBreaches : true,
    showAssignments:
      typeof settings.showAssignments === 'boolean' ? settings.showAssignments : true,
    showDailyShiftDemands:
      typeof settings.showDailyShiftDemands === 'boolean'
        ? settings.showDailyShiftDemands
        : teamUseSolver,
    showRequests: typeof settings.showRequests === 'boolean' ? settings.showRequests : true,
    periodStartDate,
    mobileSelectedView,
    mobileSelectedWorkerId,
    mobileWeekStart,
  };
}

export function getDefaultScheduleViewSettings(teamUseSolver: boolean): ScheduleViewSettingsT {
  const now = dayjs.utc();

  return {
    timeFrame: 'week',
    groupBy: 'shift',
    showBreaches: true,
    showAssignments: true,
    showDailyShiftDemands: teamUseSolver,
    showRequests: true,
    periodStartDate: now.startOf('isoWeek'),
    mobileSelectedView: 'worker',
    mobileSelectedWorkerId: null,
    mobileWeekStart: null,
  };
}
