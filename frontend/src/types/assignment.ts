import dayjs from "dayjs";
import { RequestT } from "./request";
import { BreachT } from "./breach";
import { ShiftT } from "./shift";
import { WorkerT } from "./worker";

export type AssignmentT = {
  id: string;
  teamId: string;
  scheduleId: string | null;
  workerId: string;
  date: dayjs.Dayjs;
  shiftId: string;
  fixed: boolean;
  referenceAssignmentId: string | null;
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

export type CreateAssignmentT = {
  scheduleId: string | null;
  workerId: string | null;
  shiftId: string | null;
  date: dayjs.Dayjs | null;
};
