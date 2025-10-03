/**
 * E2E tests for Request Creation functionality
 *
 * This test suite covers the request creation feature in the RequestTab component,
 * including work requests, leave requests, date ranges, and validation.
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { RequestTestBase } from "../../utils/request-test-base";

dayjs.extend(utc);

test.describe("Request Creation", () => {
  // Store the request test base per test run
  const testBasesMap = new Map<string, RequestTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    // Generate a unique ID for this specific test run
    // Combines worker index, test title, and UUID for absolute uniqueness
    const testRunId = `${testInfo.workerIndex}-${
      testInfo.title
    }-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting request creation test setup`);

    // Create a new RequestTestBase instance for this test run
    const requestTestBase = new RequestTestBase();
    testBasesMap.set(testRunId, requestTestBase);

    // Store the testRunId in test info for access in test body and cleanup
    (testInfo as any).testRunId = testRunId;

    // Setup the common request test environment (includes workers and shifts)
    await requestTestBase.setupRequestTests(testInfo.workerIndex, testRunId);

    // Navigate to the requests page (this already handles localStorage team setting)
    await requestTestBase.navigateToRequestsPage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    console.log(`[Test Run ${testRunId}] Starting cleanup...`);

    if (!testRunId) {
      console.warn("No testRunId found, skipping cleanup");
      return;
    }

    const requestTestBase = testBasesMap.get(testRunId);

    if (!requestTestBase) {
      console.warn(
        `No requestTestBase found for testRunId: ${testRunId}, skipping cleanup`
      );
      return;
    }

    console.log(`[Test Run ${testRunId}] Cleaning up test data`);

    // Clean up: delete the workers and shifts created for THIS specific test run
    try {
      await requestTestBase.cleanupTestData(testRunId);
    } catch (error) {
      console.warn(
        `[Test Run ${testRunId}] Cleanup failed, but continuing:`,
        error
      );
    }

    // Clean up the maps to prevent memory leaks
    testBasesMap.delete(testRunId);

    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test("should open request creation popover when clicking new request button", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Find and click the new request button
    const newRequestButton = requestTestBase.getNewRequestButton(page);
    await expect(newRequestButton).toBeVisible();
    await newRequestButton.click();

    // Verify the popover opens
    const popover = requestTestBase.getRequestPanelPopover(page);
    await expect(popover).toBeVisible();

    // Verify popover has correct elements
    const requestTypeToggle = requestTestBase.getRequestTypeToggle(page);
    await expect(requestTypeToggle).toBeVisible();

    const workerSelect = requestTestBase.getWorkerSelect(page);
    await expect(workerSelect).toBeVisible();

    const saveButton = requestTestBase.getSaveRequestButton(page);
    await expect(saveButton).toBeVisible();

    console.log("✅ Request creation popover opens successfully");
  });

  test("should create a work request for test worker to do test shift on test date", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    const selectedTeamFromStorage = await page.evaluate(() => {
      const selectedTeam = localStorage.getItem("selectedTeam");
      return selectedTeam ? JSON.parse(selectedTeam) : null;
    });

    console.log(
      `[${testRunId}] Selected team from localStorage in test:`,
      selectedTeamFromStorage
    );

    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);
    const testShifts = requestTestBase.getTestShifts(testRunId);

    // Open the request creation popover
    await requestTestBase.openNewRequestPopover(page);

    // Select work request type (should be default)
    await requestTestBase.selectRequestType(page, "work");

    // Select the first test worker
    await requestTestBase.selectWorker(page, testWorkers[0].name);

    // Set the request date (tomorrow)
    const tomorrow = dayjs.utc().add(1, "day");
    await requestTestBase.setStartDate(page, tomorrow);

    // Set positive preference (do the shift)
    await requestTestBase.setRequestPreference(page, "positive");

    // Select shift options (required for work requests)
    await requestTestBase.selectShiftOptions(page);

    // Save the request
    await requestTestBase.saveRequest(page);

    // Verify the request appears in the table
    await requestTestBase.verifyRequestInTable(page, {
      workerName: testWorkers[0].name,
      type: "work",
      date: tomorrow.format("YYYY-MM-DD"),
      preference: "positive",
    });

    console.log("✅ Work request for single date created successfully");
  });

  test("should create a work request for test worker to do test shift on test period", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);

    // Open the request creation popover
    await requestTestBase.openNewRequestPopover(page);

    // Select work request type
    await requestTestBase.selectRequestType(page, "work");

    // Select the first test worker
    await requestTestBase.selectWorker(page, testWorkers[0].name);

    // Set the start date (tomorrow)
    const startDate = dayjs.utc().add(1, "day");
    await requestTestBase.setStartDate(page, startDate);

    // Enable date range and set end date (one week later)
    const endDate = startDate.add(6, "days");
    await requestTestBase.enableDateRangeAndSetEndDate(page, endDate);

    // Set positive preference (do the shift)
    await requestTestBase.setRequestPreference(page, "positive");

    // Select shift options (required for work requests)
    await requestTestBase.selectShiftOptions(page);

    // Save the request
    await requestTestBase.saveRequest(page);

    // Verify the request appears in the table
    await requestTestBase.verifyRequestInTable(page, {
      workerName: testWorkers[0].name,
      type: "work",
      dateRange: `${startDate.format("YYYY-MM-DD")} to ${endDate.format(
        "YYYY-MM-DD"
      )}`,
      preference: "positive",
    });

    console.log("✅ Work request for date period created successfully");
  });

  test("should create a work request for test worker to NOT do test shift on test date", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);

    // Open the request creation popover
    await requestTestBase.openNewRequestPopover(page);

    // Select work request type
    await requestTestBase.selectRequestType(page, "work");

    // Select the second test worker
    await requestTestBase.selectWorker(page, testWorkers[1].name);

    // Set the request date (tomorrow)
    const tomorrow = dayjs.utc().add(1, "day");
    await requestTestBase.setStartDate(page, tomorrow);

    // Set negative preference (don't do the shift)
    await requestTestBase.setRequestPreference(page, "negative");

    // Select shift options (required for work requests)
    await requestTestBase.selectShiftOptions(page);

    // Save the request
    await requestTestBase.saveRequest(page);

    // Verify the request appears in the table
    await requestTestBase.verifyRequestInTable(page, {
      workerName: testWorkers[1].name,
      type: "work",
      date: tomorrow.format("YYYY-MM-DD"),
      preference: "negative",
    });

    console.log("✅ Negative work request created successfully");
  });

  test("should create a leave request for test worker on test date", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);
    const testShifts = requestTestBase.getTestShifts(testRunId);

    // Find the leave shift
    const leaveShift = testShifts.find((shift) => shift.name.includes("Leave"));
    if (!leaveShift) {
      throw new Error("Leave shift not found in test data");
    }

    // Open the request creation popover
    await requestTestBase.openNewRequestPopover(page);

    // Select leave request type
    await requestTestBase.selectRequestType(page, "leave");

    // Select the first test worker
    await requestTestBase.selectWorker(page, testWorkers[0].name);

    // Set the request date (tomorrow)
    const tomorrow = dayjs.utc().add(1, "day");
    await requestTestBase.setStartDate(page, tomorrow);

    // Select the leave shift
    await requestTestBase.selectShift(page, leaveShift.name);

    // Save the request
    await requestTestBase.saveRequest(page);

    // Verify the request appears in the table
    await requestTestBase.verifyRequestInTable(page, {
      workerName: testWorkers[0].name,
      type: "leave",
      date: tomorrow.format("YYYY-MM-DD"),
      shiftName: leaveShift.name,
    });

    console.log("✅ Leave request for single date created successfully");
  });

  test("should create a leave request for test worker on test period", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);
    const testShifts = requestTestBase.getTestShifts(testRunId);

    // Find the leave shift
    const leaveShift = testShifts.find((shift) => shift.name.includes("Leave"));
    if (!leaveShift) {
      throw new Error("Leave shift not found in test data");
    }

    // Open the request creation popover
    await requestTestBase.openNewRequestPopover(page);

    // Select leave request type
    await requestTestBase.selectRequestType(page, "leave");

    // Select the second test worker
    await requestTestBase.selectWorker(page, testWorkers[1].name);

    // Set the start date (tomorrow)
    const startDate = dayjs.utc().add(1, "day");
    await requestTestBase.setStartDate(page, startDate);

    // Enable date range and set end date (three days later)
    const endDate = startDate.add(2, "days");
    await requestTestBase.enableDateRangeAndSetEndDate(page, endDate);

    // Select the leave shift
    await requestTestBase.selectShift(page, leaveShift.name);

    // Save the request
    await requestTestBase.saveRequest(page);

    // Verify the request appears in the table
    await requestTestBase.verifyRequestInTable(page, {
      workerName: testWorkers[1].name,
      type: "leave",
      dateRange: `${startDate.format("YYYY-MM-DD")} to ${endDate.format(
        "YYYY-MM-DD"
      )}`,
      shiftName: leaveShift.name,
    });

    console.log("✅ Leave request for date period created successfully");
  });

  test("should validate required fields and show errors", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Open the request creation popover
    await requestTestBase.openNewRequestPopover(page);

    // Try to save without filling required fields
    const saveButton = requestTestBase.getSaveRequestButton(page);
    await saveButton.click();

    // The popover should still be visible (not closed due to validation errors)
    const popover = requestTestBase.getRequestPanelPopover(page);
    await expect(popover).toBeVisible();

    // Check that validation errors are displayed (look for error styling)
    const workerSelect = requestTestBase.getWorkerSelect(page);
    await expect(workerSelect).toHaveClass(/error/i);

    console.log("✅ Validation errors displayed correctly");
  });

  test("should switch between work and leave request types correctly", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Open the request creation popover
    await requestTestBase.openNewRequestPopover(page);

    // Verify work request type is selected by default
    const workButton = requestTestBase.getWorkRequestTypeButton(page);
    await expect(workButton).toHaveAttribute("aria-pressed", "true");

    // Verify positive/negative toggle is visible for work requests
    const negativePositiveToggle =
      requestTestBase.getNegativePositiveToggle(page);
    await expect(negativePositiveToggle).toBeVisible();

    // Switch to leave request type
    await requestTestBase.selectRequestType(page, "leave");

    // Verify leave request type is now selected
    const leaveButton = requestTestBase.getLeaveRequestTypeButton(page);
    await expect(leaveButton).toHaveAttribute("aria-pressed", "true");

    // Verify positive/negative toggle is hidden for leave requests
    await expect(negativePositiveToggle).not.toBeVisible();

    // Verify shift select is visible for leave requests
    const shiftSelect = requestTestBase.getShiftSelect(page);
    await expect(shiftSelect).toBeVisible();

    console.log("✅ Request type switching works correctly");
  });

  test("should handle date range toggle correctly", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Open the request creation popover
    await requestTestBase.openNewRequestPopover(page);

    // Verify only start date picker is visible initially
    const startDatePicker = requestTestBase.getStartDatePicker(page);
    await expect(startDatePicker).toBeVisible();

    const endDatePicker = requestTestBase.getEndDatePicker(page);
    await expect(endDatePicker).not.toBeVisible();

    // Enable date range
    const dateRangeCheckbox = requestTestBase.getDateRangeCheckbox(page);
    await dateRangeCheckbox.check();

    // Verify end date picker becomes visible
    await expect(endDatePicker).toBeVisible();

    // Disable date range
    await dateRangeCheckbox.uncheck();

    // Verify end date picker is hidden again
    await expect(endDatePicker).not.toBeVisible();

    console.log("✅ Date range toggle works correctly");
  });
});
