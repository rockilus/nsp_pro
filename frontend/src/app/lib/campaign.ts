// Actions
import { getSchedules } from "./schedule";
import { getConstraints } from "./constraint";
// Types
import { ScheduleStatus } from "../../types/schedule";

//////////////////////////
// Campaign Tab Data //
//////////////////////////

export async function getCampaignTabData(teamId: string) {
  try {
    const schedules = await getSchedules(teamId);
    const scheduleCampaign =
      schedules.find(
        (schedule) => schedule.status === ScheduleStatus.CAMPAIGN
      ) || null;
    const schedulesValidated = schedules.filter(
      (schedule) => schedule.status === ScheduleStatus.VALIDATED
    );
    const constraints = await getConstraints(teamId);
    return {
      scheduleCampaign: scheduleCampaign,
      schedulesValidated: schedulesValidated,
      constraints: constraints,
    };
  } catch (error) {
    console.error("Failed to fetch campaign tab data:", error);
    throw new Error(
      "Failed to fetch campaign tab data, please try again later"
    );
  }
}

export async function getCampaignTabDataNoSolver(teamId: string) {
  try {
    const schedules = await getSchedules(teamId);
    const scheduleCampaign =
      schedules.find(
        (schedule) => schedule.status === ScheduleStatus.CAMPAIGN
      ) || null;
    const schedulesValidated = schedules.filter(
      (schedule) => schedule.status === ScheduleStatus.VALIDATED
    );
    return {
      scheduleCampaign: scheduleCampaign,
      schedulesValidated: schedulesValidated,
    };
  } catch (error) {
    console.error("Failed to fetch campaign tab data:", error);
    throw new Error(
      "Failed to fetch campaign tab data, please try again later"
    );
  }
}
