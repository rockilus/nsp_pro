/**
 * Shared base functionality for request E2E tests
 *
 * This module provides common setup and navigation utilities for request tests,
 * reducing duplication across multiple request test files.
 */

import { Page } from "@playwright/test";
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

  // Keep legacy arrays for backwards compatibility with tests that don't use test IDs
  protected testWorkers: { workerId: string; name: string; teamId: string }[] =
    [];
  protected testShifts: ShiftT[] = [];

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Performs the common setup for request tests:
   * - Waits for API ready
   * - Verifies test utilities are available
   * - Creates a test team
   * - Creates test workers and shifts
   * @param workerIndex - The worker index for unique naming
   * @param testId - Optional test ID for test isolation. If provided, workers and shifts will be stored by test ID
   */
  async setupRequestTests(workerIndex: number, testId?: string): Promise<void> {
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

    // Create test workers
    const testWorkersData = [
      {
        name: `Test Worker 1 ${workerIndex}-${testId || randomUUID()}`,
        acronym: "TW1",
        weeklyHours: 40,
        weeklyHoursDesired: 40,
        dutiesPerMonth: 8,
        annualLeave: 25,
      },
      {
        name: `Test Worker 2 ${workerIndex}-${testId || randomUUID()}`,
        acronym: "TW2",
        weeklyHours: 35,
        weeklyHoursDesired: 35,
        dutiesPerMonth: 6,
        annualLeave: 20,
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
    this.testWorkersMap.delete(testId);
    this.testShiftsMap.delete(testId);
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
   * Gets the worker select dropdown
   */
  getWorkerSelect(page: Page) {
    return page.locator('[data-testid="worker-select"]');
  }

  /**
   * Gets the shift select dropdown (for leave requests)
   */
  getShiftSelect(page: Page) {
    return page.locator('[data-testid="shift-select"]');
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
    const workerSelect = this.getWorkerSelect(page);
    await workerSelect.click();

    // Wait for dropdown options to appear and select the worker
    const workerOption = page.locator(`text="${workerName}"`);
    await workerOption.waitFor({ state: "visible" });
    await workerOption.click();
  }

  /**
   * Selects a shift by name (for leave requests)
   */
  async selectShift(page: Page, shiftName: string): Promise<void> {
    const shiftSelect = this.getShiftSelect(page);
    await shiftSelect.click();

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
}
