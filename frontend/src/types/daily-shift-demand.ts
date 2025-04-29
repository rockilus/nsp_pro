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

export type DemandsResultT = {
  demandsCreated: DailyShiftDemandT[];
  demandsRead: DailyShiftDemandT[];
  demandsUpdated: DailyShiftDemandT[];
  demandsDeletedIds: string[];
};

export const toDailyShiftDemandT = (data: any): DailyShiftDemandT => {
  return {
    ...data,
    date: dayjs.unix(data.date).utc(),
  };
};

export const fromDailyShiftDemandT = (data: DailyShiftDemandT): any => {
  return {
    ...data,
    date: data.date.unix(),
  };
};

export const toDemandsResultT = (data: any): DemandsResultT => {
  return {
    demandsCreated: data.demandsCreated.map((demand: any) =>
      toDailyShiftDemandT(demand)
    ),
    demandsRead: data.demandsRead.map((demand: any) =>
      toDailyShiftDemandT(demand)
    ),
    demandsUpdated: data.demandsUpdated.map((demand: any) =>
      toDailyShiftDemandT(demand)
    ),
    demandsDeletedIds: data.demandsDeletedIds,
  };
};
export const fromDemandsResultT = (data: DemandsResultT): any => {
  return {
    demandsCreated: data.demandsCreated.map((demand: DailyShiftDemandT) =>
      fromDailyShiftDemandT(demand)
    ),
    demandsRead: data.demandsRead.map((demand: DailyShiftDemandT) =>
      fromDailyShiftDemandT(demand)
    ),
    demandsUpdated: data.demandsUpdated.map((demand: DailyShiftDemandT) =>
      fromDailyShiftDemandT(demand)
    ),
    demandsDeletedIds: data.demandsDeletedIds,
  };
};
