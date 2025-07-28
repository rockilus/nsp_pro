/**
 * Polling service for monitoring SQS solve status
 */

import {
  SolveTaskStatusResponseT,
  SolveRequestStatus,
} from "@/types/solveTaskStatus";

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
  private getSolveStatusFn: (
    solveId: string
  ) => Promise<SolveTaskStatusResponseT>;

  constructor(
    solveId: string,
    getSolveStatusFn: (solveId: string) => Promise<SolveTaskStatusResponseT>,
    options: PollingOptions = {}
  ) {
    this.solveId = solveId;
    this.getSolveStatusFn = getSolveStatusFn;
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
    console.log(
      "[stop() #1] Stopping polling for solve status (direct call on instance)..."
    );

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
    console.log("Polling for solve status...", this.isActive);

    if (!this.isActive) {
      return;
    }

    try {
      const status = await this.getSolveStatusFn(this.solveId);
      console.log(`Polling status for solve ID ${this.solveId}:`, status);
      console.log(
        `Current request status: ${status.requestStatus}, ${
          status.requestStatus === "PENDING"
        },  ${status.requestStatus === SolveRequestStatus.PENDING}`
      );

      // Reset retry count on successful request
      this.retryCount = 0;

      // Notify status change
      this.options.onStatusChange(status);

      // Check if we should continue polling
      if (status.requestStatus === SolveRequestStatus.COMPLETED) {
        this.options.onComplete(status);
        console.log("[stop() #2] Stopping polling after COMPLETED status.");
        this.stop();
        return;
      }

      if (status.requestStatus === SolveRequestStatus.FAILED) {
        this.options.onFailed(status.errorMessage || "Solve failed");
        console.log("[stop() #3] Stopping polling after FAILED status.");
        this.stop();
        return;
      }

      // Continue polling for PENDING and IN_PROGRESS
      if (
        status.requestStatus === SolveRequestStatus.PENDING ||
        status.requestStatus === SolveRequestStatus.IN_PROGRESS
      ) {
        console.log("Scheduling next poll...");

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
      console.log("[stop() #4] Stopping polling after max retries reached.");
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
    console.log("Scheduling next poll timeout to:", this.options.interval);

    this.timeoutId = setTimeout(() => {
      this.poll();
    }, this.options.interval);
  }
}
