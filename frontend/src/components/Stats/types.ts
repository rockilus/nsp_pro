import dayjs from "dayjs";

// Stats
export type StatsOptionsT = {
  id: string;
  teamId: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
};

export type ShiftPropertyHeaderT = {
  shiftDimensionId: string;
  propertyValue: string | number | boolean;
};

export type StatsHeaderT = {
  id: string;
  statsOptionsId: string;
  type: string;
  value: string;
  shiftsSelected: string;
  shiftIds: string[];
  shiftPropertyHeaders: ShiftPropertyHeaderT[];
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

export type StatT = {
  workerId: string;
  name: string;
  cluster: string;
  value: number;
};

// export type StatsT = {
//   statsOptions: StatsOptionsT | null;
//   stats: StatT[];
// };

// Types for components
export type ColumnStatsT = {
  name: string;
  label: string;
  columnSpan: number;
  cluster: string;
};
