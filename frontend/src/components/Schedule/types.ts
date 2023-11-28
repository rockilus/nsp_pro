import dayjs from "dayjs";
import { VariableDeclaration } from "typescript";

// Types for store

export type AssignmentT = {
  id: string;
  workerId: string;
  date: dayjs.Dayjs;
  shiftId: string;
  scheduleId: string;
};

export type VariableT = {
  workerId: string;
  date: dayjs.Dayjs;
  shiftId: string;
};

export type ObjectiveBreachT = {
  id: string;
  objctiveId: string;
  objectiveCategory: string;
  variables: VariableT[];
  hardToSoft: boolean;
  description: string;
  scheduleId: string;
};

export type StatT = {
  workerId: string;
  name: string;
  cluster: string;
  value: number;
};

export type ScheduleT = {
  id: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  solveStatus: string;
  status: string;
  missingCoverageDates: dayjs.Dayjs[];
  // assignments: AssignmentT[];
  // objectiveBreaches: ObjectiveBreachT[];
  // stats: StatT[];
};

export type SolutionT = {
  schedule: ScheduleT;
  assignments: AssignmentT[];
  objectiveBreaches: ObjectiveBreachT[];
  stats: StatT[];
};

// Types for components

export type ShiftIdNameT = {
  id: string;
  name: string;
};

export type WorkerIdNameT = {
  id: string;
  name: string;
};

export type ColumnT = {
  date: dayjs.Dayjs;
  name: string;
  noCoverage: boolean;
};

export type RowT = CellT[];

export type CellT = {
  date: dayjs.Dayjs;
  value: string;
  rowSpan: number;
  noCoverage: boolean;
  objectiveBreach: ObjectiveBreachT[];
};

export type ScheduleOptionsT = {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
};

export type ColumnStatsT = {
  name: string;
  label: string;
  columnSpan: number;
  cluster: string;
};
