import dayjs from "dayjs";

export type VariableT = {
  workerId: string | null;
  date: dayjs.Dayjs;
  shiftId: string;
};

export enum ObjectiveCategory {
  CONSTRAINT = 0,
  REQUEST = 1,
  DAILY_SHIFT_DEMAND = 2,
  DAILY_SHIFT_DEMAND_SPE = 3,
  WORK_TIME_CONTRACT = 4,
  WORK_TIME_DESIRED = 5,
  DUTIES_PER_MONTH = 6,
  LINK_SHIFT = 7,
}

export type BreachT = {
  id: string;
  scheduleId: string;
  objectiveId: string | null;
  objectiveCategory: ObjectiveCategory;
  variables: VariableT[];
  description: string;
  hardToSoft: boolean | null;
};
