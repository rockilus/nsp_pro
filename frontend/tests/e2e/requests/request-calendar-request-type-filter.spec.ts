/**
 * E2E tests for Request Calendar Request Type Filtering
 *
 * This test suite covers the request type filtering functionality in the request calendar toolbar,
 * testing the ability to show/hide work demands and leave requests.
 */
import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
// Utils
import { RequestTestBase } from "../../utils/request-test-base";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(utc);

test.describe("Request Calendar - Request Type Filtering", () => {
  // Store the request test base per test run
  const testBasesMap = new Map<string, RequestTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    // Ensure workerIndex has a safe fallback (0) so parallel/serial runs are stable
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    // Generate a unique ID for this specific test run
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(
      `[Test Run ${testRunId}] Starting request calendar request type filter test setup`
    );

    // Create a new RequestTestBase instance for this test run
    const requestTestBase = new RequestTestBase();
    testBasesMap.set(testRunId, requestTestBase);

    // Store the testRunId in test info for access in test body and cleanup
    (testInfo as any).testRunId = testRunId;

    // Setup the common request test environment with requests
    // createRequests = true to create test work and leave requests
    await requestTestBase.setupRequestTests(workerIndex, testRunId, true);

    // Navigate to the requests page
    await requestTestBase.navigateToRequestsPage(page);

    // Navigate to calendar tab
    await requestTestBase.navigateToCalendarTab(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    console.log(`[Test Run ${testRunId}] Starting cleanup...`);

    if (!testRunId) {
      console.warn("No testRunId found in afterEach");
      return;
    }

    const requestTestBase = testBasesMap.get(testRunId);

    if (!requestTestBase) {
      console.warn(`No requestTestBase found for testRunId: ${testRunId}`);
      return;
    }

    console.log(`[Test Run ${testRunId}] Cleaning up test data`);

    // Clean up: delete the workers, shifts, and requests created for THIS specific test run
    try {
      await requestTestBase.cleanupTestData(testRunId);
    } catch (error) {
      console.error(
        `[Test Run ${testRunId}] Error during cleanup:`,
        error instanceof Error ? error.message : String(error)
      );
    }

    // Clean up the maps to prevent memory leaks
    testBasesMap.delete(testRunId);

    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test("should show work requests when work filter is selected", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get the test requests created during setup
    const testRequests = requestTestBase.getTestRequests(testRunId);
    console.log(`[Test Run ${testRunId}] Test requests:`, testRequests);

    // Count work requests
    const workRequestsCount = testRequests.filter(
      (r) => r.requestType === "work_demand"
    ).length;

    console.log(
      `[Test Run ${testRunId}] Expected work requests count: ${workRequestsCount}`
    );

    // Verify work filter button is selected (should be by default)
    const workFilterButton = requestTestBase.getWorkRequestFilterButton(page);
    await expect(workFilterButton).toHaveAttribute("aria-pressed", "true");

    // Verify work requests are visible in the calendar
    await requestTestBase.verifyWorkRequestsVisible(page, workRequestsCount);

    console.log("✅ Work requests are visible when work filter is selected");
  });

  test("should not show work requests when work filter is not selected", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get the test requests created during setup
    const testRequests = requestTestBase.getTestRequests(testRunId);
    console.log(`[Test Run ${testRunId}] Test requests:`, testRequests);

    // Count work requests
    const workRequestsCount = testRequests.filter(
      (r) => r.requestType === "work_demand"
    ).length;

    console.log(
      `[Test Run ${testRunId}] Expected work requests count: ${workRequestsCount}`
    );

    // Verify work requests are initially visible
    await requestTestBase.verifyWorkRequestsVisible(page, workRequestsCount);

    // Deselect work filter
    await requestTestBase.toggleWorkRequestFilter(page);

    // Verify work filter button is not selected
    const workFilterButton = requestTestBase.getWorkRequestFilterButton(page);
    await expect(workFilterButton).toHaveAttribute("aria-pressed", "false");

    // Verify work requests are not visible
    await requestTestBase.verifyWorkRequestsNotVisible(page);

    console.log(
      "✅ Work requests are not visible when work filter is not selected"
    );
  });

  test("should show leave requests when leave filter is selected", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get the test requests created during setup
    const testRequests = requestTestBase.getTestRequests(testRunId);
    console.log(`[Test Run ${testRunId}] Test requests:`, testRequests);

    // Count leave requests
    const leaveRequestsCount = testRequests.filter(
      (r) => r.requestType === "leave"
    ).length;

    console.log(
      `[Test Run ${testRunId}] Expected leave requests count: ${leaveRequestsCount}`
    );

    // Verify leave filter button is selected (should be by default)
    const leaveFilterButton = requestTestBase.getLeaveRequestFilterButton(page);
    await expect(leaveFilterButton).toHaveAttribute("aria-pressed", "true");

    // Verify leave requests are visible in the calendar
    // Only verify if there are leave requests (depends on whether leave shifts exist)
    if (leaveRequestsCount > 0) {
      await requestTestBase.verifyLeaveRequestsVisible(
        page,
        leaveRequestsCount
      );
      console.log(
        "✅ Leave requests are visible when leave filter is selected"
      );
    } else {
      console.log(
        "⚠️ No leave requests created (no leave shifts available), skipping visibility verification"
      );
    }
  });

  test("should not show leave requests when leave filter is not selected", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get the test requests created during setup
    const testRequests = requestTestBase.getTestRequests(testRunId);
    console.log(`[Test Run ${testRunId}] Test requests:`, testRequests);

    // Count leave requests
    const leaveRequestsCount = testRequests.filter(
      (r) => r.requestType === "leave"
    ).length;

    console.log(
      `[Test Run ${testRunId}] Expected leave requests count: ${leaveRequestsCount}`
    );

    // Only run this test if there are leave requests to hide
    if (leaveRequestsCount === 0) {
      console.log(
        "⚠️ No leave requests created (no leave shifts available), skipping test"
      );
      test.skip();
      return;
    }

    // Verify leave requests are initially visible
    await requestTestBase.verifyLeaveRequestsVisible(page, leaveRequestsCount);

    // Deselect leave filter
    await requestTestBase.toggleLeaveRequestFilter(page);

    // Verify leave filter button is not selected
    const leaveFilterButton = requestTestBase.getLeaveRequestFilterButton(page);
    await expect(leaveFilterButton).toHaveAttribute("aria-pressed", "false");

    // Verify leave requests are not visible
    await requestTestBase.verifyLeaveRequestsNotVisible(page);

    console.log(
      "✅ Leave requests are not visible when leave filter is not selected"
    );
  });

  test("should show only work requests when only work filter is selected", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get the test requests created during setup
    const testRequests = requestTestBase.getTestRequests(testRunId);

    // Count work and leave requests
    const workRequestsCount = testRequests.filter(
      (r) => r.requestType === "work_demand"
    ).length;
    const leaveRequestsCount = testRequests.filter(
      (r) => r.requestType === "leave"
    ).length;

    console.log(
      `[Test Run ${testRunId}] Work requests: ${workRequestsCount}, Leave requests: ${leaveRequestsCount}`
    );

    // Only run this test if there are leave requests to hide
    if (leaveRequestsCount === 0) {
      console.log(
        "⚠️ No leave requests created (no leave shifts available), skipping test"
      );
      test.skip();
      return;
    }

    // Deselect leave filter
    await requestTestBase.toggleLeaveRequestFilter(page);

    // Verify only work requests are visible
    await requestTestBase.verifyWorkRequestsVisible(page, workRequestsCount);
    await requestTestBase.verifyLeaveRequestsNotVisible(page);

    console.log(
      "✅ Only work requests are visible when only work filter is selected"
    );
  });

  test("should show only leave requests when only leave filter is selected", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get the test requests created during setup
    const testRequests = requestTestBase.getTestRequests(testRunId);

    // Count work and leave requests
    const workRequestsCount = testRequests.filter(
      (r) => r.requestType === "work_demand"
    ).length;
    const leaveRequestsCount = testRequests.filter(
      (r) => r.requestType === "leave"
    ).length;

    console.log(
      `[Test Run ${testRunId}] Work requests: ${workRequestsCount}, Leave requests: ${leaveRequestsCount}`
    );

    // Only run this test if there are leave requests to show
    if (leaveRequestsCount === 0) {
      console.log(
        "⚠️ No leave requests created (no leave shifts available), skipping test"
      );
      test.skip();
      return;
    }

    // Deselect work filter
    await requestTestBase.toggleWorkRequestFilter(page);

    // Verify only leave requests are visible
    await requestTestBase.verifyLeaveRequestsVisible(page, leaveRequestsCount);
    await requestTestBase.verifyWorkRequestsNotVisible(page);

    console.log(
      "✅ Only leave requests are visible when only leave filter is selected"
    );
  });
});
