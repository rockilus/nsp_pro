import dayjs from "dayjs";

export enum DSDSourceType {
  SHIFT_DEMAND = 0,
  DIRECT_REQUIREMENT = 1,
}

export type DailyShiftDemandT = {
  id: string;
  teamId: string;
  scheduleId: string;
  shiftDemandId: string | null;
  coverageSelectorId: string | null;
  sourceType: DSDSourceType;
  date: dayjs.Dayjs;
  shiftId: string;
  count: number;
};
