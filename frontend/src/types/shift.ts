import dayjs from "dayjs";

export type ShiftDimensionT = {
  id: string;
  isRest: boolean;
  teamId: string;
  name: string;
  entryType: string;
  entryOptions: string[];
  deleted: boolean;
};

export type ShiftPropertyT = {
  id: string;
  value: string | number | boolean | string[];
  shiftId: string;
  shiftDimensionId: string;
};

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
  isTimeOff: boolean;
  staffing: number;
  color: string;
  leaveType: ShiftLeaveType;
  deleted: boolean;
  shiftProperties: ShiftPropertyT[];
};

export type NewShiftDimensionT = {
  newDimension: ShiftDimensionT;
  newProperties: ShiftPropertyT[];
};
