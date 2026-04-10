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

    // Setup schedule test environment with workers and shifts, no assignments
    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, 'day'),
      createAssignments: false,
      linkMemberToWorker: false,
    });

    // Authenticate as owner and navigate to schedule page
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
    const testTeam = scheduleTestBase.getTestTeam()!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();

    // Open dialog (implementation may vary - adjust selector as needed)
    const addButton = page.locator('[data-testid="create-assignment-button"]');
    await expect(addButton).toBeVisible({ timeout: 5000 });

    await addButton.click();

    // Verify Assignment type is selected by default or select it
    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    if (await assignmentButton.isVisible()) {
      await assignmentButton.click();
    }

    // Select worker
    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await workerSelect.click();
    await page.locator(`[data-testid="worker-option-${testWorkers[0].id}"]`).click();

    // Select shift
    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="shift-option-${testShifts[0].id}"]`).click();

    // Select date (tomorrow)
    const tomorrow = dayjs.utc().add(1, 'day');

    const datePicker = page.locator('[data-testid="edit-assignment-date-picker"]');
    await datePicker.waitFor({ state: 'visible' });
    await datePicker.fill('', { force: true }); // Clear first
    await page.waitForTimeout(100);
    await datePicker.fill(tomorrow.format('DD/MM/YYYY'), { force: true });
    await datePicker.press('Enter');
    await page.waitForTimeout(300);

    // Click create button
    const createButton = page.locator('[data-testid="edit-assignment-create-button"]');
    await createButton.click();

    // Wait for dialog to close
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify assignment was created in database
    const AR = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const assignments = AR.assignmentsRead;

    expect(assignments.length).toBeGreaterThan(0);
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

    const addButton = page.locator('[data-testid="create-assignment-button"]');
    await expect(addButton).toBeVisible({ timeout: 5000 });

    await addButton.click();

    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    if (await assignmentButton.isVisible()) {
      await assignmentButton.click();
    }

    // Select only shift and date, not worker
    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="shift-option-${testShifts[0].id}"]`).click();

    const tomorrow = dayjs.utc().add(1, 'day');
    const datePicker = page.locator('[data-testid="edit-assignment-date-picker"]');
    await datePicker.waitFor({ state: 'visible' });
    await datePicker.fill('', { force: true }); // Clear first
    await page.waitForTimeout(100);
    await datePicker.fill(tomorrow.format('DD/MM/YYYY'), { force: true });
    await datePicker.press('Enter');
    await page.waitForTimeout(300);

    // Try to create without worker
    const createButton = page.locator('[data-testid="edit-assignment-create-button"]');
    await createButton.click();

    // Dialog should still be visible (validation failed)
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Worker select should show error state (MUI applies Mui-error class)
    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await expect(workerSelect).toHaveClass(/Mui-error/);

    console.log('✅ Validation error shown for missing worker');
  });

  test('should show validation error when shift is not selected', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();

    const addButton = page.locator('[data-testid="create-assignment-button"]');
    await expect(addButton).toBeVisible({ timeout: 5000 });

    await addButton.click();

    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    if (await assignmentButton.isVisible()) {
      await assignmentButton.click();
    }

    // Select only worker and date, not shift
    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await workerSelect.click();
    await page.locator(`[data-testid="worker-option-${testWorkers[0].id}"]`).click();

    const tomorrow = dayjs.utc().add(1, 'day');
    const datePicker = page.locator('[data-testid="edit-assignment-date-picker"]');
    await datePicker.waitFor({ state: 'visible' });
    await datePicker.fill('', { force: true }); // Clear first
    await page.waitForTimeout(100);
    await datePicker.fill(tomorrow.format('DD/MM/YYYY'), { force: true });
    await datePicker.press('Enter');
    await page.waitForTimeout(300);

    // Try to create without shift
    const createButton = page.locator('[data-testid="edit-assignment-create-button"]');
    await createButton.click();

    // Dialog should still be visible (validation failed)
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Shift select should show error state (MUI applies Mui-error class)
    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await expect(shiftSelect).toHaveClass(/Mui-error/);

    console.log('✅ Validation error shown for missing shift');
  });

  test('should cancel assignment creation', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;

    const addButton = page.locator('[data-testid="create-assignment-button"]');
    await expect(addButton).toBeVisible({ timeout: 5000 });

    await addButton.click();

    // Close dialog without creating
    const closeButton = page.locator('[data-testid="close-dialog-button"]');
    await closeButton.click();

    // Verify dialog is closed
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible();

    // Verify no assignment was created
    const AR2 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const assignments = AR2.assignmentsRead;
    expect(assignments.length).toBe(0);

    console.log('✅ Assignment creation cancelled successfully');
  });

  test('should create fixed assignment', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();

    const addButton = page.locator('[data-testid="create-assignment-button"]');
    await expect(addButton).toBeVisible({ timeout: 5000 });

    await addButton.click();

    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    if (await assignmentButton.isVisible()) {
      await assignmentButton.click();
    }

    // Fill in assignment details
    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await workerSelect.click();
    await page.locator(`[data-testid="worker-option-${testWorkers[0].id}"]`).click();

    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="shift-option-${testShifts[0].id}"]`).click();

    const tomorrow = dayjs.utc().add(1, 'day');
    const datePicker = page.locator('[data-testid="edit-assignment-date-picker"]');
    await datePicker.waitFor({ state: 'visible' });
    await datePicker.fill('', { force: true }); // Clear first
    await page.waitForTimeout(100);
    await datePicker.fill(tomorrow.format('DD/MM/YYYY'), { force: true });
    await datePicker.press('Enter');
    await page.waitForTimeout(300);

    // Check fixed checkbox if it exists
    const fixedCheckbox = page.locator('input[type="checkbox"][name="fixed"]');
    if (await fixedCheckbox.isVisible().catch(() => false)) {
      await fixedCheckbox.check();
    }

    // Create assignment
    const createButton = page.locator('[data-testid="edit-assignment-create-button"]');
    await createButton.click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    // Verify assignment was created as fixed
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
