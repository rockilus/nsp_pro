import { ReactNode } from "react";
import dayjs from "dayjs";
// Types
import { ShiftT } from "./shift";
import { WorkerT } from "./worker";
import { RequestT } from "./request";

// Assignment
export type AssignmentT = {
  id: string;
  teamId: string;
  scheduleId: string;
  workerId: string;
  date: dayjs.Dayjs;
  shiftId: string;
  fixed: boolean;
};

// Daily Shift Demand
export enum DSDSourceType {
  SHIFT_DEMAND = 0,
  SHIFT_DEMAND_MODIFY = 1,
  SCHEDULE = 2,
}

export type DailyShiftDemandT = {
  id: string;
  teamId: string;
  scheduleId: string;
  shiftDemandId: string | null;
  sourceType: DSDSourceType;
  date: dayjs.Dayjs;
  shiftId: string;
  count: number;
};

// Breach
export type VariableT = {
  workerId: string | null;
  date: dayjs.Dayjs;
  shiftId: string;
};

export enum ObjectiveCategory {
  CONSTRAINT = 0,
  REQUEST = 1,
  DAILY_SHIFT_DEMAND = 2,
  DAILY_SHIFT_DEMAND_SPE = 3,
  WORK_TIME_CONTRACT = 4,
  WORK_TIME_DESIRED = 5,
  DUTIES_PER_MONTH = 6,
  LINK_SHIFT = 7,
}

export type BreachT = {
  id: string;
  scheduleId: string;
  objectiveId: string | null;
  objectiveCategory: ObjectiveCategory;
  variables: VariableT[];
  description: string;
  hardToSoft: boolean | null;
};

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
  solveDetails: SolveDetailsT | null;
  solveStatus: ScheduleSolveStatus;
  status: ScheduleStatus;
  missingCoverageDates: dayjs.Dayjs[];
  constraintBuildIds: string[];
  quickStaffings: QuickStaffingT[];
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
  content: ReactNode | null;
};

export type AssignmentDataDictT = {
  worker: WorkerT;
  shift: ShiftT;
  assignment: AssignmentT;
  breaches: BreachT[];
  requests: RequestT[];
};

export type AssignmentDictT = {
  [key: string]: AssignmentDataDictT[];
};
