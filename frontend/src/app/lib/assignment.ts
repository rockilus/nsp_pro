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
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlAssignment = API_URL + "/assignments";

//////////////////////////
// Assignment //
//////////////////////////
export async function addAssignmentAndRecurrence(
  assignment: AssignmentT,
  recurrence: RecurrenceRuleT | null = null
): Promise<AssignmentsRecurrencesResultT> {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assignment: fromAssignmentT(assignment),
      recurrence: recurrence ? fromRecurrenceRuleT(recurrence) : null,
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

export async function getValidatedAssignments(
  teamId: string,
  startDate?: dayjs.Dayjs,
  endDate?: dayjs.Dayjs
): Promise<AssignmentT[]> {
  const startDateStr = startDate ? startDate.format("YYYY-MM-DD") : undefined;
  const endDateStr = endDate ? endDate.format("YYYY-MM-DD") : undefined;

  try {
    const url = new URL(`${apiUrlAssignment}/validated/teams/${teamId}`);
    if (startDateStr) url.searchParams.append("start_date", startDateStr);
    if (endDateStr) url.searchParams.append("end_date", endDateStr);

    const response = await fetch(url.toString(), {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        "Failed to fetch validated assignments: " + errorData.detail
      );
    }

    const data = await response.json();
    return data.map(toAssignmentT);
  } catch (error) {
    console.error("Failed to fetch validated assignments:", error);
    throw new Error(
      "Failed to fetch validated assignments, please try again later"
    );
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
      recurrence: recurrenceRule ? fromRecurrenceRuleT(recurrenceRule) : null,
      recurrence_update_scope: recurrenceUpdateScope,
    }),
  };
  try {
    const queryParams = new URLSearchParams();
    if (recurrenceUpdateScope !== null) {
      queryParams.append(
        "recurrence_update_scope",
        recurrenceUpdateScope.toString()
      );
    }

    const url = `${apiUrlAssignment}/${assignment.id}/teams/${teamId}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;
    const response = await fetch(url, options);
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
  };
  try {
    const queryParams = new URLSearchParams();
    if (recurrenceId) {
      queryParams.append("recurrence_id", recurrenceId);
    }
    if (recurrenceUpdateScope !== null) {
      queryParams.append(
        "recurrence_update_scope",
        recurrenceUpdateScope.toString()
      );
    }

    const url = `${apiUrlAssignment}/${assignmentId}/teams/${teamId}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const response = await fetch(url, options);
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
