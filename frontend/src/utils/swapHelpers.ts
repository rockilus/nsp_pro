import { AssignmentDataDictT } from "../types/assignment";
import { sortAssignmentsByDateThenShiftStart } from "./assignmentSort";

/**
 * Get assignments for given assignment IDs, filtered and sorted
 * @param assignmentIds - Array of assignment IDs to filter by
 * @param allAssignments - All available assignments
 * @returns Filtered and sorted assignments
 */
export function getAssignmentsForIds(
  assignmentIds: string[],
  allAssignments: AssignmentDataDictT[],
): AssignmentDataDictT[] {
  return sortAssignmentsByDateThenShiftStart(
    allAssignments.filter((a) => assignmentIds.includes(a.assignment.id)),
  );
}
