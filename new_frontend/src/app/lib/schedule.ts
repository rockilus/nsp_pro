import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Actions
import { toAssignmentT } from "./assignment";
import { toObjectiveBreachT } from "./breach";
import { toRequestT } from "./request";
// Types
import { ScheduleT, SolutionT, ValidateT } from "../../types/schedule_temp";

dayjs.extend(utc);

const apiUrlSchedule = process.env.NEXT_PUBLIC_API_URL + "/schedules";

export const toScheduleT = (data: any): ScheduleT => {
  return {
    ...data,
    startDate: dayjs.utc(data.startDate),
    endDate: dayjs.utc(data.endDate),
    missingCoverageDates: data.missingCoverageDates.map((isoDate: string) =>
      dayjs.utc(isoDate)
    ),
  };
};

const toSolutionT = (data: any): SolutionT => {
  return {
    schedule: toScheduleT(data.schedule),
    assignments: data.assignments.map(toAssignmentT),
    objectiveBreaches: data.objectiveBreaches.map(toObjectiveBreachT),
    requests: data.requests.map(toRequestT),
  };
};

const toValidateT = (data: any): ValidateT => {
  return {
    schedule: toScheduleT(data.schedule),
    assignments: data.assignments.map(toAssignmentT),
  };
};

//////////////////////////
// Schedule //
//////////////////////////

export async function addSchedule(teamId: string) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(`${apiUrlSchedule}/teams/${teamId}`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to add schedule: " + responseData.detail);
    }
    return toScheduleT(responseData) as ScheduleT;
  } catch (error) {
    console.error("Failed to add schedule:", error);
    throw new Error("Failed to add schedule, please try again later");
  }
}

export async function solveSchedule(scheduleId: string, teamId: string) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlSchedule}/${scheduleId}/solve/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to solve schedule: " + responseData.detail);
    }
    return toSolutionT(responseData) as SolutionT;
  } catch (error) {
    console.error("Failed to solve schedule:", error);
    throw new Error("Failed to solve schedule, please try again later");
  }
}

export async function validateSchedule(scheduleId: string, teamId: string) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlSchedule}/${scheduleId}/validate/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to validate schedule: " + responseData.detail);
    }
    return toValidateT(responseData) as ValidateT;
  } catch (error) {
    console.error("Failed to validate schedule:", error);
    throw new Error("Failed to validate schedule, please try again later");
  }
}

export async function getSchedule(teamId: string) {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(`${apiUrlSchedule}/teams/${teamId}`, options);
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to fetch schedule: " + responseData.detail);
    }
    return toScheduleT(responseData) as ScheduleT;
  } catch (error) {
    console.error("Failed to fetch schedule:", error);
    throw new Error("Failed to fetch schedule, please try again later");
  }
}

export async function updateSchedule(schedule: ScheduleT) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(schedule),
  };
  try {
    const response = await fetch(
      `${apiUrlSchedule}/${schedule.id}/teams/${schedule.teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to update schedule: " + responseData.detail);
    }
    return toScheduleT(responseData) as ScheduleT;
  } catch (error) {
    console.error("Failed to update schedule:", error);
    throw new Error("Failed to update schedule, please try again later");
  }
}

export async function deleteSchedule(scheduleId: string, teamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlSchedule}/${scheduleId}/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to delete schedule: " + responseData.detail);
    }
  } catch (error) {
    console.error("Failed to delete schedule:", error);
    throw new Error("Failed to delete schedule, please try again later");
  }
}

//////////////////////////
// Campaign Tab Data //
//////////////////////////

// export async function getCampaignTabData(teamId: string) {
//   try {
//     const campaignTabData = await Promise.all([
//       getShifts(teamId),
//       getShiftDimensions(teamId),
//     ]);
//     return { shifts: campaignTabData[0], shiftDimensions: campaignTabData[1] };
//   } catch (error) {
//     console.error("Failed to fetch shifts tab data:", error);
//     throw new Error("Failed to fetch shifts tab data, please try again later");
//   }
// }
