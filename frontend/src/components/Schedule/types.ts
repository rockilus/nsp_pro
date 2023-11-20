import dayjs from "dayjs";

// Types for store

export type AssignmentT = {
  id: string;
  workerId: string;
  date: dayjs.Dayjs;
  shiftId: string;
  scheduleId: string;
};

export type ConstraintBreachT = {
  id: string;
  constraintId: string;
  category: string;
  variables: [string, dayjs.Dayjs, string][];
  hardToSoft: boolean;
  description: string;
};

export type CommentsT = {
  constraintBreaches: ConstraintBreachT[];
  missingCoverageDates: dayjs.Dayjs[];
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
  status: string;
  assignments: AssignmentT[];
  comments: CommentsT;
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
  constraintBreach: ConstraintBreachT[];
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
