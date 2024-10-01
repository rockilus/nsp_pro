import dayjs from "dayjs";
// Types
import { AttributeT } from "./attribute";

export enum ShiftType {
  NORMAL = 0,
  DUTY = 1,
  REST = 2,
  LEAVE = 3,
}

export enum ShiftRestType {
  NONE = 0,
  OFF = 1,
  RECUPERATION = 2,
}

export enum ShiftLeaveType {
  NONE = 0,
  VACATION = 1,
  VACATION_MORNING = 2,
  VACATION_AFTERNOON = 3,
  SICK = 4,
  SICK_MORNING = 5,
  SICK_AFTERNOON = 6,
  UNPAID = 7,
  UNPAID_MORNING = 8,
  UNPAID_AFTERNOON = 9,
  PARENTAL_LEAVE = 10,
  PARENTAL_LEAVE_MORNING = 11,
  PARENTAL_LEAVE_AFTERNOON = 12,
  TRAINING = 13,
  TRAINING_MORNING = 14,
  TRAINING_AFTERNOON = 15,
  OTHER = 16,
  OTHER_MORNING = 17,
  OTHER_AFTERNOON = 18,
}

export type ShiftT = {
  id: string;
  teamId: string;
  name: string;
  startTime: dayjs.Dayjs;
  endTime: dayjs.Dayjs;
  staffing: number;
  color: string;
  shiftType: ShiftType;
  restType: ShiftRestType;
  leaveType: ShiftLeaveType;
  recuperationTime: number;
  recuperationDutyId: string | null;
  deleted: boolean;
  attributes: AttributeT[];
};
