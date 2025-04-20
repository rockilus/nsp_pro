import dayjs from "dayjs";
import { ShiftT } from "./shift";

export type ShiftDemandT = {
  id: string;
  dayIndex: number; // from 0 to 6
  shiftId: string;
  coverageId: string;
  lastModified: number;
};

export type ShiftDemandCalendarT = {
  id: string;
  dayIndex: number; // from 0 to 6
  shift: ShiftT;
  isTwoDays: boolean;
  isSecondDay: boolean;
  startTime: dayjs.Dayjs;
  endTime: dayjs.Dayjs;
  coverageId: string;
  lastModified: number;
};

export type EventT = {
  startHour: number;
  durationHour: number;
  startXNumerator: number;
  startXDenominator: number;
  widthNumerator: number;
  widthDenominator: number;
  indexPosition: number;
  maxOverlap: number;
  borderTopRadius: boolean;
  borderBottomRadius: boolean;
  shiftDemand: ShiftDemandT;
  shift: ShiftT;
};
