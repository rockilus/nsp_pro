// Actions
import { getWorkers } from "./worker";
import { getShifts } from "./shift";
import { getSchedules } from "./schedule";
// Types
import { StatsT, StatsHeaderT, StatsOptionsT } from "../../types/stats";
import { ShiftWorkerOptionT } from "../../types/constraint";
import { ScheduleT, ScheduleStatus } from "../../types/schedule";
// API
import { StatsApi } from "./api/statsApi";

//////////////////////////
// Stats //
//////////////////////////

/**
 * @deprecated Use useGetStats hook instead for authenticated requests
 */
export async function getStats(statsOptions: StatsOptionsT, teamId: string) {
  try {
    return await StatsApi.getStatsLegacy(statsOptions, teamId);
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    throw new Error("Failed to fetch stats, please try again later");
  }
}

//////////////////////////
// Header //
//////////////////////////

/**
 * @deprecated Use useAddHeader hook instead for authenticated requests
 */
export async function addHeader(header: StatsHeaderT) {
  try {
    return await StatsApi.addHeaderLegacy(header);
  } catch (error) {
    console.error("Failed to add header:", error);
    throw new Error("Failed to add header, please try again later");
  }
}

/**
 * @deprecated Use useDeleteHeader hook instead for authenticated requests
 */
export async function deleteHeader(headerId: string, teamId: string) {
  try {
    await StatsApi.deleteHeaderLegacy(headerId, teamId);
  } catch (error) {
    console.error("Failed to delete header:", error);
    throw new Error("Failed to delete header, please try again later");
  }
}

//////////////////////////
// Shift Options //
//////////////////////////

/**
 * @deprecated Use useGetShiftOptions hook instead for authenticated requests
 */
export async function getShiftOptions(teamId: string) {
  try {
    return await StatsApi.getShiftOptionsLegacy(teamId);
  } catch (error) {
    console.error("Failed to fetch shift options:", error);
    throw new Error("Failed to fetch shift options, please try again later");
  }
}

//////////////////////////
// Stats Tab Data //
//////////////////////////

/**
 * @deprecated Use useGetStatsTabData hook instead for authenticated requests
 */
export async function getStatsTabData(teamId: string) {
  try {
    const statsTabData = await Promise.all([
      getSchedules(teamId),
      getShifts(teamId),
      getWorkers(teamId),
      getShiftOptions(teamId),
    ]);
    return {
      scheduleCampaign:
        statsTabData[0].find(
          (schedule) => schedule.status === ScheduleStatus.CAMPAIGN
        ) || null,
      shifts: statsTabData[1],
      workers: statsTabData[2],
      shiftOptions: statsTabData[3],
    };
  } catch (error) {
    console.error("Failed to fetch stats tab data:", error);
    throw new Error("Failed to fetch stats tab data, please try again later");
  }
}
