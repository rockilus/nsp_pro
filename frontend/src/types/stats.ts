import dayjs from "dayjs";
import { ShiftWorkerOptionT } from "./constraint";

export enum StatsTimeFrameOptions {
  CAMPAING = 0,
  LTM = 1,
  CUSTOM = 2,
}

export enum StatsUnitOptions {
  FAVORITES = 0,
  NB_DAYS_WORKED = 1,
  TIME_WORKED = 2,
  NB_SHIFTS_WORKED = 3,
  NB_REST_DAYS = 4,
  NB_REST_SHIFTS = 5,
  NB_TIMES_SHIFT = 6,
  NB_TIMES_REST = 7,
}

export enum HeaderUnitOptions {
  WEEKDAY = 0,
  WEEK = 1,
  MONTH = 2,
  YEAR = 3,
  ALL = 4,
  SHIFT = 5,
}

export type StatsHeaderT = {
  id: string;
  teamId: string;
  statsUnit: StatsUnitOptions;
  headerUnit: HeaderUnitOptions;
  value: string;
  selectedShifts: ShiftWorkerOptionT[];
  isFavorite: boolean;
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
  timeFrame: StatsTimeFrameOptions;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  statsUnit: StatsUnitOptions;
  headerUnit: HeaderUnitOptions;
  selectedShifts: ShiftWorkerOptionT[];
};
