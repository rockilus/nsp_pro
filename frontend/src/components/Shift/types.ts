import dayjs from "dayjs";

export type ShiftDimensionT = {
  id: string;
  isRest: boolean;
  teamId: string;
  name: string;
  entryType: string;
  entryOptions: string[];
};

export type ShiftPropertyT = {
  id: string;
  value: string | number | boolean | string[];
  shiftId: string;
  shiftDimensionId: string;
};

export type ShiftT = {
  id: string;
  teamId: string;
  name: string;
  startTime: dayjs.Dayjs;
  endTime: dayjs.Dayjs;
  isTimeOff: boolean;
  staffing: number;
  color: string;
  shiftProperties: ShiftPropertyT[];
};

export type RestShiftT = {
  id: string;
  teamId: string;
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

export type NewShiftDimensionT = {
  newDimension: ShiftDimensionT;
  newProperties: ShiftPropertyT[];
};
