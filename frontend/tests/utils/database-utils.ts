/**
 * Database utilities for E2E testing
 *
 * This module provides utilities to interact with the test database reset API,
 * allowing Playwright tests to reset the database state before each test run.
 */

import { TeamApi } from "../../src/app/lib/api/teamApi";
import { WorkerApi } from "../../src/app/lib/api/workerApi";
import { AuthenticatedApiClient } from "../../src/app/lib/api/baseApi";
import { TeamWithMembership } from "../../src/types/team";
import { WorkerT } from "../../src/types/worker";
import { testConfig } from "./test-config";
import dayjs from "dayjs";

export interface DatabaseResetOptions {
  collections?: string[];
  preserveSystemData?: boolean;
}

export interface DatabaseResetResponse {
  success: boolean;
  message: string;
  collections_reset: string[];
  timestamp: string;
  operation_id: string;
}

export interface DryRunResponse {
  collections_to_reset: string[];
  total_count: number;
  requested_collections: string[] | null;
  dry_run: boolean;
}

export class DatabaseTestUtils {
  private testApiClient: AuthenticatedApiClient;

  constructor() {
    // Use centralized test configuration
    this.testApiClient = this.createTestApiClient();
  }

  /**
   * Create environment-aware authentication headers
   * Follows the same pattern as the main application
   */
  private getAuthHeaders(): Record<string, string> {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (testConfig.environment === "development") {
      // Development mode: use X-Dev headers (same as main app)
      if (!testConfig.devUserId || !testConfig.devApiKey) {
        throw new Error(
          "Development environment requires TEST_USER_ID and TEST_API_KEY to be set"
        );
      }

      return {
        ...baseHeaders,
        "X-Dev-User-ID": testConfig.devUserId,
        "X-API-Key": testConfig.devApiKey,
      };
    } else {
      // Staging/Production: use Bearer token
      if (!testConfig.authToken) {
        throw new Error(
          `${testConfig.environment} environment requires TEST_AUTH_TOKEN to be set`
        );
      }

      return {
        ...baseHeaders,
        Authorization: `Bearer ${testConfig.authToken}`,
      };
    }
  }

  /**
   * Create an authenticated API client for testing with environment-aware auth
   */
  private createTestApiClient(): AuthenticatedApiClient {
    const makeAuthenticatedRequest = async <T>(
      method: string,
      endpoint: string,
      data?: any,
      options: RequestInit = {}
    ): Promise<T> => {
      const authHeaders = this.getAuthHeaders();

      const response = await fetch(`${testConfig.apiUrl}${endpoint}`, {
        method: method.toUpperCase(),
        ...options,
        headers: {
          ...authHeaders,
          ...options.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));

        // Enhanced error logging for test debugging
        console.error(`❌ Test API ${method} ${endpoint} failed:`, {
          status: response.status,
          error: errorData.detail || response.statusText,
          environment: testConfig.environment,
          endpoint,
          timestamp: new Date().toISOString(),
        });

        throw new Error(
          `API ${method} ${endpoint} failed: ${response.status} - ${
            errorData.detail || response.statusText
          }`
        );
      }

      return response.json();
    };

    return {
      get: <T>(endpoint: string, options?: RequestInit) =>
        makeAuthenticatedRequest<T>("GET", endpoint, undefined, options),
      post: <T>(endpoint: string, data?: any, options?: RequestInit) =>
        makeAuthenticatedRequest<T>("POST", endpoint, data, options),
      put: <T>(endpoint: string, data?: any, options?: RequestInit) =>
        makeAuthenticatedRequest<T>("PUT", endpoint, data, options),
      delete: <T>(endpoint: string, options?: RequestInit) =>
        makeAuthenticatedRequest<T>("DELETE", endpoint, undefined, options),
    };
  }

  /**
   * Reset database collections for testing
   */
  async resetDatabase(
    options: DatabaseResetOptions = {}
  ): Promise<DatabaseResetResponse> {
    const response = await fetch(
      `${testConfig.apiUrl}/test-utils/reset-database`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collections: options.collections,
          preserve_system_data: options.preserveSystemData ?? true,
          confirmation_token: testConfig.confirmationToken,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(
        `Database reset failed (${response.status}): ${
          errorData.detail || response.statusText
        }`
      );
    }

    return response.json();
  }

  /**
   * Preview what collections would be reset without actually resetting them
   */
  async dryRunReset(collections?: string[]): Promise<DryRunResponse> {
    const url = new URL(
      `${testConfig.apiUrl}/test-utils/reset-database/dry-run`
    );

    if (collections && collections.length > 0) {
      url.searchParams.set("collections", collections.join(","));
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(
        `Dry run failed (${response.status}): ${
          errorData.detail || response.statusText
        }`
      );
    }

    return response.json();
  }

  /**
   * Check if test utilities are available and healthy
   */
  async checkHealth(): Promise<{
    status: string;
    test_utilities_available: boolean;
  }> {
    const response = await fetch(`${testConfig.apiUrl}/test-utils/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Wait for the API server to be ready
   */
  async waitForApiReady(timeoutMs?: number): Promise<void> {
    const timeout = timeoutMs ?? testConfig.apiReadyTimeoutMs;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        await this.checkHealth();
        return;
      } catch (error) {
        // Continue waiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    throw new Error(`API not ready within ${timeout}ms timeout period`);
  }

  /**
   * Reset specific collections commonly used in team tests
   */
  async resetTeamRelatedData(): Promise<DatabaseResetResponse> {
    return this.resetDatabase({
      collections: ["teams", "team_memberships"],
      preserveSystemData: true,
    });
  }

  /**
   * Reset specific collections commonly used in workers tests
   */
  async resetWorkersRelatedData(): Promise<DatabaseResetResponse> {
    return this.resetDatabase({
      collections: [
        "teams",
        "team_memberships",
        "workers",
        "dimensions",
        "attributes",
        "specialties",
      ],
      preserveSystemData: true,
    });
  }

  /**
   * Reset scheduling related collections
   */
  async resetSchedulingData(): Promise<DatabaseResetResponse> {
    return this.resetDatabase({
      collections: [
        "schedules",
        "shifts",
        "assignments",
        "shift_demands",
        "coverage",
        "requests",
      ],
      preserveSystemData: true,
    });
  }

  /**
   * Reset all collections (full reset)
   */
  async resetAllData(): Promise<DatabaseResetResponse> {
    return this.resetDatabase({
      preserveSystemData: true,
    });
  }

  /**
   * Create a team using the existing TeamApi for consistent behavior
   */
  async createTeam(teamData: {
    name: string;
  }): Promise<{ teamId: string; name: string }> {
    try {
      // Use the existing TeamApi with our test client
      const result: TeamWithMembership = await TeamApi.createTeam(
        this.testApiClient,
        teamData.name
      );

      return {
        teamId: result.team.id,
        name: result.team.name,
      };
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to create team '${teamData.name}': ${error.message}`
        );
      }
      throw new Error(
        `Failed to create team '${teamData.name}': Unknown error`
      );
    }
  }

  /**
   * Create a worker using the existing WorkerApi for consistent behavior
   */
  async createWorker(workerData: {
    teamId: string;
    name: string;
    acronym?: string;
    employmentStartDate?: Date;
    employmentEndDate?: Date | null;
    weeklyHours?: number;
    weeklyHoursDesired?: number;
    dutiesPerMonth?: number;
    annualLeave?: number;
    specialtyIds?: string[];
  }): Promise<{ workerId: string; name: string; teamId: string }> {
    try {
      // Create a WorkerT object with defaults
      const worker: WorkerT = {
        id: "", // Will be set by the API
        teamId: workerData.teamId,
        name: workerData.name,
        acronym:
          workerData.acronym || workerData.name.substring(0, 3).toUpperCase(),
        acronymCustom: Boolean(workerData.acronym),
        employmentStartDate: workerData.employmentStartDate
          ? dayjs(workerData.employmentStartDate).utc()
          : dayjs().utc(),
        employmentEndDate: workerData.employmentEndDate
          ? dayjs(workerData.employmentEndDate).utc()
          : null,
        weeklyHours: workerData.weeklyHours ?? 40,
        weeklyHoursDesired: workerData.weeklyHoursDesired ?? 40,
        dutiesPerMonth: workerData.dutiesPerMonth ?? 0,
        annualLeave: workerData.annualLeave ?? 25,
        specialtyIds: workerData.specialtyIds ?? [],
        deleted: false,
        userId: null,
        attributes: [],
      };

      // Use the existing WorkerApi with our test client
      const result: WorkerT = await WorkerApi.addWorker(
        this.testApiClient,
        worker
      );

      return {
        workerId: result.id,
        name: result.name,
        teamId: result.teamId,
      };
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to create worker '${workerData.name}': ${error.message}`
        );
      }
      throw new Error(
        `Failed to create worker '${workerData.name}': Unknown error`
      );
    }
  }
}
