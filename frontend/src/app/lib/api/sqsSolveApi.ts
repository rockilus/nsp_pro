/**
 * API client for SQS-based solve operations
 */

import {
  SolveTaskStatusResponseT,
  SolveRequestT,
  toSolveTaskStatusResponseT,
} from "@/types/solveTaskStatus";
import { BaseApi, AuthenticatedApiClient } from "./baseApi";

export class SqsSolveApi extends BaseApi {
  /**
   * Start a new solve request using SQS (authenticated)
   */
  static async startSolve(
    apiClient: AuthenticatedApiClient,
    request: SolveRequestT
  ): Promise<SolveTaskStatusResponseT> {
    console.log("🔍 SqsSolveApi.startSolve called:", {
      timestamp: new Date().toISOString(),
      apiClient,
      request,
    });

    // Security: Input validation
    if (!request || !request.schedule_id || !request.team_id) {
      throw new Error(
        "Invalid solve request: schedule_id and team_id are required"
      );
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "post",
      "/sqs-solve/start",
      request
    );
    return toSolveTaskStatusResponseT(responseData);
  }

  /**
   * Get the status of a solve request (authenticated)
   */
  static async getSolveStatus(
    apiClient: AuthenticatedApiClient,
    solveId: string
  ): Promise<SolveTaskStatusResponseT> {
    // Security: Input validation
    if (!solveId) {
      throw new Error("Solve ID is required");
    }

    const responseData = await this.makeRequest<any>(
      apiClient,
      "get",
      `/sqs-solve/${solveId}/status`
    );
    return toSolveTaskStatusResponseT(responseData);
  }

  /**
   * Cancel a solve request (authenticated)
   */
  static async cancelSolve(
    apiClient: AuthenticatedApiClient,
    solveId: string
  ): Promise<void> {
    // Security: Input validation
    if (!solveId) {
      throw new Error("Solve ID is required");
    }

    await this.makeRequest<void>(
      apiClient,
      "post",
      `/sqs-solve/${solveId}/cancel`
    );
  }

  /**
   * Get the latest solve status for a specific schedule (authenticated)
   */
  static async getLatestSolveStatus(
    apiClient: AuthenticatedApiClient,
    scheduleId: string
  ): Promise<SolveTaskStatusResponseT | null> {
    // Security: Input validation
    if (!scheduleId) {
      throw new Error("Schedule ID is required");
    }

    try {
      const responseData = await this.makeRequest<any>(
        apiClient,
        "get",
        `/sqs-solve/schedule/${scheduleId}/latest`
      );
      return toSolveTaskStatusResponseT(responseData);
    } catch (error) {
      // Check if it's a 404 error (no solve found for this schedule)
      if (error instanceof Error && error.message.includes("not found")) {
        return null;
      }
      throw error;
    }
  }
}
