import dayjs from "dayjs";
// Types
import { StatT } from "../Stats/types";

// Types for store

// Assignment
export type AssignmentT = {
  id: string;
  workerId: string;
  date: dayjs.Dayjs;
  shiftId: string;
  scheduleId: string;
  status: string;
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
export type ScheduleT = {
  id: string;
  teamId: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  solveStatus: string;
  status: string;
  missingCoverageDates: dayjs.Dayjs[];
};

// Solution
export type SolutionT = {
  schedule: ScheduleT;
  assignments: AssignmentT[];
  objectiveBreaches: ObjectiveBreachT[];
  stats: StatT[];
};

// Validate
export type ValidateT = {
  schedule: ScheduleT;
  assignments: AssignmentT[];
};
