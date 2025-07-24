/**
 * API client for schedule operations
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
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
} from "../../../types/schedule";
import { AssignmentT } from "../../../types/assignment";
import {
  StatsOptionsT,
  StatsUnitOptions,
  HeaderUnitOptions,
  StatsTimeFrameOptions,
} from "../../../types/stats";
import { ShiftT } from "../../../types/shift";
import { WorkerT } from "../../../types/worker";
import { RecurrenceRuleT } from "../../../types/recurrence";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";
// API Classes
import { AssignmentApi } from "./assignmentApi";
import { WorkerApi } from "./workerApi";
import { ShiftApi } from "./shiftApi";
import { RequestApi } from "./requestApi";
import { StatsApi } from "./statsApi";
import { SpecialtyApi } from "./specialtyApi";
// Legacy imports (to be migrated)
import { getBreaches } from "../breach";

dayjs.extend(utc);

export class ScheduleApi extends BaseApi {
  /**
   * Create a new schedule (authenticated)
   */
  static async createSchedule(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<ScheduleT> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/schedules/teams/${teamId}`
    );
    return toScheduleT(responseData) as ScheduleT;
  }

  /**
   * Get schedules for a team (authenticated)
   */
  static async getSchedules(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<ScheduleT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      `/schedules/teams/${teamId}`
    );
    return responseData.map(toScheduleT) as ScheduleT[];
  }

  /**
   * Get work time table for a schedule (authenticated)
   */
  static async getWorkTimeTable(
    apiClient: AuthenticatedApiClient,
    scheduleId: string,
    teamId: string
  ): Promise<WorkTimeTableT> {
    // Security: Input validation
    if (!scheduleId) {
      throw new Error("Schedule ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<WorkTimeTableT>(
      apiClient,
      "get",
      `/schedules/${scheduleId}/work-time-table/teams/${teamId}`
    );
    return responseData;
  }

  /**
   * Update a schedule (authenticated)
   */
  static async updateSchedule(
    apiClient: AuthenticatedApiClient,
    schedule: ScheduleT
  ): Promise<ScheduleT> {
    // Security: Input validation
    if (!schedule || !schedule.id) {
      throw new Error("Invalid schedule data provided");
    }
    if (!schedule.teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "put",
      `/schedules/${schedule.id}/teams/${schedule.teamId}`,
      fromScheduleT(schedule)
    );
    return toScheduleT(responseData);
  }

  /**
   * Delete a schedule (authenticated)
   */
  static async deleteSchedule(
    apiClient: AuthenticatedApiClient,
    scheduleId: string,
    teamId: string
  ): Promise<void> {
    // Security: Input validation
    if (!scheduleId) {
      throw new Error("Schedule ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "delete",
      `/schedules/${scheduleId}/teams/${teamId}`
    );
  }

  /**
   * Validate a schedule (authenticated)
   */
  static async validateSchedule(
    apiClient: AuthenticatedApiClient,
    scheduleId: string,
    teamId: string
  ): Promise<ScheduleT> {
    // Security: Input validation
    if (!scheduleId) {
      throw new Error("Schedule ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/schedules/${scheduleId}/validate/teams/${teamId}`
    );
    return toScheduleT(responseData);
  }

  /**
   * Export a schedule (authenticated)
   */
  static async exportSchedule(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    exportOptions: ExportOptionsT
  ): Promise<any> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }
    if (!exportOptions) {
      throw new Error("Export options are required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/schedules/export/teams/${teamId}`,
      fromExportOptionsT(exportOptions)
    );
    return responseData;
  }

  /**
   * Duplicate a period in a schedule (authenticated)
   */
  static async duplicatePeriod(
    apiClient: AuthenticatedApiClient,
    duplicateRequest: DuplicateRequestT,
    campaignId: string,
    teamId: string
  ): Promise<DuplicateResultT> {
    // Security: Input validation
    if (!duplicateRequest) {
      throw new Error("Duplicate request data is required");
    }
    if (!campaignId) {
      throw new Error("Campaign ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/schedules/${campaignId}/duplicate-period/teams/${teamId}`,
      fromDuplicateRequestT(duplicateRequest)
    );
    return toDuplicateResultT(responseData) as DuplicateResultT;
  }

  /**
   * Get schedule tab data (combination of multiple data sources)
   */
  static async getScheduleTabData(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<{
    assignments: any;
    breaches: any[];
    requests: any[];
    schedule: ScheduleT[];
    shifts: ShiftT[];
    workers: WorkerT[];
    stats: any;
  }> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

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
        AssignmentApi.getAssignmentsByDates(apiClient, teamId),
        getBreaches(teamId), // TODO: Create BreachApi
        RequestApi.getRequests(apiClient, teamId),
        this.getSchedules(apiClient, teamId),
        ShiftApi.getAllShifts(apiClient, teamId),
        WorkerApi.getAllWorkers(apiClient, teamId),
        StatsApi.getStats(apiClient, teamId, statsOptions),
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
   * Get schedule assignments data
   */
  static async getScheduleAssignmentsData(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<{
    assignments: AssignmentT[];
    recurrences: RecurrenceRuleT[];
    shifts: ShiftT[];
    workers: WorkerT[];
  }> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    try {
      const campaignTabData = await Promise.all([
        AssignmentApi.getAssignmentsByDates(apiClient, teamId),
        ShiftApi.getAllShifts(apiClient, teamId),
        WorkerApi.getAllWorkers(apiClient, teamId),
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
   * Get schedule assignments data (no solver version)
   */
  static async getScheduleAssignmentsDataNoSolver(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<{
    assignments: AssignmentT[];
    recurrences: RecurrenceRuleT[];
    shifts: ShiftT[];
    workers: WorkerT[];
  }> {
    // Same implementation as getScheduleAssignmentsData for now
    return this.getScheduleAssignmentsData(apiClient, teamId);
  }

  /**
   * Get schedule assignments data for members
   */
  static async getScheduleAssignmentsDataMember(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<{
    assignments: AssignmentT[];
    shifts: ShiftT[];
    workers: WorkerT[];
  }> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    try {
      const campaignTabData = await Promise.all([
        AssignmentApi.getValidatedAssignments(apiClient, teamId),
        ShiftApi.getAllShifts(apiClient, teamId),
        WorkerApi.getAllWorkers(apiClient, teamId),
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
   * Get schedule LHS data
   */
  static async getScheduleLHSData(
    apiClient: AuthenticatedApiClient,
    teamId: string
  ): Promise<{
    breaches: any[];
    requests: any[];
    stats: any;
    specialties: any[];
  }> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

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
        getBreaches(teamId), // TODO: Create BreachApi
        RequestApi.getRequests(apiClient, teamId),
        StatsApi.getStats(apiClient, teamId, statsOptions),
        SpecialtyApi.getSpecialties(apiClient, teamId),
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

  // Legacy methods for backward compatibility (discouraged)
  // These methods throw errors since they require authentication
  static async createScheduleLegacy(teamId: string): Promise<ScheduleT> {
    throw new Error(
      "⚠️ Legacy method no longer supported. Use ScheduleApi.createSchedule() with authenticated API client instead."
    );
  }

  static async getSchedulesLegacy(teamId: string): Promise<ScheduleT[]> {
    throw new Error(
      "⚠️ Legacy method no longer supported. Use ScheduleApi.getSchedules() with authenticated API client instead."
    );
  }

  static async updateScheduleLegacy(schedule: ScheduleT): Promise<ScheduleT> {
    throw new Error(
      "⚠️ Legacy method no longer supported. Use ScheduleApi.updateSchedule() with authenticated API client instead."
    );
  }

  static async deleteScheduleLegacy(
    scheduleId: string,
    teamId: string
  ): Promise<boolean> {
    throw new Error(
      "⚠️ Legacy method no longer supported. Use ScheduleApi.deleteSchedule() with authenticated API client instead."
    );
  }

  static async validateScheduleLegacy(
    scheduleId: string,
    teamId: string
  ): Promise<ScheduleT> {
    throw new Error(
      "⚠️ Legacy method no longer supported. Use ScheduleApi.validateSchedule() with authenticated API client instead."
    );
  }

  static async exportScheduleLegacy(
    teamId: string,
    exportOptions: ExportOptionsT
  ): Promise<any> {
    throw new Error(
      "⚠️ Legacy method no longer supported. Use ScheduleApi.exportSchedule() with authenticated API client instead."
    );
  }

  static async duplicatePeriodLegacy(
    duplicateRequest: DuplicateRequestT,
    campaignId: string,
    teamId: string
  ): Promise<DuplicateResultT> {
    throw new Error(
      "⚠️ Legacy method no longer supported. Use ScheduleApi.duplicatePeriod() with authenticated API client instead."
    );
  }
}
