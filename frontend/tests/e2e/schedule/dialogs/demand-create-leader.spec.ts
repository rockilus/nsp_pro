/**
 * E2E tests for Demand Creation by Team Leader
 *
 * This test suite covers shift demand creation functionality in the ScheduleItemDialog
 * for team leaders, including shift selection, date selection, and validation.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ScheduleTestBase } from '../../../utils/schedule-test-base';

dayjs.extend(utc);

test.describe('Demand Creation - Team Leader', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting demand creation test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    // Setup schedule test environment with shifts, no demands initially
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

  test('should create demand with shift and date', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const testShifts = scheduleTestBase.getTestShifts();

    // Open dialog
    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    // Switch to Demand type
    const demandButton = page.locator('[data-testid="demand-button"]');
    await demandButton.click();

    // Select shift
    const shiftSelect = page.locator('[data-testid="demand-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="demand-shift-option-${testShifts[0].id}"]`).click();

    // Select date (tomorrow)
    const tomorrow = dayjs.utc().utc().startOf('day').add(1, 'day');
    const datePicker = page.locator('[data-testid="demand-date-picker"]');
    await datePicker.waitFor({ state: 'visible' });
    await datePicker.fill('', { force: true }); // Clear first
    await page.waitForTimeout(100);
    await datePicker.fill(tomorrow.format('DD/MM/YYYY'), { force: true });
    await datePicker.press('Enter');
    await page.waitForTimeout(300);

    // Click create button
    const createButton = page.locator('[data-testid="create-demand-button"]');
    await createButton.click();

    // Wait for dialog to close
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify demand was created in database
    const demands = await scheduleTestBase.getShiftDemandsByPeriod(tomorrow, tomorrow);

    expect(demands.length).toBeGreaterThan(0);
    const createdDemand = demands.find(
      (d) => d.shiftId === testShifts[0].id && d.date === tomorrow.unix(),
    );
    expect(createdDemand).toBeDefined();

    console.log('✅ Demand created successfully');
  });

  test('should show validation error when shift is not selected', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    // Then click on worker button
    const workerButton = page.locator('[data-testid="data-view-worker-button"]');
    await workerButton.click();
    await page.waitForTimeout(500);

    // Open dialog
    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    // Switch to Demand type
    const demandButton = page.locator('[data-testid="demand-button"]');
    await demandButton.click();

    // Select only date, not shift
    const tomorrow = dayjs.utc().utc().startOf('day').add(1, 'day');
    const datePicker = page.locator('[data-testid="demand-date-picker"]');
    await datePicker.waitFor({ state: 'visible' });
    await datePicker.fill('', { force: true }); // Clear first
    await page.waitForTimeout(100);
    await datePicker.fill(tomorrow.format('DD/MM/YYYY'), { force: true });
    await datePicker.press('Enter');
    await page.waitForTimeout(300);

    // Try to create without shift
    const createButton = page.locator('[data-testid="create-demand-button"]');
    await createButton.click();

    // Validation error should be displayed
    const shiftError = page.locator('[data-testid="demand-shift-error"]');
    await expect(shiftError).toBeVisible({ timeout: 2000 });

    // Dialog should still be visible (validation failed)
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    console.log('✅ Validation prevents demand creation without shift');
  });

  test('should cancel demand creation', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;

    const demands = await scheduleTestBase.getShiftDemandsByPeriod(
      dayjs.utc(),
      dayjs.utc().add(1, 'month'),
    );

    // Open dialog
    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    // Switch to Demand type
    const demandButton = page.locator('[data-testid="demand-button"]');
    await demandButton.click();

    // Click cancel
    const cancelButton = page.locator('[data-testid="cancel-demand-button"]');
    await cancelButton.click();

    // Verify dialog is closed
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible();

    // Verify no demand was created
    const demandsAfter = await scheduleTestBase.getShiftDemandsByPeriod(
      dayjs.utc(),
      dayjs.utc().add(1, 'month'),
    );

    const newDemands = demandsAfter.filter(
      (d) => !demands.some((existing) => existing.id === d.id),
    );
    expect(newDemands.length).toBe(0);

    console.log('✅ Demand creation cancelled successfully');
  });

  test('should create demand with default count of 1', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const testShifts = scheduleTestBase.getTestShifts();

    // Open dialog
    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    // Switch to Demand type
    const demandButton = page.locator('[data-testid="demand-button"]');
    await demandButton.click();

    // Select shift
    const shiftSelect = page.locator('[data-testid="demand-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="demand-shift-option-${testShifts[0].id}"]`).click();

    // Select date (tomorrow)
    const dayAfterTomorrow = dayjs.utc().utc().startOf('day').add(2, 'day');
    const datePicker = page.locator('[data-testid="demand-date-picker"]');
    await datePicker.waitFor({ state: 'visible' });
    await datePicker.fill('', { force: true }); // Clear first
    await page.waitForTimeout(100);
    await datePicker.fill(dayAfterTomorrow.format('DD/MM/YYYY'), {
      force: true,
    });
    await datePicker.press('Enter');
    await page.waitForTimeout(300);

    // Click create button
    const createButton = page.locator('[data-testid="create-demand-button"]');
    await createButton.click();

    // Wait for dialog to close
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify demand was created in database
    const demands = await scheduleTestBase.getShiftDemandsByPeriod(
      dayjs.utc(),
      dayjs.utc().add(1, 'month'),
    );

    expect(demands.length).toBeGreaterThan(0);
    const createdDemand = demands.find(
      (d) => d.shiftId === testShifts[0].id && d.date === dayAfterTomorrow.unix(),
    );
    expect(createdDemand).toBeDefined();

    expect(createdDemand!.count).toBe(1);
    console.log('✅ Demand created with default count of 1');
  });
});
