import dayjs from "dayjs";
import { ShiftWorkerOptionT } from "./constraint";

export type StatsHeaderT = {
  id: string;
  teamId: string;
  statsUnit: string;
  headerUnit: string;
  value: string;
  selectedShifts: ShiftWorkerOptionT[];
  inCustom: boolean;
};

export type StatsValueT = {
  workerId: string;
  headerId: string;
  value: number;
};

export type StatsT = {
  statsHeaders: StatsHeaderT[];
  statsValues: StatsValueT[];
};

export type StatsOptionsT = {
  timeFrame: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  statsUnit: string;
  headerUnit: string;
  selectedShifts: ShiftWorkerOptionT[];
};
