/**
 * Database utilities for E2E testing
 *
 * This module provides utilities to interact with the test database reset API,
 * allowing Playwright tests to reset the database state before each test run.
 */

import { TeamApi } from "../../src/app/lib/api/teamApi";
import { WorkerApi } from "../../src/app/lib/api/workerApi";
import { SpecialtyApi } from "../../src/app/lib/api/specialtyApi";
import { DimensionApi } from "../../src/app/lib/api/dimensionApi";
import { AttributeApi } from "../../src/app/lib/api/attributeApi";
import { ShiftApi } from "../../src/app/lib/api/shiftApi";
import { ShiftDemandApi } from "../../src/app/lib/api/shiftDemandApi";
import { ShiftDemandTemplateApi } from "../../src/app/lib/api/shiftDemandTemplateApi";
import { RequestApi } from "../../src/app/lib/api/requestApi";
import { ScheduleApi } from "../../src/app/lib/api/scheduleApi";
import { AssignmentApi } from "../../src/app/lib/api/assignmentApi";
import { AuthenticatedApiClient } from "../../src/app/lib/api/baseApi";
import { TeamWithMembership } from "../../src/types/team";
import { WorkerT, toWorkerT } from "../../src/types/worker";
import { SpecialtyT } from "../../src/types/specialty";
import {
  ShiftT,
  toShiftT,
  StaffingT,
  ShiftType,
  ShiftRestType,
  ShiftLeaveType,
  LinkShiftT,
} from "../../src/types/shift";
import {
  DimensionT,
  DimensionType,
  DimensionEntryType,
} from "../../src/types/dimension";
import { DimEntryT } from "../../src/types/dim-entry";
import { AttributeT, toAttributeT } from "../../src/types/attribute";
import {
  ShiftDemandTemplateDTO,
  ShiftDemandTemplateCreateDTO,
  ShiftDemandTemplateUpdateDTO,
} from "../../src/types/shift-demand-template";
import { ShiftDemandDTO } from "../../src/types/shiftDemand";
import {
  RequestT,
  RequestType,
  FulfillmentStatus,
  RequestStatus,
  fromRequestT,
} from "../../src/types/request";
import { ScheduleT, toScheduleT } from "../../src/types/schedule";
import { testConfig } from "./test-config";
import dayjs from "dayjs";
import { AssignmentT, AssignmentSource } from "@/types/assignment";
import { LinkShiftApi } from "@/app/lib/api/linkShiftApi";
import { SwapRequestT } from "@/types/swap";

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

export interface TestUser {
  user_id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
}

export interface UserCreationResult {
  status: string;
  message: string;
}

export interface AddTeamMemberResult {
  success: boolean;
  message: string;
  membership_id: string;
  user_id: string;
  team_id: string;
  role: string;
}

export interface TestUserWithRole {
  userId: string;
  email: string;
  teamId: string;
  role: "owner" | "member";
  membershipId: string;
}

export interface SolverScenarioResult {
  scenario_name: string;
  specialties: SpecialtyT[];
  workers: WorkerT[];
  shifts: ShiftT[];
  link_shifts: LinkShiftT[];
  dimensions: DimensionT[];
  dim_entries: DimEntryT[];
  attributes: AttributeT[];
  shift_demands: ShiftDemandDTO[];
  schedules: ScheduleT[];
}

export class DatabaseTestUtils {
  private testApiClient: AuthenticatedApiClient;

  constructor() {
    // Use centralized test configuration
    this.testApiClient = this.createTestApiClient();
  }

  /**
   * Make an authenticated request to the API
   * This is a convenience method for test scenarios where direct API calls are needed
   * and there's no existing API wrapper method
   */
  async makeAuthenticatedRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    data?: any,
  ): Promise<T> {
    const authHeaders = this.getAuthHeaders();

    const response = await fetch(`${testConfig.apiUrl}${endpoint}`, {
      method,
      headers: authHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(
        `API ${method} ${endpoint} failed: ${response.status} ${
          errorData.detail || JSON.stringify(errorData)
        }`,
      );
    }

    return response.json();
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
          "Development environment requires TEST_USER_ID and TEST_API_KEY to be set",
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
          `${testConfig.environment} environment requires TEST_AUTH_TOKEN to be set`,
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
      options: RequestInit = {},
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
          }`,
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
    options: DatabaseResetOptions = {},
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
      },
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(
        `Database reset failed (${response.status}): ${
          errorData.detail || response.statusText
        }`,
      );
    }

    return response.json();
  }

  /**
   * Preview what collections would be reset without actually resetting them
   */
  async dryRunReset(collections?: string[]): Promise<DryRunResponse> {
    const url = new URL(
      `${testConfig.apiUrl}/test-utils/reset-database/dry-run`,
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
        }`,
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
        console.log("✅ API is ready");
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
   * Creates a test user via the onboard endpoint
   * This mimics the functionality of init-dev-user.sh script
   */
  async createTestUser(user?: Partial<TestUser>): Promise<UserCreationResult> {
    const defaultUser: TestUser = {
      user_id: testConfig.devUserId,
      email: "testuser@example.com",
      username: "testuser",
      first_name: "Test",
      last_name: "User",
    };

    const testUser = { ...defaultUser, ...user };

    try {
      const response = await fetch(`${testConfig.apiUrl}/users/onboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": testConfig.devApiKey,
        },
        body: JSON.stringify(testUser),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create test user (HTTP ${response.status}): ${errorText}`,
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Test user creation failed: ${error.message}`);
      }
      throw new Error("Test user creation failed with unknown error");
    }
  }

  /**
   * Add a user to a team with a specific role (owner or member)
   * Uses the test utilities endpoint to directly create team memberships
   */
  async addTeamMember(
    userId: string,
    teamId: string,
    role: "owner" | "member",
  ): Promise<AddTeamMemberResult> {
    try {
      const response = await fetch(
        `${testConfig.apiUrl}/test-utils/add-team-member`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": testConfig.devApiKey,
          },
          body: JSON.stringify({
            user_id: userId,
            team_id: teamId,
            role: role,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to add team member (HTTP ${response.status}): ${errorText}`,
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Adding team member failed: ${error.message}`);
      }
      throw new Error("Adding team member failed with unknown error");
    }
  }

  /**
   * Create an authenticated API client for a specific user
   * This allows tests to make requests as different users by switching the X-Dev-User-ID header
   */
  createAuthenticatedClientForUser(userId: string): AuthenticatedApiClient {
    const makeAuthenticatedRequest = async <T>(
      method: string,
      endpoint: string,
      data?: any,
      options: RequestInit = {},
    ): Promise<T> => {
      const authHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (testConfig.environment === "development") {
        authHeaders["X-Dev-User-ID"] = userId; // Use the specific user ID
        authHeaders["X-API-Key"] = testConfig.devApiKey;
      } else {
        // For non-dev environments, would need proper auth token per user
        authHeaders["Authorization"] = `Bearer ${testConfig.authToken}`;
      }

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

        console.error(
          `❌ API ${method} ${endpoint} failed for user ${userId}:`,
          {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
          },
        );

        throw new Error(
          `${method} ${endpoint} failed: ${response.status} ${
            errorData.detail || JSON.stringify(errorData)
          }`,
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
   * Set authentication headers for a Playwright page for a specific user
   * This allows tests to make requests as different users
   *
   * @param page - Playwright page object
   * @param userId - User ID to authenticate as
   */
  async authenticatePageAsUser(page: any, userId: string): Promise<void> {
    if (testConfig.environment === "development") {
      await page.setExtraHTTPHeaders({
        "X-Dev-User-ID": userId,
        "X-API-Key": testConfig.devApiKey,
      });
    } else {
      // For staging/production, use Bearer token
      await page.setExtraHTTPHeaders({
        Authorization: `Bearer ${testConfig.authToken}`,
      });
    }
  }

  /**
   * Set authentication headers for a Playwright page as TEST_USER
   * Convenience method for the most common authentication scenario
   *
   * @param page - Playwright page object
   */
  async authenticatePageAsTestUser(page: any): Promise<void> {
    await this.authenticatePageAsUser(page, testConfig.devUserId);
  }

  /**
   * Set authentication headers for a Playwright page as TEST_USER_2
   * Convenience method for secondary user authentication
   *
   * @param page - Playwright page object
   */
  async authenticatePageAsTestUser2(page: any): Promise<void> {
    if (!testConfig.devUserId2) {
      throw new Error("TEST_USER_ID_2 is not configured in test environment");
    }
    await this.authenticatePageAsUser(page, testConfig.devUserId2);
  }

  /**
   * Waits for required services (API and Permit.io) to be ready
   * This ensures dependencies are available before user creation
   */
  async waitForServicesReady(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();

    // Wait for API Gateway
    await this.waitForApiReady(timeout);

    // Wait for Permit.io PDP (if available)
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`${testConfig.permitUrl}/healthy`, {
          method: "GET",
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok) {
          console.log("✅ Permit.io PDP is ready");
          return; // Both services are ready
        }
      } catch (error) {
        // Permit.io might not be required in test environment
        console.warn("⚠️ Permit.io PDP not available, continuing without it");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error("Services did not become ready within timeout period");
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
        teamData.name,
      );

      return {
        teamId: result.team.id,
        name: result.team.name,
      };
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to create team '${teamData.name}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to create team '${teamData.name}': Unknown error`,
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
        worker,
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
          `Failed to create worker '${workerData.name}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to create worker '${workerData.name}': Unknown error`,
      );
    }
  }

  /**
   * Update a worker using the existing WorkerApi for consistent behavior
   */
  async updateWorker(
    workerId: string,
    teamId: string,
    updates: {
      name?: string;
      acronym?: string;
      employmentStartDate?: Date;
      employmentEndDate?: Date | null;
      weeklyHours?: number;
      weeklyHoursDesired?: number;
      dutiesPerMonth?: number;
      annualLeave?: number;
      specialtyIds?: string[];
    },
  ): Promise<{ workerId: string; name: string; teamId: string }> {
    try {
      // First, get the current worker data
      const workers = await WorkerApi.getWorkers(this.testApiClient, teamId);
      const currentWorker = workers.find((w) => w.id === workerId);

      if (!currentWorker) {
        throw new Error(
          `Worker with ID '${workerId}' not found in team '${teamId}'`,
        );
      }

      // Create updated worker object
      const updatedWorker: WorkerT = {
        ...currentWorker,
        name: updates.name ?? currentWorker.name,
        acronym: updates.acronym ?? currentWorker.acronym,
        employmentStartDate: updates.employmentStartDate
          ? dayjs(updates.employmentStartDate).utc()
          : currentWorker.employmentStartDate,
        employmentEndDate:
          updates.employmentEndDate !== undefined
            ? updates.employmentEndDate
              ? dayjs(updates.employmentEndDate).utc()
              : null
            : currentWorker.employmentEndDate,
        weeklyHours: updates.weeklyHours ?? currentWorker.weeklyHours,
        weeklyHoursDesired:
          updates.weeklyHoursDesired ?? currentWorker.weeklyHoursDesired,
        dutiesPerMonth: updates.dutiesPerMonth ?? currentWorker.dutiesPerMonth,
        annualLeave: updates.annualLeave ?? currentWorker.annualLeave,
        specialtyIds: updates.specialtyIds ?? currentWorker.specialtyIds,
      };

      // Use the existing WorkerApi with our test client
      const result: WorkerT = await WorkerApi.updateWorker(
        this.testApiClient,
        updatedWorker,
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
          `Failed to update worker '${workerId}': ${error.message}`,
        );
      }
      throw new Error(`Failed to update worker '${workerId}': Unknown error`);
    }
  }

  /**
   * Update worker name specifically (convenience method for tests)
   */
  async updateWorkerName(
    workerId: string,
    teamId: string,
    newName: string,
  ): Promise<{ workerId: string; name: string; teamId: string }> {
    return this.updateWorker(workerId, teamId, { name: newName });
  }

  /**
   * Delete a worker using the existing WorkerApi for consistent behavior
   */
  async deleteWorker(workerId: string, teamId: string): Promise<void> {
    try {
      // Use the existing WorkerApi with our test client
      await WorkerApi.deleteWorker(this.testApiClient, workerId, teamId);
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to delete worker '${workerId}': ${error.message}`,
        );
      }
      throw new Error(`Failed to delete worker '${workerId}': Unknown error`);
    }
  }

  /**
   * Get all workers for a team using the existing WorkerApi for consistent behavior
   */
  async getWorkers(teamId: string): Promise<WorkerT[]> {
    try {
      const workers = await WorkerApi.getWorkers(this.testApiClient, teamId);
      return workers;
    } catch (error) {
      console.error("Failed to get workers:", error);
      throw new Error(
        `Failed to get workers for team '${teamId}': ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Attach a user to a worker using the existing WorkerApi for consistent behavior
   * This links a worker to a specific user, allowing member users to manage that worker
   */
  async attachWorkerToUser(
    workerId: string,
    userId: string,
    teamId: string,
  ): Promise<WorkerT> {
    try {
      const result: WorkerT = await WorkerApi.attachUserToWorker(
        this.testApiClient,
        workerId,
        userId,
        teamId,
      );

      return result;
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to attach user ${userId} to worker ${workerId}: ${error.message}`,
        );
      }
      throw new Error(
        `Failed to attach user ${userId} to worker ${workerId}: Unknown error`,
      );
    }
  }

  /**
   * Create a shift using the existing ShiftApi for consistent behavior
   */
  async createShift(shiftData: {
    teamId: string;
    name: string;
    startTime: dayjs.Dayjs;
    endTime: dayjs.Dayjs;
    shiftType: ShiftType;
    staffing?: StaffingT[];
    restType?: ShiftRestType;
    leaveType?: ShiftLeaveType;
    color?: string;
    acronym?: string;
    recuperationTime?: number;
    recuperationDutyId?: string | null;
  }): Promise<ShiftT> {
    try {
      const shift: ShiftT = {
        id: "", // Will be set by the API
        teamId: shiftData.teamId,
        name: shiftData.name,
        acronym:
          shiftData.acronym || shiftData.name.substring(0, 3).toUpperCase(),
        acronymCustom: !!shiftData.acronym,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime,
        shiftType: shiftData.shiftType,
        staffing: shiftData.staffing ?? [],
        restType: shiftData.restType ?? ShiftRestType.NONE,
        leaveType: shiftData.leaveType ?? ShiftLeaveType.NONE,
        color: shiftData.color ?? "#FFFFFF",
        recuperationTime: shiftData.recuperationTime ?? 0,
        recuperationDutyId: shiftData.recuperationDutyId ?? null,
        deleted: false,
        attributes: [],
      };

      // Use the existing ShiftApi with our test client
      const result: ShiftT = await ShiftApi.addShift(this.testApiClient, shift);

      return result;
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to create shift '${shiftData.name}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to create shift '${shiftData.name}': Unknown error`,
      );
    }
  }

  /**
   * Get all shifts for a team using the existing ShiftApi for consistent behavior
   */
  async getAllShifts(teamId: string): Promise<ShiftT[]> {
    try {
      // Use the existing ShiftApi with our test client
      const result: ShiftT[] = await ShiftApi.getAllShifts(
        this.testApiClient,
        teamId,
      );

      return result;
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to get all shifts for team '${teamId}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to get all shifts for team '${teamId}': Unknown error`,
      );
    }
  }

  /**
   * Create a link shift using the existing LinkShiftApi for consistent behavior
   */
  async createLinkShift(linkShiftData: {
    teamId: string;
    shiftIds: string[];
  }): Promise<LinkShiftT> {
    try {
      const apiClient = this.createAuthenticatedClientForUser(
        TEST_USER.user_id,
      );

      const linkShift: LinkShiftT = {
        id: "", // Will be assigned by backend
        teamId: linkShiftData.teamId,
        shiftIds: linkShiftData.shiftIds,
      };

      const createdLinkShift = await LinkShiftApi.createLinkShift(
        apiClient,
        linkShift,
      );
      return createdLinkShift;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create link shift: ${error.message}`);
      }
      throw new Error(`Failed to create link shift: ${String(error)}`);
    }
  }

  //////////////////////////
  // Specialty Methods
  //////////////////////////

  /**
   * Create a specialty using the existing SpecialtyApi for consistent behavior
   */
  async createSpecialty(specialtyData: {
    teamId: string;
    name: string;
  }): Promise<{ specialtyId: string; name: string; teamId: string }> {
    try {
      // Create the specialty object
      const newSpecialty: SpecialtyT = {
        id: "",
        teamId: specialtyData.teamId,
        name: specialtyData.name,
        deleted: false,
      };

      // Use the existing SpecialtyApi with our test client
      const result: SpecialtyT = await SpecialtyApi.addSpecialty(
        this.testApiClient,
        newSpecialty,
        specialtyData.teamId,
      );

      return {
        specialtyId: result.id,
        name: result.name,
        teamId: result.teamId,
      };
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to create specialty '${specialtyData.name}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to create specialty '${specialtyData.name}': Unknown error`,
      );
    }
  }

  /**
   * Update a specialty using the existing SpecialtyApi for consistent behavior
   */
  async updateSpecialty(
    specialtyId: string,
    teamId: string,
    updates: {
      name?: string;
    },
  ): Promise<{ specialtyId: string; name: string; teamId: string }> {
    try {
      // First get the current specialty to merge with updates
      const specialties = await SpecialtyApi.getSpecialties(
        this.testApiClient,
        teamId,
      );
      const currentSpecialty = specialties.find((s) => s.id === specialtyId);

      if (!currentSpecialty) {
        throw new Error(
          `Specialty with ID '${specialtyId}' not found in team '${teamId}'`,
        );
      }

      // Create updated specialty object
      const updatedSpecialty: SpecialtyT = {
        ...currentSpecialty,
        name: updates.name ?? currentSpecialty.name,
      };

      // Use the existing SpecialtyApi with our test client
      const result: SpecialtyT = await SpecialtyApi.updateSpecialty(
        this.testApiClient,
        updatedSpecialty,
        teamId,
      );

      return {
        specialtyId: result.id,
        name: result.name,
        teamId: result.teamId,
      };
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to update specialty '${specialtyId}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to update specialty '${specialtyId}': Unknown error`,
      );
    }
  }

  /**
   * Delete a specialty using the existing SpecialtyApi for consistent behavior
   */
  async deleteSpecialty(specialtyId: string, teamId: string): Promise<void> {
    try {
      // Use the existing SpecialtyApi with our test client
      await SpecialtyApi.deleteSpecialty(
        this.testApiClient,
        specialtyId,
        teamId,
      );
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to delete specialty '${specialtyId}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to delete specialty '${specialtyId}': Unknown error`,
      );
    }
  }

  /**
   * Get all specialties for a team using the existing SpecialtyApi
   */
  async getSpecialties(teamId: string): Promise<SpecialtyT[]> {
    try {
      // Use the existing SpecialtyApi with our test client
      const result: SpecialtyT[] = await SpecialtyApi.getSpecialties(
        this.testApiClient,
        teamId,
      );

      return result;
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to get specialties for team '${teamId}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to get specialties for team '${teamId}': Unknown error`,
      );
    }
  }

  /**
   * Reset a specific collection
   */
  async resetCollection(collection: string): Promise<DatabaseResetResponse> {
    return this.resetDatabase({
      collections: [collection],
      preserveSystemData: true,
    });
  }

  /**
   * Create a dimension using the existing DimensionApi for consistent behavior
   */
  async createDimension(dimensionData: {
    teamId: string;
    name: string;
    entryType: DimensionEntryType;
    dimensionType: DimensionType;
    dimEntries?: DimEntryT[];
  }): Promise<{ dimensionId: string; name: string; teamId: string }> {
    try {
      // Create the dimension object
      const newDimension: DimensionT = {
        id: "",
        teamId: dimensionData.teamId,
        dimTypes: [dimensionData.dimensionType],
        name: dimensionData.name,
        entryType: dimensionData.entryType,
        deleted: false,
      };

      // Use the existing DimensionApi with our test client
      const result = await DimensionApi.addDimension(
        this.testApiClient,
        newDimension,
        dimensionData.dimEntries || [],
      );

      return {
        dimensionId: result.newDimension.id,
        name: result.newDimension.name,
        teamId: result.newDimension.teamId,
      };
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to create dimension '${dimensionData.name}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to create dimension '${dimensionData.name}': Unknown error`,
      );
    }
  }

  /**
   * Update a dimension using the existing DimensionApi
   */
  async updateDimension(
    dimensionId: string,
    updates: {
      teamId: string;
      name?: string;
      entryType?: DimensionEntryType;
    },
  ): Promise<{ dimensionId: string; name: string; teamId: string }> {
    try {
      // First get the current dimension to merge updates
      const dimensions = await this.getDimensions(updates.teamId);
      const currentDimension = dimensions.find((d) => d.id === dimensionId);

      if (!currentDimension) {
        throw new Error(`Dimension with ID '${dimensionId}' not found`);
      }

      const updatedDimension: DimensionT = {
        ...currentDimension,
        name: updates.name ?? currentDimension.name,
        entryType: updates.entryType ?? currentDimension.entryType,
      };

      // Use the existing DimensionApi with our test client
      const result = await DimensionApi.updateDimension(
        this.testApiClient,
        updatedDimension,
      );

      return {
        dimensionId: result.id,
        name: result.name,
        teamId: result.teamId,
      };
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to update dimension '${dimensionId}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to update dimension '${dimensionId}': Unknown error`,
      );
    }
  }

  /**
   * Delete a dimension using the existing DimensionApi
   */
  async deleteDimension(dimensionId: string, teamId: string): Promise<void> {
    try {
      // Use the existing DimensionApi with our test client
      await DimensionApi.deleteDimension(
        this.testApiClient,
        dimensionId,
        teamId,
      );
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to delete dimension '${dimensionId}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to delete dimension '${dimensionId}': Unknown error`,
      );
    }
  }

  /**
   * Get all dimensions for a team using the existing DimensionApi
   */
  async getDimensions(
    teamId: string,
    dimensionType?: DimensionType,
  ): Promise<DimensionT[]> {
    try {
      // Use the existing DimensionApi with our test client
      const result = await DimensionApi.getDimensions(
        this.testApiClient,
        teamId,
        dimensionType ? [dimensionType] : undefined,
      );

      return result.dimensions;
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to get dimensions for team '${teamId}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to get dimensions for team '${teamId}': Unknown error`,
      );
    }
  }

  //////////////////////////
  // Attribute Methods
  //////////////////////////

  /**
   * Create an attribute using the existing AttributeApi for consistent behavior
   */
  async createAttribute(attributeData: {
    teamId: string;
    value: string | number | boolean;
    ownerType: number; // AttributeOwnerType
    ownerId: string;
    dimensionId: string;
    dimEntryIds?: string[];
  }): Promise<{
    attributeId: string;
    value: string | number | boolean;
    teamId: string;
  }> {
    try {
      // Create the attribute object
      const newAttribute = {
        id: "", // Will be set by the API
        value: attributeData.value,
        ownerType: attributeData.ownerType,
        ownerId: attributeData.ownerId,
        dimensionId: attributeData.dimensionId,
        dimEntryIds: attributeData.dimEntryIds ?? [],
      };

      // Use the existing AttributeApi with our test client
      const result = await AttributeApi.createAttribute(
        this.testApiClient,
        newAttribute,
        attributeData.teamId,
      );

      return {
        attributeId: result.id,
        value: result.value,
        teamId: attributeData.teamId,
      };
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(`Failed to create attribute: ${error.message}`);
      }
      throw new Error(`Failed to create attribute: Unknown error`);
    }
  }

  /**
   * Update an attribute using the existing AttributeApi for consistent behavior
   */
  async updateAttribute(
    attributeId: string,
    teamId: string,
    updates: {
      value?: string | number | boolean;
      dimEntryIds?: string[];
    },
  ): Promise<{
    attributeId: string;
    value: string | number | boolean;
    teamId: string;
  }> {
    try {
      // First get the current attribute data by getting all attributes for the owner
      // Since we don't have a direct "get attribute by id" method, we'll need to get by owner
      // This is a limitation we'll work around for now

      // For test purposes, we'll assume we have the current attribute data
      // In a real implementation, you might need to get the attribute first
      const updatedAttribute = {
        id: attributeId,
        value: updates.value ?? "", // Will be updated by the API call
        ownerType: 1, // Default to WORKER for tests
        ownerId: "", // Will be filled by the actual attribute data
        dimensionId: "", // Will be filled by the actual attribute data
        dimEntryIds: updates.dimEntryIds ?? [],
      };

      // Use the existing AttributeApi with our test client
      const result = await AttributeApi.updateAttribute(
        this.testApiClient,
        updatedAttribute,
        teamId,
      );

      return {
        attributeId: result.id,
        value: result.value,
        teamId: teamId,
      };
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to update attribute '${attributeId}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to update attribute '${attributeId}': Unknown error`,
      );
    }
  }

  /**
   * Delete an attribute using the existing AttributeApi for consistent behavior
   */
  async deleteAttribute(attributeId: string, teamId: string): Promise<void> {
    try {
      // Use the existing AttributeApi with our test client
      await AttributeApi.deleteAttribute(
        this.testApiClient,
        attributeId,
        teamId,
      );
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to delete attribute '${attributeId}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to delete attribute '${attributeId}': Unknown error`,
      );
    }
  }

  /**
   * Get attributes by owner using the existing AttributeApi for consistent behavior
   */
  async getAttributesByOwner(ownerId: string, teamId: string): Promise<any[]> {
    try {
      // Use the existing AttributeApi with our test client
      const result = await AttributeApi.getAttributesByOwner(
        this.testApiClient,
        ownerId,
        teamId,
      );

      return result;
    } catch (error) {
      // Enhanced error handling for test debugging
      if (error instanceof Error) {
        throw new Error(
          `Failed to get attributes for owner '${ownerId}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to get attributes for owner '${ownerId}': Unknown error`,
      );
    }
  }

  /**
   * Create a shift demand for testing
   */
  async createShiftDemand(options: {
    teamId: string;
    shiftId: string;
    date: Date;
    count: number;
    notes?: string;
    source?: "manual" | "template" | "solver" | "import";
  }): Promise<any> {
    try {
      const shiftDemandData = {
        shiftId: options.shiftId,
        date: Math.floor(options.date.getTime() / 1000), // Convert to Unix timestamp
        count: options.count,
        notes: options.notes || null,
        source: options.source || "manual",
        sourceId: null,
      };

      const result = await ShiftDemandApi.createShiftDemand(
        this.testApiClient,
        options.teamId,
        shiftDemandData,
      );

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create shift demand: ${error.message}`);
      }
      throw new Error(`Failed to create shift demand: Unknown error`);
    }
  }

  /**
   * Get shift demands by period for testing
   */
  async getShiftDemandsByPeriod(
    teamId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    try {
      const result = await ShiftDemandApi.getShiftDemandsByPeriod(
        this.testApiClient,
        teamId,
        startDate,
        endDate,
      );

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get shift demands: ${error.message}`);
      }
      throw new Error(`Failed to get shift demands: Unknown error`);
    }
  }

  /**
   * Create a shift demand template using ShiftDemandTemplateApi for consistency
   */
  async createShiftDemandTemplate(templateData: {
    teamId: string;
    name: string;
    description?: string;
  }): Promise<{ templateId: string; name: string; teamId: string }> {
    try {
      console.log(
        `📝 Creating shift demand template "${templateData.name}" for team ${templateData.teamId}...`,
      );

      // Create template data in the format expected by the API
      const createData: ShiftDemandTemplateCreateDTO = {
        name: templateData.name,
        description: templateData.description || "",
      };

      // Use the existing ShiftDemandTemplateApi with our test client
      const result: ShiftDemandTemplateDTO =
        await ShiftDemandTemplateApi.createTemplate(
          this.testApiClient,
          templateData.teamId,
          createData,
        );

      console.log(`✅ Template created with ID: ${result.id}`);

      return {
        templateId: result.id,
        name: result.name,
        teamId: result.teamId,
      };
    } catch (error) {
      console.error("Failed to create shift demand template:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to create template: ${error.message}`);
      }
      throw new Error(`Failed to create template: Unknown error`);
    }
  }

  /**
   * Update a shift demand template using the ShiftDemandTemplateApi via the test client
   */
  async updateShiftDemandTemplate(
    templateId: string,
    teamId: string,
    updates: Partial<ShiftDemandTemplateUpdateDTO>,
  ): Promise<ShiftDemandTemplateDTO> {
    try {
      // Use the wrapped API client to call the template update endpoint
      const result = await ShiftDemandTemplateApi.updateTemplate(
        this.testApiClient,
        templateId,
        teamId,
        updates as any,
      );
      return result;
    } catch (error) {
      console.error("Failed to update shift demand template:", error);
      throw error;
    }
  }

  /**
   * Delete a shift demand template using ShiftDemandTemplateApi for consistency
   */
  async deleteShiftDemandTemplate(
    templateId: string,
    teamId: string,
  ): Promise<void> {
    try {
      console.log(`🗑️ Deleting shift demand template ${templateId}...`);

      // Use the existing ShiftDemandTemplateApi with our test client
      await ShiftDemandTemplateApi.deleteTemplate(
        this.testApiClient,
        templateId,
        teamId,
      );

      console.log(`✅ Template deleted successfully`);
    } catch (error) {
      console.error("Failed to delete shift demand template:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to delete template: ${error.message}`);
      }
      throw new Error(`Failed to delete template: Unknown error`);
    }
  }

  //////////////////////////
  // Constraint Methods
  //////////////////////////

  /**
   * Create a constraint using direct API call
   */
  async createConstraint(constraintData: {
    teamId: string;
    constraintType: number;
    templateId: string;
    language: string;
    blocks: any[];
    text: string;
    hard: boolean;
    priority: string;
    active: boolean;
  }): Promise<{ constraintId: string; teamId: string }> {
    try {
      // Make direct API call instead of using dynamic import
      const constraintToCreate = {
        id: "", // Will be set by the API
        teamId: constraintData.teamId,
        constraintType: constraintData.constraintType,
        templateId: constraintData.templateId,
        language: constraintData.language,
        blocks: constraintData.blocks,
        text: constraintData.text,
        hard: constraintData.hard,
        priority: constraintData.priority,
        active: constraintData.active,
        missingAttributes: [],
      };

      const createdConstraint = await this.testApiClient.post<any>(
        `/constraints/teams/${constraintData.teamId}`,
        constraintToCreate,
      );

      console.log(
        `Created constraint: ${createdConstraint.text} (${createdConstraint.id})`,
      );
      return {
        constraintId: createdConstraint.id,
        teamId: createdConstraint.teamId,
      };
    } catch (error) {
      console.error("Failed to create constraint:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to create constraint: ${error.message}`);
      }
      throw new Error(`Failed to create constraint: Unknown error`);
    }
  }

  /**
   * Update a constraint using the existing ConstraintApi for consistent behavior
   */
  async updateConstraint(
    constraintId: string,
    teamId: string,
    updates: {
      constraintType?: number;
      templateId?: string;
      language?: string;
      blocks?: any[];
      text?: string;
      hard?: boolean;
      priority?: string;
      active?: boolean;
    },
  ): Promise<{ constraintId: string; teamId: string }> {
    try {
      // Make direct API calls instead of using dynamic import

      // First get the current constraint
      const constraints = await this.testApiClient.get<any[]>(
        `/constraints/teams/${teamId}`,
      );
      const currentConstraint = constraints.find((c) => c.id === constraintId);

      if (!currentConstraint) {
        throw new Error(`Constraint with ID ${constraintId} not found`);
      }

      const updatedConstraint = {
        ...currentConstraint,
        ...updates,
      };

      const result = await this.testApiClient.put<any>(
        `/constraints/${constraintId}/teams/${teamId}`,
        updatedConstraint,
      );

      console.log(`Updated constraint: ${result.text} (${result.id})`);
      return {
        constraintId: result.id,
        teamId: result.teamId,
      };
    } catch (error) {
      console.error("Failed to update constraint:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to update constraint: ${error.message}`);
      }
      throw new Error(`Failed to update constraint: Unknown error`);
    }
  }

  /**
   * Delete a constraint using direct API call
   */
  async deleteConstraint(constraintId: string, teamId: string): Promise<void> {
    try {
      await this.testApiClient.delete<void>(
        `/constraints/${constraintId}/teams/${teamId}`,
      );
      console.log(`Deleted constraint: ${constraintId}`);
    } catch (error) {
      console.error("Failed to delete constraint:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to delete constraint: ${error.message}`);
      }
      throw new Error(`Failed to delete constraint: Unknown error`);
    }
  }

  /**
   * Get all constraints for a team using direct API call
   */
  async getConstraints(teamId: string): Promise<any[]> {
    try {
      const constraints = await this.testApiClient.get<any[]>(
        `/constraints/teams/${teamId}`,
      );
      console.log(
        `Retrieved ${constraints.length} constraints for team ${teamId}`,
      );
      return constraints;
    } catch (error) {
      console.error("Failed to get constraints:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to get constraints: ${error.message}`);
      }
      throw new Error(`Failed to get constraints: Unknown error`);
    }
  }

  /**
   * Get constraint templates for a team using direct API call
   */
  async getConstraintTemplates(teamId: string): Promise<any[]> {
    try {
      // Make direct API call instead of using dynamic import
      const templates = await this.testApiClient.get<any[]>(
        `/constraint-templates/teams/${teamId}`,
      );
      console.log(
        `Retrieved ${templates.length} constraint templates for team ${teamId}`,
      );
      return templates;
    } catch (error) {
      console.error("Failed to get constraint templates:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to get constraint templates: ${error.message}`);
      }
      throw new Error(`Failed to get constraint templates: Unknown error`);
    }
  }

  /**
   * Reset constraint-related collections
   */
  async resetConstraintData(): Promise<DatabaseResetResponse> {
    return this.resetDatabase({
      collections: ["constraints", "constraint_templates"],
    });
  }

  //////////////////////////
  // Request Methods
  //////////////////////////

  /**
   * Create a request using RequestApi for consistent behavior
   */
  async createRequest(requestData: {
    teamId: string;
    workerId: string;
    requestType: "work_demand" | "leave";
    startDate: dayjs.Dayjs;
    endDate: dayjs.Dayjs;
    status?: "pending" | "approved" | "denied" | "deferred";
    negative?: boolean;
    comment?: string;
    shiftId?: string | null;
    shiftOptions?: any[];
  }): Promise<any> {
    try {
      if (
        !Object.values(RequestType).includes(
          requestData.requestType as RequestType,
        )
      ) {
        throw new Error(`Invalid RequestType: ${requestData.requestType}`);
      }

      if (
        requestData.status &&
        !Object.values(RequestStatus).includes(
          requestData.status as RequestStatus,
        )
      ) {
        throw new Error(`Invalid RequestStatus: ${requestData.status}`);
      }

      // RequestDTO expects camelCase fields
      const requestPayload: RequestT = {
        id: "",
        teamId: requestData.teamId,
        requestType: requestData.requestType as RequestType,
        workerId: requestData.workerId,
        startDate: requestData.startDate,
        endDate: requestData.endDate,
        shiftId: requestData.shiftId || null,
        shiftOptions: requestData.shiftOptions || [],
        negative: requestData.negative || false,
        hard: true,
        status: (requestData.status as RequestStatus) || RequestStatus.PENDING,
        fulfillment: FulfillmentStatus.NOT_PROCESSED,
        comment: requestData.comment || "",
        createdAt: dayjs(),
        active: true,
        shiftTargetIds: [],
        missingAttributes: [],
      };

      // Use RequestApi for consistent behavior
      const response = await RequestApi.addRequest(
        this.testApiClient,
        requestPayload,
        requestData.teamId,
      );

      console.log(
        `Created request for worker ${requestData.workerId} in team ${requestData.teamId}`,
      );

      return response;
    } catch (error) {
      console.error("Failed to create request:", error);
      throw new Error(
        `Failed to create request: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Delete a request using the test API
   */
  async deleteRequest(requestId: string, teamId: string): Promise<void> {
    try {
      await this.testApiClient.delete(
        `/requests/${requestId}?teamId=${teamId}`,
      );
      console.log(`Deleted request ${requestId} from team ${teamId}`);
    } catch (error) {
      console.error(`Failed to delete request ${requestId}:`, error);
      throw new Error(
        `Failed to delete request: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Get all requests for a team
   */
  async getRequests(teamId: string): Promise<any[]> {
    try {
      const response = await this.testApiClient.get<any[]>(
        `/requests?teamId=${teamId}`,
      );
      return response;
    } catch (error) {
      console.error("Failed to get requests:", error);
      throw new Error(
        `Failed to get requests: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Approve a request using the RequestApi for consistent behavior
   * @param requestId - The ID of the request to approve
   * @param teamId - The team ID
   * @returns The updated request with APPROVED status
   */
  async approveRequest(
    requestId: string,
    teamId: string,
  ): Promise<{ request: RequestT; assignments: AssignmentT[] }> {
    try {
      const { request, assignments } = await RequestApi.acceptRequest(
        this.testApiClient,
        requestId,
        teamId,
      );
      return { request, assignments };
    } catch (error) {
      console.error("Failed to approve request:", error);
      throw new Error(
        `Failed to approve request '${requestId}': ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Deny a request using the RequestApi for consistent behavior
   * @param requestId - The ID of the request to deny
   * @param teamId - The team ID
   * @returns The updated request with DENIED status
   */
  async denyRequest(requestId: string, teamId: string): Promise<RequestT> {
    try {
      const deniedRequest = await RequestApi.denyRequest(
        this.testApiClient,
        requestId,
        teamId,
      );
      return deniedRequest;
    } catch (error) {
      console.error("Failed to deny request:", error);
      throw new Error(
        `Failed to deny request '${requestId}': ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Reset request-related collections
   */
  async resetRequestData(): Promise<DatabaseResetResponse> {
    return this.resetDatabase({
      collections: ["requests"],
      preserveSystemData: true,
    });
  }

  //////////////////////////
  // Schedule Methods
  //////////////////////////

  /**
   * Create a schedule using ScheduleApi for consistent behavior
   */
  async createSchedule(teamId: string): Promise<ScheduleT> {
    try {
      return await ScheduleApi.createSchedule(this.testApiClient, teamId);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to create schedule for team '${teamId}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to create schedule for team '${teamId}': Unknown error`,
      );
    }
  }

  /**
   * Get schedules for a team using ScheduleApi for consistent behavior
   */
  async getSchedules(teamId: string): Promise<ScheduleT[]> {
    try {
      return await ScheduleApi.getSchedules(this.testApiClient, teamId);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to get schedules for team '${teamId}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to get schedules for team '${teamId}': Unknown error`,
      );
    }
  }

  /**
   * Update a schedule using ScheduleApi for consistent behavior
   */
  async updateSchedule(schedule: ScheduleT): Promise<ScheduleT> {
    try {
      return await ScheduleApi.updateSchedule(this.testApiClient, schedule);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to update schedule '${schedule.id}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to update schedule '${schedule.id}': Unknown error`,
      );
    }
  }

  /**
   * Validate a schedule using ScheduleApi for consistent behavior
   */
  async validateSchedule(
    scheduleId: string,
    teamId: string,
  ): Promise<ScheduleT> {
    if (!scheduleId) {
      throw new Error("Schedule ID is required");
    }
    if (!teamId) {
      throw new Error("Team ID is required");
    }

    try {
      const validatedSchedule = await ScheduleApi.validateSchedule(
        this.testApiClient,
        scheduleId,
        teamId,
      );
      console.log(`✅ Validated schedule: ${validatedSchedule.id}`);
      return validatedSchedule;
    } catch (error) {
      console.error("Failed to validate schedule:", error);
      throw new Error(
        `Failed to validate schedule: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  //////////////////////////
  // Assignment Methods
  //////////////////////////

  /**
   * Create an assignment using AssignmentApi for consistent behavior
   */
  async createAssignment(assignmentData: {
    teamId: string;
    workerId: string;
    shiftId: string;
    date: dayjs.Dayjs;
    fixed?: boolean;
    comment?: string;
    scheduleId?: string | null;
  }): Promise<AssignmentT> {
    try {
      // Construct AssignmentT object
      const assignment: AssignmentT = {
        id: "", // Will be generated by backend
        workerId: assignmentData.workerId,
        shiftId: assignmentData.shiftId,
        date: assignmentData.date,
        fixed: assignmentData.fixed ?? false,
        teamId: assignmentData.teamId,
        scheduleId: assignmentData.scheduleId ?? null,
        source: AssignmentSource.MANUAL,
        referenceAssignmentId: null,
        sourceId: null,
      };

      const result = await AssignmentApi.addAssignmentAndRecurrence(
        this.testApiClient,
        assignment,
        null, // No recurrence
      );

      // Return the first created assignment
      if (result.assignmentsCreated.length === 0) {
        throw new Error("No assignment was created");
      }
      return result.assignmentsCreated[0];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create assignment: ${error.message}`);
      }
      throw new Error("Failed to create assignment: Unknown error");
    }
  }

  /**
   * Delete an assignment using AssignmentApi for consistent behavior
   */
  async deleteAssignment(assignmentId: string, teamId: string): Promise<any> {
    try {
      return await AssignmentApi.deleteAssignment(
        this.testApiClient,
        assignmentId,
        teamId,
        null, // No recurrence
        null, // No recurrence update scope
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to delete assignment '${assignmentId}': ${error.message}`,
        );
      }
      throw new Error(
        `Failed to delete assignment '${assignmentId}': Unknown error`,
      );
    }
  }

  /**
   * Add the second test user (TEST_USER_2) to a team with a specific role
   * This is an opt-in helper for tests that need multi-user scenarios.
   *
   * By default, TEST_USER_2 is NOT added to teams. Call this method explicitly
   * in tests that require a second user.
   *
   * @param teamId - The team ID to add the user to
   * @param role - The role for the user (default: "member")
   * @returns The team membership details
   *
   * @example
   * // In a test that needs a second user:
   * await dbUtils.addSecondUserToTeam(teamId); // adds as member
   * await dbUtils.addSecondUserToTeam(teamId, "owner"); // adds as owner
   */
  async addSecondUserToTeam(
    teamId: string,
    role: "owner" | "member" = "member",
  ): Promise<AddTeamMemberResult> {
    return this.addTeamMember(TEST_USER_2.user_id, teamId, role);
  }

  //////////////////////////
  // Solver Test Scenario Methods
  //////////////////////////

  /**
   * Load a predefined solver test scenario from backend fixtures
   * This creates all workers, shifts, and shift demands in one API call
   */
  async loadSolverScenario(
    scenarioName: string,
    teamId: string,
  ): Promise<SolverScenarioResult> {
    try {
      // Backend returns an object with scenario_name, workers and shifts
      const result = await this.testApiClient.post<{
        scenario_name: string;
        specialties: any[];
        workers: any[];
        shifts: any[];
        link_shifts: any[];
        dimensions: any[];
        dim_entries: any[];
        attributes: any[];
        shift_demands: any[];
        schedules: any[];
      }>("/test-utils/scenarios/load", {
        scenario_name: scenarioName,
        team_id: teamId,
      });

      console.log(`✅ Loaded solver scenario: ${scenarioName}`);
      return {
        scenario_name: scenarioName,
        specialties: result.specialties,
        workers: result.workers.map(toWorkerT),
        shifts: result.shifts.map(toShiftT),
        link_shifts: result.link_shifts,
        dimensions: result.dimensions,
        dim_entries: result.dim_entries,
        attributes: result.attributes.map(toAttributeT),
        shift_demands: result.shift_demands,
        schedules: result.schedules.map(toScheduleT),
      };
    } catch (error) {
      console.error(`Failed to load scenario '${scenarioName}':`, error);
      throw new Error(
        `Failed to load scenario '${scenarioName}': ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * List all available solver test scenarios
   * Returns scenario names that can be loaded via loadSolverScenario
   */
  async listSolverScenarios(): Promise<string[]> {
    try {
      // The route returns a simple array of scenario names
      const result = await this.testApiClient.get<string[]>(
        "/test-utils/scenarios",
      );

      console.log(`✅ Found ${result.length} available scenarios`);
      return result;
    } catch (error) {
      console.error("Failed to list solver scenarios:", error);
      throw new Error(
        `Failed to list solver scenarios: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  //////////////////////////
  // Swap Methods
  //////////////////////////

  /**
   * Create a swap using the existing SwapApi for consistent behavior
   */
  async createSwap(swapData: {
    teamId: string;
    offeredAssignmentIds: string[];
    requestedAssignmentIds: string[];
    swapType: "direct" | "open";
    targetWorkerId: string | null;
    comment: string;
  }): Promise<SwapRequestT> {
    try {
      const response = await this.testApiClient.post<any>(
        `/swaps/teams/${swapData.teamId}`,
        {
          swapType: swapData.swapType,
          offeredAssignmentIds: swapData.offeredAssignmentIds,
          requestedAssignmentIds: swapData.requestedAssignmentIds,
          targetWorkerId: swapData.targetWorkerId,
          comment: swapData.comment,
        },
      );

      console.log(`✅ Created swap: ${response.id}`);

      // Convert response to SwapRequestT
      return {
        id: response.id,
        teamId: response.teamId,
        createdByUserId: response.createdByUserId,
        swapType: response.swapType,
        status: response.status,
        offeredAssignmentIds: response.offeredAssignmentIds,
        requestedAssignmentIds: response.requestedAssignmentIds,
        targetWorkerId: response.targetWorkerId,
        comment: response.comment,
        bids: (response.bids || []).map((bid: any) => ({
          id: bid.id,
          workerId: bid.workerId,
          offeredAssignmentIds: bid.offeredAssignmentIds,
          createdAt: dayjs.unix(bid.createdAt),
          accepted: bid.accepted,
        })),
        createdAt: dayjs.unix(response.createdAt),
        completedAt: response.completedAt
          ? dayjs.unix(response.completedAt)
          : null,
        completedByUserId: response.completedByUserId,
        revertedAt: response.revertedAt
          ? dayjs.unix(response.revertedAt)
          : null,
        revertedByUserId: response.revertedByUserId,
        auditData: response.auditData || [],
      };
    } catch (error) {
      console.error("Failed to create swap:", error);
      throw new Error(
        `Failed to create swap: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Add a bid to an open swap
   */
  async addBidToOpenSwap(
    swapId: string,
    bidderWorkerId: string,
    offeredAssignmentIds: string[],
  ): Promise<SwapRequestT> {
    try {
      const response = await this.testApiClient.post<any>(
        `/swaps/${swapId}/bids`,
        {
          bidderWorkerId,
          offeredAssignmentIds,
        },
      );

      console.log(`✅ Added bid to swap: ${swapId}`);

      return {
        id: response.id,
        teamId: response.teamId,
        createdByUserId: response.createdByUserId,
        swapType: response.swapType,
        status: response.status,
        offeredAssignmentIds: response.offeredAssignmentIds,
        requestedAssignmentIds: response.requestedAssignmentIds,
        targetWorkerId: response.targetWorkerId,
        comment: response.comment,
        bids: (response.bids || []).map((bid: any) => ({
          id: bid.id,
          workerId: bid.workerId,
          offeredAssignmentIds: bid.offeredAssignmentIds,
          createdAt: dayjs.unix(bid.createdAt),
          accepted: bid.accepted,
        })),
        createdAt: dayjs.unix(response.createdAt),
        completedAt: response.completedAt
          ? dayjs.unix(response.completedAt)
          : null,
        completedByUserId: response.completedByUserId,
        revertedAt: response.revertedAt
          ? dayjs.unix(response.revertedAt)
          : null,
        revertedByUserId: response.revertedByUserId,
        auditData: response.auditData || [],
      };
    } catch (error) {
      console.error("Failed to add bid to swap:", error);
      throw new Error(
        `Failed to add bid to swap: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Accept a bid on an open swap
   */
  async acceptBidOnOpenSwap(
    swapId: string,
    bidId: string,
  ): Promise<SwapRequestT> {
    try {
      const response = await this.testApiClient.post<any>(
        `/swaps/${swapId}/accept-bid/${bidId}`,
        {},
      );

      console.log(`✅ Accepted bid ${bidId} on swap: ${swapId}`);

      return {
        id: response.id,
        teamId: response.teamId,
        createdByUserId: response.createdByUserId,
        swapType: response.swapType,
        status: response.status,
        offeredAssignmentIds: response.offeredAssignmentIds,
        requestedAssignmentIds: response.requestedAssignmentIds,
        targetWorkerId: response.targetWorkerId,
        comment: response.comment,
        bids: (response.bids || []).map((bid: any) => ({
          id: bid.id,
          workerId: bid.workerId,
          offeredAssignmentIds: bid.offeredAssignmentIds,
          createdAt: dayjs.unix(bid.createdAt),
          accepted: bid.accepted,
        })),
        createdAt: dayjs.unix(response.createdAt),
        completedAt: response.completedAt
          ? dayjs.unix(response.completedAt)
          : null,
        completedByUserId: response.completedByUserId,
        revertedAt: response.revertedAt
          ? dayjs.unix(response.revertedAt)
          : null,
        revertedByUserId: response.revertedByUserId,
        auditData: response.auditData || [],
      };
    } catch (error) {
      console.error("Failed to accept bid on swap:", error);
      throw new Error(
        `Failed to accept bid on swap: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Get all swaps for a team
   */
  async getSwaps(
    teamId: string,
    status?: "active" | "pending_approval" | "completed" | "cancelled",
  ): Promise<SwapRequestT[]> {
    try {
      let endpoint = `/swaps/teams/${teamId}`;
      if (status) {
        endpoint += `?status=${status}`;
      }

      const response = await this.testApiClient.get<any[]>(endpoint);

      return response.map((swap) => ({
        id: swap.id,
        teamId: swap.teamId,
        createdByUserId: swap.createdByUserId,
        swapType: swap.swapType,
        status: swap.status,
        offeredAssignmentIds: swap.offeredAssignmentIds,
        requestedAssignmentIds: swap.requestedAssignmentIds,
        targetWorkerId: swap.targetWorkerId,
        comment: swap.comment,
        bids: (swap.bids || []).map((bid: any) => ({
          id: bid.id,
          workerId: bid.workerId,
          offeredAssignmentIds: bid.offeredAssignmentIds,
          createdAt: dayjs.unix(bid.createdAt),
          accepted: bid.accepted,
        })),
        createdAt: dayjs.unix(swap.createdAt),
        completedAt: swap.completedAt ? dayjs.unix(swap.completedAt) : null,
        completedByUserId: swap.completedByUserId,
        revertedAt: swap.revertedAt ? dayjs.unix(swap.revertedAt) : null,
        revertedByUserId: swap.revertedByUserId,
        auditData: swap.auditData || [],
      }));
    } catch (error) {
      console.error("Failed to get swaps:", error);
      throw new Error(
        `Failed to get swaps: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Get a specific swap by ID
   */
  async getSwapById(swapId: string): Promise<SwapRequestT> {
    try {
      const response = await this.testApiClient.get<any>(`/swaps/${swapId}`);

      return {
        id: response.id,
        teamId: response.teamId,
        createdByUserId: response.createdByUserId,
        swapType: response.swapType,
        status: response.status,
        offeredAssignmentIds: response.offeredAssignmentIds,
        requestedAssignmentIds: response.requestedAssignmentIds,
        targetWorkerId: response.targetWorkerId,
        comment: response.comment,
        bids: (response.bids || []).map((bid: any) => ({
          id: bid.id,
          workerId: bid.workerId,
          offeredAssignmentIds: bid.offeredAssignmentIds,
          createdAt: dayjs.unix(bid.createdAt),
          accepted: bid.accepted,
        })),
        createdAt: dayjs.unix(response.createdAt),
        completedAt: response.completedAt
          ? dayjs.unix(response.completedAt)
          : null,
        completedByUserId: response.completedByUserId,
        revertedAt: response.revertedAt
          ? dayjs.unix(response.revertedAt)
          : null,
        revertedByUserId: response.revertedByUserId,
        auditData: response.auditData || [],
      };
    } catch (error) {
      console.error("Failed to get swap by ID:", error);
      throw new Error(
        `Failed to get swap by ID: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Accept a direct swap invitation (target worker accepts)
   */
  async acceptDirectSwap(swapId: string): Promise<SwapRequestT> {
    try {
      const response = await this.testApiClient.post<any>(
        `/swaps/${swapId}/accept`,
        {},
      );

      console.log(`✅ Accepted direct swap: ${swapId}`);

      return {
        id: response.id,
        teamId: response.teamId,
        createdByUserId: response.createdByUserId,
        swapType: response.swapType,
        status: response.status,
        offeredAssignmentIds: response.offeredAssignmentIds,
        requestedAssignmentIds: response.requestedAssignmentIds,
        targetWorkerId: response.targetWorkerId,
        comment: response.comment,
        bids: (response.bids || []).map((bid: any) => ({
          id: bid.id,
          workerId: bid.workerId,
          offeredAssignmentIds: bid.offeredAssignmentIds,
          createdAt: dayjs.unix(bid.createdAt),
          accepted: bid.accepted,
        })),
        createdAt: dayjs.unix(response.createdAt),
        completedAt: response.completedAt
          ? dayjs.unix(response.completedAt)
          : null,
        completedByUserId: response.completedByUserId,
        revertedAt: response.revertedAt
          ? dayjs.unix(response.revertedAt)
          : null,
        revertedByUserId: response.revertedByUserId,
        auditData: response.auditData || [],
      };
    } catch (error) {
      console.error("Failed to accept direct swap:", error);
      throw new Error(
        `Failed to accept direct swap: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Approve a swap (leader completes the swap)
   */
  async approveSwap(swapId: string): Promise<SwapRequestT> {
    try {
      const response = await this.testApiClient.post<any>(
        `/swaps/${swapId}/approve`,
        {},
      );

      console.log(`✅ Approved swap: ${swapId}`);

      return {
        id: response.id,
        teamId: response.teamId,
        createdByUserId: response.createdByUserId,
        swapType: response.swapType,
        status: response.status,
        offeredAssignmentIds: response.offeredAssignmentIds,
        requestedAssignmentIds: response.requestedAssignmentIds,
        targetWorkerId: response.targetWorkerId,
        comment: response.comment,
        bids: (response.bids || []).map((bid: any) => ({
          id: bid.id,
          workerId: bid.workerId,
          offeredAssignmentIds: bid.offeredAssignmentIds,
          createdAt: dayjs.unix(bid.createdAt),
          accepted: bid.accepted,
        })),
        createdAt: dayjs.unix(response.createdAt),
        completedAt: response.completedAt
          ? dayjs.unix(response.completedAt)
          : null,
        completedByUserId: response.completedByUserId,
        revertedAt: response.revertedAt
          ? dayjs.unix(response.revertedAt)
          : null,
        revertedByUserId: response.revertedByUserId,
        auditData: response.auditData || [],
      };
    } catch (error) {
      console.error("Failed to approve swap:", error);
      throw new Error(
        `Failed to approve swap: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Revert a completed swap (leader action)
   * This restores assignments to their original workers before the swap
   */
  async revertSwap(swapId: string): Promise<SwapRequestT> {
    try {
      const response = await this.testApiClient.post<any>(
        `/swaps/${swapId}/revert`,
        {},
      );

      console.log(`✅ Reverted swap: ${swapId}`);

      return {
        id: response.id,
        teamId: response.teamId,
        createdByUserId: response.createdByUserId,
        swapType: response.swapType,
        status: response.status,
        offeredAssignmentIds: response.offeredAssignmentIds,
        requestedAssignmentIds: response.requestedAssignmentIds,
        targetWorkerId: response.targetWorkerId,
        comment: response.comment,
        bids: (response.bids || []).map((bid: any) => ({
          id: bid.id,
          workerId: bid.workerId,
          offeredAssignmentIds: bid.offeredAssignmentIds,
          createdAt: dayjs.unix(bid.createdAt),
          accepted: bid.accepted,
        })),
        createdAt: dayjs.unix(response.createdAt),
        completedAt: response.completedAt
          ? dayjs.unix(response.completedAt)
          : null,
        completedByUserId: response.completedByUserId,
        revertedAt: response.revertedAt
          ? dayjs.unix(response.revertedAt)
          : null,
        revertedByUserId: response.revertedByUserId,
        auditData: response.auditData || [],
      };
    } catch (error) {
      console.error("Failed to revert swap:", error);
      throw new Error(
        `Failed to revert swap: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Delete a swap
   */
  async deleteSwap(swapId: string): Promise<void> {
    try {
      await this.testApiClient.delete<void>(`/swaps/${swapId}`);

      console.log(`✅ Deleted swap: ${swapId}`);
    } catch (error) {
      console.error("Failed to delete swap:", error);
      throw new Error(
        `Failed to delete swap: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  //////////////////////////
  // Assignment Methods
  //////////////////////////

  /**
   * Get assignments for a team using the existing AssignmentApi for consistent behavior
   */
  async getAssignments(
    teamId: string,
    includeCampaign: boolean = false,
    startDate?: dayjs.Dayjs,
    endDate?: dayjs.Dayjs,
    workerId?: string,
  ): Promise<{ assignments: AssignmentT[] }> {
    try {
      const result = await AssignmentApi.getAssignments(
        this.testApiClient,
        teamId,
        includeCampaign,
        startDate,
        endDate,
        workerId,
      );

      console.log(
        `✅ Retrieved ${result.assignmentsRead.length} assignments for team ${teamId}`,
      );

      return {
        assignments: result.assignmentsRead,
      };
    } catch (error) {
      console.error("Failed to get assignments:", error);
      throw new Error(
        `Failed to get assignments: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }
}

/**
 * Default test user credentials for use across tests
 */
export const TEST_USER = {
  user_id: testConfig.devUserId || "64e9b7f1e13e4a1a9c8b4567",
  email: "testuser@example.com",
  username: "testuser",
  first_name: "Test",
  last_name: "User",
} as const;

/**
 * Second test user credentials for multi-user test scenarios
 * This user is created in global setup but NOT automatically added to teams.
 * Use addSecondUserToTeam() to explicitly add this user to a team when needed.
 */
export const TEST_USER_2 = {
  user_id: testConfig.devUserId2 || "64e9b7f1e13e4a1a9c8b4568",
  email: "testuser2@example.com",
  username: "testuser2",
  first_name: "Test",
  last_name: "User2",
} as const;
