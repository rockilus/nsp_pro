import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Actions
import { getAssignmentsByDates } from "./assignment";
import { getBreaches } from "./breach";
import { getRequests } from "./request";
import { getAllWorkers } from "./worker";
import { getAllShifts } from "./shift";
import { getStats } from "./stats";
import { getDailyShiftDemands } from "./daily-shift-demand";
import { toCoverageSelectorT } from "./campaign";
import { getSpecialties } from "./specialty";
// Types
import {
  ScheduleT,
  ExportOptionsT,
  WorkTimeTableT,
  DuplicateRequestT,
  toScheduleT,
  fromScheduleT,
  fromExportOptionsT,
  fromDuplicateRequestT,
  DuplicateResultT,
  toDuplicateResultT,
} from "../../types/schedule";
import {
  AssignmentT,
  AssignmentsRecurrencesResultT,
  toAssignmentsRecurrencesResultT,
} from "@/types/assignment";
import {
  StatsOptionsT,
  StatsUnitOptions,
  HeaderUnitOptions,
  StatsTimeFrameOptions,
} from "../../types/stats";
import { ShiftT } from "../../types/shift";
import { CoverageSelectorT } from "../../types/coverage-selector";
import { WorkerT } from "@/types/worker";
import { RecurrenceRuleT } from "@/types/recurrence";
import { DailyShiftDemandT } from "@/types/daily-shift-demand";
// Env Vars
import { API_URL } from "./env";

dayjs.extend(utc);

const apiUrlSchedule = API_URL + "/schedules";

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

export async function getWorkTimeTable(scheduleId: string, teamId: string) {
  noStore();
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
  };
  try {
    const response = await fetch(
      `${apiUrlSchedule}/${scheduleId}/work-time-table/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        "Failed to fetch work time table: " + responseData.detail
      );
    }
    return responseData as WorkTimeTableT;
  } catch (error) {
    console.error("Failed to fetch work time table:", error);
    throw new Error("Failed to fetch work time table, please try again later");
  }
}

export async function updateSchedule(schedule: ScheduleT) {
  const options: RequestInit = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fromScheduleT(schedule)),
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
    return {
      schedule: toScheduleT(responseData[0]),
      coverageSelectors: responseData[1].map(
        toCoverageSelectorT
      ) as CoverageSelectorT[],
    };
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
      timeFrame: StatsTimeFrameOptions.CAMPAING,
      startDate: dayjs.utc().startOf("day").subtract(1, "year"),
      endDate: dayjs.utc().startOf("day"),
      statsUnit: StatsUnitOptions.NB_DAYS_WORKED,
      headerUnit: HeaderUnitOptions.WEEK,
      selectedShifts: [],
      showFavorites: true,
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

export async function getScheduleAssignmentsData(teamId: string): Promise<{
  assignments: AssignmentT[];
  recurrences: RecurrenceRuleT[];
  shifts: ShiftT[];
  workers: WorkerT[];
  dailyShiftDemands: DailyShiftDemandT[];
}> {
  try {
    const statsOptions: StatsOptionsT = {
      timeFrame: StatsTimeFrameOptions.CAMPAING,
      startDate: dayjs.utc().startOf("day").subtract(1, "year"),
      endDate: dayjs.utc().startOf("day"),
      statsUnit: StatsUnitOptions.NB_DAYS_WORKED,
      headerUnit: HeaderUnitOptions.WEEK,
      selectedShifts: [],
      showFavorites: true,
    };
    const campaignTabData = await Promise.all([
      getAssignmentsByDates(teamId),
      getAllShifts(teamId),
      getAllWorkers(teamId),
      getDailyShiftDemands(teamId),
    ]);
    return {
      assignments: campaignTabData[0].assignmentsRead,
      recurrences: campaignTabData[0].recurrencesRead,
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
      timeFrame: StatsTimeFrameOptions.CAMPAING,
      startDate: dayjs.utc().startOf("day").subtract(1, "year"),
      endDate: dayjs.utc().startOf("day"),
      statsUnit: StatsUnitOptions.NB_DAYS_WORKED,
      headerUnit: HeaderUnitOptions.WEEK,
      selectedShifts: [],
      showFavorites: true,
    };
    const campaignTabData = await Promise.all([
      getBreaches(teamId),
      getRequests(teamId),
      getStats(statsOptions, teamId),
      getSpecialties(teamId),
    ]);
    return {
      breaches: campaignTabData[0],
      requests: campaignTabData[1],
      stats: campaignTabData[2],
      specialties: campaignTabData[3],
    };
  } catch (error) {
    console.error("Failed to fetch schedule LHS data:", error);
    throw new Error(
      "Failed to fetch schedule LHS data, please try again later"
    );
  }
}

export async function duplicatePeriod(
  duplicateRequest: DuplicateRequestT,
  campaignId: string,
  teamId: string
): Promise<DuplicateResultT> {
  const options: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fromDuplicateRequestT(duplicateRequest)),
  };
  try {
    const response = await fetch(
      `${apiUrlSchedule}/${campaignId}/duplicate-period/teams/${teamId}`,
      options
    );
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error("Failed to duplicate period: " + responseData.detail);
    }
    return toDuplicateResultT(responseData) as DuplicateResultT;
  } catch (error) {
    console.error("Failed to duplicate period:", error);
    throw new Error("Failed to duplicate period, please try again later");
  }
}
