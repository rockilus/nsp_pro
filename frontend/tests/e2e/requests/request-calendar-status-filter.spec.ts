/**
 * E2E tests for Request Calendar Status Filtering
 *
 * This test suite covers the status filtering functionality in the request calendar toolbar,
 * testing the ability to show/hide pending, approved, and denied requests.
 */
import { test, expect, Page } from "@playwright/test";
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

test.describe("Request Calendar - Status Filtering", () => {
  // Store the request test base per test run
  const testBasesMap = new Map<string, RequestTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    // Ensure workerIndex has a safe fallback (0) so parallel/serial runs are stable
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    // Generate a unique ID for this specific test run
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(
      `[Test Run ${testRunId}] Starting request calendar status filter test setup`
    );

    // Create a new RequestTestBase instance for this test run
    const requestTestBase = new RequestTestBase();
    testBasesMap.set(testRunId, requestTestBase);

    // Store the testRunId in test info for access in test body and cleanup
    (testInfo as any).testRunId = testRunId;

    // Setup the common request test environment with requests
    // createRequests = true to create test pending, approved, and denied requests
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

  test("should show pending requests when pending filter is selected", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get the test requests created during setup
    const testRequests = requestTestBase.getTestRequests(testRunId);
    console.log(`[Test Run ${testRunId}] Test requests:`, testRequests);

    // Count pending requests
    const pendingRequestsCount = testRequests.filter(
      (r) => r.status === "pending"
    ).length;

    console.log(
      `[Test Run ${testRunId}] Expected pending requests count: ${pendingRequestsCount}`
    );

    // Verify pending filter button is selected (should be by default)
    const pendingFilterButton =
      requestTestBase.getPendingStatusFilterButton(page);
    await expect(pendingFilterButton).toHaveAttribute("aria-pressed", "true");

    // Verify pending requests are visible in the calendar
    await requestTestBase.verifyPendingRequestsVisible(
      page,
      pendingRequestsCount
    );

    console.log(
      "✅ Pending requests are visible when pending filter is selected"
    );
  });

  test("should not show pending requests when pending filter is not selected", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get the test requests created during setup
    const testRequests = requestTestBase.getTestRequests(testRunId);
    console.log(`[Test Run ${testRunId}] Test requests:`, testRequests);

    // Count pending requests
    const pendingRequestsCount = testRequests.filter(
      (r) => r.status === "pending"
    ).length;

    console.log(
      `[Test Run ${testRunId}] Expected pending requests count: ${pendingRequestsCount}`
    );

    // Verify pending requests are initially visible
    await requestTestBase.verifyPendingRequestsVisible(
      page,
      pendingRequestsCount
    );

    // Deselect pending filter
    await requestTestBase.togglePendingStatusFilter(page);

    // Verify pending filter button is not selected
    const pendingFilterButton =
      requestTestBase.getPendingStatusFilterButton(page);
    await expect(pendingFilterButton).toHaveAttribute("aria-pressed", "false");

    // Verify pending requests are not visible
    await requestTestBase.verifyPendingRequestsNotVisible(page);

    console.log(
      "✅ Pending requests are not visible when pending filter is not selected"
    );
  });

  test("should show approved requests when approved filter is selected", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get the test requests created during setup
    const testRequests = requestTestBase.getTestRequests(testRunId);
    console.log(`[Test Run ${testRunId}] Test requests:`, testRequests);

    // Count approved requests
    const approvedRequestsCount = testRequests.filter(
      (r) => r.status === "approved"
    ).length;

    console.log(
      `[Test Run ${testRunId}] Expected approved requests count: ${approvedRequestsCount}`
    );

    // Verify accepted filter button is selected (should be by default)
    const acceptedFilterButton =
      requestTestBase.getAcceptedStatusFilterButton(page);
    await expect(acceptedFilterButton).toHaveAttribute("aria-pressed", "true");

    // Verify approved requests are visible in the calendar
    await requestTestBase.verifyApprovedRequestsVisible(
      page,
      approvedRequestsCount
    );

    console.log(
      "✅ Approved requests are visible when approved filter is selected"
    );
  });

  test("should not show approved requests when approved filter is not selected", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get the test requests created during setup
    const testRequests = requestTestBase.getTestRequests(testRunId);
    console.log(`[Test Run ${testRunId}] Test requests:`, testRequests);

    // Count approved requests
    const approvedRequestsCount = testRequests.filter(
      (r) => r.status === "approved"
    ).length;

    console.log(
      `[Test Run ${testRunId}] Expected approved requests count: ${approvedRequestsCount}`
    );

    // Verify approved requests are initially visible
    await requestTestBase.verifyApprovedRequestsVisible(
      page,
      approvedRequestsCount
    );

    // Deselect approved filter
    await requestTestBase.toggleAcceptedStatusFilter(page);

    // Verify accepted filter button is not selected
    const acceptedFilterButton =
      requestTestBase.getAcceptedStatusFilterButton(page);
    await expect(acceptedFilterButton).toHaveAttribute("aria-pressed", "false");

    // Verify approved requests are not visible
    await requestTestBase.verifyApprovedRequestsNotVisible(page);

    console.log(
      "✅ Approved requests are not visible when approved filter is not selected"
    );
  });

  test("should show denied requests when denied filter is selected", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get the test requests created during setup
    const testRequests = requestTestBase.getTestRequests(testRunId);
    console.log(`[Test Run ${testRunId}] Test requests:`, testRequests);

    // Count denied requests
    const deniedRequestsCount = testRequests.filter(
      (r) => r.status === "denied"
    ).length;

    console.log(
      `[Test Run ${testRunId}] Expected denied requests count: ${deniedRequestsCount}`
    );

    // Verify denied filter button is selected (should be by default)
    const deniedFilterButton =
      requestTestBase.getDeniedStatusFilterButton(page);
    await expect(deniedFilterButton).toHaveAttribute("aria-pressed", "true");

    // Verify denied requests are visible in the calendar
    await requestTestBase.verifyDeniedRequestsVisible(
      page,
      deniedRequestsCount
    );

    console.log(
      "✅ Denied requests are visible when denied filter is selected"
    );
  });

  test("should not show denied requests when denied filter is not selected", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get the test requests created during setup
    const testRequests = requestTestBase.getTestRequests(testRunId);
    console.log(`[Test Run ${testRunId}] Test requests:`, testRequests);

    // Count denied requests
    const deniedRequestsCount = testRequests.filter(
      (r) => r.status === "denied"
    ).length;

    console.log(
      `[Test Run ${testRunId}] Expected denied requests count: ${deniedRequestsCount}`
    );

    // Verify denied requests are initially visible
    await requestTestBase.verifyDeniedRequestsVisible(
      page,
      deniedRequestsCount
    );

    // Deselect denied filter
    await requestTestBase.toggleDeniedStatusFilter(page);

    // Verify denied filter button is not selected
    const deniedFilterButton =
      requestTestBase.getDeniedStatusFilterButton(page);
    await expect(deniedFilterButton).toHaveAttribute("aria-pressed", "false");

    // Verify denied requests are not visible
    await requestTestBase.verifyDeniedRequestsNotVisible(page);

    console.log(
      "✅ Denied requests are not visible when denied filter is not selected"
    );
  });
});
