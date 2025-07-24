/**
 * API client for assignment operations
 */

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import {
  AssignmentT,
  fromAssignmentT,
  toAssignmentT,
  AssignmentsRecurrencesResultT,
  toAssignmentsRecurrencesResultT,
} from "../../../types/assignment";
import {
  fromRecurrenceRuleT,
  RecurrenceRuleT,
  RecurrenceUpdateScope,
} from "../../../types/recurrence";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

dayjs.extend(utc);

export class AssignmentApi extends BaseApi {
  /**
   * Add assignment with optional recurrence (authenticated)
   */
  static async addAssignmentAndRecurrence(
    apiClient: AuthenticatedApiClient,
    assignment: AssignmentT,
    recurrence: RecurrenceRuleT | null = null
  ): Promise<AssignmentsRecurrencesResultT> {
    // Security: Input validation
    if (!assignment || !assignment.teamId) {
      throw new Error("Assignment and team ID are required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      `/assignments/teams/${assignment.teamId}`,
      {
        assignment: fromAssignmentT(assignment),
        recurrence: recurrence ? fromRecurrenceRuleT(recurrence) : null,
      }
    );
    return toAssignmentsRecurrencesResultT(responseData);
  }

  /**
   * Get assignments by date range (authenticated)
   */
  static async getAssignmentsByDates(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    startDate?: dayjs.Dayjs,
    endDate?: dayjs.Dayjs
  ): Promise<AssignmentsRecurrencesResultT> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const startDateStr = startDate ? startDate.unix() : null;
    const endDateStr = endDate ? endDate.unix() : null;

    let endpoint = `/assignments/teams/${teamId}`;
    if (startDateStr && endDateStr) {
      endpoint += `?start_date=${startDateStr}&end_date=${endDateStr}`;
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "get",
      endpoint
    );
    return toAssignmentsRecurrencesResultT(responseData);
  }

  /**
   * Get validated assignments by date range (authenticated)
   */
  static async getValidatedAssignments(
    apiClient: AuthenticatedApiClient,
    teamId: string,
    startDate?: dayjs.Dayjs,
    endDate?: dayjs.Dayjs
  ): Promise<AssignmentT[]> {
    // Security: Input validation
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const startDateStr = startDate ? startDate.format("YYYY-MM-DD") : undefined;
    const endDateStr = endDate ? endDate.format("YYYY-MM-DD") : undefined;

    let endpoint = `/assignments/validated/teams/${teamId}`;
    const params = new URLSearchParams();
    if (startDateStr) params.append("start_date", startDateStr);
    if (endDateStr) params.append("end_date", endDateStr);

    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const responseData = await this.makeRequest<any[]>(
      apiClient,
      "get",
      endpoint
    );
    return responseData.map(toAssignmentT);
  }

  /**
   * Update assignment with optional recurrence (authenticated)
   */
  static async updateAssignmentAndRecurrence(
    apiClient: AuthenticatedApiClient,
    assignment: AssignmentT,
    teamId: string,
    recurrenceRule: RecurrenceRuleT | null = null,
    recurrenceUpdateScope: RecurrenceUpdateScope | null = null
  ): Promise<AssignmentsRecurrencesResultT> {
    // Security: Input validation
    if (!assignment || !assignment.id) {
      throw new Error("Assignment with ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    let endpoint = `/assignments/${assignment.id}/teams/${teamId}`;
    if (recurrenceUpdateScope !== null) {
      endpoint += `?recurrence_update_scope=${recurrenceUpdateScope.toString()}`;
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "put",
      endpoint,
      {
        assignment: fromAssignmentT(assignment),
        recurrence: recurrenceRule ? fromRecurrenceRuleT(recurrenceRule) : null,
        recurrence_update_scope: recurrenceUpdateScope,
      }
    );
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
    recurrenceUpdateScope: RecurrenceUpdateScope | null = null
  ): Promise<AssignmentsRecurrencesResultT> {
    // Security: Input validation
    if (!assignmentId) {
      throw new Error("Assignment ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    const params = new URLSearchParams();
    if (recurrenceId) {
      params.append("recurrence_id", recurrenceId);
    }
    if (recurrenceUpdateScope !== null) {
      params.append(
        "recurrence_update_scope",
        recurrenceUpdateScope.toString()
      );
    }

    let endpoint = `/assignments/${assignmentId}/teams/${teamId}`;
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "delete",
      endpoint
    );
    return toAssignmentsRecurrencesResultT(responseData);
  }
}
