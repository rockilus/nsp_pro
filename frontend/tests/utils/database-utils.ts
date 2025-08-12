/**
 * Database utilities for E2E testing
 *
 * This module provides utilities to interact with the test database reset API,
 * allowing Playwright tests to reset the database state before each test run.
 */

import { TeamApi } from "../../src/app/lib/api/teamApi";
import { AuthenticatedApiClient } from "../../src/app/lib/api/baseApi";
import { TeamWithMembership } from "../../src/types/team";

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
  private baseUrl: string;
  private confirmationToken: string;
  private testAuthToken: string;
  private testApiClient: AuthenticatedApiClient | null = null;

  constructor(baseUrl = "http://localhost:4000") {
    this.baseUrl = baseUrl;
    this.confirmationToken = "test-reset-confirm";

    // Get test auth token from environment
    this.testAuthToken = process.env.TEST_AUTH_TOKEN || "";

    // Only create API client if token is available
    if (this.testAuthToken) {
      this.testApiClient = this.createTestApiClient();
    }
  }

  /**
   * Create an authenticated API client for testing
   */
  private createTestApiClient(): AuthenticatedApiClient {
    const makeAuthenticatedRequest = async <T>(
      method: string,
      endpoint: string,
      data?: any,
      options: RequestInit = {}
    ): Promise<T> => {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: method.toUpperCase(),
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.testAuthToken}`,
          ...options.headers,
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
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
    const response = await fetch(`${this.baseUrl}/test-utils/reset-database`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        collections: options.collections,
        preserve_system_data: options.preserveSystemData ?? true,
        confirmation_token: this.confirmationToken,
      }),
    });

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
    const url = new URL(`${this.baseUrl}/test-utils/reset-database/dry-run`);

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
    const response = await fetch(`${this.baseUrl}/test-utils/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Wait for the API server to be ready
   */
  async waitForApiReady(timeoutMs = 10000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        await this.checkHealth();
        return;
      } catch (error) {
        // Continue waiting
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    throw new Error(`API not ready within ${timeoutMs}ms timeout period`);
  }

  /**
   * Reset specific collections commonly used in team tests
   */
  async resetTeamRelatedData(): Promise<DatabaseResetResponse> {
    return this.resetDatabase({
      collections: ["teams", "team_memberships", "team_invitations", "workers"],
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
    if (!this.testApiClient) {
      throw new Error(
        "TEST_AUTH_TOKEN environment variable is required for API tests. " +
          "Please set TEST_AUTH_TOKEN in your .env.test.local file or environment."
      );
    }

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
}
