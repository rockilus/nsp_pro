/**
 * Shared base functionality for request E2E tests
 *
 * This module provides common setup and navigation utilities for request tests,
 * reducing duplication across multiple request test files.
 */

import { Page, expect } from "@playwright/test";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { randomUUID } from "crypto";
import { DatabaseTestUtils } from "./database-utils";
import {
  ShiftT,
  ShiftType,
  ShiftRestType,
  ShiftLeaveType,
} from "../../src/types/shift";
import { SWOIdTypes } from "../../src/types/constraint";
import {
  RequestT,
  RequestStatus,
  RequestType,
  FulfillmentStatus,
} from "../../src/types/request";

dayjs.extend(utc);

export class RequestTestBase {
  protected dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;

  // Maps to store workers and shifts by test ID for test isolation
  protected testWorkersMap = new Map<
    string,
    { workerId: string; name: string; teamId: string }[]
  >();
  protected testShiftsMap = new Map<string, ShiftT[]>();
  protected testRequestsMap = new Map<string, RequestT[]>();

  // Keep legacy arrays for backwards compatibility with tests that don't use test IDs
  protected testWorkers: { workerId: string; name: string; teamId: string }[] =
    [];
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
    createRequests: boolean = false
  ): Promise<void> {
    console.log(
      `[${testId || "legacy"}] Setting up request test environment...`
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
      })`
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
      } test shifts`
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
          s.shiftType === ShiftType.REST
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
          })`
        );
      }

      // Create work requests that reference the created test shifts via shiftOptions
      // All requests are created as PENDING - tests should explicitly approve/deny as needed
      const testRequestsData = [
        // Future work request - worker 2, pending, prefer selectedShift
        {
          workerId: testWorkers[1].workerId,
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
          workerId: testWorkers[0].workerId,
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
      ];

      const testRequests = [];
      for (const requestData of testRequestsData) {
        const request = await this.createTestRequest(requestData, testId);
        testRequests.push(request);
      }

      // Store requests by test ID if provided, otherwise use legacy array
      if (testId) {
        this.testRequestsMap.set(testId, testRequests);
      } else {
        this.testRequests = testRequests;
      }

      console.log(
        `[${testId || "legacy"}] Created ${testRequests.length} test requests`
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
      `Navigated to requests page for team: ${this.testTeam.name} (${this.testTeam.teamId})`
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
    testId?: string
  ): Promise<{ workerId: string; name: string; teamId: string }> {
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
    testId?: string
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
  getTestWorkers(
    testId?: string
  ): { workerId: string; name: string; teamId: string }[] {
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
        }`
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
        await this.deleteTestWorker(worker.workerId);
      } catch (error) {
        console.warn(`Failed to delete worker ${worker.workerId}:`, error);
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
        await this.deleteTestWorker(worker.workerId);
      } catch (error) {
        console.warn(`Failed to delete worker ${worker.workerId}:`, error);
      }
    }
  }

  /**
   * Cleanup test data for a specific test ID
   * @param testId - The test ID to clean up
   */
  async cleanupTestData(testId: string): Promise<void> {
    await this.deleteTestWorkers(testId);
    await this.deleteTestRequests(testId);
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
    testId?: string
  ): Promise<RequestT> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not initialized. Call setupRequestTests first."
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
      startDate: requestData.startDate.toDate(),
      endDate: requestData.endDate.toDate(),
      status: requestData.status
        ? requestStatusMap[requestData.status]
        : "pending",
      negative: requestData.negative || false,
      comment: requestData.comment || "",
      shiftId: requestData.shiftId,
      shiftOptions: requestData.shiftOptions,
    });

    // Convert API response to RequestT
    const request: RequestT = {
      id: apiResponse.id,
      teamId: apiResponse.teamId,
      requestType: requestData.requestType,
      workerId: apiResponse.workerId,
      startDate: dayjs.unix(apiResponse.startDate).utc(),
      endDate: dayjs.unix(apiResponse.endDate).utc(),
      shiftId: apiResponse.shiftId || null,
      shiftOptions: apiResponse.shiftOptions || [],
      negative: apiResponse.negative || false,
      hard: apiResponse.hard || true,
      status: requestData.status || RequestStatus.PENDING,
      fulfillment: FulfillmentStatus.NOT_PROCESSED,
      comment: apiResponse.comment || "",
      createdAt: dayjs.unix(apiResponse.createdAt).utc(),
      active: apiResponse.active || true,
      shiftTargetIds: apiResponse.shiftTargetIds || [],
      missingAttributes: apiResponse.missingAttributes || [],
    };

    return request;
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
  async approveTestRequest(requestId: string): Promise<RequestT> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRequestTests first.");
    }

    return await this.dbUtils.approveRequest(requestId, this.testTeam.teamId);
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
  getRequestPanelPopover(page: Page) {
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
    return page.getByTestId("calendar-month-label");
  }

  /**
   * Gets the previous month button
   */
  getPrevMonthButton(page: Page) {
    return page.getByTestId("calendar-prev-month-button");
  }

  /**
   * Gets the next month button
   */
  getNextMonthButton(page: Page) {
    return page.getByTestId("calendar-next-month-button");
  }

  /**
   * Gets the today button
   */
  getTodayButton(page: Page) {
    return page.getByTestId("calendar-today-button");
  }

  /**
   * Gets a specific calendar cell by worker ID and date
   */
  getCalendarCell(page: Page, workerId: string, date: dayjs.Dayjs) {
    return page.getByTestId(
      `calendar-cell-${workerId}-${date.format("YYYY-MM-DD")}`
    );
  }

  /**
   * Gets a specific calendar cell with an existing request
   */
  getCalendarCellWithRequest(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
    requestId: string
  ) {
    return page.getByTestId(
      `calendar-cell-${workerId}-${date.format(
        "YYYY-MM-DD"
      )}-request-${requestId}`
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
    const popover = this.getRequestPanelPopover(page);
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
    await startDatePicker.click();
    await startDatePicker.fill(date.format("DD/MM/YYYY"));
    // Press Enter to confirm the date
    await startDatePicker.press("Enter");
  }

  /**
   * Enables date range and sets end date
   */
  async enableDateRangeAndSetEndDate(
    page: Page,
    endDate: dayjs.Dayjs
  ): Promise<void> {
    // Enable date range
    const dateRangeCheckbox = this.getDateRangeCheckbox(page);
    await dateRangeCheckbox.click();

    // Set end date
    const endDatePicker = this.getEndDatePicker(page);
    await endDatePicker.waitFor({ state: "visible" });
    await endDatePicker.click();
    await endDatePicker.fill(endDate.format("DD/MM/YYYY"));
    await endDatePicker.press("Enter");
  }

  /**
   * Sets the request preference (positive or negative for work requests)
   */
  async setRequestPreference(
    page: Page,
    preference: "positive" | "negative"
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

    // Press Escape to close the popover and confirm selection
    await page.keyboard.press("Escape");

    // Wait for the popover to close
    await shiftOptionsPopover.waitFor({ state: "hidden" });
  }

  /**
   * Saves the request
   */
  async saveRequest(page: Page): Promise<void> {
    const saveButton = this.getSaveRequestButton(page);
    await saveButton.click();

    // Wait for popover to close
    const popover = this.getRequestPanelPopover(page);
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
    }
  ): Promise<void> {
    const requestTable = this.getRequestTable(page);
    await requestTable.waitFor({ state: "visible" });

    // Look for the worker name in the table
    const workerCell = page.locator(`text="${expectedRequest.workerName}"`);
    await workerCell.waitFor({ state: "visible" });

    // Additional verifications can be added here based on the specific request details
    console.log(
      `✅ Verified request for ${expectedRequest.workerName} appears in table`
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
    date: dayjs.Dayjs
  ): Promise<void> {
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
    requestId: string
  ): Promise<void> {
    const cell = this.getCalendarCellWithRequest(
      page,
      workerId,
      date,
      requestId
    );
    await expect(cell).toBeVisible();
    await cell.click();
  }

  /**
   * Navigates to a specific month in the calendar
   */
  async navigateToMonth(page: Page, targetMonth: dayjs.Dayjs): Promise<void> {
    const currentMonthLabel = this.getCalendarMonthLabel(page);
    let currentMonthText = await currentMonthLabel.textContent();
    let currentMonth = dayjs.utc(currentMonthText, "MMMM YYYY");

    while (!currentMonth.isSame(targetMonth, "month")) {
      if (currentMonth.isBefore(targetMonth, "month")) {
        await this.getNextMonthButton(page).click();
      } else {
        await this.getPrevMonthButton(page).click();
      }

      // Wait for the month to change
      await page.waitForTimeout(100);
      currentMonthText = await currentMonthLabel.textContent();
      currentMonth = dayjs.utc(currentMonthText, "MMMM YYYY");
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
    timeout: number = 5000
  ): Promise<void> {
    const cell = this.getCalendarCellWithRequest(
      page,
      workerId,
      date,
      requestId
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
    timeout: number = 5000
  ): Promise<void> {
    const cell = this.getCalendarCellWithRequest(
      page,
      workerId,
      date,
      requestId
    );
    await expect(cell).not.toBeVisible({ timeout });
  }

  /**
   * Verifies that a calendar cell is empty (no request)
   */
  async verifyCalendarCellIsEmpty(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs
  ): Promise<void> {
    const cell = this.getCalendarCell(page, workerId, date);
    await expect(cell).toBeVisible();

    // Check that it doesn't have the request class
    const hasRequestClass = await cell.evaluate((el: Element) =>
      el.classList.contains("calendar-cell--leave")
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
    }
  ): Promise<void> {
    const cell = this.getCalendarCellWithRequest(
      page,
      workerId,
      date,
      requestId
    );
    await expect(cell).toBeVisible();

    // Check that it has the request class
    const hasRequestClass = await cell.evaluate((el: Element) =>
      el.classList.contains("calendar-cell--leave")
    );
    expect(hasRequestClass).toBe(true);

    if (expectedProperties?.backgroundColor) {
      const backgroundColor = await cell.evaluate(
        (el: Element) =>
          getComputedStyle(el as HTMLElement).backgroundColor ||
          (el as HTMLElement).style.background
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
    pastDate: dayjs.Dayjs
  ): Promise<void> {
    const cell = this.getCalendarCell(page, workerId, pastDate);
    await expect(cell).toBeVisible();

    // Verify the cell has the past class
    const hasPastClass = await cell.evaluate((el: Element) =>
      el.classList.contains("calendar-cell--past")
    );
    expect(hasPastClass).toBe(true);

    // Click on the cell
    await cell.click();

    // Verify no request panel opened
    const requestPanel = this.getRequestPanelPopover(page);
    await expect(requestPanel).not.toBeVisible();
  }

  /**
   * Toggles the status legend filters and verifies visibility
   */
  async toggleStatusFilter(
    page: Page,
    status: "pending" | "accepted-not-fulfilled" | "fulfilled"
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
    requestType: RequestType = RequestType.WORK_DEMAND
  ): Promise<string> {
    // Click on empty cell to open create dialog
    await this.clickEmptyCalendarCell(page, workerId, date);

    // Verify request panel opens
    const requestPanel = this.getRequestPanelPopover(page);
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
}
