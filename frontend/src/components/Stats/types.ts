import dayjs from "dayjs";
import { TemplateOptionValueT } from "../Constraint/types";

export type StatsHeaderT = {
  id: string;
  statsOptionsId: string;
  statsUnit: string;
  headerUnit: string;
  value: string;
  selectedShifts: TemplateOptionValueT[];
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
  id: string;
  teamId: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  customHeaders: StatsHeaderT[];
};

export type StatT = {
  workerId: string;
  name: string;
  cluster: string;
  value: number;
};

export type StatsShiftOptionsT = Record<string, TemplateOptionValueT[]>;

export type StatsOptionsAndStatsT = {
  statsOptions: StatsOptionsT | null;
  stats: StatsT;
};
