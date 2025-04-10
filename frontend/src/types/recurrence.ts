import dayjs from "dayjs";
import { AssignmentT } from "./schedule";
import { DailyShiftDemandT } from "./schedule";

export enum RecurrenceType {
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

export type RecurrenceRuleT = {
  id: string;
  teamId: string;
  recurrenceType: RecurrenceType;
  assignment: AssignmentT | null;
  dailyShiftDemand: DailyShiftDemandT | null;
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

export enum UpdateScope {
  SINGLE = 0,
  FUTURE = 1,
  ALL = 2,
}
