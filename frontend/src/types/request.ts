import dayjs from "dayjs";

export type RequestT = {
  id: string;
  workerId: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  shiftId: string;
  hard: boolean;
  status: string;
  active: boolean;
};
