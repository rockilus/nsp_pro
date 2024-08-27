import dayjs from "dayjs";
// Types
import { ShiftT } from "./shift";

export type ShiftDemandT = {
  id: string;
  dayIndex: number; // from 0 to 6
  shift: ShiftT;
  coverageId: string;
};

export type CoverageT = {
  id: string;
  teamId: string;
  name: string;
  shiftDemands: ShiftDemandT[];
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

export type ShiftDemandCalendarT = {
  id: string;
  dayIndex: number; // from 0 to 6
  shift: ShiftT;
  isTwoDays: boolean;
  isSecondDay: boolean;
  startTime: dayjs.Dayjs;
  endTime: dayjs.Dayjs;
  coverageId: string;
};

export type EventT = {
  startHour: number;
  durationHour: number;
  numOverlap: number;
  indexPosition: number;
  maxOverlap: number;
  borderTopRadius: boolean;
  borderBottomRadius: boolean;
  shiftDemand: ShiftDemandT;

  // top: 0,
  // left: 0,
  // width: dayColWidth - 1,
  // height: rowHeight * 2,
  // backgroundColor: "rgba(255, 0, 0, 0.7)",
  // opacity: 0.7,
  // color: "white",
  // borderTopLeftRadius: "0px",
  // borderTopRightRadius: "0px",
  // borderBottomLeftRadius: "4px",
  // borderBottomRightRadius: "4px",
  // position: "absolute",
  // zIndex: 5,
};
