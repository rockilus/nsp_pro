import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
// Types
import { AttributeT } from './attribute';

dayjs.extend(utc);

export enum ShiftType {
  NORMAL = 0,
  DUTY = 1,
  REST = 2,
  LEAVE = 3,
  ON_CALL = 4,
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

export type StaffingT = {
  specialtyId: string | null;
  staffing: number;
};

export type ShiftT = {
  id: string;
  teamId: string;
  name: string;
  acronym: string;
  acronymCustom: boolean;
  startTime: dayjs.Dayjs;
  endTime: dayjs.Dayjs;
  staffing: StaffingT[];
  color: string;
  shiftType: ShiftType;
  restType: ShiftRestType;
  leaveType: ShiftLeaveType;
  recuperationTime: number;
  recuperationDutyId: string | null;
  deleted: boolean;
  useCustomWorkTime: boolean;
  customWorkTimeMinutes: number;
  attributes: AttributeT[];
};

export type LinkShiftT = {
  id: string;
  teamId: string;
  shiftIds: string[];
};

// Helper to transform API data to ShiftT
export const toShiftT = (data: any): ShiftT => {
  return {
    ...data,
    startTime: dayjs.unix(data.startTime).utc(),
    endTime: dayjs.unix(data.endTime).utc(),
  };
};

// Helper to transform ShiftT to API data format
export const fromShiftT = (data: ShiftT): any => {
  return {
    ...data,
    startTime: data.startTime.unix(),
    endTime: data.endTime.unix(),
  };
};
