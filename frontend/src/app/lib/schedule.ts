/**
 * @deprecated This file contains legacy schedule API functions.
 * New code should use ScheduleApi class and useSchedule hooks instead.
 * These functions are kept for backward compatibility.
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Actions
import { getAssignmentsByDates, getValidatedAssignments } from "./assignment";
import { getBreaches } from "./breach";
import { getRequests } from "./request";
import { getAllWorkers } from "./worker";
import { getAllShifts } from "./shift";
import { getStats } from "./stats";
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
import { AssignmentT } from "@/types/assignment";
import {
  StatsOptionsT,
  StatsUnitOptions,
  HeaderUnitOptions,
  StatsTimeFrameOptions,
} from "../../types/stats";
import { ShiftT } from "../../types/shift";
import { WorkerT } from "@/types/worker";
import { RecurrenceRuleT } from "@/types/recurrence";
// Env Vars
import { API_URL } from "./env";
// New API
import { ScheduleApi } from "./api/scheduleApi";

dayjs.extend(utc);

const apiUrlSchedule = API_URL + "/schedules";

//////////////////////////
// Legacy Schedule Functions //
// @deprecated Use ScheduleApi class instead
//////////////////////////

/**
 * @deprecated Use ScheduleApi.createSchedule() instead
 */
export async function addSchedule(teamId: string) {
  console.warn(
    "⚠️ addSchedule is deprecated. Use ScheduleApi.createSchedule() instead"
  );
  return ScheduleApi.createScheduleLegacy(teamId);
}

/**
 * @deprecated Use ScheduleApi.validateSchedule() instead
 */
export async function validateSchedule(scheduleId: string, teamId: string) {
  console.warn(
    "⚠️ validateSchedule is deprecated. Use ScheduleApi.validateSchedule() instead"
  );
  return ScheduleApi.validateScheduleLegacy(scheduleId, teamId);
}

/**
 * @deprecated Use ScheduleApi.getSchedules() instead
 */
export async function getSchedules(teamId: string) {
  console.warn(
    "⚠️ getSchedules is deprecated. Use ScheduleApi.getSchedules() instead"
  );
  return ScheduleApi.getSchedulesLegacy(teamId);
}

/**
 * @deprecated Use ScheduleApi.getWorkTimeTable() instead
 */
export async function getWorkTimeTable(scheduleId: string, teamId: string) {
  console.warn(
    "⚠️ getWorkTimeTable is deprecated. Use ScheduleApi.getWorkTimeTable() instead"
  );
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

/**
 * @deprecated Use ScheduleApi.updateSchedule() instead
 */
export async function updateSchedule(schedule: ScheduleT) {
  console.warn(
    "⚠️ updateSchedule is deprecated. Use ScheduleApi.updateSchedule() instead"
  );
  return ScheduleApi.updateScheduleLegacy(schedule);
}

/**
 * @deprecated Use ScheduleApi.deleteSchedule() instead
 */
export async function deleteSchedule(scheduleId: string, teamId: string) {
  console.warn(
    "⚠️ deleteSchedule is deprecated. Use ScheduleApi.deleteSchedule() instead"
  );
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
// Legacy Export Schedule //
// @deprecated Use ScheduleApi class instead
//////////////////////////

/**
 * @deprecated Use ScheduleApi.exportSchedule() instead
 */
export async function exportSchedule(
  teamId: string,
  exportOptions: ExportOptionsT
) {
  console.warn(
    "⚠️ exportSchedule is deprecated. Use ScheduleApi.exportSchedule() instead"
  );
  return ScheduleApi.exportScheduleLegacy(teamId, exportOptions);
}

//////////////////////////
// Legacy Schedule Tab Data //
// @deprecated Use ScheduleApi class and useSchedule hooks instead
//////////////////////////

/**
 * @deprecated Use ScheduleApi.getScheduleTabData() or useGetScheduleTabData() hook instead
 */
export async function getScheduleTabData(teamId: string) {
  console.warn(
    "⚠️ getScheduleTabData is deprecated. Use ScheduleApi.getScheduleTabData() or useGetScheduleTabData() hook instead"
  );
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

/**
 * @deprecated Use ScheduleApi.getScheduleAssignmentsData() or useGetScheduleAssignmentsData() hook instead
 */
export async function getScheduleAssignmentsData(teamId: string): Promise<{
  assignments: AssignmentT[];
  recurrences: RecurrenceRuleT[];
  shifts: ShiftT[];
  workers: WorkerT[];
}> {
  console.warn(
    "⚠️ getScheduleAssignmentsData is deprecated. Use ScheduleApi.getScheduleAssignmentsData() or useGetScheduleAssignmentsData() hook instead"
  );
  try {
    const campaignTabData = await Promise.all([
      getAssignmentsByDates(teamId),
      getAllShifts(teamId),
      getAllWorkers(teamId),
    ]);
    return {
      assignments: campaignTabData[0].assignmentsRead,
      recurrences: campaignTabData[0].recurrencesRead,
      shifts: campaignTabData[1],
      workers: campaignTabData[2],
    };
  } catch (error) {
    console.error("Failed to fetch schedule assignments data:", error);
    throw new Error(
      "Failed to fetch schedule assignments data, please try again later"
    );
  }
}

/**
 * @deprecated Use ScheduleApi.getScheduleAssignmentsDataNoSolver() or useGetScheduleAssignmentsDataNoSolver() hook instead
 */
export async function getScheduleAssignmentsDataNoSolver(
  teamId: string
): Promise<{
  assignments: AssignmentT[];
  recurrences: RecurrenceRuleT[];
  shifts: ShiftT[];
  workers: WorkerT[];
}> {
  console.warn(
    "⚠️ getScheduleAssignmentsDataNoSolver is deprecated. Use ScheduleApi.getScheduleAssignmentsDataNoSolver() or useGetScheduleAssignmentsDataNoSolver() hook instead"
  );
  try {
    const campaignTabData = await Promise.all([
      getAssignmentsByDates(teamId),
      getAllShifts(teamId),
      getAllWorkers(teamId),
    ]);
    return {
      assignments: campaignTabData[0].assignmentsRead,
      recurrences: campaignTabData[0].recurrencesRead,
      shifts: campaignTabData[1],
      workers: campaignTabData[2],
    };
  } catch (error) {
    console.error("Failed to fetch schedule assignments data:", error);
    throw new Error(
      "Failed to fetch schedule assignments data, please try again later"
    );
  }
}

/**
 * @deprecated Use ScheduleApi.getScheduleAssignmentsDataMember() or useGetScheduleAssignmentsDataMember() hook instead
 */
export async function getScheduleAssignmentsDataMember(
  teamId: string
): Promise<{
  assignments: AssignmentT[];
  shifts: ShiftT[];
  workers: WorkerT[];
}> {
  console.warn(
    "⚠️ getScheduleAssignmentsDataMember is deprecated. Use ScheduleApi.getScheduleAssignmentsDataMember() or useGetScheduleAssignmentsDataMember() hook instead"
  );
  try {
    const campaignTabData = await Promise.all([
      getValidatedAssignments(teamId),
      getAllShifts(teamId),
      getAllWorkers(teamId),
    ]);
    return {
      assignments: campaignTabData[0],
      shifts: campaignTabData[1],
      workers: campaignTabData[2],
    };
  } catch (error) {
    console.error("Failed to fetch schedule assignments data:", error);
    throw new Error(
      "Failed to fetch schedule assignments data, please try again later"
    );
  }
}

/**
 * @deprecated Use ScheduleApi.getScheduleLHSData() or useGetScheduleLHSData() hook instead
 */
export async function getScheduleLHSData(teamId: string) {
  console.warn(
    "⚠️ getScheduleLHSData is deprecated. Use ScheduleApi.getScheduleLHSData() or useGetScheduleLHSData() hook instead"
  );
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

/**
 * @deprecated Use ScheduleApi.duplicatePeriod() or useDuplicatePeriod() hook instead
 */
export async function duplicatePeriod(
  duplicateRequest: DuplicateRequestT,
  campaignId: string,
  teamId: string
): Promise<DuplicateResultT> {
  console.warn(
    "⚠️ duplicatePeriod is deprecated. Use ScheduleApi.duplicatePeriod() or useDuplicatePeriod() hook instead"
  );
  return ScheduleApi.duplicatePeriodLegacy(
    duplicateRequest,
    campaignId,
    teamId
  );
}
