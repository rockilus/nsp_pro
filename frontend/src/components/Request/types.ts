import dayjs from "dayjs";

export type RequestT = {
  id: string;
  workerId: string;
  date: dayjs.Dayjs;
  shiftId: string;
  hard: boolean;
  status: string;
};
