/**
 * E2E tests for Schedule Selection Feature — Access Control
 *
 * Tests verify:
 * - Member cannot see the selection mode toggle in settings
 * - Leader (owner) can see the selection mode toggle
 * - Leader can enable selection mode (toolbar appears)
 * - Leader can disable selection mode (toolbar disappears)
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ScheduleTestBase } from '../../../../utils/schedule-test-base';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

test.describe('Schedule Selection - Access Control', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);
    (testInfo as any).testRunId = testRunId;

    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc(),
      createAssignments: false,
      linkMemberToWorker: true,
    });

    await scheduleTestBase.actAsOwner(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('member cannot see settings-selection-mode-button', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    // Switch to member context and reload
    await scheduleTestBase.actAsMember(page);
    await scheduleTestBase.navigateToSchedulePage(page);

    // Settings button should NOT be visible for member
    await expect(page.locator('[data-testid="schedule-settings-button"]')).not.toBeVisible();
  });

  test('leader sees settings-selection-mode-button', async ({ page }) => {
    // Open settings popover
    await page.click('[data-testid="schedule-settings-button"]');

    // Selection mode button should be visible for owner
    await expect(page.locator('[data-testid="settings-selection-mode-button"]')).toBeVisible();
  });

  test('leader can enable selection mode', async ({ page }) => {
    // Toolbar should not be visible initially
    await expect(page.locator('[data-testid="schedule-action-toolbar"]')).not.toBeVisible();

    // Open settings and activate selection mode
    await page.click('[data-testid="schedule-settings-button"]');
    await page.click('[data-testid="settings-selection-mode-button"]');

    // Toolbar should now be visible
    await expect(page.locator('[data-testid="schedule-action-toolbar"]')).toBeVisible();
  });

  test('leader can disable selection mode', async ({ page }) => {
    // Enable selection mode
    await page.click('[data-testid="schedule-settings-button"]');
    await page.click('[data-testid="settings-selection-mode-button"]');
    await expect(page.locator('[data-testid="schedule-action-toolbar"]')).toBeVisible();

    // Exit selection mode via close button
    await page.click('[data-testid="schedule-close-selection-button"]');

    // Toolbar should be gone
    await expect(page.locator('[data-testid="schedule-action-toolbar"]')).not.toBeVisible();
  });
});
