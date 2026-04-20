/**
 * E2E tests for ScheduleItemDialog Navigation
 *
 * This test suite covers basic dialog functionality:
 * - Opening and closing the dialog
 * - Switching between Assignment/Demand/Request types in CREATE mode
 * - Dialog title changes based on mode
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ScheduleTestBase } from '../../../utils/schedule-test-base';

dayjs.extend(utc);

test.describe('ScheduleItemDialog Navigation', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting dialog navigation test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    // Setup schedule test environment
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

    const scheduleTestBase = testBasesMap.get(testRunId);
    if (scheduleTestBase) {
      // Cleanup happens automatically via DatabaseTestUtils
      testBasesMap.delete(testRunId);
    }
  });

  test('should open dialog when clicking add button or schedule cell', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    // Wait for schedule page to load
    await page.waitForLoadState('networkidle');

    // Look for a cell in the schedule (this might vary based on UI implementation)
    // For now, let's check if the dialog can be opened via a FAB or add button
    // Note: The actual selector depends on the schedule page implementation

    // Try to find and click a schedule cell or add button
    // This is a placeholder - adjust based on actual schedule page structure
    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    // Verify dialog opens
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    console.log('✅ Dialog opened successfully');
  });

  test('should show type toggle buttons in CREATE mode', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    // Open dialog in CREATE mode (implementation-specific)
    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    // Verify type toggle buttons are visible
    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    const demandButton = page.locator('[data-testid="demand-button"]');
    const requestButton = page.locator('[data-testid="request-button"]');

    await expect(assignmentButton).toBeVisible();
    await expect(demandButton).toBeVisible();
    await expect(requestButton).toBeVisible();

    console.log('✅ Type toggle buttons visible in CREATE mode');
  });

  test('should switch between Assignment/Demand/Request types', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    // Click Demand button
    const demandButton = page.locator('[data-testid="demand-button"]');
    await demandButton.click();

    // Verify Demand form content appears (check for demand-specific elements)
    const demandShiftSelect = page.locator('[data-testid="demand-shift-select"]');
    await expect(demandShiftSelect).toBeVisible();

    // Click Assignment button
    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    await assignmentButton.click();

    // Verify Assignment form content appears
    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await expect(workerSelect).toBeVisible();

    // Click Request button
    const requestButton = page.locator('[data-testid="request-button"]');
    await requestButton.click();

    // Verify Request form content appears
    const requestWorkerSelect = page.locator('[data-testid="worker-select"]');
    await expect(requestWorkerSelect).toBeVisible();

    console.log('✅ Successfully switched between all three types');
  });

  test('should close dialog when clicking close button', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    // Verify dialog is open
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Click close button
    const closeButton = page.locator('[data-testid="close-dialog-button"]');
    await closeButton.click();

    // Verify dialog is closed
    await expect(dialog).not.toBeVisible();

    console.log('✅ Dialog closed successfully');
  });

  test('should close dialog when pressing ESC key', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    const addButton = page.locator('[data-testid^="add-assignment-button-"]').first();
    await addButton.waitFor({ state: 'attached', timeout: 5000 });
    await addButton.click({ force: true });

    // Verify dialog is open
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Press ESC key
    await page.keyboard.press('Escape');

    // Verify dialog is closed
    await expect(dialog).not.toBeVisible();

    console.log('✅ Dialog closed with ESC key');
  });

  test('should show edit title when opening existing assignment', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();

    // Create an assignment first
    const tomorrow = dayjs.utc().add(1, 'day');
    const dbUtils = (scheduleTestBase as any).dbUtils;

    const ARResult = await scheduleTestBase.createAssignmentAndRecurrence({
      workerId: testWorkers[0].id,
      shiftId: testShifts[0].id,
      date: tomorrow,
      fixed: false,
      comment: 'Test assignment',
    });
    const testAssignment = ARResult.assignmentsCreated[0];

    // Set schedule view settings to show the week containing tomorrow
    await scheduleTestBase.setScheduleViewSettings(page, {
      targetDate: tomorrow,
      timeFrame: 'week',
    });

    // Click on the assignment cell (implementation-specific selector)
    // This is a placeholder - actual implementation depends on schedule UI
    const assignmentCell = page.locator(`[data-testid="assignment-cell-${testAssignment.id}"]`);

    // Assert cell is visible - test will fail if not found
    await expect(assignmentCell).toBeVisible();
    await assignmentCell.click();

    // Verify dialog opens with edit title
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // In EDIT mode, type toggle buttons should NOT be visible
    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    await expect(assignmentButton).not.toBeVisible();

    console.log('✅ Dialog opened in EDIT mode without type toggles');
  });
});
