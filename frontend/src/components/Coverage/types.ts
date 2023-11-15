import dayjs from "dayjs";

export type ShiftDemandT = {
  dayIndex: number; // from 0 to 6
  shiftId: string;
  quantity: number;
  startTime: dayjs.Dayjs;
  duration: number; // in minutes
  coverageId: string;
};

export type CoverageT = {
  id: string;
  name: string;
  shiftDemands: ShiftDemandT[];
};

export type ShiftT = {
  id: string;
  name: string;
  // ... any other properties of a shift
};
