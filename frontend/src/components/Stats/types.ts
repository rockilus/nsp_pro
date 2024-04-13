import dayjs from "dayjs";

// Stats
export type StatsOptionsT = {
  id: string;
  teamId: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
};

export type StatT = {
  workerId: string;
  name: string;
  cluster: string;
  value: number;
};

export type StatsT = {
  statsOptions: StatsOptionsT | null;
  stats: StatT[];
};

// Types for components
export type ColumnStatsT = {
  name: string;
  label: string;
  columnSpan: number;
  cluster: string;
};
