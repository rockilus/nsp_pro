import dayjs from 'dayjs';
import type { AssignmentDataDictT } from '../types/assignment';

// Comparator for AssignmentDataDictT: by assignment.date then shift.startTime
export function compareAssignmentData(a: AssignmentDataDictT, b: AssignmentDataDictT): number {
  const aDate = a?.assignment?.date?.valueOf?.() ?? Number.POSITIVE_INFINITY;
  const bDate = b?.assignment?.date?.valueOf?.() ?? Number.POSITIVE_INFINITY;

  if (aDate < bDate) return -1;
  if (aDate > bDate) return 1;

  const aStart = a?.shift?.startTime?.valueOf?.() ?? Number.POSITIVE_INFINITY;
  const bStart = b?.shift?.startTime?.valueOf?.() ?? Number.POSITIVE_INFINITY;

  if (aStart < bStart) return -1;
  if (aStart > bStart) return 1;

  const aId = a?.assignment?.id ?? '';
  const bId = b?.assignment?.id ?? '';
  if (aId < bId) return -1;
  if (aId > bId) return 1;
  return 0;
}

export function sortAssignmentsByDateThenShiftStart(
  assignments?: AssignmentDataDictT[] | null,
): AssignmentDataDictT[] {
  if (!assignments) return [];
  return [...assignments].sort(compareAssignmentData);
}

export function getEarliestAssignment(
  assignments?: AssignmentDataDictT[] | null,
): AssignmentDataDictT | null {
  const sorted = sortAssignmentsByDateThenShiftStart(assignments ?? []);
  return sorted.length > 0 ? sorted[0] : null;
}

export function sortItemsByEarliestAssignment<T>(
  items: T[],
  getAssignments: (item: T) => AssignmentDataDictT[] | undefined,
  fallbackAccessor?: (item: T) => dayjs.Dayjs | undefined,
): T[] {
  return [...items].sort((x, y) => {
    const ax = getEarliestAssignment(getAssignments(x));
    const ay = getEarliestAssignment(getAssignments(y));

    if (ax && ay) return compareAssignmentData(ax, ay);
    if (ax && !ay) return -1; // x has assignment, y doesn't -> x first
    if (!ax && ay) return 1; // y has assignment, x doesn't -> y first

    if (fallbackAccessor) {
      const fx = fallbackAccessor(x)?.valueOf?.() ?? Number.POSITIVE_INFINITY;
      const fy = fallbackAccessor(y)?.valueOf?.() ?? Number.POSITIVE_INFINITY;
      if (fx < fy) return -1;
      if (fx > fy) return 1;
    }

    return 0;
  });
}
