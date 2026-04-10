import dayjs from 'dayjs';

export enum OccurrenceType {
  ASSIGNMENT = 0,
  DAILY_SHIFT_DEMAND = 1,
}

export enum FrequencyType {
  DAY = 0,
  WEEK = 1,
  MONTH = 2,
  YEAR = 3,
}

export enum MonthRepeatType {
  DAY_IN_MONTH = 0,
  WEEKDAY = 1,
}

export enum RecurrenceEndType {
  NEVER = 0,
  END_DATE = 1,
  NUMBER_OF_OCCURRENCES = 2,
}

export type OccurrenceInfoT = {
  shiftId: string | null;
  workerId: string | null;
  count: number | null;
};

export type RecurrenceRuleT = {
  id: string;
  teamId: string;
  occurrenceType: OccurrenceType;
  occurrenceInfo: OccurrenceInfoT;
  repeatEvery: number;
  frequencyType: FrequencyType;
  weekDays: number[];
  monthRepeatType: MonthRepeatType | null;
  recurrenceEndType: RecurrenceEndType;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs | null;
  numberOfOccurrences: number | null;
};

export type RecurrenceExclusionT = {
  id: string;
  recurrenceRuleId: string;
  excludedDate: dayjs.Dayjs;
};

export enum RecurrenceUpdateScope {
  NONE = 0,
  SINGLE = 1,
  FUTURE = 2,
  ALL = 3,
}

export const toRecurrenceRuleT = (data: any): RecurrenceRuleT => {
  return {
    ...data,
    startDate: dayjs.unix(data.startDate).utc(),
    endDate: data.endDate ? dayjs.unix(data.endDate).utc() : null,
  };
};

export const fromRecurrenceRuleT = (data: RecurrenceRuleT): any => {
  return {
    ...data,
    startDate: data.startDate.unix(),
    endDate: data.endDate ? data.endDate.unix() : null,
  };
};
