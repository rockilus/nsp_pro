import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

import { AssignmentT, toAssignmentT } from "./assignment";
import { BreachT, toBreachT } from "./breach";
import { RequestT, toRequestT } from "./request";

dayjs.extend(utc);

export interface SolveRequestT {
  schedule_id: string;
  team_id: string;
}

export enum SolveRequestStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum ScheduleSolveStatus {
  NOT_SOLVED = "NOT_SOLVED",
  SOLVED_NO_BREACH = "SOLVED_NO_BREACH",
  SOLVED_HARD_BREACHED = "SOLVED_HARD_BREACHED",
  SOLVED_SOFT_BREACHED = "SOLVED_SOFT_BREACHED",
  NO_SOLUTION = "NO_SOLUTION",
}

export interface ResultModelT {
  assignments: AssignmentT[];
  breaches: BreachT[];
  requests: RequestT[];
}

export interface SolveTaskStatusResponseT {
  id: string | null;
  solveId: string;
  scheduleId: string;
  teamId: string;
  userId: string;
  requestStatus: SolveRequestStatus;
  solveStatus: ScheduleSolveStatus;
  startedAt: dayjs.Dayjs | null;
  completedAt: dayjs.Dayjs | null;
  errorMessage: string | null;
  result: ResultModelT | null;
}

export const toResultModelT = (data: any): ResultModelT => {
  return {
    assignments: data.assignments.map((assignment: any) =>
      toAssignmentT(assignment)
    ),
    breaches: data.breaches.map((breach: any) => toBreachT(breach)),
    requests: data.requests.map((request: any) => toRequestT(request)),
  };
};

export const toSolveTaskStatusResponseT = (
  data: any
): SolveTaskStatusResponseT => {
  return {
    ...data,
    startedAt: data.startedAt ? dayjs.unix(data.startedAt).utc() : null,
    completedAt: data.completedAt ? dayjs.unix(data.completedAt).utc() : null,
    result: data.result ? toResultModelT(data.result) : null,
  };
};
