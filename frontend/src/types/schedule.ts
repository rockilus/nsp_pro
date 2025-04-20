import { ReactNode } from "react";
import dayjs from "dayjs";
// Types
import { ShiftT } from "./shift";
import { RequestT } from "./request";
import { AssignmentT } from "./assignment";
import { BreachT } from "./breach";

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
