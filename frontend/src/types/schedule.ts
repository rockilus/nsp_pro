import { ReactNode } from 'react';
import dayjs from 'dayjs';
// Types
import { ShiftT } from './shift';
import { RequestT } from './request';
import {
  AssignmentT,
  AssignmentsRecurrencesResultT,
  toAssignmentsRecurrencesResultT,
} from './assignment';
import { BreachT } from './breach';
import { DemandsResultT } from './shiftDemand';
import { ShiftDemandDTO } from './shiftDemand';
import { WorkerT } from './worker';
import { RecurrenceRuleT } from './recurrence';
import { MAX_SCHEDULE_DURATION_MONTHS } from '../constants/constants';

// Schedule
export type QuickStaffingT = {
  workerId: string;
  shiftId: string;
  target: number;
};

export enum ScheduleSolveStatus {
  NOT_SOLVED = 0,
  SOLVED = 1,
  HARD_BREACHED = 2,
  SOFT_BREACHED = 3,
  NO_SOLUTION = 4,
}

export enum ScheduleStatus {
  CAMPAIGN = 0,
  VALIDATED = 1,
}

export type ScheduleT = {
  id: string;
  teamId: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  status: ScheduleStatus;
  missingCoverageDates: dayjs.Dayjs[];
  constraintBuildIds: string[];
  constraintEffectivePeriods: Record<string, PeriodT | null>;
  quickStaffings: QuickStaffingT[];
  createdAt: dayjs.Dayjs;
  updatedAt: dayjs.Dayjs;
  createdBy: string;
  requestDeadline?: dayjs.Dayjs;
  lastReminderSentAt?: dayjs.Dayjs;
};

// Solution
export type SolutionT = {
  schedule: ScheduleT;
  assignments: AssignmentT[];
  objectiveBreaches: BreachT[];
  requests: RequestT[];
  recuperationShiftsNew: ShiftT[];
};

// Validate
export type ValidateT = {
  schedule: ScheduleT;
  assignments: AssignmentT[];
};

// Excel export options
export enum ExportPeriodOptions {
  CURRENT_SELECTION = 0,
  CAMPAIGN = 1,
  ALL = 2,
  CUSTOM = 3,
}

export type ExportOptionsT = {
  periodOption: ExportPeriodOptions;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
};

export type WorkTimeTableDataT = {
  hours: number;
  count: number;
};

export type WorkTimeTableT = {
  duties: WorkTimeTableDataT;
  others: WorkTimeTableDataT;
  workers: WorkTimeTableDataT;
  nbWeeks: number;
};

export type periodDateT = {
  date: dayjs.Dayjs;
  scheduleId: string | null;
  scheduleStatus: ScheduleStatus | null;
};

export type PeriodT = {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
};

export type DuplicateOptionsT = {
  copyAssignments: boolean;
  copyDemands: boolean;
};

export type DuplicateRequestT = {
  sourcePeriod: PeriodT;
  targetPeriod: PeriodT;
  options: DuplicateOptionsT;
};

export type AssignmentDataT = {
  worker: WorkerT;
  shift: ShiftT;
  assignment: AssignmentT;
  recurrence: RecurrenceRuleT | null;
  breaches: BreachT[];
  requests: RequestT[];
};

export type AssignmentsDictT = {
  [key: string]: AssignmentDataT[];
};

// New ShiftDemandDTO-based types
export type ShiftDemandsDataT = {
  shiftDemand: ShiftDemandDTO;
  shift: ShiftT;
};

export type ShiftDemandsDictT = {
  [key: string]: ShiftDemandsDataT;
};

export type WorkerPreferenceCellData = {
  slots: ('morning' | 'afternoon' | 'night')[];
  restriction: 'no_work' | 'no_normal' | 'no_duty' | 'no_specific';
};

export type ScheduleCellDataT = {
  assignmentsData: AssignmentDataT[];
  shiftDemandsData: ShiftDemandsDataT | null;
  requests: RequestT[];
  workerPreferences: WorkerPreferenceCellData[];
};

export type ScheduleCellsDictT = {
  [key: string]: ScheduleCellDataT;
};

export type ScheduleViewSettingsT = {
  timeFrame: 'week' | 'month';
  groupBy: 'shift' | 'worker';
  showBreaches: boolean;
  showAssignments: boolean;
  showDailyShiftDemands: boolean;
  showRequests: boolean;
  showWorkerPreferences: boolean;
  periodStartDate: dayjs.Dayjs;
  // Mobile-specific settings
  mobileSelectedView?: 'worker' | 'team';
  mobileSelectedWorkerId?: string | null;
  mobileWeekStart?: string | null; // ISO date string for landscape week start
};

export type DuplicateResultT = {
  assignments: AssignmentsRecurrencesResultT | null;
  demands: DemandsResultT | null;
};

export const toScheduleT = (data: any): ScheduleT => {
  const constraintEffectivePeriods: Record<string, PeriodT | null> = {};
  if (data.constraintEffectivePeriods) {
    for (const [cbId, periodData] of Object.entries(data.constraintEffectivePeriods)) {
      if (periodData && typeof periodData === 'object') {
        const pd = periodData as { startDate: number; endDate: number };
        constraintEffectivePeriods[cbId] = {
          startDate: dayjs.unix(pd.startDate).utc(),
          endDate: dayjs.unix(pd.endDate).utc(),
        };
      } else {
        constraintEffectivePeriods[cbId] = null;
      }
    }
  }
  return {
    ...data,
    startDate: dayjs.unix(data.startDate).utc(),
    endDate: dayjs.unix(data.endDate).utc(),
    missingCoverageDates: data.missingCoverageDates.map((timeStamp: number) =>
      dayjs.unix(timeStamp).utc(),
    ),
    constraintEffectivePeriods,
    createdAt: dayjs.unix(data.createdAt).utc(),
    updatedAt: dayjs.unix(data.updatedAt).utc(),
    requestDeadline:
      data.requestDeadline != null ? dayjs.unix(data.requestDeadline).utc() : undefined,
    lastReminderSentAt:
      data.lastReminderSentAt != null ? dayjs.unix(data.lastReminderSentAt).utc() : undefined,
  };
};

export const fromScheduleT = (data: ScheduleT): any => {
  const constraintEffectivePeriods: Record<string, { startDate: number; endDate: number } | null> =
    {};
  if (data.constraintEffectivePeriods) {
    for (const [cbId, period] of Object.entries(data.constraintEffectivePeriods)) {
      if (period) {
        constraintEffectivePeriods[cbId] = {
          startDate: period.startDate.unix(),
          endDate: period.endDate.unix(),
        };
      } else {
        constraintEffectivePeriods[cbId] = null;
      }
    }
  }
  return {
    ...data,
    startDate: data.startDate.unix(),
    endDate: data.endDate.unix(),
    missingCoverageDates: data.missingCoverageDates.map((date: dayjs.Dayjs) => date.unix()),
    constraintEffectivePeriods,
    createdAt: data.createdAt.unix(),
    updatedAt: data.updatedAt.unix(),
    requestDeadline: data.requestDeadline?.unix() ?? null,
  };
};

export type RequestDeadlineT = {
  deadlineDate: dayjs.Dayjs | null;
  periodStartDate?: dayjs.Dayjs | null;
  periodEndDate?: dayjs.Dayjs | null;
};

export const toRequestDeadlineT = (data: any): RequestDeadlineT => {
  return {
    deadlineDate: data.deadlineDate != null ? dayjs.unix(data.deadlineDate).utc() : null,
    periodStartDate: data.periodStartDate != null ? dayjs.unix(data.periodStartDate).utc() : null,
    periodEndDate: data.periodEndDate != null ? dayjs.unix(data.periodEndDate).utc() : null,
  };
};

export const fromExportOptionsT = (data: ExportOptionsT): any => {
  return {
    ...data,
    startDate: data.startDate.unix(),
    endDate: data.endDate.unix(),
  };
};

export const fromPeriodT = (data: PeriodT): any => {
  return {
    ...data,
    startDate: data.startDate.unix(),
    endDate: data.endDate.unix(),
  };
};

export const fromDuplicateRequestT = (data: DuplicateRequestT): any => {
  return {
    ...data,
    sourcePeriod: fromPeriodT(data.sourcePeriod),
    targetPeriod: fromPeriodT(data.targetPeriod),
  };
};

export const toDuplicateResultT = (data: any): DuplicateResultT => {
  return {
    assignments: data.assignments ? toAssignmentsRecurrencesResultT(data.assignments) : null,
    demands: data.demands ? data.demands : null,
  };
};

/**
 * Validate that a schedule duration does not exceed the maximum allowed months.
 * Throws an Error when invalid.
 */
export const validateScheduleDuration = (schedule: ScheduleT): void => {
  const maxEnd = schedule.startDate.add(MAX_SCHEDULE_DURATION_MONTHS, 'month');
  if (schedule.endDate.isAfter(maxEnd)) {
    throw new Error(`Schedule duration must be at most ${MAX_SCHEDULE_DURATION_MONTHS} months`);
  }
};

/**
 * Return the latest end date among an array of schedules.
 * Returns `null` when the array is empty or not provided.
 */
export const getLatestScheduleEndDate = (
  schedules: ScheduleT[] | null | undefined,
): dayjs.Dayjs | null => {
  if (!schedules || schedules.length === 0) return null;

  return schedules.reduce((latest: dayjs.Dayjs | null, s: ScheduleT) => {
    if (!latest) return s.endDate;
    return s.endDate.isAfter(latest) ? s.endDate : latest;
  }, null);
};
