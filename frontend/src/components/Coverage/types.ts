import dayjs from "dayjs";

export type ShiftDemandT = {
  id: string;
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

export type ColOverlayT = {
  left: number;
  width: number;
  color: string;
  SDOverlays: SDOverlayT[];
};

export type SDOverlayT = {
  top: number;
  left: number;
  height: number;
  width: number;
  color: string;
  widthDivisor: number;
  widthIndex: number;
  shiftDemand: ShiftDemandT;
};
