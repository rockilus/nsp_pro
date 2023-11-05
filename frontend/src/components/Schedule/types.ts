import { type } from "os";

export type AssignmentT = {
  id: string;
  workerId: string;
  date: Date;
  shiftId: string;
  scheduleId: string;
};

export type ConstraintBreachT = {
  id: string;
  constraintId: string;
  category: string;
  variables: [string, Date, string][];
  hardToSoft: boolean;
  description: string;
};

export type CommentsT = {
  constraintBreaches: ConstraintBreachT[];
  missingCoverageDates: Date[];
};

export type ScheduleT = {
  id: string;
  startDate: Date;
  endDate: Date;
  status: string;
  assignments: AssignmentT[];
  comments: CommentsT;
};

export type ShiftIdNameT = {
  id: string;
  name: string;
};

export type WorkerIdNameT = {
  id: string;
  name: string;
};

export type ColumnT = {
  date: Date;
  name: string;
  noCoverage: boolean;
};

export type RowT = CellT[];

export type CellT = {
  date: Date;
  value: string;
  rowSpan: number;
  noCoverage: boolean;
  constraintBreach: boolean;
};

export type ScheduleOptionsT = {
  startDate: Date;
  endDate: Date;
};
