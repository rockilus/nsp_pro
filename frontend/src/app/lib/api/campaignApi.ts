/**
 * API client for campaign operations
 */

import { ScheduleT, ScheduleStatus } from "../../../types/schedule";
import { ConstraintT } from "../../../types/constraint";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";
import { ScheduleApi } from "./scheduleApi";
import { ConstraintApi } from "./constraintApi";

export interface CampaignTabData {
  scheduleCampaign: ScheduleT | null;
  schedulesValidated: ScheduleT[];
  constraints: ConstraintT[];
}

export interface CampaignTabDataNoSolver {
  scheduleCampaign: ScheduleT | null;
  schedulesValidated: ScheduleT[];
}

export class CampaignApi extends BaseApi {
  /**
   * Get campaign tab data including schedules and constraints (authenticated)
   */
  static async getCampaignTabData(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<CampaignTabData> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    try {
      // Fetch schedules and constraints in parallel
      const [schedules, constraints] = await Promise.all([
        ScheduleApi.getSchedules(apiClient, teamId),
        ConstraintApi.getConstraints(apiClient, teamId),
      ]);

      const scheduleCampaign =
        schedules.find(
          (schedule) => schedule.status === ScheduleStatus.CAMPAIGN
        ) || null;

      const schedulesValidated = schedules.filter(
        (schedule) => schedule.status === ScheduleStatus.VALIDATED
      );

      return {
        scheduleCampaign,
        schedulesValidated,
        constraints,
      };
    } catch (error) {
      console.error("Failed to fetch campaign tab data:", error);
      throw new Error(
        "Failed to fetch campaign tab data, please try again later"
      );
    }
  }

  /**
   * Get campaign tab data without constraints (for teams not using solver) (authenticated)
   */
  static async getCampaignTabDataNoSolver(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<CampaignTabDataNoSolver> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    try {
      const schedules = await ScheduleApi.getSchedules(apiClient, teamId);

      const scheduleCampaign =
        schedules.find(
          (schedule) => schedule.status === ScheduleStatus.CAMPAIGN
        ) || null;

      const schedulesValidated = schedules.filter(
        (schedule) => schedule.status === ScheduleStatus.VALIDATED
      );

      return {
        scheduleCampaign,
        schedulesValidated,
      };
    } catch (error) {
      console.error("Failed to fetch campaign tab data:", error);
      throw new Error(
        "Failed to fetch campaign tab data, please try again later"
      );
    }
  }

  // Legacy methods for backward compatibility (discouraged)
  static async getCampaignTabDataLegacy(
    teamId: string
  ): Promise<CampaignTabData> {
    console.warn("⚠️ Using legacy unauthenticated API call");

    // Import legacy functions to maintain compatibility
    const { getSchedules } = await import("../schedule");
    const { getConstraints } = await import("../constraint");

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
        scheduleCampaign,
        schedulesValidated,
        constraints,
      };
    } catch (error) {
      console.error("Failed to fetch campaign tab data:", error);
      throw new Error(
        "Failed to fetch campaign tab data, please try again later"
      );
    }
  }

  static async getCampaignTabDataNoSolverLegacy(
    teamId: string
  ): Promise<CampaignTabDataNoSolver> {
    console.warn("⚠️ Using legacy unauthenticated API call");

    // Import legacy functions to maintain compatibility
    const { getSchedules } = await import("../schedule");

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
        scheduleCampaign,
        schedulesValidated,
      };
    } catch (error) {
      console.error("Failed to fetch campaign tab data:", error);
      throw new Error(
        "Failed to fetch campaign tab data, please try again later"
      );
    }
  }
}
