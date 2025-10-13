/**
 * E2E tests for Request Calendar Filtering
 *
 * This test suite covers the comprehensive filtering functionality in the request calendar,
 * testing filters for shift, date, type, status, fulfillment, worker sorting/filtering, and reset functionality.
 *
 * Uses the new table state filter implementation with localStorage persistence.
 */
import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
// Utils
import { RequestTestBase } from "../../utils/request-test-base";
// Types
import {
  RequestT,
  RequestType,
  RequestStatus,
  FulfillmentStatus,
} from "../../../src/types/request";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(utc);

test.describe("Request Calendar - Comprehensive Filtering", () => {
  // Store the request test base per test run
  const testBasesMap = new Map<string, RequestTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    // Ensure workerIndex has a safe fallback (0) so parallel/serial runs are stable
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    // Generate a unique ID for this specific test run
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(
      `[Test Run ${testRunId}] Starting request calendar filtering test setup`
    );

    // Create a new RequestTestBase instance for this test run
    const requestTestBase = new RequestTestBase();
    testBasesMap.set(testRunId, requestTestBase);

    // Store the testRunId in test info for access in test body and cleanup
    (testInfo as any).testRunId = testRunId;

    // Setup the common request test environment with requests
    // createRequests = true to create test requests via API
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

  test("should filter requests by shift", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get test data
    const testRequests = requestTestBase.getTestRequests(testRunId);
    const testShifts = requestTestBase.getTestShifts(testRunId);

    console.log(`[Test Run ${testRunId}] Test requests:`, testRequests.length);
    console.log(`[Test Run ${testRunId}] Test shifts:`, testShifts.length);

    // Map requests by shift
    // A request is associated with a shift if:
    // - It's a leave request with shiftId matching the shift
    // - It's a work request with shiftOptions containing the shift ID
    // - The shift ID is in shiftTargetIds
    const requestsByShift = new Map<string, RequestT[]>();

    for (const request of testRequests) {
      const associatedShiftIds = new Set<string>();

      // Check shiftId (leave requests)
      if (request.shiftId) {
        associatedShiftIds.add(request.shiftId);
      }

      // Check shiftOptions (work requests)
      if (request.shiftOptions) {
        for (const option of request.shiftOptions) {
          if (option.id) {
            associatedShiftIds.add(option.id);
          }
        }
      }

      // Check shiftTargetIds
      if (request.shiftTargetIds) {
        for (const id of request.shiftTargetIds) {
          associatedShiftIds.add(id);
        }
      }

      // Add request to each associated shift's list
      for (const shiftId of associatedShiftIds) {
        if (!requestsByShift.has(shiftId)) {
          requestsByShift.set(shiftId, []);
        }
        requestsByShift.get(shiftId)!.push(request);
      }
    }

    // Log the mapping
    for (const [shiftId, requests] of requestsByShift.entries()) {
      const shift = testShifts.find((s) => s.id === shiftId);
      console.log(
        `[Test Run ${testRunId}] Shift "${shift?.name || shiftId}": ${
          requests.length
        } requests`
      );
    }

    // Get count of requests before filtering
    const initialCount = await requestTestBase.countVisibleRequests(page);
    console.log(
      `[Test Run ${testRunId}] Initial visible requests: ${initialCount}`
    );

    // Select a target shift (the first shift) to filter
    const targetShift = testShifts[0];
    const targetShiftRequests = requestsByShift.get(targetShift.id) || [];
    const otherShiftRequests = testRequests.filter(
      (r) => !targetShiftRequests.includes(r)
    );

    console.log(
      `[Test Run ${testRunId}] Target shift "${targetShift.name}": ${targetShiftRequests.length} requests`
    );
    console.log(
      `[Test Run ${testRunId}] Other shifts: ${otherShiftRequests.length} requests`
    );

    // Apply filter for the target shift
    await requestTestBase.applySelectFilter(page, "shift", [targetShift.id]);

    // Verify filter chip is visible
    await requestTestBase.verifyFilterChipVisible(page, "shift");

    // Count requests after filtering by checking for target request IDs
    const targetRequestIds = targetShiftRequests.map((r) => r.id);
    let visibleTargetRequestCount = 0;
    for (const requestId of targetRequestIds) {
      const requestCell = page.locator(`[data-testid*="request-${requestId}"]`);
      const isVisible = await requestCell.isVisible();
      if (isVisible) {
        visibleTargetRequestCount++;
      }
    }
    console.log(
      `[Test Run ${testRunId}] Filtered visible requests: ${visibleTargetRequestCount} of ${targetRequestIds.length} target requests`
    );

    // Verify the filtered count matches target shift requests
    expect(visibleTargetRequestCount).toBe(targetShiftRequests.length);

    // Verify target shift requests are visible
    for (const request of targetShiftRequests) {
      const requestCell = page.locator(
        `[data-testid*="request-${request.id}"]`
      );
      await expect(requestCell).toBeVisible();
    }
    console.log(
      `[Test Run ${testRunId}] ✓ All ${targetShiftRequests.length} requests for target shift are visible`
    );

    // Verify other shift requests are NOT visible
    for (const request of otherShiftRequests) {
      const requestCell = page.locator(
        `[data-testid*="request-${request.id}"]`
      );
      await expect(requestCell).not.toBeVisible();
    }
    console.log(
      `[Test Run ${testRunId}] ✓ All ${otherShiftRequests.length} requests for other shifts are hidden`
    );

    console.log(
      `✅ Successfully filtered requests by shift: ${targetShift.name}`
    );
  });

  test("should filter requests by date range", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get test data
    const testRequests = requestTestBase.getTestRequests(testRunId);
    console.log(`[Test Run ${testRunId}] Test requests:`, testRequests.length);

    // Get count of requests before filtering
    const initialCount = await requestTestBase.countVisibleRequests(page);
    console.log(
      `[Test Run ${testRunId}] Initial visible requests: ${initialCount}`
    );

    // Apply date filter for future requests (today to 10 days from now)
    const startDate = dayjs().utc().format("YYYY-MM-DD");
    const endDate = dayjs().utc().add(10, "days").format("YYYY-MM-DD");

    await requestTestBase.applyDateFilter(page, "date", startDate, endDate);

    // Verify filter chip is visible
    await requestTestBase.verifyFilterChipVisible(page, "date");

    // Count requests after filtering
    const filteredCount = await requestTestBase.countVisibleRequests(page);
    console.log(
      `[Test Run ${testRunId}] Filtered visible requests: ${filteredCount}`
    );

    // The filtered count should exclude past requests
    const futureRequests = testRequests.filter(
      (r) =>
        !r.startDate.isBefore(dayjs().utc(), "day") &&
        !r.startDate.isAfter(dayjs().utc().add(10, "days"), "day")
    );
    expect(filteredCount).toBe(futureRequests.length);

    console.log(
      `✅ Successfully filtered requests by date range: ${startDate} to ${endDate}`
    );
  });

  test("should filter requests by type (work demand)", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get test data
    const testRequests = requestTestBase.getTestRequests(testRunId);
    const workRequests = testRequests.filter(
      (r) => r.requestType === RequestType.WORK_DEMAND
    );
    const leaveRequests = testRequests.filter(
      (r) => r.requestType === RequestType.LEAVE
    );

    console.log(
      `[Test Run ${testRunId}] Work requests: ${workRequests.length}, Leave requests: ${leaveRequests.length}`
    );

    // Apply filter for work demand requests
    await requestTestBase.applySelectFilter(page, "requestType", [
      RequestType.WORK_DEMAND,
    ]);

    // Verify filter chip is visible
    await requestTestBase.verifyFilterChipVisible(page, "requestType");

    // Verify only work requests are visible
    const filteredCount = await requestTestBase.countVisibleRequests(page);
    expect(filteredCount).toBe(workRequests.length);

    console.log(`✅ Successfully filtered requests by type: Work Demand`);
  });

  test("should filter requests by type (leave)", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get test data
    const testRequests = requestTestBase.getTestRequests(testRunId);
    const leaveRequests = testRequests.filter(
      (r) => r.requestType === RequestType.LEAVE
    );

    console.log(
      `[Test Run ${testRunId}] Leave requests: ${leaveRequests.length}`
    );

    // Skip if no leave requests
    if (leaveRequests.length === 0) {
      console.log("⚠️ No leave requests available, skipping test");
      test.skip();
      return;
    }

    // Apply filter for leave requests
    await requestTestBase.applySelectFilter(page, "requestType", [
      RequestType.LEAVE,
    ]);

    // Verify filter chip is visible
    await requestTestBase.verifyFilterChipVisible(page, "requestType");

    // Verify only leave requests are visible
    const filteredCount = await requestTestBase.countVisibleRequests(page);
    expect(filteredCount).toBe(leaveRequests.length);

    console.log(`✅ Successfully filtered requests by type: Leave`);
  });

  test("should filter requests by status (pending)", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get test data
    const testRequests = requestTestBase.getTestRequests(testRunId);
    const pendingRequests = testRequests.filter(
      (r) => r.status === RequestStatus.PENDING
    );

    console.log(
      `[Test Run ${testRunId}] Pending requests: ${pendingRequests.length}`
    );

    // Apply filter for pending requests
    await requestTestBase.applySelectFilter(page, "status", [
      RequestStatus.PENDING,
    ]);

    // Verify filter chip is visible
    await requestTestBase.verifyFilterChipVisible(page, "status");

    // Verify only pending requests are visible
    const filteredCount = await requestTestBase.countVisibleRequests(page);
    expect(filteredCount).toBe(pendingRequests.length);

    console.log(`✅ Successfully filtered requests by status: Pending`);
  });

  test("should filter requests by status (approved)", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get test data
    const testRequests = requestTestBase.getTestRequests(testRunId);
    const approvedRequests = testRequests.filter(
      (r) => r.status === RequestStatus.APPROVED
    );

    console.log(
      `[Test Run ${testRunId}] Approved requests: ${approvedRequests.length}`
    );

    // Apply filter for approved requests
    await requestTestBase.applySelectFilter(page, "status", [
      RequestStatus.APPROVED,
    ]);

    // Verify filter chip is visible
    await requestTestBase.verifyFilterChipVisible(page, "status");

    // Verify only approved requests are visible
    const filteredCount = await requestTestBase.countVisibleRequests(page);
    expect(filteredCount).toBe(approvedRequests.length);

    console.log(`✅ Successfully filtered requests by status: Approved`);
  });

  test("should filter requests by status (denied)", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get test data
    const testRequests = requestTestBase.getTestRequests(testRunId);
    const deniedRequests = testRequests.filter(
      (r) => r.status === RequestStatus.DENIED
    );

    console.log(
      `[Test Run ${testRunId}] Denied requests: ${deniedRequests.length}`
    );

    // Apply filter for denied requests
    await requestTestBase.applySelectFilter(page, "status", [
      RequestStatus.DENIED,
    ]);

    // Verify filter chip is visible
    await requestTestBase.verifyFilterChipVisible(page, "status");

    // Verify only denied requests are visible
    const filteredCount = await requestTestBase.countVisibleRequests(page);
    expect(filteredCount).toBe(deniedRequests.length);

    console.log(`✅ Successfully filtered requests by status: Denied`);
  });

  test("should filter requests by fulfillment status", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get test data
    const testRequests = requestTestBase.getTestRequests(testRunId);
    const notProcessedRequests = testRequests.filter(
      (r) => r.fulfillment === FulfillmentStatus.NOT_PROCESSED
    );

    console.log(
      `[Test Run ${testRunId}] Not processed requests: ${notProcessedRequests.length}`
    );

    // Apply filter for not processed requests
    await requestTestBase.applySelectFilter(page, "fulfillment", [
      FulfillmentStatus.NOT_PROCESSED,
    ]);

    // Verify filter chip is visible
    await requestTestBase.verifyFilterChipVisible(page, "fulfillment");

    // Verify only not processed requests are visible
    const filteredCount = await requestTestBase.countVisibleRequests(page);
    expect(filteredCount).toBe(notProcessedRequests.length);

    console.log(
      `✅ Successfully filtered requests by fulfillment: Not Processed`
    );
  });

  test("should filter requests by worker", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get test data
    const testRequests = requestTestBase.getTestRequests(testRunId);
    const testWorkers = requestTestBase.getTestWorkers(testRunId);

    console.log(`[Test Run ${testRunId}] Test workers:`, testWorkers.length);

    // Get requests for first worker
    const firstWorker = testWorkers[0];
    const firstWorkerRequests = testRequests.filter(
      (r) => r.workerId === firstWorker.workerId
    );

    console.log(
      `[Test Run ${testRunId}] Requests for ${firstWorker.name}: ${firstWorkerRequests.length}`
    );

    // Apply worker filter
    await requestTestBase.applyWorkerFilter(page, [firstWorker.workerId]);

    // Verify filter chip is visible
    await requestTestBase.verifyFilterChipVisible(page, "workerId");

    // Verify only the first worker's requests are visible
    const filteredCount = await requestTestBase.countVisibleRequests(page);
    expect(filteredCount).toBe(firstWorkerRequests.length);

    console.log(
      `✅ Successfully filtered requests by worker: ${firstWorker.name}`
    );
  });

  test("should sort workers in ascending order", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Apply ascending sort
    await requestTestBase.sortByWorker(page, "asc");

    // Verify sort chip is visible
    await requestTestBase.verifySortChipVisible(page);

    // Verify sort chip label contains ascending indicator
    const sortChip = page.getByTestId("sort-chip");
    const chipText = await sortChip.textContent();
    expect(chipText).toContain("↑");

    console.log(`✅ Successfully sorted workers in ascending order`);
  });

  test("should sort workers in descending order", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Apply descending sort
    await requestTestBase.sortByWorker(page, "desc");

    // Verify sort chip is visible
    await requestTestBase.verifySortChipVisible(page);

    // Verify sort chip label contains descending indicator
    const sortChip = page.getByTestId("sort-chip");
    const chipText = await sortChip.textContent();
    expect(chipText).toContain("↓");

    console.log(`✅ Successfully sorted workers in descending order`);
  });

  test("should apply multiple filters simultaneously", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get test data
    const testRequests = requestTestBase.getTestRequests(testRunId);
    const testWorkers = requestTestBase.getTestWorkers(testRunId);

    console.log(
      `[Test Run ${testRunId}] Total requests: ${testRequests.length}`
    );

    // Apply multiple filters: worker, type, and status
    const firstWorker = testWorkers[0];
    await requestTestBase.applyWorkerFilter(page, [firstWorker.workerId]);
    await requestTestBase.applySelectFilter(page, "requestType", [
      RequestType.WORK_DEMAND,
    ]);
    await requestTestBase.applySelectFilter(page, "status", [
      RequestStatus.PENDING,
    ]);

    // Verify all filter chips are visible
    await requestTestBase.verifyFilterChipVisible(page, "workerId");
    await requestTestBase.verifyFilterChipVisible(page, "requestType");
    await requestTestBase.verifyFilterChipVisible(page, "status");

    // Count filtered requests
    const expectedRequests = testRequests.filter(
      (r) =>
        r.workerId === firstWorker.workerId &&
        r.requestType === RequestType.WORK_DEMAND &&
        r.status === RequestStatus.PENDING
    );

    const filteredCount = await requestTestBase.countVisibleRequests(page);
    expect(filteredCount).toBe(expectedRequests.length);

    console.log(
      `✅ Successfully applied multiple filters: ${filteredCount} requests match all criteria`
    );
  });

  test("should reset all filters and sorting", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get initial count
    const initialCount = await requestTestBase.countVisibleRequests(page);
    console.log(
      `[Test Run ${testRunId}] Initial visible requests: ${initialCount}`
    );

    // Apply some filters and sorting
    await requestTestBase.sortByWorker(page, "asc");
    await requestTestBase.applySelectFilter(page, "requestType", [
      RequestType.WORK_DEMAND,
    ]);

    // Verify filters are applied
    await requestTestBase.verifySortChipVisible(page);
    await requestTestBase.verifyFilterChipVisible(page, "requestType");

    // Count after filtering
    const filteredCount = await requestTestBase.countVisibleRequests(page);
    console.log(
      `[Test Run ${testRunId}] Filtered visible requests: ${filteredCount}`
    );

    // Reset all filters
    await requestTestBase.resetAllFilters(page);

    // Verify filter bar is not visible
    await requestTestBase.verifyNoActiveFilters(page);

    // Verify all requests are visible again
    const finalCount = await requestTestBase.countVisibleRequests(page);
    expect(finalCount).toBe(initialCount);

    console.log(`✅ Successfully reset all filters and sorting`);
  });

  test("should remove individual filters", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Get test data
    const testRequests = requestTestBase.getTestRequests(testRunId);

    // Apply two filters
    await requestTestBase.applySelectFilter(page, "requestType", [
      RequestType.WORK_DEMAND,
    ]);
    await requestTestBase.applySelectFilter(page, "status", [
      RequestStatus.PENDING,
    ]);

    // Verify both filters are applied
    await requestTestBase.verifyFilterChipVisible(page, "requestType");
    await requestTestBase.verifyFilterChipVisible(page, "status");

    // Count with both filters
    const bothFiltersCount = await requestTestBase.countVisibleRequests(page);
    console.log(
      `[Test Run ${testRunId}] With both filters: ${bothFiltersCount} requests`
    );

    // Remove requestType filter
    await requestTestBase.removeFilter(page, "requestType");

    // Verify requestType filter is removed but status filter remains
    await expect(page.getByTestId("filter-chip-requestType")).not.toBeVisible();
    await requestTestBase.verifyFilterChipVisible(page, "status");

    // Count with only status filter
    const oneFilterCount = await requestTestBase.countVisibleRequests(page);
    console.log(
      `[Test Run ${testRunId}] With status filter only: ${oneFilterCount} requests`
    );

    // Verify count increased (removed one filter)
    expect(oneFilterCount).toBeGreaterThan(bothFiltersCount);

    // Verify count matches pending requests
    const pendingRequests = testRequests.filter(
      (r) => r.status === RequestStatus.PENDING
    );
    expect(oneFilterCount).toBe(pendingRequests.length);

    console.log(`✅ Successfully removed individual filter`);
  });

  test("should persist filters across page reload", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    // Apply a filter
    await requestTestBase.applySelectFilter(page, "requestType", [
      RequestType.WORK_DEMAND,
    ]);

    // Verify filter is applied
    await requestTestBase.verifyFilterChipVisible(page, "requestType");

    // Get filtered count before reload
    const countBeforeReload = await requestTestBase.countVisibleRequests(page);
    console.log(
      `[Test Run ${testRunId}] Requests before reload: ${countBeforeReload}`
    );

    // Reload the page
    await page.reload();

    // Wait for calendar to be visible again
    await expect(page.getByTestId("request-calendar")).toBeVisible();

    // Verify filter is still applied after reload
    await requestTestBase.verifyFilterChipVisible(page, "requestType");

    // Verify count is the same
    const countAfterReload = await requestTestBase.countVisibleRequests(page);
    expect(countAfterReload).toBe(countBeforeReload);

    console.log(`✅ Successfully persisted filter across page reload`);
  });
});
