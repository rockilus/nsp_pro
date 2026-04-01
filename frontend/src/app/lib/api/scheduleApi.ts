/**
 * API client for schedule operations
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
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
  RequestDeadlineT,
  toRequestDeadlineT,
} from '../../../types/schedule';
import { AssignmentT } from '../../../types/assignment';
import {
  StatsOptionsT,
  StatsUnitOptions,
  HeaderUnitOptions,
  StatsTimeFrameOptions,
} from '../../../types/stats';
import { ShiftT } from '../../../types/shift';
import { WorkerT } from '../../../types/worker';
import { RecurrenceRuleT } from '../../../types/recurrence';
import { BaseApi, AuthenticatedApiClient } from './baseApi';
// API Classes
import { AssignmentApi } from './assignmentApi';
import { WorkerApi } from './workerApi';
import { ShiftApi } from './shiftApi';
import { RequestApi } from './requestApi';
import { StatsApi } from './statsApi';
import { SpecialtyApi } from './specialtyApi';
import { BreachApi } from './breachApi';

dayjs.extend(utc);

export class ScheduleApi extends BaseApi {
  /**
   * Create a new schedule (authenticated)
   */
  static async createSchedule(
    apiClient: AuthenticatedApiClient,
    teamId: string,
  ): Promise<ScheduleT> {
    // Security: Input validation
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/schedules/teams/${teamId}`,
    );
    return toScheduleT(responseData) as ScheduleT;
  }

  /**
   * Get schedules for a team (authenticated)
   */
  static async getSchedules(
    apiClient: AuthenticatedApiClient,
    teamId: string,
  ): Promise<ScheduleT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      'get',
      `/schedules/teams/${teamId}`,
    );
    return responseData.map(toScheduleT) as ScheduleT[];
  }

  /**
   * Get work time table for a schedule (authenticated)
   */
  static async getWorkTimeTable(
    apiClient: AuthenticatedApiClient,
    scheduleId: string,
    teamId: string,
  ): Promise<WorkTimeTableT> {
    // Security: Input validation
    if (!scheduleId) {
      throw new Error('Schedule ID is required');
    }
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<WorkTimeTableT>(
      apiClient,
      'get',
      `/schedules/${scheduleId}/work-time-table/teams/${teamId}`,
    );
    return responseData;
  }

  /**
   * Update a schedule (authenticated)
   */
  static async updateSchedule(
    apiClient: AuthenticatedApiClient,
    schedule: ScheduleT,
  ): Promise<ScheduleT> {
    // Security: Input validation
    if (!schedule || !schedule.id) {
      throw new Error('Invalid schedule data provided');
    }
    if (!schedule.teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'put',
      `/schedules/${schedule.id}/teams/${schedule.teamId}`,
      fromScheduleT(schedule),
    );
    return toScheduleT(responseData);
  }

  /**
   * Delete a schedule (authenticated)
   */
  static async deleteSchedule(
    apiClient: AuthenticatedApiClient,
    scheduleId: string,
    teamId: string,
  ): Promise<void> {
    // Security: Input validation
    if (!scheduleId) {
      throw new Error('Schedule ID is required');
    }
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    await this.makeRequest<void>(apiClient, 'delete', `/schedules/${scheduleId}/teams/${teamId}`);
  }

  /**
   * Validate a schedule (authenticated)
   */
  static async validateSchedule(
    apiClient: AuthenticatedApiClient,
    scheduleId: string,
    teamId: string,
  ): Promise<ScheduleT> {
    // Security: Input validation
    if (!scheduleId) {
      throw new Error('Schedule ID is required');
    }
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/schedules/${scheduleId}/validate/teams/${teamId}`,
    );
    return toScheduleT(responseData);
  }

  /**
   * Export a schedule (authenticated)
   */
  static async exportSchedule(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    exportOptions: ExportOptionsT,
  ): Promise<any> {
    // Security: Input validation
    if (!teamId) {
      throw new Error('Team ID is required');
    }
    if (!exportOptions) {
      throw new Error('Export options are required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/schedules/export/teams/${teamId}`,
      fromExportOptionsT(exportOptions),
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
    teamId: string,
  ): Promise<DuplicateResultT> {
    // Security: Input validation
    if (!duplicateRequest) {
      throw new Error('Duplicate request data is required');
    }
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/schedules/${campaignId}/duplicate-period/teams/${teamId}`,
      fromDuplicateRequestT(duplicateRequest),
    );
    return toDuplicateResultT(responseData) as DuplicateResultT;
  }

  /**
   * Get schedule assignments data
   */
  /**
   * Get schedule entities (shifts and workers only)
   *
   * This replaces getScheduleAssignmentsData for fetching entity data.
   * Assignments should now be fetched separately using useAssignmentsByPeriod hook.
   *
   * @param apiClient - Authenticated API client
   * @param teamId - Team identifier
   * @returns Shifts and workers only (entities that change rarely)
   */
  static async getScheduleEntities(
    apiClient: AuthenticatedApiClient,
    teamId: string,
  ): Promise<{
    shifts: ShiftT[];
    workers: WorkerT[];
  }> {
    // Security: Input validation
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    try {
      const [shifts, workers] = await Promise.all([
        ShiftApi.getAllShifts(apiClient, teamId),
        WorkerApi.getWorkers(apiClient, teamId, undefined, true),
      ]);

      return {
        shifts,
        workers,
      };
    } catch (error) {
      console.error('Failed to fetch schedule entities:', error);
      throw new Error('Failed to fetch schedule entities, please try again later');
    }
  }

  /**
   * @deprecated Use getScheduleEntities + useAssignmentsByPeriod hook instead
   *
   * This method fetches everything at once without date filtering.
   * New code should use:
   * - getScheduleEntities() for shifts/workers
   * - useAssignmentsByPeriod() hook for assignments with smart buffering
   */
  static async getScheduleAssignmentsData(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    includeCampaign: boolean = true,
  ): Promise<{
    assignments: AssignmentT[];
    recurrences: RecurrenceRuleT[];
    shifts: ShiftT[];
    workers: WorkerT[];
  }> {
    // Security: Input validation
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    try {
      const campaignTabData = await Promise.all([
        AssignmentApi.getAssignments(apiClient, teamId, includeCampaign),
        ShiftApi.getAllShifts(apiClient, teamId),
        WorkerApi.getWorkers(apiClient, teamId, undefined, true),
      ]);

      return {
        assignments: campaignTabData[0].assignmentsRead,
        recurrences: campaignTabData[0].recurrencesRead,
        shifts: campaignTabData[1],
        workers: campaignTabData[2],
      };
    } catch (error) {
      console.error('Failed to fetch schedule assignments data:', error);
      throw new Error('Failed to fetch schedule assignments data, please try again later');
    }
  }

  /**
   * @deprecated Use getScheduleEntities + useAssignmentsByPeriod hook instead
   * Get schedule assignments data (no solver version)
   */
  static async getScheduleAssignmentsDataNoSolver(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    includeCampaign: boolean = true,
  ): Promise<{
    assignments: AssignmentT[];
    recurrences: RecurrenceRuleT[];
    shifts: ShiftT[];
    workers: WorkerT[];
  }> {
    // Same implementation as getScheduleAssignmentsData for now
    return this.getScheduleAssignmentsData(apiClient, teamId, includeCampaign);
  }

  /**
   * Get the request deadline for a team's campaign schedule (accessible to members)
   */
  static async getRequestDeadline(
    apiClient: AuthenticatedApiClient,
    teamId: string,
  ): Promise<RequestDeadlineT> {
    if (!teamId) {
      throw new Error('Team ID is required');
    }
    const responseData = await this.makeRequest<any>(
      apiClient,
      'get',
      `/schedules/teams/${teamId}/request-deadline`,
    );
    return toRequestDeadlineT(responseData);
  }

  /**
   * Set the request deadline on a campaign schedule
   */
  static async setRequestDeadline(
    apiClient: AuthenticatedApiClient,
    scheduleId: string,
    teamId: string,
    deadline: Date,
  ): Promise<ScheduleT> {
    if (!scheduleId) throw new Error('Schedule ID is required');
    if (!teamId) throw new Error('Team ID is required');
    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/schedules/${scheduleId}/request-deadline/teams/${teamId}`,
      { deadline: deadline.getTime() / 1000 },
    );
    return toScheduleT(responseData);
  }

  /**
   * Send a reminder notification for the request deadline
   */
  static async sendRequestDeadlineReminder(
    apiClient: AuthenticatedApiClient,
    scheduleId: string,
    teamId: string,
  ): Promise<void> {
    if (!scheduleId) throw new Error('Schedule ID is required');
    if (!teamId) throw new Error('Team ID is required');
    await this.makeRequest<void>(
      apiClient,
      'post',
      `/schedules/${scheduleId}/request-deadline/reminder/teams/${teamId}`,
    );
  }

  /**
   * Extend the request deadline on a campaign schedule
   */
  static async extendRequestDeadline(
    apiClient: AuthenticatedApiClient,
    scheduleId: string,
    teamId: string,
    newDeadline: Date,
  ): Promise<ScheduleT> {
    if (!scheduleId) throw new Error('Schedule ID is required');
    if (!teamId) throw new Error('Team ID is required');
    const responseData = await this.makeRequest<any>(
      apiClient,
      'put',
      `/schedules/${scheduleId}/request-deadline/teams/${teamId}`,
      { deadline: newDeadline.getTime() / 1000 },
    );
    return toScheduleT(responseData);
  }
}
