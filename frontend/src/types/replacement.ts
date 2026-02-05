import dayjs from "dayjs";
import { BreachT } from "./breach";

export type ReplacementCategoryT = "can_do" | "could_do" | "cant_do";

export type FilterHitsT = {
  isntFilteredOut: boolean;
  filterLabels: string[];
};

export type OverlapHitsT = {
  hasntOverlap: boolean;
  overlapAssignmentIds: string[];
};

export type ConstraintHitsT = {
  meetsConstraints: boolean;
  breaches: BreachT[];
};

export type RequestHitsT = {
  hasNoRequestConflict: boolean;
  conflictingRequestIds: string[];
};

export type MonthlyDutiesImplicationsT = {
  newNumberMonthlyDuties: number;
  newMonthlyDutiesDelta: number;
  meetsTarget: boolean;
};

export type WeeklyWorkTimeImplicationsT = {
  newWeeklyWorkedMinutes: number;
  newWeeklyTimeDeltaMinutes: number;
  meetsTarget: boolean;
};

export type LTMIndicatorT = {
  count: number;
  lastDate: dayjs.Dayjs | null;
};

export type ReplacementImplicationsT = {
  // Can't do (hard constraints)
  isEmployed: boolean;
  hasSpecialty: boolean;
  isntOnLeave: boolean;
  filterHits: FilterHitsT;
  overlapHits: OverlapHitsT;
  hardConstraintHits: ConstraintHitsT;
  requestHits: RequestHitsT;

  // Could do (soft constraints)
  softConstraintHits: ConstraintHitsT;
  newMonthlyDuties: MonthlyDutiesImplicationsT;
  newWeeklyTime: WeeklyWorkTimeImplicationsT;

  // Indicators (informational)
  nbTimesDidShiftLtm: LTMIndicatorT;
  nbTimesWorkedWeekdayLtm: LTMIndicatorT;
};

export type ReplacementCandidateT = {
  workerId: string;
  workerName: string;
  rank: number;
  replacementCategory: ReplacementCategoryT;
  replacementImplications: ReplacementImplicationsT;
  mostConstrainingReason: string;
};

/**
 * Convert raw API data to ReplacementCandidateT
 */
export function toReplacementCandidateT(data: any): ReplacementCandidateT {
  return {
    ...data,
    replacementImplications: {
      ...data.replacementImplications,
      nbTimesDidShiftLtm: {
        count: data.replacementImplications.nbTimesDidShiftLtm.count,
        lastDate: data.replacementImplications.nbTimesDidShiftLtm.lastDate
          ? dayjs.unix(data.replacementImplications.nbTimesDidShiftLtm.lastDate)
          : null,
      },
      nbTimesWorkedWeekdayLtm: {
        count: data.replacementImplications.nbTimesWorkedWeekdayLtm.count,
        lastDate: data.replacementImplications.nbTimesWorkedWeekdayLtm.lastDate
          ? dayjs.unix(
              data.replacementImplications.nbTimesWorkedWeekdayLtm.lastDate,
            )
          : null,
      },
    },
  };
}
