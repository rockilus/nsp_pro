import dayjs from "dayjs";

export type CoverageSelectorT = {
  id: string;
  scheduleId: string;
  fullPeriod: boolean;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  coverageId: string;
};
