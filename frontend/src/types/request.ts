import dayjs from "dayjs";

export enum RequestStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  DISABLED = 3,
}

export type RequestT = {
  id: string;
  teamId: string;
  workerId: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  shiftId: string;
  negative: boolean;
  hard: boolean;
  status: RequestStatus;
  active: boolean;
};
