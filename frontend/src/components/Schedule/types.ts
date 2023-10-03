export type AssignmentT = {
  id: string;
  workerId: string;
  date: string;
  shiftId: string;
  scheduleId: string;
};

export type CommentsT = {
  constraintBreaches: string[];
  missingCoverageDates: string[];
};

export type ScheduleT = {
  id: string;
  startDate: string;
  endDate: string;
  assignments: AssignmentT[];
  comments: CommentsT;
};
