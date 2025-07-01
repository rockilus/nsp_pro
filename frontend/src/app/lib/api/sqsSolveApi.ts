/**
 * API client for SQS-based solve operations
 */

export interface SqsSolveRequest {
  schedule_id: string;
  team_id: string;
}

export interface SqsSolveResponse {
  message_id: string;
  solve_id: string;
  status: string;
}

export interface SqsSolveStatusResponse {
  solve_id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  result?: {
    schedule?: any;
    assignments?: any[];
    breaches?: any[];
    requests?: any[];
  };
}

export interface SqsSolveResultResponse {
  solve_id: string;
  schedule: any;
  assignments: any[];
  breaches: any[];
  requests: any[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class SqsSolveApi {
  /**
   * Start a new solve request using SQS
   */
  static async startSolve(request: SqsSolveRequest): Promise<SqsSolveResponse> {
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

    return await response.json();
  }

  /**
   * Get the status of a solve request
   */
  static async getSolveStatus(
    solveId: string
  ): Promise<SqsSolveStatusResponse> {
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

    return await response.json();
  }

  /**
   * Get the result of a completed solve request
   */
  static async getSolveResult(
    solveId: string
  ): Promise<SqsSolveResultResponse> {
    const response = await fetch(
      `${API_BASE_URL}/sqs-solve/${solveId}/result`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get solve result: ${response.status} - ${
          errorData.detail || response.statusText
        }`
      );
    }

    return await response.json();
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
}
