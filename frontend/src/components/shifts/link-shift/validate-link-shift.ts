import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import { LinkShiftT, ShiftT } from "../../../types/shift";

dayjs.extend(utc);

interface ValidationResultT {
  isValid: boolean;
  validationMessage: string;
}

const shiftsOverlap = (shifts: ShiftT[]): boolean => {
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      const shift1 = shifts[i];
      const shift2 = shifts[j];
      const startTime1 = dayjs.utc(shift1.startTime);
      const endTime1 = dayjs.utc(shift1.endTime);
      const startTime2 = dayjs.utc(shift2.startTime);
      const endTime2 = dayjs.utc(shift2.endTime);
      if (startTime1.isBefore(endTime2) && endTime1.isAfter(startTime2)) {
        return true;
      }
    }
  }
  return false;
};

const validateLinkShift = (
  lsCandidate: LinkShiftT,
  shiftsLs: ShiftT[],
  lsOthers: LinkShiftT[]
): ValidationResultT => {
  if (lsCandidate.shiftIds.length < 2) {
    return {
      isValid: false,
      validationMessage: "LinkShift must contain at least two shifts.",
    };
  }
  if (lsCandidate.shiftIds.length !== new Set(lsCandidate.shiftIds).size) {
    return {
      isValid: false,
      validationMessage: "Duplicate shift IDs found in link_shift.shift_ids.",
    };
  }
  if (shiftsLs.length !== lsCandidate.shiftIds.length) {
    return { isValid: false, validationMessage: "Shifts not found." };
  }
  if (shiftsOverlap(shiftsLs)) {
    return { isValid: false, validationMessage: "Shifts overlap." };
  }
  for (const ls of lsOthers) {
    if (
      new Set(ls.shiftIds).size === new Set(lsCandidate.shiftIds).size &&
      ls.shiftIds.every((id) => lsCandidate.shiftIds.includes(id))
    ) {
      return { isValid: false, validationMessage: "LinkShift already exists." };
    }
  }
  return { isValid: true, validationMessage: "" };
};

export { validateLinkShift };
