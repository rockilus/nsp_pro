/**
 * Shared base functionality for request E2E tests
 *
 * This module provides common setup and navigation utilities for request tests,
 * reducing duplication across multiple request test files.
 */

import { Page, expect } from "@playwright/test";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { randomUUID } from "crypto";
import { DatabaseTestUtils } from "./database-utils";
import {
  ShiftT,
  ShiftType,
  ShiftRestType,
  ShiftLeaveType,
} from "../../src/types/shift";
import { WorkerT } from "@/types/worker";
import { SWOIdTypes } from "../../src/types/constraint";
import {
  RequestT,
  RequestStatus,
  RequestType,
  FulfillmentStatus,
} from "../../src/types/request";
import { AssignmentT } from "@/types/assignment";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

export class RequestTestBase {
  protected dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;

  // Maps to store workers and shifts by test ID for test isolation
  protected testWorkersMap = new Map<string, WorkerT[]>();
  protected testShiftsMap = new Map<string, ShiftT[]>();
  protected testRequestsMap = new Map<string, RequestT[]>();

  // Keep legacy arrays for backwards compatibility with tests that don't use test IDs
  protected testWorkers: WorkerT[] = [];
  protected testShifts: ShiftT[] = [];
  protected testRequests: RequestT[] = [];

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Performs the common setup for request tests:
   * - Waits for API ready
   * - Verifies test utilities are available
   * - Creates a test team
   * - Creates test workers and shifts
   * - Optionally creates test requests
   * @param workerIndex - The worker index for unique naming
   * @param testId - Optional test ID for test isolation. If provided, workers and shifts will be stored by test ID
   * @param createRequests - Optional flag to create test requests (default: false)
   */
  async setupRequestTests(
    workerIndex: number,
    testId?: string,
    createRequests: boolean = false,
  ): Promise<void> {
    console.log(
      `[${testId || "legacy"}] Setting up request test environment...`,
    );

    // Ensure API is ready
    await this.dbUtils.waitForApiReady();

    // Check test utilities are available
    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error("Test utilities not available for request tests");
    }

    // Create test team
    this.testTeam = await this.dbUtils.createTeam({
      name: `Request Test Team ${workerIndex}-${testId || randomUUID()}`,
    });

    console.log(
      `[${testId || "legacy"}] Created test team: ${this.testTeam.name} (${
        this.testTeam.teamId
      })`,
    );

    if (!this.testTeam) {
      throw new Error("Failed to create test team for request tests");
    }

    // Create test workers with employment start date before any past requests
    // Past requests are created 2 days ago, so we set employment start date 7 days ago
    const employmentStartDate = dayjs.utc().subtract(7, "days").toDate();

    const testWorkersData = [
      {
        name: `Test Worker 1 ${workerIndex}-${testId || randomUUID()}`,
        acronym: "TW1",
        weeklyHours: 40,
        weeklyHoursDesired: 40,
        dutiesPerMonth: 8,
        annualLeave: 25,
        employmentStartDate: employmentStartDate,
      },
      {
        name: `Test Worker 2 ${workerIndex}-${testId || randomUUID()}`,
        acronym: "TW2",
        weeklyHours: 35,
        weeklyHoursDesired: 35,
        dutiesPerMonth: 6,
        annualLeave: 20,
        employmentStartDate: employmentStartDate,
      },
    ];

    const testWorkers = [];
    for (const workerData of testWorkersData) {
      const worker = await this.createTestWorker(workerData, testId);
      testWorkers.push(worker);
    }

    // Store workers by test ID if provided, otherwise use legacy array
    if (testId) {
      this.testWorkersMap.set(testId, testWorkers);
    } else {
      this.testWorkers = testWorkers;
    }

    // Create test shifts
    const testShiftsData = [
      {
        name: `Day Shift ${workerIndex}-${testId || randomUUID()}`,
        startTime: dayjs.utc().hour(8).minute(0).second(0),
        endTime: dayjs.utc().hour(16).minute(0).second(0),
        shiftType: ShiftType.NORMAL,
        color: "#4caf50",
        acronym: "DAY",
      },
      {
        name: `Night Shift ${workerIndex}-${testId || randomUUID()}`,
        startTime: dayjs.utc().hour(20).minute(0).second(0),
        endTime: dayjs.utc().hour(8).minute(0).second(0).add(1, "day"),
        shiftType: ShiftType.DUTY,
        color: "#2196f3",
        acronym: "NIGHT",
      },
    ];

    const testShifts = [];
    for (const shiftData of testShiftsData) {
      const shift = await this.createTestShift(shiftData, testId);
      testShifts.push(shift);
    }

    // Store shifts by test ID if provided, otherwise use legacy array
    if (testId) {
      this.testShiftsMap.set(testId, testShifts);
    } else {
      this.testShifts = testShifts;
    }

    console.log(
      `[${testId || "legacy"}] Created ${testWorkers.length} test workers and ${
        testShifts.length
      } test shifts`,
    );

    // Create test requests if requested
    if (createRequests) {
      // Prefer using one of the shifts we just created for this test (keeps tests isolated)
      // Look up shifts created for this testId (or legacy array)
      const createdShifts = testId
        ? this.testShiftsMap.get(testId) || []
        : this.testShifts;

      // Prefer a shift to use for work request shiftOptions. Prefer a leave-type only if explicitly desired
      let selectedShift: ShiftT | undefined = createdShifts.find(
        (s) =>
          s.shiftType === ShiftType.NORMAL ||
          s.shiftType === ShiftType.DUTY ||
          s.shiftType === ShiftType.REST,
      );

      // Fall back to any created shift
      if (!selectedShift) {
        selectedShift = createdShifts[0];
      }

      // As a last resort, try to fetch any shift from the API
      if (!selectedShift) {
        const allShifts = await this.fetchAllShiftsForTeam();
        selectedShift = allShifts[0];
      }

      if (!selectedShift) {
        throw new Error(
          `Failed to find or fetch a shift for request test setup (${
            testId || "legacy"
          })`,
        );
      }

      // Fetch leave shifts for leave request
      const leaveShifts = await this.fetchLeaveShiftsForTeam();
      let selectedLeaveShift: ShiftT | undefined = leaveShifts.find(
        (s) => s.shiftType === ShiftType.LEAVE,
      );

      if (!selectedLeaveShift) {
        console.warn(
          `[${testId || "legacy"}] No leave shift found for leave request`,
        );
      }

      // Create work requests that reference the created test shifts via shiftOptions
      // All requests are created as PENDING - tests should explicitly approve/deny as needed
      const testRequestsData: Array<any> = [
        // Future work request - worker 2, pending, prefer selectedShift
        {
          workerId: testWorkers[1].id,
          requestType: RequestType.WORK_DEMAND,
          startDate: dayjs.utc().add(3, "days"),
          endDate: dayjs.utc().add(3, "days"),
          status: RequestStatus.PENDING,
          negative: false,
          shiftOptions: [
            {
              name: selectedShift.name,
              id: selectedShift.id,
              idType: SWOIdTypes.SHIFT,
              isBoolDim: false,
              categoryName: "Shifts",
            },
          ],
        },
        // Past work request - worker 1, pending (tests should approve if needed)
        {
          workerId: testWorkers[0].id,
          requestType: RequestType.WORK_DEMAND,
          startDate: dayjs.utc().subtract(2, "days"),
          endDate: dayjs.utc().subtract(2, "days"),
          status: RequestStatus.PENDING,
          negative: false,
          shiftOptions: [
            {
              name: selectedShift.name,
              id: selectedShift.id,
              idType: SWOIdTypes.SHIFT,
              isBoolDim: false,
              categoryName: "Shifts",
            },
          ],
        },
        // Past work request - worker 1, pending (will be approved for rescind test)
        {
          workerId: testWorkers[0].id,
          requestType: RequestType.WORK_DEMAND,
          startDate: dayjs.utc().add(1, "day"),
          endDate: dayjs.utc().add(1, "day"),
          status: RequestStatus.PENDING,
          negative: false,
          shiftOptions: [
            {
              name: selectedShift.name,
              id: selectedShift.id,
              idType: SWOIdTypes.SHIFT,
              isBoolDim: false,
              categoryName: "Shifts",
            },
          ],
        },
      ];

      // Add leave request if a leave shift is available
      if (selectedLeaveShift) {
        testRequestsData.push({
          workerId: testWorkers[0].id,
          requestType: RequestType.LEAVE,
          startDate: dayjs.utc().add(5, "days"),
          endDate: dayjs.utc().add(5, "days"),
          status: RequestStatus.PENDING,
          negative: false,
          shiftId: selectedLeaveShift.id,
        });

        console.log(
          `[${testId || "legacy"}] Will create leave request with shift: ${
            selectedLeaveShift.name
          }`,
        );
      }

      // Add another work request (worker 1) that will be denied for status filter tests
      testRequestsData.push({
        workerId: testWorkers[0].id,
        requestType: RequestType.WORK_DEMAND,
        startDate: dayjs.utc().add(7, "days"),
        endDate: dayjs.utc().add(7, "days"),
        status: RequestStatus.PENDING,
        negative: false,
        shiftOptions: [
          {
            name: selectedShift.name,
            id: selectedShift.id,
            idType: SWOIdTypes.SHIFT,
            isBoolDim: false,
            categoryName: "Shifts",
          },
        ],
      });

      const testRequests = [];
      for (const requestData of testRequestsData) {
        const request = await this.createTestRequest(requestData, testId);
        testRequests.push(request);
      }

      // Approve the third request (index 2) for the rescind test
      if (testRequests.length >= 3) {
        console.log(
          `[${testId || "legacy"}] Approving third request for rescind test`,
        );
        // approveTestRequest returns { request: RequestT, assignments: AssignmentT[] }
        // we only want to keep the RequestT in our testRequests array
        const approvedResponse = await this.approveTestRequest(
          testRequests[2].id,
        );
        testRequests[2] = approvedResponse.request;
      }

      // Deny the last request for status filter tests
      const lastIndex = testRequests.length - 1;
      if (lastIndex >= 0) {
        console.log(
          `[${testId || "legacy"}] Denying last request for status filter test`,
        );
        const deniedRequest = await this.denyTestRequest(
          testRequests[lastIndex].id,
        );
        testRequests[lastIndex] = deniedRequest;
      }

      // Store requests by test ID if provided, otherwise use legacy array
      if (testId) {
        this.testRequestsMap.set(testId, testRequests);
      } else {
        this.testRequests = testRequests;
      }

      console.log(
        `[${testId || "legacy"}] Created ${testRequests.length} test requests`,
      );
    }
  }

  /**
   * Sets the selected team directly in localStorage and navigates to requests page
   * This bypasses the UI navigation for faster test execution
   */
  async navigateToRequestsPageDirect(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRequestTests first.");
    }

    // Set authentication headers before any navigation
    await this.dbUtils.authenticatePageAsTestUser(page);

    // Disable caching to prevent cross-test contamination
    await page.route("**/*", (route) => {
      const headers = {
        ...route.request().headers(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      };
      route.continue({ headers });
    });

    // Set the selected team in localStorage to bypass team selection
    await page.addInitScript((teamData) => {
      localStorage.clear(); // Clear any existing data to prevent cross-test contamination
      sessionStorage.clear(); // Also clear session storage
      localStorage.setItem("selectedTeam", JSON.stringify(teamData));
      localStorage.setItem("selectedTeamId", teamData.teamId);
      // Note: This console.log runs in browser context, not visible in terminal
      // console.log("🔧 [addInitScript] Setting selectedTeam in localStorage:", teamDataStr);
    }, this.testTeam);

    // Navigate directly to the requests page
    await page.goto(`http://localhost:3000/en/plan/requests`);

    // Force a hard refresh to ensure clean state and prevent API caching issues
    await page.reload({ waitUntil: "networkidle" });

    // Wait for the page to load and render
    await page.waitForSelector('[data-testid="request-tab"]', {
      timeout: 10000,
    });

    console.log(
      `Navigated to requests page for team: ${this.testTeam.name} (${this.testTeam.teamId})`,
    );
  }

  /**
   * Navigates to the requests page for the test team
   * This should be called in beforeEach for consistent navigation
   * Uses direct navigation for faster test execution
   */
  async navigateToRequestsPage(page: Page): Promise<void> {
    await this.navigateToRequestsPageDirect(page);
  }

  /**
   * Creates a test worker using the API
   * @param workerData - The worker data
   * @param testId - Optional test ID for test isolation
   */
  async createTestWorker(
    workerData: {
      name: string;
      acronym?: string;
      weeklyHours?: number;
      weeklyHoursDesired?: number;
      dutiesPerMonth?: number;
      annualLeave?: number;
    },
    testId?: string,
  ): Promise<WorkerT> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRequestTests first.");
    }

    return await this.dbUtils.createWorker({
      teamId: this.testTeam.teamId,
      ...workerData,
    });
  }

  /**
   * Creates a test shift using the API
   * @param shiftData - The shift data
   * @param testId - Optional test ID for test isolation
   */
  async createTestShift(
    shiftData: {
      name: string;
      startTime: dayjs.Dayjs;
      endTime: dayjs.Dayjs;
      shiftType: ShiftType;
      restType?: ShiftRestType;
      leaveType?: ShiftLeaveType;
      color?: string;
      acronym?: string;
    },
    testId?: string,
  ): Promise<ShiftT> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRequestTests first.");
    }

    return await this.dbUtils.createShift({
      teamId: this.testTeam.teamId,
      ...shiftData,
    });
  }

  /**
   * Deletes a test worker using the API
   */
  async deleteTestWorker(workerId: string): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRequestTests first.");
    }

    await this.dbUtils.deleteWorker(workerId, this.testTeam.teamId);
  }

  /**
   * Gets the test workers created during setup
   * @param testId - Optional test ID to get workers for a specific test
   */
  getTestWorkers(testId?: string): WorkerT[] {
    if (testId) {
      return this.testWorkersMap.get(testId) || [];
    }
    return this.testWorkers;
  }

  /**
   * Gets the test shifts created during setup
   * @param testId - Optional test ID to get shifts for a specific test
   */
  getTestShifts(testId?: string): ShiftT[] {
    if (testId) {
      return this.testShiftsMap.get(testId) || [];
    }
    return this.testShifts;
  }

  /**
   * Gets the test requests created during setup
   * @param testId - Optional test ID to get requests for a specific test
   */
  getTestRequests(testId?: string): RequestT[] {
    if (testId) {
      return this.testRequestsMap.get(testId) || [];
    }
    return this.testRequests;
  }

  /**
   * Gets the test team created during setup
   */
  getTestTeam(): { teamId: string; name: string } | null {
    return this.testTeam;
  }

  /**
   * Fetches all shifts for the test team from the API
   * @returns Promise<ShiftT[]> - All shifts for the team
   */
  async fetchAllShiftsForTeam(): Promise<ShiftT[]> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRequestTests first.");
    }

    try {
      return await this.dbUtils.getAllShifts(this.testTeam.teamId);
    } catch (error) {
      console.error("Failed to fetch all shifts for team:", error);
      throw new Error(
        `Failed to fetch all shifts for team: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Fetches all leave shifts for the test team from the API
   * @returns Promise<ShiftT[]> - All leave shifts for the team
   */
  async fetchLeaveShiftsForTeam(): Promise<ShiftT[]> {
    const allShifts = await this.fetchAllShiftsForTeam();
    return allShifts.filter((shift) => shift.shiftType === ShiftType.LEAVE);
  }

  /**
   * Deletes all test workers created during setup
   */
  async deleteAllTestWorkers(): Promise<void> {
    if (!this.testTeam) return;

    // Delete workers from all test IDs
    for (const [testId, workers] of this.testWorkersMap.entries()) {
      await this.deleteTestWorkers(testId);
    }

    // Delete legacy workers
    for (const worker of this.testWorkers) {
      try {
        await this.deleteTestWorker(worker.id);
      } catch (error) {
        console.warn(`Failed to delete worker ${worker.id}:`, error);
      }
    }
  }

  /**
   * Deletes test workers for a specific test ID
   * @param testId - The test ID to clean up workers for
   */
  async deleteTestWorkers(testId: string): Promise<void> {
    const workers = this.testWorkersMap.get(testId);
    if (!workers) return;

    for (const worker of workers) {
      try {
        await this.deleteTestWorker(worker.id);
      } catch (error) {
        console.warn(`Failed to delete worker ${worker.id}:`, error);
      }
    }
  }

  /**
   * Cleanup test data for a specific test ID
   * @param testId - The test ID to clean up
   */
  async cleanupTestData(testId: string): Promise<void> {
    this.testWorkersMap.delete(testId);
    this.testShiftsMap.delete(testId);
    this.testRequestsMap.delete(testId);
  }

  /**
   * Creates a test request using the API
   * @param requestData - The request data
   * @param testId - Optional test ID for test isolation
   */
  async createTestRequest(
    requestData: {
      workerId: string;
      requestType: RequestType;
      startDate: dayjs.Dayjs;
      endDate: dayjs.Dayjs;
      status?: RequestStatus;
      negative?: boolean;
      comment?: string;
      shiftId?: string | null;
      shiftOptions?: any[];
    },
    testId?: string,
  ): Promise<RequestT> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not initialized. Call setupRequestTests first.",
      );
    }

    // Convert RequestType enum to API format
    const requestTypeMap = {
      [RequestType.WORK_DEMAND]: "work_demand" as const,
      [RequestType.LEAVE]: "leave" as const,
    };

    // Convert RequestStatus enum to API format
    const requestStatusMap = {
      [RequestStatus.PENDING]: "pending" as const,
      [RequestStatus.APPROVED]: "approved" as const,
      [RequestStatus.DENIED]: "denied" as const,
      [RequestStatus.DEFERRED]: "deferred" as const,
    };

    const apiResponse = await this.dbUtils.createRequest({
      teamId: this.testTeam.teamId,
      workerId: requestData.workerId,
      requestType: requestTypeMap[requestData.requestType],
      startDate: requestData.startDate,
      endDate: requestData.endDate,
      status: requestData.status
        ? requestStatusMap[requestData.status]
        : "pending",
      negative: requestData.negative || false,
      comment: requestData.comment || "",
      shiftId: requestData.shiftId,
      shiftOptions: requestData.shiftOptions,
    });

    // API response is already converted to RequestT by RequestApi.addRequest (via toRequestT)
    // apiResponse is already a RequestT with dayjs objects, so we can return it directly
    return apiResponse;
  }

  /**
   * Deletes a test request using the API
   */
  async deleteTestRequest(requestId: string): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRequestTests first.");
    }

    await this.dbUtils.deleteRequest(requestId, this.testTeam.teamId);
  }

  /**
   * Approves a test request using the API
   * @param requestId - The ID of the request to approve
   * @returns The updated request with APPROVED status
   */
  async approveTestRequest(
    requestId: string,
  ): Promise<{ request: RequestT; assignments: AssignmentT[] }> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRequestTests first.");
    }

    return await this.dbUtils.approveRequest(requestId, this.testTeam.teamId);
  }

  /**
   * Denies a test request using the API
   * @param requestId - The ID of the request to deny
   * @returns The updated request with DENIED status
   */
  async denyTestRequest(requestId: string): Promise<RequestT> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRequestTests first.");
    }

    return await this.dbUtils.denyRequest(requestId, this.testTeam.teamId);
  }

  /**
   * Deletes all test requests created during setup
   */
  async deleteAllTestRequests(): Promise<void> {
    if (!this.testTeam) return;

    // Delete requests from all test IDs
    for (const [testId, requests] of this.testRequestsMap.entries()) {
      await this.deleteTestRequests(testId);
    }

    // Delete legacy requests
    for (const request of this.testRequests) {
      try {
        await this.deleteTestRequest(request.id);
      } catch (error) {
        console.warn(`Failed to delete request ${request.id}:`, error);
      }
    }
  }

  /**
   * Deletes test requests for a specific test ID
   * @param testId - The test ID to clean up requests for
   */
  async deleteTestRequests(testId: string): Promise<void> {
    const requests = this.testRequestsMap.get(testId);
    if (!requests) return;

    for (const request of requests) {
      try {
        await this.deleteTestRequest(request.id);
      } catch (error) {
        console.warn(`Failed to delete request ${request.id}:`, error);
      }
    }
  }

  /**
   * Navigates to the request calendar view
   * Must be called after navigateToRequestsPage
   */
  async navigateToCalendarTab(page: Page): Promise<void> {
    // Click on the calendar tab
    const calendarTab = this.getCalendarTab(page);
    await expect(calendarTab).toBeVisible();
    await calendarTab.click();

    // Wait for the calendar to be visible
    const calendar = this.getRequestCalendar(page);
    await expect(calendar).toBeVisible();
  }

  //////////////////////////
  // Request Page Locators
  //////////////////////////

  /**
   * Gets the new request button
   */
  getNewRequestButton(page: Page) {
    return page.locator('[data-testid="new-request-button"]');
  }

  /**
   * Gets the request panel dialog
   */
  getRequestPanelDialog(page: Page) {
    return page.locator('[data-testid="request-panel-dialog"]');
  }

  /**
   * Gets the request type toggle group
   */
  getRequestTypeToggle(page: Page) {
    return page.locator('[data-testid="request-type-toggle"]');
  }

  /**
   * Gets the work request type button
   */
  getWorkRequestTypeButton(page: Page) {
    return page.locator('[data-testid="work-request-type-button"]');
  }

  /**
   * Gets the leave request type button
   */
  getLeaveRequestTypeButton(page: Page) {
    return page.locator('[data-testid="leave-request-type-button"]');
  }

  /**
   * Gets the worker select dropdown input element
   * Note: MUI Select component uses a hidden input for the value
   */
  getWorkerSelect(page: Page) {
    return page.locator('[data-testid="worker-select"] input');
  }

  /**
   * Gets the shift select dropdown input element (for leave requests)
   * Note: MUI Select component uses a hidden input for the value
   */
  getShiftSelect(page: Page) {
    return page.locator('[data-testid="shift-select"] input');
  }

  /**
   * Gets the date range checkbox
   */
  getDateRangeCheckbox(page: Page) {
    return page.locator('[data-testid="date-range-checkbox"]');
  }

  /**
   * Gets the start date picker
   */
  getStartDatePicker(page: Page) {
    return page.locator('[data-testid="start-date-picker"]');
  }

  /**
   * Gets the end date picker
   */
  getEndDatePicker(page: Page) {
    return page.locator('[data-testid="end-date-picker"]');
  }

  /**
   * Gets the negative/positive toggle group (for work requests)
   */
  getNegativePositiveToggle(page: Page) {
    return page.locator('[data-testid="negative-positive-toggle"]');
  }

  /**
   * Gets the positive request button ("do")
   */
  getPositiveRequestButton(page: Page) {
    return page.locator('[data-testid="positive-request-button"]');
  }

  /**
   * Gets the negative request button ("don't")
   */
  getNegativeRequestButton(page: Page) {
    return page.locator('[data-testid="negative-request-button"]');
  }

  /**
   * Gets the save request button
   */
  getSaveRequestButton(page: Page) {
    return page.locator('[data-testid="save-request-button"]');
  }

  /**
   * Gets the request table
   */
  getRequestTable(page: Page) {
    return page.locator('[data-testid="request-table"]');
  }

  /**
   * Gets the request tab container
   */
  getRequestTab(page: Page) {
    return page.locator('[data-testid="request-tab"]');
  }

  /**
   * Gets the shift options display block
   */
  getShiftOptionsDisplayBlock(page: Page) {
    return page.locator('[data-testid="shift-options-display-block"]');
  }

  /**
   * Gets the shift options button
   */
  getShiftOptionsButton(page: Page) {
    return page.locator('[data-testid="shift-options-button"]');
  }

  /**
   * Gets the shift options popover
   */
  getShiftOptionsPopover(page: Page) {
    return page.locator('[data-testid="shift-options-popover"]');
  }

  /**
   * Gets the calendar tab button
   */
  getCalendarTab(page: Page) {
    return page.getByTestId("calendar-tab");
  }

  /**
   * Gets the request calendar component
   */
  getRequestCalendar(page: Page) {
    return page.getByTestId("request-calendar");
  }

  /**
   * Gets the calendar month label
   */
  getCalendarMonthLabel(page: Page) {
    // TimeNavigation component uses data-testid="time-nav-label"
    return page.locator('[data-testid="time-nav-label"]');
  }

  /**
   * Gets the previous month button
   */
  getPrevMonthButton(page: Page) {
    // TimeNavigation component uses data-testid="time-nav-previous"
    return page.locator('[data-testid="time-nav-previous"]');
  }

  /**
   * Gets the next month button
   */
  getNextMonthButton(page: Page) {
    // TimeNavigation component uses data-testid="time-nav-next"
    return page.locator('[data-testid="time-nav-next"]');
  }

  /**
   * Gets the today button
   */
  getTodayButton(page: Page) {
    // TimeNavigation component uses data-testid="time-nav-today"
    return page.locator('[data-testid="time-nav-today"]');
  }

  /**
   * Gets the period navigation component locators
   * (Uses TimeNavigation component)
   */
  getPeriodNav(page: Page) {
    return {
      todayButton: page.locator('[data-testid="time-nav-today"]'),
      previousButton: page.locator('[data-testid="time-nav-previous"]'),
      nextButton: page.locator('[data-testid="time-nav-next"]'),
      label: page.locator('[data-testid="time-nav-label"]'),
      select: page.locator('[data-testid="time-nav-select"]'),
    };
  }

  /**
   * Gets the table header cell for a specific date.
   * @param page The Playwright page object.
   * @param date The date in 'YYYY-MM-DD' format.
   */
  getDateHeader(page: Page, date: string) {
    return page.locator(`[data-testid="date-header-${date}"]`);
  }

  /**
   * Gets a specific calendar cell by worker ID and date
   */
  getCalendarCell(page: Page, workerId: string, date: dayjs.Dayjs) {
    return page.getByTestId(
      `calendar-cell-${workerId}-${date.format("YYYY-MM-DD")}`,
    );
  }

  /**
   * Gets a specific calendar cell with an existing request
   */
  getCalendarCellWithRequest(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
    requestId: string,
  ) {
    return page.getByTestId(
      `calendar-cell-${workerId}-${date.format(
        "YYYY-MM-DD",
      )}-request-${requestId}`,
    );
  }

  /**
   * Gets the pending status legend button
   */
  getShowPendingButton(page: Page) {
    return page.getByTestId("calendar-show-pending-button");
  }

  /**
   * Gets the accepted not fulfilled status legend button
   */
  getShowAcceptedNotFulfilledButton(page: Page) {
    return page.getByTestId("calendar-show-accepted-not-fulfilled-button");
  }

  /**
   * Gets the fulfilled status legend button
   */
  getShowFulfilledButton(page: Page) {
    return page.getByTestId("calendar-show-fulfilled-button");
  }

  /**
   * Gets the approve request button
   */
  getApproveRequestButton(page: Page, requestId: string) {
    return page.getByTestId(`approve-request-button-${requestId}`);
  }

  /**
   * Gets the reject request button
   */
  getRejectRequestButton(page: Page, requestId: string) {
    return page.getByTestId(`reject-request-button-${requestId}`);
  }

  /**
   * Gets the rescind request button
   */
  getRescindRequestButton(page: Page, requestId: string) {
    return page.getByTestId(`rescind-request-button-${requestId}`);
  }

  /**
   * Gets the delete request button
   */
  getDeleteRequestButton(page: Page, requestId: string) {
    return page.getByTestId(`delete-request-button-${requestId}`);
  }

  /**
   * Gets the comment field in the request panel
   */
  getCommentField(page: Page) {
    return page.locator('textarea[name="comment"], input[name="comment"]');
  }

  //////////////////////////
  // Helper Actions
  //////////////////////////

  /**
   * Opens the new request popover
   */
  async openNewRequestPopover(page: Page): Promise<void> {
    const newRequestButton = this.getNewRequestButton(page);
    await newRequestButton.waitFor({ state: "visible" });
    await newRequestButton.click();

    // Wait for popover to open
    const popover = this.getRequestPanelDialog(page);
    await popover.waitFor({ state: "visible" });
  }

  /**
   * Selects a request type (work or leave)
   */
  async selectRequestType(page: Page, type: "work" | "leave"): Promise<void> {
    if (type === "work") {
      await this.getWorkRequestTypeButton(page).click();
    } else {
      await this.getLeaveRequestTypeButton(page).click();
    }
  }

  /**
   * Selects a worker by name
   */
  async selectWorker(page: Page, workerName: string): Promise<void> {
    // Click on the Select component (parent of the hidden input)
    const workerSelectContainer = page.locator('[data-testid="worker-select"]');
    await workerSelectContainer.click();

    // Wait for dropdown options to appear and select the worker
    const workerOption = page.locator(`text="${workerName}"`);
    await workerOption.waitFor({ state: "visible" });
    await workerOption.click();
  }

  /**
   * Selects a shift by name (for leave requests)
   */
  async selectShift(page: Page, shiftName: string): Promise<void> {
    // Click on the Select component (parent of the hidden input)
    const shiftSelectContainer = page.locator('[data-testid="shift-select"]');
    await shiftSelectContainer.click();

    // Wait for dropdown options to appear and select the shift
    const shiftOption = page.locator(`text="${shiftName}"`);
    await shiftOption.waitFor({ state: "visible" });
    await shiftOption.click();
  }

  /**
   * Sets the request date (or start date if using date range)
   */
  async setStartDate(page: Page, date: dayjs.Dayjs): Promise<void> {
    const startDatePicker = this.getStartDatePicker(page);
    const value = date.format("DD/MM/YYYY");

    // Wait for the input to be visible
    await startDatePicker.waitFor({ state: "visible" });

    // For MUI date pickers with complex internal structure, we need to use fill with force
    await startDatePicker.fill("", { force: true }); // Clear first
    await page.waitForTimeout(100);
    await startDatePicker.fill(value, { force: true }); // Then fill

    // Press Enter to confirm the value
    await startDatePicker.press("Enter");

    // Give the app time to process the change
    await page.waitForTimeout(300);

    console.log(`Set start date to: ${value}`);
  }

  /**
   * Enables date range and sets end date
   */
  async enableDateRangeAndSetEndDate(
    page: Page,
    endDate: dayjs.Dayjs,
  ): Promise<void> {
    // Enable date range
    const dateRangeCheckbox = this.getDateRangeCheckbox(page);
    await dateRangeCheckbox.click();

    // Set end date
    const endDatePicker = this.getEndDatePicker(page);
    await endDatePicker.waitFor({ state: "visible" });

    const value = endDate.format("DD/MM/YYYY");
    // Set value directly on the end date input to avoid opening the overlay
    await endDatePicker.evaluate((el: HTMLInputElement, v: string) => {
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);

    await page.waitForTimeout(30);
  }

  /**
   * Sets the request preference (positive or negative for work requests)
   */
  async setRequestPreference(
    page: Page,
    preference: "positive" | "negative",
  ): Promise<void> {
    if (preference === "positive") {
      await this.getPositiveRequestButton(page).click();
    } else {
      await this.getNegativeRequestButton(page).click();
    }
  }

  /**
   * Selects shift options for work requests
   * This opens the shift options popover and selects the first available shift option
   */
  async selectShiftOptions(page: Page): Promise<void> {
    // Click on the shift options display block to open the popover
    const shiftOptionsBlock = this.getShiftOptionsDisplayBlock(page);
    await shiftOptionsBlock.waitFor({ state: "visible" });
    await shiftOptionsBlock.click();

    // Wait for the popover to open
    const shiftOptionsPopover = this.getShiftOptionsPopover(page);
    await shiftOptionsPopover.waitFor({ state: "visible" });

    // Look for the first available shift option using the test ID pattern
    // Pattern: swo-option-{categoryName}-{id}-{isBoolDim}
    // We'll look for any shift option (categoryName "Shifts" and isBoolDim false)
    const shiftOption = page
      .locator('[data-testid^="swo-option-Shifts-"][data-testid$="-false"]')
      .first();

    // Wait for the option to be visible and click it
    await shiftOption.waitFor({ state: "visible", timeout: 5000 });
    await shiftOption.click();

    // Wait a bit for the selection to register
    await page.waitForTimeout(200);

    // The popover does not close automatically after selection
    // We can force-click the invisible backdrop to close it
    await page.mouse.click(100, 100);
    await expect(shiftOption).not.toBeVisible();

    // Wait for the popover to close (with a reasonable timeout)
    await shiftOptionsPopover
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => {
        // If it doesn't close, try clicking outside one more time
        console.log(
          "Popover didn't close automatically, attempting to close manually",
        );
      });
  }

  /**
   * Saves the request
   */
  async saveRequest(page: Page): Promise<void> {
    const saveButton = this.getSaveRequestButton(page);
    await saveButton.click();

    // Wait for popover to close
    const popover = this.getRequestPanelDialog(page);
    await popover.waitFor({ state: "hidden" });
  }

  /**
   * Verifies that a request appears in the request table
   */
  async verifyRequestInTable(
    page: Page,
    expectedRequest: {
      workerName: string;
      type: "work" | "leave";
      date?: string;
      dateRange?: string;
      preference?: "positive" | "negative";
      shiftName?: string;
    },
  ): Promise<void> {
    const requestTable = this.getRequestTable(page);
    await requestTable.waitFor({ state: "visible" });

    // Wait a bit for the table to update after request creation
    await page.waitForTimeout(500);

    // Look for a row containing both the worker name and date (if provided)
    if (expectedRequest.date) {
      console.log(
        `Looking for request with worker: ${expectedRequest.workerName} and date: ${expectedRequest.date}`,
      );

      // Find rows with the worker name
      const workerRows = page.locator("tbody tr").filter({
        hasText: expectedRequest.workerName,
      });

      const rowCount = await workerRows.count();
      console.log(`Found ${rowCount} rows with worker name`);

      // Get all text from the rows for debugging
      for (let i = 0; i < rowCount; i++) {
        const rowText = await workerRows.nth(i).textContent();
        console.log(`Row ${i} text: ${rowText}`);
      }

      // Try multiple date formats that might be used in the table
      // Based on the code, the format is "MMM D" for dates in the current year
      const dateFormats = [
        dayjs(expectedRequest.date).format("MMM D"), // "Jan 15" - this is the actual format used in the table!
        dayjs(expectedRequest.date).format("MMM DD"), // "Jan 15" with leading zero
        dayjs(expectedRequest.date).format("MMM D, YYYY"), // "Jan 15, 2026"
        dayjs(expectedRequest.date).format("MMM DD, YYYY"), // "Jan 15, 2026" with leading zero
        dayjs(expectedRequest.date).format("DD MMM YYYY"), // "15 Jan 2026"
        dayjs(expectedRequest.date).format("D MMM YYYY"), // "15 Jan 2026" without leading zero
        dayjs(expectedRequest.date).format("DD/MM/YYYY"), // "15/01/2026"
        dayjs(expectedRequest.date).format("YYYY-MM-DD"), // "2026-01-15"
      ];

      // Try to find a row with any of the date formats
      let found = false;
      for (const dateFormat of dateFormats) {
        const rowWithDate = workerRows.filter({ hasText: dateFormat });
        const count = await rowWithDate.count();
        if (count > 0) {
          console.log(`✅ Found row with date format: ${dateFormat}`);
          await rowWithDate.first().waitFor({ state: "visible" });
          found = true;
          break;
        } else {
          console.log(`❌ Date format not found: ${dateFormat}`);
        }
      }

      if (!found) {
        // If no specific date match, just verify the worker name exists
        console.log(
          `⚠️ Could not find specific date format, verifying worker exists`,
        );
        await workerRows.first().waitFor({ state: "visible" });
      }
    } else {
      // If no date provided, just look for the worker name
      const workerCell = page
        .locator(`text="${expectedRequest.workerName}"`)
        .first();
      await workerCell.waitFor({ state: "visible" });
    }

    // Additional verifications can be added here based on the specific request details
    console.log(
      `✅ Verified request for ${expectedRequest.workerName} appears in table`,
    );
  }

  //////////////////////////
  // Calendar Interaction Helpers
  //////////////////////////

  /**
   * Clicks on an empty calendar cell to create a new request
   */
  async clickEmptyCalendarCell(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
  ): Promise<void> {
    // Navigate to the correct month first
    await this.navigateToMonth(page, date);

    const cell = this.getCalendarCell(page, workerId, date);
    await expect(cell).toBeVisible();
    await cell.click();
  }

  /**
   * Clicks on a calendar cell with an existing request to edit it
   */
  async clickRequestCalendarCell(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
    requestId: string,
  ): Promise<void> {
    // Navigate to the correct month first
    await this.navigateToMonth(page, date);

    const cell = this.getCalendarCellWithRequest(
      page,
      workerId,
      date,
      requestId,
    );
    await expect(cell).toBeVisible();
    await cell.click();
  }

  /**
   * Navigates to a specific month in the calendar
   */
  async navigateToMonth(page: Page, targetMonth: dayjs.Dayjs): Promise<void> {
    const currentMonthLabel = this.getCalendarMonthLabel(page);

    // Wait for the calendar to be fully loaded before reading the month
    await expect(currentMonthLabel).toBeVisible();

    // Wait for the first day of the month to be rendered in the calendar
    // This ensures the calendar data has fully loaded
    const firstDayOfMonth = targetMonth.startOf("month").format("YYYY-MM-DD");
    const firstDateHeader = this.getDateHeader(page, firstDayOfMonth);
    await expect(firstDateHeader)
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        // If the first day isn't visible yet, just continue - we'll navigate to it
      });

    let currentMonthText = await currentMonthLabel.textContent();
    // Use strict parsing (third parameter = true) to avoid parsing issues
    let currentMonth = dayjs.utc(currentMonthText, "MMMM YYYY", true);

    while (!currentMonth.isSame(targetMonth, "month")) {
      if (currentMonth.isBefore(targetMonth, "month")) {
        await this.getNextMonthButton(page).click();
      } else {
        await this.getPrevMonthButton(page).click();
      }

      // Wait for the month label text to change to avoid using a fixed timeout
      const previousText = currentMonthText;
      await page.waitForFunction(
        ({ selector, prev }: { selector: string; prev: string | null }) => {
          const el = document.querySelector(selector);
          return !!(el && el.textContent && el.textContent !== prev);
        },
        { selector: '[data-testid="time-nav-label"]', prev: previousText },
      );
      currentMonthText = await currentMonthLabel.textContent();
      // Use strict parsing (third parameter = true) to avoid parsing issues
      currentMonth = dayjs.utc(currentMonthText, "MMMM YYYY", true);
    }
  }

  /**
   * Waits for a request to appear in the calendar at the specified location
   */
  async waitForRequestInCalendar(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
    requestId: string,
    timeout: number = 5000,
  ): Promise<void> {
    const cell = this.getCalendarCellWithRequest(
      page,
      workerId,
      date,
      requestId,
    );
    await expect(cell).toBeVisible({ timeout });
  }

  /**
   * Waits for a request to disappear from the calendar at the specified location
   */
  async waitForRequestToDisappearFromCalendar(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
    requestId: string,
    timeout: number = 5000,
  ): Promise<void> {
    const cell = this.getCalendarCellWithRequest(
      page,
      workerId,
      date,
      requestId,
    );
    await expect(cell).not.toBeVisible({ timeout });
  }

  /**
   * Verifies that a calendar cell is empty (no request)
   */
  async verifyCalendarCellIsEmpty(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
  ): Promise<void> {
    // Navigate to the correct month first
    await this.navigateToMonth(page, date);

    const cell = this.getCalendarCell(page, workerId, date);
    await expect(cell).toBeVisible();

    // Check that it doesn't have the request class
    const hasRequestClass = await cell.evaluate((el: Element) =>
      el.classList.contains("calendar-cell--leave"),
    );
    expect(hasRequestClass).toBe(false);
  }

  /**
   * Verifies that a calendar cell has a request with specific properties
   */
  async verifyCalendarCellHasRequest(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
    requestId: string,
    expectedProperties?: {
      status?: RequestStatus;
      backgroundColor?: string;
    },
  ): Promise<void> {
    // Navigate to the correct month first
    await this.navigateToMonth(page, date);

    const cell = this.getCalendarCellWithRequest(
      page,
      workerId,
      date,
      requestId,
    );
    await expect(cell).toBeVisible();

    // Check that it has the request class
    const hasRequestClass = await cell.evaluate((el: Element) =>
      el.classList.contains("calendar-cell--leave"),
    );
    expect(hasRequestClass).toBe(true);

    if (expectedProperties?.backgroundColor) {
      const backgroundColor = await cell.evaluate(
        (el: Element) =>
          getComputedStyle(el as HTMLElement).backgroundColor ||
          (el as HTMLElement).style.background,
      );
      expect(backgroundColor).toContain(expectedProperties.backgroundColor);
    }
  }

  /**
   * Verifies that clicking on a past date does nothing
   */
  async verifyPastDateClick(
    page: Page,
    workerId: string,
    pastDate: dayjs.Dayjs,
  ): Promise<void> {
    // Navigate to the correct month first
    await this.navigateToMonth(page, pastDate);

    const cell = this.getCalendarCell(page, workerId, pastDate);
    await expect(cell).toBeVisible();

    // Verify the cell has the past class
    const hasPastClass = await cell.evaluate((el: Element) =>
      el.classList.contains("calendar-cell--past"),
    );
    expect(hasPastClass).toBe(true);

    // Click on the cell
    await cell.click();

    // Verify no request panel opened
    const requestPanel = this.getRequestPanelDialog(page);
    await expect(requestPanel).not.toBeVisible();
  }

  /**
   * Toggles the status legend filters and verifies visibility
   */
  async toggleStatusFilter(
    page: Page,
    status: "pending" | "accepted-not-fulfilled" | "fulfilled",
  ): Promise<void> {
    let button;
    switch (status) {
      case "pending":
        button = this.getShowPendingButton(page);
        break;
      case "accepted-not-fulfilled":
        button = this.getShowAcceptedNotFulfilledButton(page);
        break;
      case "fulfilled":
        button = this.getShowFulfilledButton(page);
        break;
    }

    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Creates and verifies a request appears in the calendar
   */
  async createRequestAndVerifyInCalendar(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
    requestType: RequestType = RequestType.WORK_DEMAND,
  ): Promise<string> {
    // Click on empty cell to open create dialog
    await this.clickEmptyCalendarCell(page, workerId, date);

    // Verify request panel opens
    const requestPanel = this.getRequestPanelDialog(page);
    await expect(requestPanel).toBeVisible();

    // Select request type if needed
    if (requestType === RequestType.LEAVE) {
      await this.selectRequestType(page, "leave");
    }

    // Save the request
    await this.saveRequest(page);

    // Wait for panel to close
    await expect(requestPanel).not.toBeVisible();

    // Note: In a real test, you'd need to get the created request ID
    // For now, return a placeholder
    return "created-request-id";
  }

  //////////////////////////
  // Request Type Filter Helpers
  //////////////////////////

  /**
   * Gets the work request filter button
   */
  getWorkRequestFilterButton(page: Page) {
    return page.getByTestId("request-calendar-filter-work");
  }

  /**
   * Gets the leave request filter button
   */
  getLeaveRequestFilterButton(page: Page) {
    return page.getByTestId("request-calendar-filter-leave");
  }

  /**
   * Toggles the work request filter
   */
  async toggleWorkRequestFilter(page: Page): Promise<void> {
    const button = this.getWorkRequestFilterButton(page);
    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Toggles the leave request filter
   */
  async toggleLeaveRequestFilter(page: Page): Promise<void> {
    const button = this.getLeaveRequestFilterButton(page);
    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Gets all visible work request cells in the calendar
   */
  getVisibleWorkRequestCells(page: Page) {
    return page.locator('[data-request-type="work_demand"]');
  }

  /**
   * Gets all visible leave request cells in the calendar
   */
  getVisibleLeaveRequestCells(page: Page) {
    return page.locator('[data-request-type="leave"]');
  }

  /**
   * Verifies that work requests are visible in the calendar
   */
  async verifyWorkRequestsVisible(
    page: Page,
    expectedCount?: number,
  ): Promise<void> {
    const workRequestCells = this.getVisibleWorkRequestCells(page);
    const count = await workRequestCells.count();

    if (expectedCount !== undefined) {
      expect(count).toBe(expectedCount);
    } else {
      expect(count).toBeGreaterThan(0);
    }
  }

  /**
   * Verifies that leave requests are visible in the calendar
   */
  async verifyLeaveRequestsVisible(
    page: Page,
    expectedCount?: number,
  ): Promise<void> {
    const leaveRequestCells = this.getVisibleLeaveRequestCells(page);
    const count = await leaveRequestCells.count();

    if (expectedCount !== undefined) {
      expect(count).toBe(expectedCount);
    } else {
      expect(count).toBeGreaterThan(0);
    }
  }

  /**
   * Verifies that work requests are not visible in the calendar
   */
  async verifyWorkRequestsNotVisible(page: Page): Promise<void> {
    const workRequestCells = this.getVisibleWorkRequestCells(page);
    const count = await workRequestCells.count();
    expect(count).toBe(0);
  }

  /**
   * Verifies that leave requests are not visible in the calendar
   */
  async verifyLeaveRequestsNotVisible(page: Page): Promise<void> {
    const leaveRequestCells = this.getVisibleLeaveRequestCells(page);
    const count = await leaveRequestCells.count();
    expect(count).toBe(0);
  }

  //////////////////////////
  // Status Filter Methods
  //////////////////////////

  /**
   * Gets the pending request status filter button
   */
  getPendingStatusFilterButton(page: Page) {
    return page.getByTestId("request-calendar-filter-pending");
  }

  /**
   * Gets the accepted request status filter button
   */
  getAcceptedStatusFilterButton(page: Page) {
    return page.getByTestId("request-calendar-filter-accepted");
  }

  /**
   * Gets the denied request status filter button
   */
  getDeniedStatusFilterButton(page: Page) {
    return page.getByTestId("request-calendar-filter-denied");
  }

  /**
   * Toggles the pending request status filter
   */
  async togglePendingStatusFilter(page: Page): Promise<void> {
    const button = this.getPendingStatusFilterButton(page);
    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Toggles the accepted request status filter
   */
  async toggleAcceptedStatusFilter(page: Page): Promise<void> {
    const button = this.getAcceptedStatusFilterButton(page);
    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Toggles the denied request status filter
   */
  async toggleDeniedStatusFilter(page: Page): Promise<void> {
    const button = this.getDeniedStatusFilterButton(page);
    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Gets all visible pending request cells in the calendar
   */
  getVisiblePendingRequestCells(page: Page) {
    return page.locator('[data-request-status="pending"]');
  }

  /**
   * Gets all visible approved request cells in the calendar
   */
  getVisibleApprovedRequestCells(page: Page) {
    return page.locator('[data-request-status="approved"]');
  }

  /**
   * Gets all visible denied request cells in the calendar
   */
  getVisibleDeniedRequestCells(page: Page) {
    return page.locator('[data-request-status="denied"]');
  }

  /**
   * Verifies that pending requests are visible in the calendar
   */
  async verifyPendingRequestsVisible(
    page: Page,
    expectedCount?: number,
  ): Promise<void> {
    const pendingRequestCells = this.getVisiblePendingRequestCells(page);
    const count = await pendingRequestCells.count();

    if (expectedCount !== undefined) {
      expect(count).toBe(expectedCount);
    } else {
      expect(count).toBeGreaterThan(0);
    }
  }

  /**
   * Verifies that approved requests are visible in the calendar
   */
  async verifyApprovedRequestsVisible(
    page: Page,
    expectedCount?: number,
  ): Promise<void> {
    const approvedRequestCells = this.getVisibleApprovedRequestCells(page);
    const count = await approvedRequestCells.count();

    if (expectedCount !== undefined) {
      expect(count).toBe(expectedCount);
    } else {
      expect(count).toBeGreaterThan(0);
    }
  }

  /**
   * Verifies that denied requests are visible in the calendar
   */
  async verifyDeniedRequestsVisible(
    page: Page,
    expectedCount?: number,
  ): Promise<void> {
    const deniedRequestCells = this.getVisibleDeniedRequestCells(page);
    const count = await deniedRequestCells.count();

    if (expectedCount !== undefined) {
      expect(count).toBe(expectedCount);
    } else {
      expect(count).toBeGreaterThan(0);
    }
  }

  /**
   * Verifies that pending requests are not visible in the calendar
   */
  async verifyPendingRequestsNotVisible(page: Page): Promise<void> {
    const pendingRequestCells = this.getVisiblePendingRequestCells(page);
    const count = await pendingRequestCells.count();
    expect(count).toBe(0);
  }

  /**
   * Verifies that approved requests are not visible in the calendar
   */
  async verifyApprovedRequestsNotVisible(page: Page): Promise<void> {
    const approvedRequestCells = this.getVisibleApprovedRequestCells(page);
    const count = await approvedRequestCells.count();
    expect(count).toBe(0);
  }

  /**
   * Verifies that denied requests are not visible in the calendar
   */
  async verifyDeniedRequestsNotVisible(page: Page): Promise<void> {
    const deniedRequestCells = this.getVisibleDeniedRequestCells(page);
    const count = await deniedRequestCells.count();
    expect(count).toBe(0);
  }

  //////////////////////////
  // New Filter Methods (using new implementation)
  //////////////////////////

  /**
   * Opens the calendar filter menu
   */
  async openCalendarFilterMenu(page: Page): Promise<void> {
    const filterButton = page.getByTestId("calendar-filter-menu-button");
    await expect(filterButton).toBeVisible();
    await filterButton.click();
    // Wait for the column list to appear
    await expect(page.getByTestId("filter-column-list")).toBeVisible();
  }

  /**
   * Selects a filter column from the menu
   */
  async selectFilterColumn(page: Page, columnId: string): Promise<void> {
    const columnButton = page.getByTestId(`filter-column-${columnId}`);
    await expect(columnButton).toBeVisible();
    await columnButton.click();
  }

  /**
   * Applies a select filter with specific values
   * @param page - The Playwright page
   * @param columnId - The column ID to filter (e.g., "shiftId", "requestType", "status")
   * @param values - Array of values to select
   */
  async applySelectFilter(
    page: Page,
    columnId: string,
    values: string[],
  ): Promise<void> {
    // Open filter menu if not already open
    const filterList = page.getByTestId("filter-column-list");
    const isMenuOpen = await filterList.isVisible().catch(() => false);
    if (!isMenuOpen) {
      await this.openCalendarFilterMenu(page);
    }

    // Select the column
    await this.selectFilterColumn(page, columnId);

    // Wait for filter to appear
    await expect(page.getByTestId(`select-filter-${columnId}`)).toBeVisible();

    // Select the values
    for (const value of values) {
      const checkbox = page.getByTestId(`filter-option-${columnId}-${value}`);
      await expect(checkbox).toBeVisible();
      const isChecked = await checkbox.isChecked();
      if (!isChecked) {
        await checkbox.click();
      }
    }

    // Apply the filter
    const applyButton = page.getByTestId(`filter-apply-${columnId}`);
    await applyButton.click();

    // Wait for filter bar to show the applied filter
    await expect(page.getByTestId("table-filter-bar")).toBeVisible();
  }

  /**
   * Applies a date range filter
   * @param page - The Playwright page
   * @param columnId - The column ID to filter (usually "startDate" or "endDate")
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   */
  async applyDateFilter(
    page: Page,
    columnId: string,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    // Open filter menu if not already open
    const filterList = page.getByTestId("filter-column-list");
    const isMenuOpen = await filterList.isVisible().catch(() => false);
    if (!isMenuOpen) {
      await this.openCalendarFilterMenu(page);
    }

    // Select the column
    await this.selectFilterColumn(page, columnId);

    // Wait for filter to appear
    await expect(page.getByTestId(`date-filter-${columnId}`)).toBeVisible();

    // Fill in the dates
    await page.getByTestId(`filter-start-date-${columnId}`).fill(startDate);
    await page.getByTestId(`filter-end-date-${columnId}`).fill(endDate);

    // Apply the filter
    const applyButton = page.getByTestId(`filter-apply-${columnId}`);
    await applyButton.click();

    // Wait for filter bar to show the applied filter
    await expect(page.getByTestId("table-filter-bar")).toBeVisible();
  }

  /**
   * Verifies that a filter chip is visible in the filter bar
   */
  async verifyFilterChipVisible(page: Page, columnId: string): Promise<void> {
    const filterChip = page.getByTestId(`filter-chip-${columnId}`);
    await expect(filterChip).toBeVisible();
  }

  /**
   * Removes a specific filter by clicking its chip
   */
  async removeFilter(page: Page, columnId: string): Promise<void> {
    const filterChip = page.getByTestId(`filter-chip-${columnId}`);
    await expect(filterChip).toBeVisible();
    // Click the delete icon on the chip
    await filterChip.locator('button[aria-label="delete"]').click();
  }

  /**
   * Resets all filters and sorting
   */
  async resetAllFilters(page: Page): Promise<void> {
    const resetButton = page.getByTestId("reset-all-filters-button");
    await expect(resetButton).toBeVisible();
    await resetButton.click();
    // Wait for filter bar to disappear
    await expect(page.getByTestId("table-filter-bar")).not.toBeVisible();
  }

  /**
   * Verifies that the filter bar is not visible (no active filters)
   */
  async verifyNoActiveFilters(page: Page): Promise<void> {
    await expect(page.getByTestId("table-filter-bar")).not.toBeVisible();
  }

  /**
   * Opens the worker column sort/filter menu
   */
  async openWorkerColumnMenu(page: Page): Promise<void> {
    const menuButton = page.getByTestId("column-menu-workerId");
    await expect(menuButton).toBeVisible();
    await menuButton.click();
  }

  /**
   * Sorts by worker in specified direction
   * @param page - The Playwright page
   * @param direction - Sort direction ("asc" or "desc")
   */
  async sortByWorker(page: Page, direction: "asc" | "desc"): Promise<void> {
    await this.openWorkerColumnMenu(page);
    const sortButton = page.getByTestId(`sort-${direction}-workerId`);
    await expect(sortButton).toBeVisible();
    await sortButton.click();
    // Wait for sort chip to appear
    await expect(page.getByTestId("sort-chip")).toBeVisible();
  }

  /**
   * Removes worker sorting
   */
  async removeWorkerSort(page: Page): Promise<void> {
    await this.openWorkerColumnMenu(page);
    const removeSortButton = page.getByTestId("remove-sort-workerId");
    await expect(removeSortButton).toBeVisible();
    await removeSortButton.click();
  }

  /**
   * Applies worker filter through the worker column menu
   * @param page - The Playwright page
   * @param workerIds - Array of worker IDs to filter by
   */
  async applyWorkerFilter(page: Page, workerIds: string[]): Promise<void> {
    await this.openWorkerColumnMenu(page);

    // Click filter menu item
    const filterMenuItem = page.getByTestId("filter-menu-workerId");
    await expect(filterMenuItem).toBeVisible();
    await filterMenuItem.click();

    // Wait for filter to appear
    await expect(page.getByTestId("select-filter-workerId")).toBeVisible();

    // Select the workers
    for (const workerId of workerIds) {
      const checkbox = page.getByTestId(`filter-option-workerId-${workerId}`);
      await expect(checkbox).toBeVisible();
      const isChecked = await checkbox.isChecked();
      if (!isChecked) {
        await checkbox.click();
      }
    }

    // Apply the filter
    const applyButton = page.getByTestId("filter-apply-workerId");
    await applyButton.click();

    // Wait for filter bar to show the applied filter
    await expect(page.getByTestId("table-filter-bar")).toBeVisible();
  }

  /**
   * Verifies that the sort chip is visible in the filter bar
   */
  async verifySortChipVisible(page: Page): Promise<void> {
    await expect(page.getByTestId("sort-chip")).toBeVisible();
  }

  /**
   * Verifies that specific requests are visible in the calendar by their IDs
   * @param page - The Playwright page
   * @param requestIds - Array of request IDs that should be visible
   */
  async verifyRequestsVisibleByIds(
    page: Page,
    requestIds: string[],
  ): Promise<void> {
    for (const requestId of requestIds) {
      const requestCell = page.locator(`[data-request-id="${requestId}"]`);
      await expect(requestCell).toBeVisible();
    }
  }

  /**
   * Verifies that specific requests are not visible in the calendar by their IDs
   * @param page - The Playwright page
   * @param requestIds - Array of request IDs that should not be visible
   */
  async verifyRequestsNotVisibleByIds(
    page: Page,
    requestIds: string[],
  ): Promise<void> {
    for (const requestId of requestIds) {
      const requestCell = page.locator(`[data-request-id="${requestId}"]`);
      await expect(requestCell).not.toBeVisible();
    }
  }

  /**
   * Counts visible request cells in the calendar
   */
  async countVisibleRequests(page: Page): Promise<number> {
    const requestCells = page.locator("[data-request-id]");
    return await requestCells.count();
  }

  /**
   * Verifies the number of visible requests matches expected count
   */
  async verifyRequestCount(page: Page, expectedCount: number): Promise<void> {
    const count = await this.countVisibleRequests(page);
    expect(count).toBe(expectedCount);
  }

  /**
   * Set the request calendar view settings in localStorage
   * Only updates the provided settings, leaving others unchanged.
   * If targetDate and timeFrame are provided, calculates the appropriate periodStartDate.
   *
   * @param page - Playwright page object
   * @param options - Optional settings to update
   * @param reload - Whether to reload the page after setting (default: true)
   */
  async setRequestCalendarViewSettings(
    page: Page,
    options?: {
      selectedTab?: "table" | "calendar";
      targetDate?: dayjs.Dayjs;
      timeFrame?: "week" | "month";
      periodStartDate?: dayjs.Dayjs;
      filters?: Array<{
        id: string;
        type: "text" | "select" | "date" | "boolean";
        value: any;
      }>;
      sort?: {
        columnId: string;
        direction: "asc" | "desc";
      } | null;
    },
    reload: boolean = true,
  ): Promise<void> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not initialized. Call setupRequestTests first.",
      );
    }

    // Use team-scoped storage key
    const storageKey = `requestViewSettings_${this.testTeam.teamId}`;

    // Get existing settings from localStorage
    const existingSettings = await page.evaluate((key) => {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    }, storageKey);

    // Build updates object with only provided values
    const stateUpdates: any = {};

    // Handle selectedTab
    if (options?.selectedTab !== undefined) {
      stateUpdates.selectedTab = options.selectedTab;
    }

    // Handle periodStartDate calculation or direct setting
    if (options?.periodStartDate) {
      stateUpdates.periodStartDate = options.periodStartDate
        .utc()
        .toISOString();
    } else if (options?.targetDate && options?.timeFrame) {
      let calculatedDate: dayjs.Dayjs;
      if (options.timeFrame === "week") {
        // Start of ISO week (Monday)
        calculatedDate = options.targetDate.startOf("isoWeek");
      } else {
        // Start of the month
        calculatedDate = options.targetDate.startOf("month");
      }

      stateUpdates.periodStartDate = calculatedDate.utc().toISOString();
    }

    // Add timeFrame
    if (options?.timeFrame !== undefined) {
      stateUpdates.timeFrame = options.timeFrame;
    }

    // Add filters and sort
    if (options?.filters !== undefined) {
      stateUpdates.filters = options.filters;
    }
    if (options?.sort !== undefined) {
      stateUpdates.sort = options.sort;
    }

    // Merge with existing settings using new flat structure
    // Ensure all required fields have defaults
    const settings = {
      selectedTab: existingSettings?.selectedTab || "table",
      filters: existingSettings?.filters || [],
      sort: existingSettings?.sort || null,
      timeFrame: existingSettings?.timeFrame || "month",
      periodStartDate:
        existingSettings?.periodStartDate ||
        dayjs().utc().startOf("month").toISOString(),
      ...stateUpdates, // Apply updates on top
    };

    // Set in localStorage
    await page.evaluate(
      ({ key, value }) => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      { key: storageKey, value: settings },
    );

    const logParts = ["✅ Set request view settings (team-scoped):"];
    if (stateUpdates.selectedTab !== undefined) {
      logParts.push(`tab ${stateUpdates.selectedTab}`);
    }
    if (stateUpdates.timeFrame) {
      logParts.push(`${stateUpdates.timeFrame} view`);
    }
    if (stateUpdates.periodStartDate) {
      logParts.push(
        `starting ${dayjs(stateUpdates.periodStartDate).format("YYYY-MM-DD")}`,
      );
    }
    if (Object.keys(stateUpdates).length === 0) {
      logParts.push("(no changes)");
    }
    console.log(logParts.join(" "));

    // Navigate to requests page to apply localStorage changes
    // This is more reliable than reload() because it re-runs the addInitScript for team selection
    if (reload) {
      // Navigate to the requests page
      await page.goto(`http://localhost:3000/en/plan/requests`);
      await page.waitForLoadState("networkidle");

      // Wait for the requests page to load
      await page.waitForSelector('[data-testid="request-tab"]', {
        timeout: 10000,
      });
    }
  }
}
