import dayjs from "dayjs";

export enum RequestStatus {
  PENDING = "pending", // Waiting for manager review
  APPROVED = "approved", // Approved and must be fulfilled
  DENIED = "denied", // Denied and must not be fulfilled
  DEFERRED = "deferred", // Left to the algorithm to decide
}

export enum FulfillmentStatus {
  NOT_PROCESSED = "not_processed",
  FULFILLED = "fulfilled",
  UNFULFILLED = "unfulfilled",
}
export enum RequestType {
  WORK_DEMAND = "work_demand",
  LEAVE = "leave",
}

export type RequestT = {
  id: string;
  teamId: string;
  requestType: RequestType;
  workerId: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  shiftId: string;
  negative: boolean;
  hard: boolean;
  status: RequestStatus;
  fulfillment: FulfillmentStatus;
  comment: string;
  createdAt: dayjs.Dayjs;
  active: boolean;
};

export const toRequestT = (data: any) => {
  const r: RequestT = {
    ...data,
    startDate: dayjs.unix(data.startDate).utc(),
    endDate: dayjs.unix(data.endDate).utc(),
    createdAt: dayjs.unix(data.createdAt).utc(),
  };
  return r;
};

export const fromRequestT = (data: RequestT) => {
  return {
    ...data,
    startDate: data.startDate.unix(),
    endDate: data.endDate.unix(),
    createdAt: data.createdAt.unix(),
  };
};
