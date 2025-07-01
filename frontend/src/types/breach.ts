import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

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

export const toBreachT = (data: any): BreachT => {
  return {
    ...data,
    variables: data.variables.map((variable: any) => {
      const variableT: VariableT = {
        ...variable,
        date: dayjs.utc(variable.date),
      };
      return variableT;
    }),
  };
};
