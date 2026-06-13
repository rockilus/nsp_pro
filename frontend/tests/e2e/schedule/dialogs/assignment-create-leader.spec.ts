/**
 * E2E tests for Assignment Creation by Team Leader
 *
 * This test suite covers assignment creation functionality in the ScheduleItemDialog
 * for team leaders (owners), including validation and pre-populated fields.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ScheduleTestBase } from '../../../utils/schedule-test-base';

dayjs.extend(utc);

test.describe('Assignment Creation - Team Leader', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting assignment creation test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);
    (testInfo as any).testRunId = testRunId;

    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, 'day'),
      createAssignments: false,
      linkMemberToWorker: false,
    });
    await scheduleTestBase.actAsOwner(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test('should create assignment with worker, shift, and date', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();

    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    if (await assignmentButton.isVisible()) {
      await assignmentButton.click();
    }

    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await workerSelect.click();
    await page.locator(`[data-testid="worker-option-${testWorkers[0].id}"]`).click();

    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="shift-option-${testShifts[0].id}"]`).click();

    const tomorrow = dayjs.utc().add(1, 'day');
    await selectDate(page, tomorrow);

    const createButton = page.locator('[data-testid="edit-assignment-create-button"]');
    await createButton.click();

    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    const AR = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const assignments = AR.assignmentsRead;

    expect(assignments.length).toBeGreaterThan(0);
    // Dates are now stored as UTC midnight dayjs throughout (DatePicker.onChange
    // converts local → utc, and fromAssignmentT → .unix() → API → toAssignmentT
    // → dayjs.unix(ts).utc() preserves the calendar day). Use .isSame with 'day'.
    const createdAssignment = assignments.find(
      (a) =>
        a.workerId === testWorkers[0].id &&
        a.shiftId === testShifts[0].id &&
        a.date.isSame(tomorrow, 'day'),
    );
    expect(createdAssignment).toBeDefined();

    console.log('✅ Assignment created successfully');
  });

  test('should show validation error when worker is not selected', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();

    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    if (await assignmentButton.isVisible()) {
      await assignmentButton.click();
    }

    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="shift-option-${testShifts[0].id}"]`).click();

    const tomorrow = dayjs.utc().add(1, 'day');
    await selectDate(page, tomorrow);

    const createButton = page.locator('[data-testid="edit-assignment-create-button"]');
    await createButton.click();

    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();
    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await expect(workerSelect).toHaveClass(/Mui-error/);

    console.log('✅ Validation error shown for missing worker');
  });

  test('should show validation error when shift is not selected', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();

    const workerButton = page.locator('[data-testid="data-view-worker-button"]');
    await workerButton.click();
    await page.waitForTimeout(500);

    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    if (await assignmentButton.isVisible()) {
      await assignmentButton.click();
    }

    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await workerSelect.click();
    await page.locator(`[data-testid="worker-option-${testWorkers[0].id}"]`).click();

    const tomorrow = dayjs.utc().add(1, 'day');
    await selectDate(page, tomorrow);

    const createButton = page.locator('[data-testid="edit-assignment-create-button"]');
    await createButton.click();

    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();
    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await expect(shiftSelect).toHaveClass(/Mui-error/);

    console.log('✅ Validation error shown for missing shift');
  });

  test('should cancel assignment creation', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    const closeButton = page.locator('[data-testid="close-dialog-button"]');
    await closeButton.click();

    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible();

    const AR2 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    expect(AR2.assignmentsRead.length).toBe(0);

    console.log('✅ Assignment creation cancelled successfully');
  });

  test('should create fixed assignment', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();

    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    if (await assignmentButton.isVisible()) {
      await assignmentButton.click();
    }

    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await workerSelect.click();
    await page.locator(`[data-testid="worker-option-${testWorkers[0].id}"]`).click();

    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="shift-option-${testShifts[0].id}"]`).click();

    const tomorrow = dayjs.utc().add(1, 'day');
    await selectDate(page, tomorrow);

    const fixedCheckbox = page.locator('input[type="checkbox"][name="fixed"]');
    if (await fixedCheckbox.isVisible().catch(() => false)) {
      await fixedCheckbox.check();
    }

    const createButton = page.locator('[data-testid="edit-assignment-create-button"]');
    await createButton.click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    const AR3 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const assignments = AR3.assignmentsRead;
    const createdAssignment = assignments.find(
      (a: any) =>
        a.workerId === testWorkers[0].id &&
        a.shiftId === testShifts[0].id &&
        a.date.isSame(tomorrow, 'day'),
    );
    if (createdAssignment) {
      expect(createdAssignment.fixed).toBe(true);
      console.log('✅ Fixed assignment created successfully');
    } else {
      console.log('⚠️ Assignment created but fixed status not verified');
    }
  });
});

/**
 * Build an English ordinal string (e.g. "14th", "1st") without the dayjs
 * advancedFormat plugin.
 */
function englishOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Helper: select a date using the shadcn DatePicker (popover-based, not an <input>).
 *
 * The DatePicker renders a Button trigger that opens a portaled Calendar popover.
 * react-day-picker gridcell buttons have accessible names like
 * "Sunday, June 14th, 2026".
 *
 * This helper clicks the trigger, then clicks the calendar day button by its
 * full accessible name, avoiding any locale or format mismatches.
 *
 * Note: the DatePicker onChange handler in assignment-form.tsx converts the
 * local dayjs to UTC midnight via dayjs.utc(newDate.format('YYYY-MM-DD')), so
 * the stored value and the `date` parameter here (dayjs.utc()) stay in sync.
 */
async function selectDate(page: import('@playwright/test').Page, date: dayjs.Dayjs) {
  const datePicker = page.locator('[data-testid="edit-assignment-date-picker"]');
  await datePicker.waitFor({ state: 'visible' });
  await datePicker.click();

  const dayName = [
    date.format('dddd'),
    ', ',
    date.format('MMMM'),
    ' ',
    englishOrdinal(date.date()),
    ', ',
    date.format('YYYY'),
  ].join('');

  const dayButton = page.getByRole('button', { name: dayName });
  await dayButton.waitFor({ state: 'visible' });
  await dayButton.click();

  await expect(datePicker).toContainText(date.format('D MMMM YYYY'));
}
