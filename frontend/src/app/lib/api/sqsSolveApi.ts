/**
 * API client for SQS-based solve operations
 */

import {
  SolveTaskStatusResponseT,
  SolveRequestT,
  toSolveTaskStatusResponseT,
} from "@/types/solveTaskStatus";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class SqsSolveApi {
  /**
   * Start a new solve request using SQS
   */
  static async startSolve(
    request: SolveRequestT
  ): Promise<SolveTaskStatusResponseT> {
    const response = await fetch(`${API_BASE_URL}/sqs-solve/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to start solve: ${response.status} - ${
          errorData.detail || response.statusText
        }`
      );
    }
    const data = await response.json();
    return toSolveTaskStatusResponseT(data);
  }

  /**
   * Get the status of a solve request
   */
  static async getSolveStatus(
    solveId: string
  ): Promise<SolveTaskStatusResponseT> {
    const response = await fetch(
      `${API_BASE_URL}/sqs-solve/${solveId}/status`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get solve status: ${response.status} - ${
          errorData.detail || response.statusText
        }`
      );
    }

    const data = await response.json();
    return toSolveTaskStatusResponseT(data);
  }

  /**
   * Cancel a solve request
   */
  static async cancelSolve(solveId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/sqs-solve/${solveId}/cancel`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to cancel solve: ${response.status} - ${
          errorData.detail || response.statusText
        }`
      );
    }
  }

  /**
   * Get the latest solve status for a specific schedule
   */
  static async getLatestSolveStatus(
    scheduleId: string
  ): Promise<SolveTaskStatusResponseT | null> {
    const response = await fetch(
      `${API_BASE_URL}/sqs-solve/schedule/${scheduleId}/latest`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // No solve found for this schedule
        return null;
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get latest solve status: ${response.status} - ${
          errorData.detail || response.statusText
        }`
      );
    }

    const data = await response.json();
    return toSolveTaskStatusResponseT(data);
  }
}
