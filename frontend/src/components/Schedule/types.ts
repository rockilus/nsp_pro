import dayjs from "dayjs";

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
  objctiveId: string;
  objectiveCategory: string;
  variables: VariableT[];
  hardToSoft: boolean;
  description: string;
  scheduleId: string;
};

// Stats
export type StatsOptionsT = {
  id: string;
  teamId: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
};

export type StatT = {
  workerId: string;
  name: string;
  cluster: string;
  value: number;
};

export type StatsT = {
  statsOptions: StatsOptionsT | null;
  stats: StatT[];
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
  schedule: ScheduleT | null;
  status: string;
};

export type RowT = CellT[];

export type CellT = {
  date: dayjs.Dayjs;
  value: string;
  rowSpan: number;
  noCoverage: boolean;
  objectiveBreach: ObjectiveBreachT[];
};

export type ColumnStatsT = {
  name: string;
  label: string;
  columnSpan: number;
  cluster: string;
};
