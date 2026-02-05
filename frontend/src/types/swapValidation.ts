import dayjs from "dayjs";
import { ReplacementImplicationsT } from "./replacement";

export type SwapAssignmentInfoT = {
  workerId: string;
  workerName: string;
  assignmentIds: string[];
  currentImplications: ReplacementImplicationsT[];
  swappedImplications: ReplacementImplicationsT[];
};

export type SwapValidationResultT = {
  isValid: boolean;
  workerAInfo: SwapAssignmentInfoT;
  workerBInfo: SwapAssignmentInfoT;
  validationMessage: string;
};

/**
 * Convert raw API data to SwapValidationResultT
 */
export function toSwapValidationResultT(data: any): SwapValidationResultT {
  return {
    isValid: data.isValid,
    workerAInfo: toSwapAssignmentInfoT(data.workerAInfo),
    workerBInfo: toSwapAssignmentInfoT(data.workerBInfo),
    validationMessage: data.validationMessage,
  };
}

/**
 * Convert raw API data to SwapAssignmentInfoT
 */
export function toSwapAssignmentInfoT(data: any): SwapAssignmentInfoT {
  return {
    workerId: data.workerId,
    workerName: data.workerName,
    assignmentIds: data.assignmentIds,
    currentImplications: data.currentImplications.map(
      toReplacementImplicationsT,
    ),
    swappedImplications: data.swappedImplications.map(
      toReplacementImplicationsT,
    ),
  };
}

/**
 * Convert raw API data to ReplacementImplicationsT
 */
function toReplacementImplicationsT(data: any): ReplacementImplicationsT {
  return {
    ...data,
    nbTimesDidShiftLtm: {
      count: data.nbTimesDidShiftLtm.count,
      lastDate: data.nbTimesDidShiftLtm.lastDate
        ? dayjs.unix(data.nbTimesDidShiftLtm.lastDate).utc()
        : null,
    },
    nbTimesWorkedWeekdayLtm: {
      count: data.nbTimesWorkedWeekdayLtm.count,
      lastDate: data.nbTimesWorkedWeekdayLtm.lastDate
        ? dayjs.unix(data.nbTimesWorkedWeekdayLtm.lastDate).utc()
        : null,
    },
  };
}
