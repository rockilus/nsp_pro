import dayjs from "dayjs";

export type ShiftDimensionT = {
  id: string;
  name: string;
  entryType: string;
  entryOptions: string[];
};

export type ShiftPropertyT = {
  id: string;
  value: string | number | boolean;
  shiftId: string;
  shiftDimensionId: string;
};

export type ShiftT = {
  id: string;
  name: string;
  startTime: dayjs.Dayjs;
  endTime: dayjs.Dayjs;
  isTimeOff: boolean;
  staffing: number;
  color: string;
  shiftProperties: ShiftPropertyT[];
};

export type ShiftDefaultT = {
  id: string;
  name: string;
  startTime: dayjs.Dayjs;
  endTime: dayjs.Dayjs;
  isTimeOff: boolean;
  staffing: number;
  color: string;
};
