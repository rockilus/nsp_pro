/**
 * E2E tests for Request Calendar functionality
 *
 * This test suite covers the request calendar feature in the RequestTab component,
 * including calendar navigation, cell interactions, and request management.
 */

import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { RequestTestBase } from "../../utils/request-test-base";
import { RequestType, RequestStatus } from "../../../src/types/request";
import { randomUUID } from "crypto";

dayjs.extend(utc);

test.describe("Request Calendar", () => {
  // Store the request test base per test run
  const testBasesMap = new Map<string, RequestTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    // Ensure workerIndex has a safe fallback (0) so parallel/serial runs are stable
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    // Generate a unique ID for this specific test run
    // Combines worker index, test title, and UUID for absolute uniqueness
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting request calendar test setup`);

    // Create a new RequestTestBase instance for this test run
    const requestTestBase = new RequestTestBase();
    testBasesMap.set(testRunId, requestTestBase);

    // Store the testRunId in test info for access in test body and cleanup
    (testInfo as any).testRunId = testRunId;

    // Determine if this test needs pre-created requests
    const needsPreCreatedRequests =
      testInfo.title.includes("should show existing requests") ||
      testInfo.title.includes("should open edit request panel") ||
      testInfo.title.includes("should delete request when clicking delete") ||
      testInfo.title.includes(
        "should approve request when clicking checkmark"
      ) ||
      testInfo.title.includes("should rescind approved request") ||
      testInfo.title.includes("should reject request when clicking close");

    // Setup the common request test environment (includes workers and shifts)
    // Create test requests if this test needs them
    await requestTestBase.setupRequestTests(
      workerIndex,
      testRunId,
      needsPreCreatedRequests
    );

    // Navigate to the requests page
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

  test("should show request calendar when clicking on the calendar tab", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Verify we're on the requests page with the list view (tab 0) selected
    const requestTab = requestTestBase.getRequestTab(page);
    await expect(requestTab).toBeVisible();

    // Navigate to the calendar tab
    await requestTestBase.navigateToCalendarTab(page);

    // Verify the calendar is visible
    const calendar = requestTestBase.getRequestCalendar(page);
    await expect(calendar).toBeVisible();

    // Verify calendar components are present
    const monthLabel = requestTestBase.getCalendarMonthLabel(page);
    await expect(monthLabel).toBeVisible();

    const prevButton = requestTestBase.getPrevMonthButton(page);
    await expect(prevButton).toBeVisible();

    const nextButton = requestTestBase.getNextMonthButton(page);
    await expect(nextButton).toBeVisible();

    console.log(
      "✅ Request calendar shows correctly when clicking calendar tab"
    );
  });

  test("should do nothing when clicking on a past date cell", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);

    // Navigate to calendar
    await requestTestBase.navigateToCalendarTab(page);

    // Use yesterday as a past date
    const pastDate = dayjs.utc().subtract(1, "day");

    // Verify that clicking on a past date does nothing
    await requestTestBase.verifyPastDateClick(
      page,
      testWorkers[0].workerId,
      pastDate
    );

    console.log("✅ Clicking on past date does nothing");
  });

  test("should open create request panel when clicking on today or future date cell", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);

    // Navigate to calendar
    await requestTestBase.navigateToCalendarTab(page);

    // Use today as a test date
    const today = dayjs.utc().startOf("day");

    // Click on empty cell for today
    await requestTestBase.clickEmptyCalendarCell(
      page,
      testWorkers[0].workerId,
      today
    );

    // Verify request panel opens
    const requestPanel = requestTestBase.getRequestPanelPopover(page);
    await expect(requestPanel).toBeVisible();

    // Verify we can close the panel by clicking the cancel button
    const cancelButton = page.getByTestId("cancel-request-button");
    await cancelButton.click();
    await expect(requestPanel).not.toBeVisible();

    console.log("✅ Create request panel opens when clicking on today");

    // Test with a future date
    const futureDate = dayjs.utc().add(2, "days");

    // Click on empty cell for future date
    await requestTestBase.clickEmptyCalendarCell(
      page,
      testWorkers[0].workerId,
      futureDate
    );

    // Verify request panel opens again
    await expect(requestPanel).toBeVisible();

    console.log("✅ Create request panel opens when clicking on future date");
  });

  test("should create a new request and show it in the calendar", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);

    // Navigate to calendar
    await requestTestBase.navigateToCalendarTab(page);

    // Use tomorrow as test date
    const tomorrow = dayjs.utc().add(1, "day");

    // Click on empty cell to create request
    await requestTestBase.clickEmptyCalendarCell(
      page,
      testWorkers[0].workerId,
      tomorrow
    );

    // Verify request panel opens
    const requestPanel = requestTestBase.getRequestPanelPopover(page);
    await expect(requestPanel).toBeVisible();

    // Select work request type (should be default)
    await requestTestBase.selectRequestType(page, "work");

    // Verify worker is pre-filled (should be pre-populated from calendar cell click)
    const workerSelect = requestTestBase.getWorkerSelect(page);
    await expect(workerSelect).toHaveValue(testWorkers[0].workerId);

    // Verify date is pre-filled (should be pre-populated from calendar cell click)
    // Note: We don't need to set the date as it's already set by the calendar cell click

    // Set positive preference (do the shift)
    await requestTestBase.setRequestPreference(page, "positive");

    // Select shift options (required for work requests)
    await requestTestBase.selectShiftOptions(page);

    // Save the request
    await requestTestBase.saveRequest(page);

    // Verify the request appears in the calendar
    // Wait for a cell with a request ID suffix to appear (pattern: calendar-cell-{workerId}-{date}-request-{requestId})
    const cellPattern = `calendar-cell-${
      testWorkers[0].workerId
    }-${tomorrow.format("YYYY-MM-DD")}-request-`;
    const calendarCell = page.locator(`[data-testid^="${cellPattern}"]`);

    // Wait for the cell to be visible and have the request styling
    await expect(calendarCell).toBeVisible({ timeout: 5000 });

    // Wait for the cell to have the calendar-cell--leave class (indicating a request is present)
    await expect(calendarCell).toHaveClass(/calendar-cell--leave/, {
      timeout: 5000,
    });

    console.log(
      "✅ Work request for single date created successfully and appears in calendar"
    );
  });

  test("should show existing requests in the calendar (past and future)", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);
    const testRequests = requestTestBase.getTestRequests(testRunId);

    // Verify we have the test requests created during setup
    expect(testRequests.length).toBe(2);

    // First request should be a future pending leave for worker 2
    const futureRequest = testRequests[0];
    expect(futureRequest.workerId).toBe(testWorkers[1].workerId);
    expect(futureRequest.requestType).toBe(RequestType.WORK_DEMAND);
    expect(futureRequest.status).toBe(RequestStatus.PENDING);

    // Second request should be a past approved leave for worker 1
    const pastRequest = testRequests[1];
    expect(pastRequest.workerId).toBe(testWorkers[0].workerId);
    expect(pastRequest.requestType).toBe(RequestType.WORK_DEMAND);
    expect(pastRequest.status).toBe(RequestStatus.APPROVED);

    // Navigate to calendar
    await requestTestBase.navigateToCalendarTab(page);

    // Verify past request is shown
    await requestTestBase.verifyCalendarCellHasRequest(
      page,
      testWorkers[0].workerId,
      pastRequest.startDate,
      pastRequest.id
    );

    // Verify future request is shown
    await requestTestBase.verifyCalendarCellHasRequest(
      page,
      testWorkers[1].workerId,
      futureRequest.startDate,
      futureRequest.id
    );

    console.log("✅ Existing requests (past and future) are shown in calendar");
  });

  test("should open edit request panel when clicking on existing request", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);
    const testRequests = requestTestBase.getTestRequests(testRunId);

    // Verify we have the test requests created during setup
    expect(testRequests.length).toBe(2);

    // Use the future pending request (first in the array)
    const futureRequest = testRequests[0];
    expect(futureRequest.workerId).toBe(testWorkers[1].workerId);
    expect(futureRequest.requestType).toBe(RequestType.WORK_DEMAND);
    expect(futureRequest.status).toBe(RequestStatus.PENDING);

    // Navigate to calendar
    await requestTestBase.navigateToCalendarTab(page);

    // Click on the existing request
    await requestTestBase.clickRequestCalendarCell(
      page,
      testWorkers[1].workerId,
      futureRequest.startDate,
      futureRequest.id
    );

    // Verify request panel opens in edit mode
    const requestPanel = requestTestBase.getRequestPanelPopover(page);
    await expect(requestPanel).toBeVisible();

    // Verify the form is populated with existing request data
    // Check that we're in edit mode by looking for action buttons
    const deleteButton = requestTestBase.getDeleteRequestButton(
      page,
      futureRequest.id
    );
    await expect(deleteButton).toBeVisible();

    console.log(
      "✅ Edit request panel opens when clicking on existing request"
    );
  });

  test("should delete request when clicking delete button in edit panel", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);
    const testRequests = requestTestBase.getTestRequests(testRunId);

    // Verify we have the test requests created during setup
    expect(testRequests.length).toBe(2);

    // Use the future pending request (first in the array)
    const futureRequest = testRequests[0];
    expect(futureRequest.workerId).toBe(testWorkers[1].workerId);
    expect(futureRequest.requestType).toBe(RequestType.WORK_DEMAND);
    expect(futureRequest.status).toBe(RequestStatus.PENDING);

    // Navigate to calendar
    await requestTestBase.navigateToCalendarTab(page);

    // Click on the existing request to edit
    await requestTestBase.clickRequestCalendarCell(
      page,
      testWorkers[1].workerId,
      futureRequest.startDate,
      futureRequest.id
    );

    // Verify request panel opens
    const requestPanel = requestTestBase.getRequestPanelPopover(page);
    await expect(requestPanel).toBeVisible();

    // Click delete button
    const deleteButton = requestTestBase.getDeleteRequestButton(
      page,
      futureRequest.id
    );
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Wait for panel to close
    await expect(requestPanel).not.toBeVisible();

    // Verify request is removed from calendar
    await requestTestBase.verifyCalendarCellIsEmpty(
      page,
      testWorkers[1].workerId,
      futureRequest.startDate
    );

    console.log("✅ Request deleted successfully from calendar");
  });

  test("should approve request when clicking checkmark button in edit panel", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);
    const testRequests = requestTestBase.getTestRequests(testRunId);

    // Verify we have the test requests created during setup
    expect(testRequests.length).toBe(2);

    // Use the future pending request (first in the array)
    const pendingRequest = testRequests[0];
    expect(pendingRequest.workerId).toBe(testWorkers[1].workerId);
    expect(pendingRequest.requestType).toBe(RequestType.WORK_DEMAND);
    expect(pendingRequest.status).toBe(RequestStatus.PENDING);

    // Navigate to calendar
    await requestTestBase.navigateToCalendarTab(page);

    // Click on the pending request to edit
    await requestTestBase.clickRequestCalendarCell(
      page,
      testWorkers[1].workerId,
      pendingRequest.startDate,
      pendingRequest.id
    );

    // Verify request panel opens
    const requestPanel = requestTestBase.getRequestPanelPopover(page);
    await expect(requestPanel).toBeVisible();

    // Click approve button (checkmark)
    const approveButton = requestTestBase.getApproveRequestButton(
      page,
      pendingRequest.id
    );
    await expect(approveButton).toBeVisible();
    await approveButton.click();

    // Verify the status chip in the panel shows "Approved"
    const statusChip = requestPanel.locator('[class*="MuiChip-filled"]');
    await expect(statusChip).toBeVisible();
    await expect(statusChip).toHaveText(/approved/i);

    // Close the panel
    const closeButton = page.getByTestId("close-request-dialog-button");
    await closeButton.click();
    await expect(requestPanel).not.toBeVisible();

    // Verify the request status changed in the calendar (color should change)
    await requestTestBase.verifyCalendarCellHasRequest(
      page,
      testWorkers[1].workerId,
      pendingRequest.startDate,
      pendingRequest.id,
      { status: RequestStatus.APPROVED }
    );

    console.log(
      "✅ Request approved successfully and status updated in calendar"
    );
  });

  test("should rescind approved request when clicking rescind button", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);
    const testRequests = requestTestBase.getTestRequests(testRunId);

    // Verify we have the test requests created during setup
    expect(testRequests.length).toBe(2);

    // Use the past approved request (second in the array)
    const approvedRequest = testRequests[1];
    expect(approvedRequest.workerId).toBe(testWorkers[0].workerId);
    expect(approvedRequest.requestType).toBe(RequestType.WORK_DEMAND);
    expect(approvedRequest.status).toBe(RequestStatus.APPROVED);

    // Navigate to calendar
    await requestTestBase.navigateToCalendarTab(page);

    // Click on the approved request to edit
    await requestTestBase.clickRequestCalendarCell(
      page,
      testWorkers[0].workerId,
      approvedRequest.startDate,
      approvedRequest.id
    );

    // Verify request panel opens
    const requestPanel = requestTestBase.getRequestPanelPopover(page);
    await expect(requestPanel).toBeVisible();

    // Click rescind button
    const rescindButton = requestTestBase.getRescindRequestButton(
      page,
      approvedRequest.id
    );
    await expect(rescindButton).toBeVisible();
    await rescindButton.click();

    // Wait for panel to close
    await expect(requestPanel).not.toBeVisible();

    // Verify the request status changed back to pending
    await requestTestBase.verifyCalendarCellHasRequest(
      page,
      testWorkers[0].workerId,
      approvedRequest.startDate,
      approvedRequest.id,
      { status: RequestStatus.PENDING }
    );

    console.log(
      "✅ Request rescinded successfully and status reverted to pending"
    );
  });

  test("should reject request when clicking close icon button in edit panel", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = requestTestBase.getTestWorkers(testRunId);
    const testRequests = requestTestBase.getTestRequests(testRunId);

    // Verify we have the test requests created during setup
    expect(testRequests.length).toBe(2);

    // Use the future pending request (first in the array)
    const pendingRequest = testRequests[0];
    expect(pendingRequest.workerId).toBe(testWorkers[1].workerId);
    expect(pendingRequest.requestType).toBe(RequestType.WORK_DEMAND);
    expect(pendingRequest.status).toBe(RequestStatus.PENDING);

    // Navigate to calendar
    await requestTestBase.navigateToCalendarTab(page);

    // Click on the pending request to edit
    await requestTestBase.clickRequestCalendarCell(
      page,
      testWorkers[1].workerId,
      pendingRequest.startDate,
      pendingRequest.id
    );

    // Verify request panel opens
    const requestPanel = requestTestBase.getRequestPanelPopover(page);
    await expect(requestPanel).toBeVisible();

    // Click reject button (close icon)
    const rejectButton = requestTestBase.getRejectRequestButton(
      page,
      pendingRequest.id
    );
    await expect(rejectButton).toBeVisible();
    await rejectButton.click();

    // Verify the status chip in the panel shows "Rejected"
    const statusChip = requestPanel.locator('[class*="MuiChip-filled"]');
    await expect(statusChip).toBeVisible();
    await expect(statusChip).toHaveText(/rejected/i);

    // Close the panel
    const closeButton = page.getByTestId("close-request-dialog-button");
    await closeButton.click();
    await expect(requestPanel).not.toBeVisible();

    // Verify the request status changed to denied/rejected
    await requestTestBase.verifyCalendarCellHasRequest(
      page,
      testWorkers[1].workerId,
      pendingRequest.startDate,
      pendingRequest.id,
      { status: RequestStatus.DENIED }
    );

    console.log(
      "✅ Request rejected successfully and status updated in calendar"
    );
  });
});
