/**
 * Polling service for monitoring SQS solve status
 */

import {
  SolveTaskStatusResponseT,
  SolveRequestStatus,
} from "@/types/solveTaskStatus";
import { SqsSolveApi } from "../api/sqsSolveApi";

export interface PollingOptions {
  interval?: number; // polling interval in milliseconds (default: 2000)
  maxRetries?: number; // max retries on network errors (default: 5)
  onStatusChange?: (status: SolveTaskStatusResponseT) => void;
  onError?: (error: Error) => void;
  onComplete?: (result: SolveTaskStatusResponseT) => void;
  onFailed?: (error: string) => void;
}

export class SolvePollingService {
  private solveId: string;
  private options: Required<PollingOptions>;
  private timeoutId: NodeJS.Timeout | null = null;
  private isActive = false;
  private retryCount = 0;

  constructor(solveId: string, options: PollingOptions = {}) {
    this.solveId = solveId;
    this.options = {
      interval: options.interval || 2000,
      maxRetries: options.maxRetries || 5,
      onStatusChange: options.onStatusChange || (() => {}),
      onError: options.onError || (() => {}),
      onComplete: options.onComplete || (() => {}),
      onFailed: options.onFailed || (() => {}),
    };
  }

  /**
   * Start polling for solve status
   */
  start(): void {
    if (this.isActive) {
      console.warn("Polling is already active");
      return;
    }

    this.isActive = true;
    this.retryCount = 0;
    this.poll();
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.isActive = false;
    this.retryCount = 0;
  }

  /**
   * Check if polling is currently active
   */
  isPolling(): boolean {
    return this.isActive;
  }

  /**
   * Get the current solve ID
   */
  getSolveId(): string {
    return this.solveId;
  }

  private async poll(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    try {
      const status = await SqsSolveApi.getSolveStatus(this.solveId);

      // Reset retry count on successful request
      this.retryCount = 0;

      // Notify status change
      this.options.onStatusChange(status);

      // Check if we should continue polling
      if (status.requestStatus === SolveRequestStatus.COMPLETED) {
        this.options.onComplete(status);
        this.stop();
        return;
      }

      if (status.requestStatus === SolveRequestStatus.FAILED) {
        this.options.onFailed(status.errorMessage || "Solve failed");
        this.stop();
        return;
      }

      // Continue polling for PENDING and IN_PROGRESS
      if (
        status.requestStatus === SolveRequestStatus.PENDING ||
        status.requestStatus === SolveRequestStatus.IN_PROGRESS
      ) {
        this.scheduleNextPoll();
      }
    } catch (error) {
      this.handlePollingError(error as Error);
    }
  }

  private handlePollingError(error: Error): void {
    this.retryCount++;

    if (this.retryCount >= this.options.maxRetries) {
      this.options.onError(
        new Error(
          `Polling failed after ${this.options.maxRetries} retries. Last error: ${error.message}`
        )
      );
      this.stop();
      return;
    }

    // Exponential backoff: increase interval on retries
    const backoffInterval =
      this.options.interval * Math.pow(2, this.retryCount - 1);

    console.warn(
      `Polling error (retry ${this.retryCount}/${this.options.maxRetries}):`,
      error.message
    );

    this.timeoutId = setTimeout(() => {
      this.poll();
    }, backoffInterval);
  }

  private scheduleNextPoll(): void {
    this.timeoutId = setTimeout(() => {
      this.poll();
    }, this.options.interval);
  }
}
