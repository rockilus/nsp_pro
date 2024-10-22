import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import { AssignmentT } from "../../types/schedule";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlAssignment = API_URL + "/assignments";

export const toAssignmentT = (data: any): AssignmentT => {
  return {
    ...data,
    date: dayjs.utc(data.date),
  };
};

//////////////////////////
// Assignment //
//////////////////////////

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
    body: JSON.stringify(assignment),
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
    return toAssignmentT(responseData) as AssignmentT;
  } catch (error) {
    console.error("Failed to update assignment:", error);
    throw new Error("Failed to update assignment, please try again later");
  }
}
