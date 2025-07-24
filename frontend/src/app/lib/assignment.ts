/**
 * @deprecated This file contains legacy assignment API functions.
 * New code should use AssignmentApi class and useAssignment hooks instead.
 *
 * Migration:
 * - Replace direct function calls with AssignmentApi methods
 * - Use useAssignment hooks in React components
 * - Ensure proper authentication is in place
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import {
  AssignmentT,
  fromAssignmentT,
  toAssignmentT,
  AssignmentsRecurrencesResultT,
  toAssignmentsRecurrencesResultT,
} from "@/types/assignment";
import {
  fromRecurrenceRuleT,
  RecurrenceRuleT,
  RecurrenceUpdateScope,
} from "../../types/recurrence";
// New API Class
import { AssignmentApi } from "./api/assignmentApi";

dayjs.extend(utc);

//////////////////////////
// Legacy Assignment Functions //
// @deprecated - Use AssignmentApi instead //
//////////////////////////
/**
 * @deprecated Use AssignmentApi.addAssignmentAndRecurrence() instead
 */
export async function addAssignmentAndRecurrence(
  assignment: AssignmentT,
  recurrence: RecurrenceRuleT | null = null
): Promise<AssignmentsRecurrencesResultT> {
  console.warn(
    "⚠️ addAssignmentAndRecurrence is deprecated. Use AssignmentApi.addAssignmentAndRecurrence() instead"
  );
  return AssignmentApi.addAssignmentAndRecurrenceLegacy(assignment, recurrence);
}

/**
 * @deprecated Use AssignmentApi.getAssignmentsByDates() instead
 */
export async function getAssignmentsByDates(
  teamId: string,
  startDate?: dayjs.Dayjs,
  endDate?: dayjs.Dayjs
): Promise<AssignmentsRecurrencesResultT> {
  console.warn(
    "⚠️ getAssignmentsByDates is deprecated. Use AssignmentApi.getAssignmentsByDates() instead"
  );
  return AssignmentApi.getAssignmentsByDatesLegacy(teamId, startDate, endDate);
}

/**
 * @deprecated Use AssignmentApi.getValidatedAssignments() instead
 */
export async function getValidatedAssignments(
  teamId: string,
  startDate?: dayjs.Dayjs,
  endDate?: dayjs.Dayjs
): Promise<AssignmentT[]> {
  console.warn(
    "⚠️ getValidatedAssignments is deprecated. Use AssignmentApi.getValidatedAssignments() instead"
  );
  return AssignmentApi.getValidatedAssignmentsLegacy(
    teamId,
    startDate,
    endDate
  );
}

/**
 * @deprecated Use AssignmentApi.updateAssignmentAndRecurrence() instead
 */
export async function updateAssignmentAndRecurrence(
  assignment: AssignmentT,
  teamId: string,
  recurrenceRule: RecurrenceRuleT | null = null,
  recurrenceUpdateScope: RecurrenceUpdateScope | null = null
): Promise<AssignmentsRecurrencesResultT> {
  console.warn(
    "⚠️ updateAssignmentAndRecurrence is deprecated. Use AssignmentApi.updateAssignmentAndRecurrence() instead"
  );
  return AssignmentApi.updateAssignmentAndRecurrenceLegacy(
    assignment,
    teamId,
    recurrenceRule,
    recurrenceUpdateScope
  );
}

/**
 * @deprecated Use AssignmentApi.deleteAssignment() instead
 */
export async function deleteAssignment(
  assignmentId: string,
  teamId: string,
  recurrenceId: string | null = null,
  recurrenceUpdateScope: RecurrenceUpdateScope | null = null
): Promise<AssignmentsRecurrencesResultT> {
  console.warn(
    "⚠️ deleteAssignment is deprecated. Use AssignmentApi.deleteAssignment() instead"
  );
  return AssignmentApi.deleteAssignmentLegacy(
    assignmentId,
    teamId,
    recurrenceId,
    recurrenceUpdateScope
  );
}
