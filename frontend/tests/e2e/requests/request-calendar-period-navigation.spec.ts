/**
 * E2E tests for Request Calendar Period Navigation
 *
 * This test suite covers the period navigation functionality in the request calendar,
 * including week and month view navigation using the TimeNavigation component.
 */

import { test, expect } from '@playwright/test';
import { RequestTestBase } from '../../utils/request-test-base';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import isBetween from 'dayjs/plugin/isBetween';
import utc from 'dayjs/plugin/utc';
import { randomUUID } from 'crypto';

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(utc);

test.describe('Request Calendar - Period Navigation', () => {
  // Store the request test base per test run
  const testBasesMap = new Map<string, RequestTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    // Ensure workerIndex has a safe fallback (0) so parallel/serial runs are stable
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

    // Generate a unique ID for this specific test run
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting request calendar period navigation test setup`);

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
      console.warn('No testRunId found in afterEach');
      return;
    }

    const requestTestBase = testBasesMap.get(testRunId);

    if (!requestTestBase) {
      console.warn(`[Test Run ${testRunId}] No requestTestBase found in afterEach`);
      return;
    }

    console.log(`[Test Run ${testRunId}] Cleaning up test data`);

    // Clean up: delete the workers and shifts created for THIS specific test run
    try {
      await requestTestBase.cleanupTestData(testRunId);
    } catch (error) {
      console.error(
        `[Test Run ${testRunId}] Error during cleanup:`,
        error instanceof Error ? error.message : String(error),
      );
    }

    // Clean up the maps to prevent memory leaks
    testBasesMap.delete(testRunId);

    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test('should navigate weeks in week view', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    const periodNav = requestTestBase.getPeriodNav(page);
    const today = dayjs.utc();
    const startOfWeek = today.startOf('isoWeek');
    const endOfWeek = today.endOf('isoWeek');

    // Navigate to current week using helper method
    await requestTestBase.navigateToPeriod(page, today, 'week');

    // Verify we're in week view
    await expect(periodNav.select).toHaveValue('week');

    // Check that the view is the current week using formatPeriodLabel
    const expectedLabel = requestTestBase.formatPeriodLabel(startOfWeek, endOfWeek, 'week');
    await expect(periodNav.label).toHaveText(expectedLabel);
    await expect(
      requestTestBase.getDateHeader(page, startOfWeek.format('YYYY-MM-DD')),
    ).toBeVisible();
    await expect(requestTestBase.getDateHeader(page, endOfWeek.format('YYYY-MM-DD'))).toBeVisible();

    // Navigate to the previous week
    const prevWeekDate = startOfWeek.subtract(1, 'week');
    const prevWeekStart = prevWeekDate.startOf('isoWeek');
    const prevWeekEnd = prevWeekDate.endOf('isoWeek');
    await requestTestBase.navigateToPeriod(page, prevWeekDate, 'week');

    const prevWeekLabel = requestTestBase.formatPeriodLabel(prevWeekStart, prevWeekEnd, 'week');
    await expect(periodNav.label).toHaveText(prevWeekLabel);
    await expect(
      requestTestBase.getDateHeader(page, prevWeekStart.format('YYYY-MM-DD')),
    ).toBeVisible();
    await expect(
      requestTestBase.getDateHeader(page, prevWeekEnd.format('YYYY-MM-DD')),
    ).toBeVisible();

    // Navigate to the next week (back to current)
    await requestTestBase.navigateToPeriod(page, today, 'week');
    await expect(periodNav.label).toHaveText(expectedLabel);
    await expect(
      requestTestBase.getDateHeader(page, startOfWeek.format('YYYY-MM-DD')),
    ).toBeVisible();
    await expect(requestTestBase.getDateHeader(page, endOfWeek.format('YYYY-MM-DD'))).toBeVisible();

    // Navigate to next week
    const nextWeekDate = startOfWeek.add(1, 'week');
    const nextWeekStart = nextWeekDate.startOf('isoWeek');
    const nextWeekEnd = nextWeekDate.endOf('isoWeek');
    await requestTestBase.navigateToPeriod(page, nextWeekDate, 'week');

    const nextWeekLabel = requestTestBase.formatPeriodLabel(nextWeekStart, nextWeekEnd, 'week');
    await expect(periodNav.label).toHaveText(nextWeekLabel);
    await expect(
      requestTestBase.getDateHeader(page, nextWeekStart.format('YYYY-MM-DD')),
    ).toBeVisible();

    // Click Today button and verify it returns to current week
    await periodNav.todayButton.click();
    await expect(periodNav.label).toHaveText(expectedLabel);
    await expect(
      requestTestBase.getDateHeader(page, startOfWeek.format('YYYY-MM-DD')),
    ).toBeVisible();

    console.log('✅ Request calendar navigates weeks correctly in week view');
  });

  test('should navigate months in month view', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    const periodNav = requestTestBase.getPeriodNav(page);
    const today = dayjs.utc();
    const startOfMonth = today.startOf('month');
    const endOfMonth = today.endOf('month');

    // Navigate to current month using helper method
    await requestTestBase.navigateToPeriod(page, today, 'month');

    // Verify we're in month view
    await expect(periodNav.select).toHaveValue('month');

    // Check that the view is the current month using formatPeriodLabel
    const expectedLabel = requestTestBase.formatPeriodLabel(startOfMonth, endOfMonth, 'month');
    await expect(periodNav.label).toHaveText(expectedLabel);
    await expect(
      requestTestBase.getDateHeader(page, startOfMonth.format('YYYY-MM-DD')),
    ).toBeVisible();
    await expect(
      requestTestBase.getDateHeader(page, endOfMonth.format('YYYY-MM-DD')),
    ).toBeVisible();

    // Navigate to the previous month
    const prevMonthDate = startOfMonth.subtract(1, 'month');
    const prevMonthStart = prevMonthDate.startOf('month');
    const prevMonthEnd = prevMonthDate.endOf('month');
    await requestTestBase.navigateToPeriod(page, prevMonthDate, 'month');

    const prevMonthLabel = requestTestBase.formatPeriodLabel(prevMonthStart, prevMonthEnd, 'month');
    await expect(periodNav.label).toHaveText(prevMonthLabel);
    await expect(
      requestTestBase.getDateHeader(page, prevMonthStart.format('YYYY-MM-DD')),
    ).toBeVisible();
    await expect(
      requestTestBase.getDateHeader(page, prevMonthEnd.format('YYYY-MM-DD')),
    ).toBeVisible();

    // Navigate to the next month (back to current)
    await requestTestBase.navigateToPeriod(page, today, 'month');
    await expect(periodNav.label).toHaveText(expectedLabel);
    await expect(
      requestTestBase.getDateHeader(page, startOfMonth.format('YYYY-MM-DD')),
    ).toBeVisible();

    // Navigate to next month
    const nextMonthDate = startOfMonth.add(1, 'month');
    const nextMonthStart = nextMonthDate.startOf('month');
    const nextMonthEnd = nextMonthDate.endOf('month');
    await requestTestBase.navigateToPeriod(page, nextMonthDate, 'month');

    const nextMonthLabel = requestTestBase.formatPeriodLabel(nextMonthStart, nextMonthEnd, 'month');
    await expect(periodNav.label).toHaveText(nextMonthLabel);

    // Click Today button and verify it returns to current month
    await periodNav.todayButton.click();
    await expect(periodNav.label).toHaveText(expectedLabel);
    await expect(
      requestTestBase.getDateHeader(page, startOfMonth.format('YYYY-MM-DD')),
    ).toBeVisible();

    console.log('✅ Request calendar navigates months correctly in month view');
  });

  test('should correctly switch between week and month views', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const requestTestBase = testBasesMap.get(testRunId)!;

    const periodNav = requestTestBase.getPeriodNav(page);

    // 1. Start in week view, navigate to current week containing start of month
    const today = dayjs.utc();
    const startOfMonthTest = today.startOf('month');
    const startOfWeek = startOfMonthTest.startOf('isoWeek');
    const endOfWeek = startOfMonthTest.endOf('isoWeek');
    const monthOfStartOfWeek = startOfWeek.startOf('month');
    const monthEndOfStartOfWeek = startOfWeek.endOf('month');

    // Navigate to week containing start of month
    await requestTestBase.navigateToPeriod(page, startOfMonthTest, 'week');
    await expect(periodNav.select).toHaveValue('week');
    const weekLabel = requestTestBase.formatPeriodLabel(startOfWeek, endOfWeek, 'week');
    await expect(periodNav.label).toHaveText(weekLabel);

    // Switch to month view - should show the month containing the week start
    await periodNav.select.selectOption('month');
    await expect(periodNav.select).toHaveValue('month');

    // Wait for calendar to update and show the month
    await page.waitForTimeout(500);
    const monthLabel = requestTestBase.formatPeriodLabel(
      monthOfStartOfWeek,
      monthEndOfStartOfWeek,
      'month',
    );
    await expect(periodNav.label).toHaveText(monthLabel);
    await expect(
      requestTestBase.getDateHeader(page, monthOfStartOfWeek.format('YYYY-MM-DD')),
    ).toBeVisible();

    // 2. Navigate to next month, then switch from month to week
    const nextMonthDate = monthOfStartOfWeek.add(1, 'month');
    const startOfMonth = nextMonthDate.startOf('month');
    const endOfMonth = nextMonthDate.endOf('month');
    await requestTestBase.navigateToPeriod(page, nextMonthDate, 'month');

    const nextMonthLabel = requestTestBase.formatPeriodLabel(startOfMonth, endOfMonth, 'month');
    await expect(periodNav.label).toHaveText(nextMonthLabel);

    // Switch to week view - should show week containing start of month
    await periodNav.select.selectOption('week');
    await expect(periodNav.select).toHaveValue('week');

    // Wait for calendar to update
    await page.waitForTimeout(500);
    const weekOfStartOfMonth = startOfMonth.startOf('isoWeek');
    const endOfWeekOfStartOfMonth = startOfMonth.endOf('isoWeek');

    const weekLabel2 = requestTestBase.formatPeriodLabel(
      weekOfStartOfMonth,
      endOfWeekOfStartOfMonth,
      'week',
    );
    await expect(periodNav.label).toHaveText(weekLabel2);
    // The dates should be visible
    await expect(
      requestTestBase.getDateHeader(page, weekOfStartOfMonth.format('YYYY-MM-DD')),
    ).toBeVisible();
    await expect(
      requestTestBase.getDateHeader(page, endOfWeekOfStartOfMonth.format('YYYY-MM-DD')),
    ).toBeVisible();

    console.log('✅ Request calendar switches between week and month views correctly');
  });
});
