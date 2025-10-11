/**
 * E2E tests for Request Calendar Period Navigation
 *
 * This test suite covers the period navigation functionality in the request calendar,
 * including week and month view navigation using the TimeNavigation component.
 */

import { test, expect } from "@playwright/test";
import { RequestTestBase } from "../../utils/request-test-base";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
import { randomUUID } from "crypto";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(utc);

test.describe("Request Calendar - Period Navigation", () => {
  // Store the request test base per test run
  const testBasesMap = new Map<string, RequestTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    // Ensure workerIndex has a safe fallback (0) so parallel/serial runs are stable
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    // Generate a unique ID for this specific test run
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(
      `[Test Run ${testRunId}] Starting request calendar period navigation test setup`
    );

    // Create a new RequestTestBase instance for this test run
    const requestTestBase = new RequestTestBase();
    testBasesMap.set(testRunId, requestTestBase);

    // Store the testRunId in test info for access in test body and cleanup
    (testInfo as any).testRunId = testRunId;

    // Setup the common request test environment
    // No need to create pre-existing requests for period navigation tests
    await requestTestBase.setupRequestTests(workerIndex, testRunId, false);

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
      console.warn(
        `[Test Run ${testRunId}] No requestTestBase found in afterEach`
      );
      return;
    }

    console.log(`[Test Run ${testRunId}] Cleaning up test data`);

    // Clean up: delete the workers and shifts created for THIS specific test run
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

  test("should navigate weeks in week view", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    const periodNav = requestTestBase.getPeriodNav(page);
    const today = dayjs.utc();
    const startOfWeek = today.startOf("isoWeek");
    const endOfWeek = today.endOf("isoWeek");

    // Explicitly select week view
    await periodNav.select.selectOption("week");

    // Set a known starting point by clicking "Today"
    await periodNav.todayButton.click();

    // Check that the view is the current week
    await expect(periodNav.label).toHaveText(today.format("MMMM YYYY"));
    await expect(
      requestTestBase.getDateHeader(page, startOfWeek.format("YYYY-MM-DD"))
    ).toBeVisible();
    await expect(
      requestTestBase.getDateHeader(page, endOfWeek.format("YYYY-MM-DD"))
    ).toBeVisible();

    // Navigate to the previous week
    await periodNav.previousButton.click();
    const prevWeekStart = startOfWeek.subtract(1, "week");
    const prevWeekEnd = endOfWeek.subtract(1, "week");
    await expect(
      requestTestBase.getDateHeader(page, prevWeekStart.format("YYYY-MM-DD"))
    ).toBeVisible();
    await expect(
      requestTestBase.getDateHeader(page, prevWeekEnd.format("YYYY-MM-DD"))
    ).toBeVisible();

    // Navigate to the next week (back to current)
    await periodNav.nextButton.click();
    await expect(
      requestTestBase.getDateHeader(page, startOfWeek.format("YYYY-MM-DD"))
    ).toBeVisible();
    await expect(
      requestTestBase.getDateHeader(page, endOfWeek.format("YYYY-MM-DD"))
    ).toBeVisible();

    // Navigate to next week, then click Today
    await periodNav.nextButton.click();
    const nextWeekStart = startOfWeek.add(1, "week");
    await expect(
      requestTestBase.getDateHeader(page, nextWeekStart.format("YYYY-MM-DD"))
    ).toBeVisible();

    await periodNav.todayButton.click();
    await expect(
      requestTestBase.getDateHeader(page, startOfWeek.format("YYYY-MM-DD"))
    ).toBeVisible();

    console.log("✅ Request calendar navigates weeks correctly in week view");
  });

  test("should navigate months in month view", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    const periodNav = requestTestBase.getPeriodNav(page);
    const today = dayjs.utc();
    const startOfMonth = today.startOf("month");
    const endOfMonth = today.endOf("month");

    // Switch to month view
    await periodNav.select.selectOption("month");

    // Set a known starting point by clicking "Today"
    await periodNav.todayButton.click();

    // Check that the view is the current month
    await expect(periodNav.label).toHaveText(today.format("MMMM YYYY"));
    await expect(
      requestTestBase.getDateHeader(page, startOfMonth.format("YYYY-MM-DD"))
    ).toBeVisible();
    await expect(
      requestTestBase.getDateHeader(page, endOfMonth.format("YYYY-MM-DD"))
    ).toBeVisible();

    // Navigate to the previous month
    await periodNav.previousButton.click();
    const prevMonthStart = startOfMonth.subtract(1, "month");
    const prevMonthEnd = prevMonthStart.endOf("month");
    await expect(periodNav.label).toHaveText(
      prevMonthStart.format("MMMM YYYY")
    );
    await expect(
      requestTestBase.getDateHeader(page, prevMonthStart.format("YYYY-MM-DD"))
    ).toBeVisible();
    await expect(
      requestTestBase.getDateHeader(page, prevMonthEnd.format("YYYY-MM-DD"))
    ).toBeVisible();

    // Navigate to the next month (back to current)
    await periodNav.nextButton.click();
    await expect(periodNav.label).toHaveText(today.format("MMMM YYYY"));
    await expect(
      requestTestBase.getDateHeader(page, startOfMonth.format("YYYY-MM-DD"))
    ).toBeVisible();

    // Navigate to next month, then click Today
    await periodNav.nextButton.click();
    const nextMonthStart = startOfMonth.add(1, "month");
    await expect(periodNav.label).toHaveText(
      nextMonthStart.format("MMMM YYYY")
    );

    await periodNav.todayButton.click();
    await expect(periodNav.label).toHaveText(today.format("MMMM YYYY"));
    await expect(
      requestTestBase.getDateHeader(page, startOfMonth.format("YYYY-MM-DD"))
    ).toBeVisible();

    console.log("✅ Request calendar navigates months correctly in month view");
  });

  test("should correctly switch between week and month views", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    const periodNav = requestTestBase.getPeriodNav(page);

    // 1. Switch from week to month
    const today = dayjs.utc();
    const startOfMonthTest = today.startOf("month");
    const startOfWeek = startOfMonthTest.startOf("isoWeek");
    const monthOfStartOfWeek = startOfWeek.startOf("month");

    console.log("Start of week:", startOfWeek.format("YYYY-MM-DD"));
    console.log(
      "Month of start of week:",
      monthOfStartOfWeek.format("YYYY-MM-DD")
    );

    // Explicitly select week view first
    await periodNav.select.selectOption("week");
    await expect(periodNav.select).toHaveValue("week");

    // Switch to month view
    await periodNav.select.selectOption("month");

    await expect(periodNav.select).toHaveValue("month");
    await expect(periodNav.label).toHaveText(
      monthOfStartOfWeek.format("MMMM YYYY")
    );
    await expect(
      requestTestBase.getDateHeader(
        page,
        monthOfStartOfWeek.format("YYYY-MM-DD")
      )
    ).toBeVisible();

    // 2. Switch from month to week
    const startOfMonth = monthOfStartOfWeek.add(1, "month").startOf("month");
    await periodNav.nextButton.click(); // Go to next month
    await expect(periodNav.label).toHaveText(startOfMonth.format("MMMM YYYY"));

    // Explicitly confirm we're in month view, then switch to week
    await expect(periodNav.select).toHaveValue("month");
    await periodNav.select.selectOption("week");
    const weekOfStartOfMonth = startOfMonth.startOf("isoWeek");
    const endOfWeekOfStartOfMonth = startOfMonth.endOf("isoWeek");

    await expect(periodNav.select).toHaveValue("week");
    // The label might span two months, so we check the dates are visible
    await expect(
      requestTestBase.getDateHeader(
        page,
        weekOfStartOfMonth.format("YYYY-MM-DD")
      )
    ).toBeVisible();
    await expect(
      requestTestBase.getDateHeader(
        page,
        endOfWeekOfStartOfMonth.format("YYYY-MM-DD")
      )
    ).toBeVisible();

    console.log(
      "✅ Request calendar switches between week and month views correctly"
    );
  });
});
