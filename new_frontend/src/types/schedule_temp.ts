import dayjs from "dayjs";
// Types
import { ShiftT } from "./shift";
import { WorkerT } from "./worker";
import { RequestT } from "./request";

// Assignment
export type AssignmentT = {
  id: string;
  workerId: string;
  date: dayjs.Dayjs;
  shiftId: string;
  scheduleId: string;
  status: string;
  fixed: boolean;
};

// Objective Breach
export type VariableT = {
  workerId: string;
  date: dayjs.Dayjs;
  shiftId: string;
};

export type ObjectiveBreachT = {
  id: string;
  objectiveId: string;
  objectiveCategory: string;
  variables: VariableT[];
  hardToSoft: boolean;
  description: string;
  scheduleId: string;
};

// Schedule
export type QuickStaffingT = {
  workerId: string;
  shiftId: string;
  target: number;
};

export type ScheduleT = {
  id: string;
  teamId: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  solveStatus: string;
  status: string;
  missingCoverageDates: dayjs.Dayjs[];
  constraintBuildIds: string[];
  quickStaffings: QuickStaffingT[];
};

// Solution
export type SolutionT = {
  schedule: ScheduleT;
  assignments: AssignmentT[];
  objectiveBreaches: ObjectiveBreachT[];
  requests: RequestT[];
};

// Validate
export type ValidateT = {
  schedule: ScheduleT;
  assignments: AssignmentT[];
};

export type SelectedCellT = {
  assignment: AssignmentT;
  worker: WorkerT;
  shift: ShiftT;
  requests: RequestT[];
  breaches: ObjectiveBreachT[];
};
