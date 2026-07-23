import dayjs from 'dayjs';
import { RequestT } from './request';
import { BreachT } from './breach';
import { ShiftT } from './shift';
import { WorkerT } from './worker';
import { RecurrenceRuleT, toRecurrenceRuleT } from './recurrence';
import { RotationT, toRotationT } from './rotation';

// class AssignmentSource(Enum):
//     MANUAL = "manual"
//     SOLVER = "solver"
//     DUPLICATE = "duplicate"
//     RECURRENCE = "recurrence"
//     REQUEST = "request"

export enum AssignmentSource {
  MANUAL = 'manual',
  SOLVER = 'solver',
  DUPLICATE = 'duplicate',
  RECURRENCE = 'recurrence',
  REQUEST = 'request',
  ROTATION = 'rotation',
}

export type AssignmentT = {
  id: string;
  teamId: string;
  scheduleId: string | null;
  workerId: string;
  date: dayjs.Dayjs;
  shiftId: string;
  fixed: boolean;
  source: AssignmentSource;
  referenceAssignmentId: string | null;
  sourceId: string | null;
};

export type AssignmentDataDictT = {
  worker: WorkerT;
  shift: ShiftT;
  assignment: AssignmentT;
  recurrence: RecurrenceRuleT | null;
  rotation: RotationT | null;
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
  haveDemand: boolean;
};

export type AssignmentsRecurrencesResultT = {
  assignmentsCreated: AssignmentT[];
  assignmentsRead: AssignmentT[];
  assignmentsUpdated: AssignmentT[];
  assignmentsDeletedIds: string[];
  recurrenceCreated: RecurrenceRuleT | null;
  recurrencesRead: RecurrenceRuleT[];
  recurrenceUpdated: RecurrenceRuleT | null;
  recurrencesDeletedIds: string[];
  rotations: RotationT[];
};

export const toAssignmentT = (data: any): AssignmentT => {
  return {
    ...data,
    date: dayjs.unix(data.date).utc(),
  };
};

export const fromAssignmentT = (data: AssignmentT): any => {
  return {
    ...data,
    date: data.date.unix(),
  };
};

export const toAssignmentsRecurrencesResultT = (data: any): AssignmentsRecurrencesResultT => {
  return {
    assignmentsCreated: data.assignmentsCreated.map((assignment: any) => toAssignmentT(assignment)),
    assignmentsRead: data.assignmentsRead.map((assignment: any) => toAssignmentT(assignment)),
    assignmentsUpdated: data.assignmentsUpdated.map((assignment: any) => toAssignmentT(assignment)),
    assignmentsDeletedIds: data.assignmentsDeletedIds || [],
    recurrenceCreated: data.recurrenceCreated ? toRecurrenceRuleT(data.recurrenceCreated) : null,
    recurrencesRead: data.recurrencesRead.map((recurrence: any) => toRecurrenceRuleT(recurrence)),
    recurrenceUpdated: data.recurrenceUpdated ? toRecurrenceRuleT(data.recurrenceUpdated) : null,
    recurrencesDeletedIds: data.recurrencesDeletedIds || [],
    rotations: (data.rotations || []).map((rotation: any) => toRotationT(rotation)),
  };
};
