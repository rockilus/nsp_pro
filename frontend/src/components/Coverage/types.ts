import { ShiftT } from "../Shift/types";

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
