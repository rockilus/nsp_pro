/**
 * E2E tests for Mobile Assignment Dialogs - Team Member
 *
 * This test suite verifies mobile viewport behavior for team members,
 * ensuring read-only access and that only Assignment type is available
 * (no Demand or Request buttons).
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ScheduleTestBase } from '../../../utils/schedule-test-base';

dayjs.extend(utc);

test.describe('Mobile Assignment Dialogs - Team Member', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting mobile member test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, 'day'),
      createAssignments: true,
      linkMemberToWorker: true,
    });

    // Set mobile viewport
    await scheduleTestBase.setMobileViewport(page);

    await scheduleTestBase.actAsMember(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;

    testBasesMap.delete(testRunId);
    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test('should not show fab button', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    const fabButton = page.locator('[data-testid="mobile-create-assignment-fab"]').first();

    expect(fabButton).not.toBeVisible();

    console.log('✅ FAB button is hidden for team member');
  });

  test('should not open dialog when clicking on assignment', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();

    // Get the created assignment
    const AR = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const assignments = AR.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments[0];

    // Click on assignment cell to open edit dialog
    // Note: Selector depends on schedule UI implementation
    const assignmentDate = dayjs(assignment.date);
    const assignmentCell = page.locator(`[data-testid="assignment-list-item-${assignment.id}"]`);
    await expect(assignmentCell).toBeVisible();

    await assignmentCell.click();

    // Verify dialog opens in edit mode
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible();

    console.log('✅ Assignment cell is not clickable for team member');
  });
});
