import { ReactNode } from "react";
import dayjs from "dayjs";
// Types
import { ShiftT } from "./shift";
import { RequestT } from "./request";
import { AssignmentT } from "./assignment";
import { BreachT } from "./breach";
import { OccurrenceType } from "./recurrence";
import { DailyShiftDemandT } from "./daily-shift-demand";
import { WorkerT } from "./worker";
import { RecurrenceRuleT } from "./recurrence";

// Schedule
export type QuickStaffingT = {
  workerId: string;
  shiftId: string;
  target: number;
};

export enum SolveDetailsStatus {
  PENDING = 0,
  STARTED = 1,
  RETRY = 2,
  FAILURE = 3,
  SUCCESS = 4,
}

export type SolveDetailsT = {
  taskId: string;
  status: SolveDetailsStatus;
  updatedAt: dayjs.Dayjs;
  result: { [key: string]: any } | null;
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
  lastModifiedDates: number;
  solveDetails: SolveDetailsT | null;
  solveStatus: ScheduleSolveStatus;
  status: ScheduleStatus;
  missingCoverageDates: dayjs.Dayjs[];
  constraintBuildIds: string[];
  quickStaffings: QuickStaffingT[];
  lastUpdatedDsds: number | null;
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

export type LHSTabContentT = {
  name: string;
  label: string;
  content: ReactNode | null;
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
  occurrenceType: OccurrenceType;
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

export type DailyShiftDemandsDataT = {
  dailyShiftDemands: DailyShiftDemandT[];
  shift: ShiftT;
};

export type DailyShiftDemandsDictT = {
  [key: string]: DailyShiftDemandsDataT;
};

export type ScheduleCellDataT = {
  assignmentsData: AssignmentDataT[];
  dailyShiftDemandsData: DailyShiftDemandsDataT | null;
  requests: RequestT[];
};

export type ScheduleCellsDictT = {
  [key: string]: ScheduleCellDataT;
};

export type ScheduleViewSettingsT = {
  timeFrame: "week" | "month";
  groupBy: "shift" | "worker";
  showBreaches: boolean;
  showAssignments: boolean;
  showDailyShiftDemands: boolean;
  showRequests: boolean;
};

export const toSolveDetailsT = (data: any): SolveDetailsT => {
  return {
    ...data,
    updatedAt: dayjs.unix(data.updatedAt).utc(),
  };
};

export const fromSolveDetailsT = (data: SolveDetailsT): any => {
  return {
    ...data,
    updatedAt: data.updatedAt.unix(),
  };
};

export const toScheduleT = (data: any): ScheduleT => {
  return {
    ...data,
    startDate: dayjs.unix(data.startDate).utc(),
    endDate: dayjs.unix(data.endDate).utc(),
    solveDetails: data.solveDetails ? toSolveDetailsT(data.solveDetails) : null,
    missingCoverageDates: data.missingCoverageDates.map((timeStamp: number) =>
      dayjs.unix(timeStamp).utc()
    ),
  };
};

export const fromScheduleT = (data: ScheduleT): any => {
  return {
    ...data,
    startDate: data.startDate.unix(),
    endDate: data.endDate.unix(),
    solveDetails: data.solveDetails
      ? fromSolveDetailsT(data.solveDetails)
      : null,
    missingCoverageDates: data.missingCoverageDates.map((date: dayjs.Dayjs) =>
      date.unix()
    ),
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
