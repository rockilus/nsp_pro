import { type } from "os";

export type AssignmentT = {
  id: string;
  workerId: string;
  date: Date;
  shiftId: string;
  scheduleId: string;
};

export type CommentsT = {
  constraintBreaches: string[];
  missingCoverageDates: Date[];
};

export type ScheduleT = {
  id: string;
  startDate: Date;
  endDate: Date;
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
};
