import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import { AssignmentT } from "../../types/schedule";
import { RecurrenceRuleT } from "../../types/recurrence";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlAssignment = API_URL + "/assignments";

export const toAssignmentT = (data: any): AssignmentT => {
  return {
    ...data,
    date: dayjs.unix(data.date).utc(),
  };
};

export const fromAssignmentT = (data: AssignmentT): any => {
  return {
    ...data,
    date: data.date.unix(),
  };
};

export const toRecurrenceRuleT = (data: any): RecurrenceRuleT => {
  return {
    ...data,
    startDate: dayjs(data.startDate).utc(),
    endDate: data.endDate ? dayjs(data.endDate).utc() : null,
  };
};

export const fromRecurrenceRuleT = (data: RecurrenceRuleT): any => {
  return {
    ...data,
    startDate: data.startDate.toISOString(),
    endDate: data.endDate ? data.endDate.toISOString() : null,
  };
};

//////////////////////////
// Assignment //
//////////////////////////
export async function addAssignment(
  assignment: AssignmentT,
  recurrenceRule?: RecurrenceRuleT
): Promise<{
  assignments: AssignmentT[];
  recurrenceRule: RecurrenceRuleT | null;
}> {
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
    return {
      assignments: responseData.assignments.map(toAssignmentT),
      recurrenceRule: responseData.recurrence_rule
        ? toRecurrenceRuleT(responseData.recurrence_rule)
        : null,
    };
  } catch (error) {
    console.error("Failed to add assignment:", error);
    throw new Error("Failed to add assignment, please try again later");
  }
}

export async function getAssignmentsByDates(
  teamId: string,
  startDate?: dayjs.Dayjs,
  endDate?: dayjs.Dayjs
) {
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
    return responseData.map(toAssignmentT) as AssignmentT[];
  } catch (error) {
    console.error("Failed to fetch assignments:", error);
    throw new Error("Failed to fetch assignments, please try again later");
  }
}

export async function updateAssignment(
  assignment: AssignmentT,
  teamId: string
) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fromAssignmentT(assignment)),
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
    return {
      updatedAssignment: toAssignmentT(responseData.updated_assignment),
      recuperationAssignments: responseData.recuperation_assignments
        ? responseData.recuperation_assignments.map(toAssignmentT)
        : [],
      deletedIds: responseData.deleted_ids || [],
    };
  } catch (error) {
    console.error("Failed to update assignment:", error);
    throw new Error("Failed to update assignment, please try again later");
  }
}

export async function deleteAssignment(assignmentId: string, teamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
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
    return { deletedIds: responseData.deleted_ids || [] };
  } catch (error) {
    console.error("Failed to delete assignment:", error);
    throw new Error("Failed to delete assignment, please try again later");
  }
}
