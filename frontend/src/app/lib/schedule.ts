import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Actions
import { toAssignmentT, getAssignmentsByDates } from "./assignment";
import { toBreachT, getBreaches } from "./breach";
import { toRequestT, getRequests } from "./request";
import { getAllWorkers } from "./worker";
import { getAllShifts, toShiftT } from "./shift";
import { getStats } from "./stats";
import {
  getDailyShiftDemands,
  toDailyShiftDemandT,
} from "./daily-shift-demand";

// Types
import {
  ScheduleT,
  AssignmentT,
  BreachT,
  ExportOptionsT,
} from "../../types/schedule";
import { RequestT } from "../../types/request";
import { StatsOptionsT } from "../../types/stats";
import { ShiftT } from "../../types/shift";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlSchedule = API_URL + "/schedules";

export const toScheduleT = (data: any): ScheduleT => {
  return {
    ...data,
    startDate: dayjs.unix(data.startDate).utc(),
    endDate: dayjs.unix(data.endDate).utc(),
    missingCoverageDates: data.missingCoverageDates.map((timeStamp: number) =>
      dayjs.unix(timeStamp).utc()
    ),
  };
};

export const fromExportOptionsT = (data: ExportOptionsT): any => {
  return {
    ...data,
    startDate: data.startDate.unix(),
    endDate: data.endDate.unix(),
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
    return toScheduleT(responseData) as ScheduleT;
  } catch (error) {
    console.error("Failed to solve schedule:", error);
    throw new Error("Failed to solve schedule, please try again later");
  }
}

// export async function solveSchedule(scheduleId: string, teamId: string) {
//   const options: RequestInit = {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//   };
//   try {
//     const response = await fetch(
//       `${apiUrlSchedule}/${scheduleId}/solve/teams/${teamId}`,
//       options
//     );
//     const responseData = await response.json();
//     if (!response.ok) {
//       throw new Error("Failed to solve schedule: " + responseData.detail);
//     }
//     return {
//       schedule: toScheduleT(responseData.schedule),
//       assignments: responseData.assignments.map(toAssignmentT),
//       breaches: responseData.objectiveBreaches.map(toBreachT),
//       requests: responseData.requests.map(toRequestT),
//       recuperationShiftsNew: responseData.recuperationShiftsNew.map(toShiftT),
//     } as {
//       schedule: ScheduleT;
//       assignments: AssignmentT[];
//       breaches: BreachT[];
//       requests: RequestT[];
//       recuperationShiftsNew: ShiftT[];
//     };
//   } catch (error) {
//     console.error("Failed to solve schedule:", error);
//     throw new Error("Failed to solve schedule, please try again later");
//   }
// }

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
    return toScheduleT(responseData);
  } catch (error) {
    console.error("Failed to validate schedule:", error);
    throw new Error("Failed to validate schedule, please try again later");
  }
}

export async function getSchedules(teamId: string) {
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
    return responseData.map(toScheduleT) as ScheduleT[];
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
// Export Schedule //
//////////////////////////

export async function exportSchedule(
  teamId: string,
  exportOptions: ExportOptionsT
) {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fromExportOptionsT(exportOptions)),
  };
  try {
    const response = await fetch(
      `${apiUrlSchedule}/export/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to export schedule: " + responseData.detail);
    }
    return responseData;
  } catch (error) {
    console.error("Failed to export schedule:", error);
    throw new Error("Failed to export schedule, please try again later");
  }
}

//////////////////////////
// Schedule Tab Data //
//////////////////////////

export async function getScheduleTabData(teamId: string) {
  try {
    const statsOptions: StatsOptionsT = {
      timeFrame: "campaign",
      startDate: dayjs.utc().startOf("day").subtract(1, "year"),
      endDate: dayjs.utc().startOf("day"),
      statsUnit: "custom",
      headerUnit: "week",
      selectedShifts: [],
    };
    const campaignTabData = await Promise.all([
      getAssignmentsByDates(teamId),
      getBreaches(teamId),
      getRequests(teamId),
      getSchedules(teamId),
      getAllShifts(teamId),
      getAllWorkers(teamId),
      getStats(statsOptions, teamId),
    ]);
    return {
      assignments: campaignTabData[0],
      breaches: campaignTabData[1],
      requests: campaignTabData[2],
      schedule: campaignTabData[3],
      shifts: campaignTabData[4],
      workers: campaignTabData[5],
      stats: campaignTabData[6],
    };
  } catch (error) {
    console.error("Failed to fetch schedule tab data:", error);
    throw new Error(
      "Failed to fetch schedule tab data, please try again later"
    );
  }
}

export async function getScheduleAssignmentsData(teamId: string) {
  try {
    const statsOptions: StatsOptionsT = {
      timeFrame: "campaign",
      startDate: dayjs.utc().startOf("day").subtract(1, "year"),
      endDate: dayjs.utc().startOf("day"),
      statsUnit: "custom",
      headerUnit: "week",
      selectedShifts: [],
    };
    const campaignTabData = await Promise.all([
      getAssignmentsByDates(teamId),
      getAllShifts(teamId),
      getAllWorkers(teamId),
      getDailyShiftDemands(teamId),
    ]);
    return {
      assignments: campaignTabData[0],
      shifts: campaignTabData[1],
      workers: campaignTabData[2],
      dailyShiftDemands: campaignTabData[3],
    };
  } catch (error) {
    console.error("Failed to fetch schedule assignments data:", error);
    throw new Error(
      "Failed to fetch schedule assignments data, please try again later"
    );
  }
}

export async function getScheduleLHSData(teamId: string) {
  try {
    const statsOptions: StatsOptionsT = {
      timeFrame: "campaign",
      startDate: dayjs.utc().startOf("day").subtract(1, "year"),
      endDate: dayjs.utc().startOf("day"),
      statsUnit: "custom",
      headerUnit: "week",
      selectedShifts: [],
    };
    const campaignTabData = await Promise.all([
      getBreaches(teamId),
      getRequests(teamId),
      getStats(statsOptions, teamId),
    ]);
    return {
      breaches: campaignTabData[0],
      requests: campaignTabData[1],
      stats: campaignTabData[2],
    };
  } catch (error) {
    console.error("Failed to fetch schedule LHS data:", error);
    throw new Error(
      "Failed to fetch schedule LHS data, please try again later"
    );
  }
}
