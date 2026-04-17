/**
 * API client for assignment operations
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  AssignmentT,
  fromAssignmentT,
  toAssignmentT,
  AssignmentsRecurrencesResultT,
  toAssignmentsRecurrencesResultT,
} from '../../../types/assignment';
import {
  fromRecurrenceRuleT,
  RecurrenceRuleT,
  RecurrenceUpdateScope,
} from '../../../types/recurrence';
import { ReplacementCandidateT, toReplacementCandidateT } from '../../../types/replacement';
import { BaseApi, AuthenticatedApiClient } from './baseApi';

dayjs.extend(utc);

/**
 * Implicit campaign-scope selection criteria sent to the backend.
 * Exactly one of selectedRowWorkerIds / selectedRowShiftIds is populated
 * (depending on the current groupBy setting). An empty list means
 * "all rows in the campaign".
 */
export interface SelectionIntentPayload {
  campaignId: string;
  /** empty = all workers; populated in worker-view row selection */
  selectedRowWorkerIds: string[];
  /** empty = all shifts; populated in shift-view row selection */
  selectedRowShiftIds: string[];
  /** IDs of individual assignments deselected from the implicit set */
  excludedAssignmentIds: string[];
}

export class AssignmentApi extends BaseApi {
  /**
   * Add assignment with optional recurrence (authenticated)
   */
  static async addAssignmentAndRecurrence(
    apiClient: AuthenticatedApiClient,
    assignment: AssignmentT,
    recurrence: RecurrenceRuleT | null = null,
  ): Promise<AssignmentsRecurrencesResultT> {
    // Security: Input validation
    if (!assignment || !assignment.teamId) {
      throw new Error('Assignment and team ID are required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/assignments/teams/${assignment.teamId}`,
      {
        assignment: fromAssignmentT(assignment),
        recurrence: recurrence ? fromRecurrenceRuleT(recurrence) : null,
      },
    );
    return toAssignmentsRecurrencesResultT(responseData);
  }

  /**
   * Get assignments by date range with optional campaign inclusion (authenticated)
   */
  static async getAssignments(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    includeCampaign: boolean = false,
    startDate?: dayjs.Dayjs,
    endDate?: dayjs.Dayjs,
    workerId?: string,
    shiftTypes?: number[],
  ): Promise<AssignmentsRecurrencesResultT> {
    // Security: Input validation
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const startDateStr = startDate ? startDate.format('YYYY-MM-DD') : null;
    const endDateStr = endDate ? endDate.format('YYYY-MM-DD') : null;

    let endpoint = `/assignments/teams/${teamId}`;
    const params = new URLSearchParams();
    if (startDateStr && endDateStr) {
      params.append('start_date', startDateStr);
      params.append('end_date', endDateStr);
    }
    if (includeCampaign) {
      params.append('include_campaign', 'true');
    }
    if (workerId) {
      params.append('worker_id', workerId);
    }
    if (shiftTypes && shiftTypes.length > 0) {
      shiftTypes.forEach((t) => params.append('shift_type', String(t)));
    }

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const responseData = await this.makeRequest<any>(apiClient, 'get', endpoint);
    return toAssignmentsRecurrencesResultT(responseData);
  }

  /**
   * Update assignment with optional recurrence (authenticated)
   */
  static async updateAssignmentAndRecurrence(
    apiClient: AuthenticatedApiClient,
    assignment: AssignmentT,
    teamId: string,
    recurrenceRule: RecurrenceRuleT | null = null,
    recurrenceUpdateScope: RecurrenceUpdateScope | null = null,
  ): Promise<AssignmentsRecurrencesResultT> {
    // Security: Input validation
    if (!assignment || !assignment.id) {
      throw new Error('Assignment with ID is required');
    }
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    let endpoint = `/assignments/${assignment.id}/teams/${teamId}`;
    if (recurrenceUpdateScope !== null) {
      endpoint += `?recurrence_update_scope=${recurrenceUpdateScope.toString()}`;
    }

    const responseData = await this.makeRequest<any>(apiClient, 'put', endpoint, {
      assignment: fromAssignmentT(assignment),
      recurrence: recurrenceRule ? fromRecurrenceRuleT(recurrenceRule) : null,
      recurrence_update_scope: recurrenceUpdateScope,
    });
    return toAssignmentsRecurrencesResultT(responseData);
  }

  /**
   * Delete assignment (authenticated)
   */
  static async deleteAssignment(
    apiClient: AuthenticatedApiClient,
    assignmentId: string,
    teamId: string,
    recurrenceId: string | null = null,
    recurrenceUpdateScope: RecurrenceUpdateScope | null = null,
  ): Promise<AssignmentsRecurrencesResultT> {
    // Security: Input validation
    if (!assignmentId) {
      throw new Error('Assignment ID is required');
    }
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const params = new URLSearchParams();
    if (recurrenceId) {
      params.append('recurrence_id', recurrenceId);
    }
    if (recurrenceUpdateScope !== null) {
      params.append('recurrence_update_scope', recurrenceUpdateScope.toString());
    }

    let endpoint = `/assignments/${assignmentId}/teams/${teamId}`;
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const responseData = await this.makeRequest<any>(apiClient, 'delete', endpoint);
    return toAssignmentsRecurrencesResultT(responseData);
  }

  /**
   * Get replacement candidates for an assignment (authenticated)
   */
  static async getReplacementCandidates(
    apiClient: AuthenticatedApiClient,
    assignmentId: string,
    teamId: string,
  ): Promise<ReplacementCandidateT[]> {
    // Security: Input validation
    if (!assignmentId || !teamId) {
      throw new Error('Assignment ID and team ID are required');
    }

    const endpoint = `/assignments/${assignmentId}/replacement-candidates/teams/${teamId}`;

    const responseData = await this.makeRequest<any[]>(apiClient, 'get', endpoint);

    return responseData.map((candidate: any) => toReplacementCandidateT(candidate));
  }

  /**
   * Bulk create assignments (no recurrence) (authenticated)
   */
  static async bulkCreateAssignments(
    apiClient: AuthenticatedApiClient,
    assignments: AssignmentT[],
    teamId: string,
  ): Promise<AssignmentsRecurrencesResultT> {
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'post',
      `/assignments/bulk/teams/${teamId}`,
      { assignments: assignments.map(fromAssignmentT) },
    );
    return toAssignmentsRecurrencesResultT(responseData);
  }

  /**
   * Bulk update assignments (authenticated)
   */
  static async bulkUpdateAssignments(
    apiClient: AuthenticatedApiClient,
    assignments: AssignmentT[],
    teamId: string,
    intent?: SelectionIntentPayload,
  ): Promise<AssignmentsRecurrencesResultT> {
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const body: Record<string, unknown> = { assignments: assignments.map(fromAssignmentT) };
    if (intent) {
      body.intent = {
        campaign_id: intent.campaignId,
        selected_row_worker_ids: intent.selectedRowWorkerIds,
        selected_row_shift_ids: intent.selectedRowShiftIds,
        excluded_assignment_ids: intent.excludedAssignmentIds,
      };
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'put',
      `/assignments/bulk/teams/${teamId}`,
      body,
    );
    return toAssignmentsRecurrencesResultT(responseData);
  }

  /**
   * Bulk delete assignments (authenticated)
   */
  static async bulkDeleteAssignments(
    apiClient: AuthenticatedApiClient,
    assignmentIds: string[],
    teamId: string,
    intent?: SelectionIntentPayload,
  ): Promise<AssignmentsRecurrencesResultT> {
    if (!teamId) {
      throw new Error('Team ID is required');
    }

    const body: Record<string, unknown> = { ids: assignmentIds };
    if (intent) {
      body.intent = {
        campaign_id: intent.campaignId,
        selected_row_worker_ids: intent.selectedRowWorkerIds,
        selected_row_shift_ids: intent.selectedRowShiftIds,
        excluded_assignment_ids: intent.excludedAssignmentIds,
      };
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      'delete',
      `/assignments/bulk/teams/${teamId}`,
      body,
    );
    return toAssignmentsRecurrencesResultT(responseData);
  }
}
