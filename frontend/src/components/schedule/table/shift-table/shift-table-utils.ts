// Types
import { ShiftT, ShiftType } from "../../../../types/shift";
import { AssignmentT } from "@/types/assignment";

// Sorts an array of shifts with the following order:
// 1. Duty shifts (`ShiftType.DUTY`), ordered by start time.
// 2. All other shifts, ordered by start time.
const sortShifts = (shifts: ShiftT[]): ShiftT[] => {
  return [...shifts].sort((a, b) => {
    // Check if 'a' or 'b' is a Duty shift
    const isA_Duty = a.shiftType === ShiftType.DUTY;
    const isB_Duty = b.shiftType === ShiftType.DUTY;

    if (isA_Duty && !isB_Duty) {
      return -1; // 'a' comes before 'b'
    }
    if (!isA_Duty && isB_Duty) {
      return 1; // 'b' comes before 'a'
    }

    // If both are Duty shifts or both are not, sort by startTime
    if (a.startTime.isBefore(b.startTime)) {
      return -1;
    }
    if (a.startTime.isAfter(b.startTime)) {
      return 1;
    }

    return 0; // They are equal in terms of shiftType and startTime
  });
};

export const getRelevantShifts = (
  shifts: ShiftT[],
  assignments: AssignmentT[],
): ShiftT[] => {
  const shiftIdsInAssignments = new Set(assignments.map((a) => a.shiftId));

  const relevantShifts = shifts.filter(
    (shift) =>
      (shiftIdsInAssignments.has(shift.id) || !shift.deleted) &&
      (shift.shiftType === ShiftType.NORMAL ||
        shift.shiftType === ShiftType.DUTY),
  );

  return sortShifts(relevantShifts);
};
