import { unstable_noStore as noStore } from "next/cache";
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
  toRecurrenceRuleT,
} from "../../types/recurrence";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlAssignment = API_URL + "/assignments";

//////////////////////////
// Assignment //
//////////////////////////
export async function addAssignmentAndRecurrence(
  assignment: AssignmentT,
  recurrenceRule?: RecurrenceRuleT
): Promise<AssignmentsRecurrencesResultT> {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assignment: fromAssignmentT(assignment),
      recurrenceRule: recurrenceRule
        ? fromRecurrenceRuleT(recurrenceRule)
        : null,
    }),
  };
  try {
    const response = await fetch(
      `${apiUrlAssignment}/teams/${assignment.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add assignment: " + responseData.detail);
    }
    return toAssignmentsRecurrencesResultT(responseData);
  } catch (error) {
    console.error("Failed to add assignment:", error);
    throw new Error("Failed to add assignment, please try again later");
  }
}

export async function getAssignmentsByDates(
  teamId: string,
  startDate?: dayjs.Dayjs,
  endDate?: dayjs.Dayjs
): Promise<AssignmentsRecurrencesResultT> {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  const startDateStr = startDate ? startDate.unix() : null;
  const endDateStr = endDate ? endDate.unix() : null;
  const url = `${apiUrlAssignment}/teams/${teamId}${
    startDateStr && endDateStr
      ? `?start_date=${startDateStr}&end_date=${endDateStr}`
      : ""
  }`;

  try {
    const response = await fetch(url, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch assignments: " + responseData.detail);
    }
    return toAssignmentsRecurrencesResultT(responseData);
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    throw new Error("Failed to fetch assignments, please try again later");
  }
}

export async function updateAssignmentAndRecurrence(
  assignment: AssignmentT,
  teamId: string,
  recurrenceRule: RecurrenceRuleT | null = null,
  recurrenceUpdateScope: RecurrenceUpdateScope | null = null
): Promise<AssignmentsRecurrencesResultT> {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assignment: fromAssignmentT(assignment),
      recurrence_rule: recurrenceRule
        ? fromRecurrenceRuleT(recurrenceRule)
        : null,
      recurrence_update_scope: recurrenceUpdateScope,
    }),
  };
  try {
    const response = await fetch(
      `${apiUrlAssignment}/${assignment.id}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update assignment: " + responseData.detail);
    }
    return toAssignmentsRecurrencesResultT(responseData);
  } catch (error) {
    console.error("Failed to update assignment:", error);
    throw new Error("Failed to update assignment, please try again later");
  }
}

export async function deleteAssignment(
  assignmentId: string,
  teamId: string,
  recurrenceId: string | null = null,
  recurrenceUpdateScope: RecurrenceUpdateScope | null = null
): Promise<AssignmentsRecurrencesResultT> {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recurrence_id: recurrenceId,
      recurrence_update_scope: recurrenceUpdateScope,
    }),
  };
  try {
    const response = await fetch(
      `${apiUrlAssignment}/${assignmentId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete assignment: " + responseData.detail);
    }
    return toAssignmentsRecurrencesResultT(responseData);
  } catch (error) {
    console.error("Failed to delete assignment:", error);
    throw new Error("Failed to delete assignment, please try again later");
  }
}
