/**
 * E2E tests for Assignment Editing by Team Leader
 *
 * This test suite covers assignment editing functionality in the ScheduleItemDialog
 * for team leaders, including updating worker, shift, date, fixed status, and comments.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ScheduleTestBase } from '../../../utils/schedule-test-base';
import { selectDate } from '../../../utils/date-picker-helpers';

dayjs.extend(utc);

test.describe('Assignment Editing - Team Leader', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting assignment edit test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, 'day'),
      createAssignments: true,
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

  test('should open assignment in edit mode with populated fields', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();

    const AR = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const assignments = AR.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments[0];

    const assignmentCell = page.locator(`[data-testid="assignment-cell-${assignment.id}"]`);
    await expect(assignmentCell).toBeVisible();
    await assignmentCell.click();

    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    await expect(assignmentButton).not.toBeVisible();

    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await expect(workerSelect).toBeVisible();
    const expectedWorker = testWorkers.find((w) => w.id === assignment.workerId);
    expect(expectedWorker).toBeDefined();
    await expect(workerSelect).toContainText(expectedWorker!.name);

    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await expect(shiftSelect).toBeVisible();
    const expectedShift = testShifts.find((s) => s.id === assignment.shiftId);
    expect(expectedShift).toBeDefined();
    await expect(shiftSelect).toContainText(expectedShift!.name);

    // shadcn DatePicker is a Button, not an <input> — use toContainText
    const datePicker = page.locator('[data-testid="edit-assignment-date-picker"]');
    await expect(datePicker).toBeVisible();
    const expectedDate = assignment.date.local().format('D MMMM YYYY');
    await expect(datePicker).toContainText(expectedDate);

    const saveButton = page.locator('[data-testid="save-assignment-button"]');
    const deleteButton = page.locator('[data-testid="delete-assignment-button"]');
    await expect(saveButton).toBeVisible();
    await expect(deleteButton).toBeVisible();

    console.log('✅ Assignment opened in edit mode successfully');
  });

  test('should update assignment worker', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();

    const AR2 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const assignments = AR2.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments[0];

    const assignmentCell = page.locator(`[data-testid="assignment-cell-${assignment.id}"]`);
    await expect(assignmentCell).toBeVisible();
    await assignmentCell.click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).toBeVisible();

    const newWorker = testWorkers.find((w) => w.id !== assignment.workerId);
    expect(newWorker).toBeDefined();

    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await workerSelect.click();
    await page.locator(`[data-testid="worker-option-${newWorker!.id}"]`).click();

    const saveButton = page.locator('[data-testid="save-assignment-button"]');
    await saveButton.click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    const AR3 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const updatedAssignments = AR3.assignmentsRead;
    const updatedAssignment = updatedAssignments.find((a) => a.id === assignment.id);
    expect(updatedAssignment).toBeDefined();
    expect(updatedAssignment!.workerId).toBe(newWorker!.id);
    console.log('✅ Assignment worker updated successfully');
  });

  test('should update assignment shift', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();

    const AR4 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const assignments = AR4.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments[0];

    const assignmentCell = page.locator(`[data-testid="assignment-cell-${assignment.id}"]`);
    await expect(assignmentCell).toBeVisible();
    await assignmentCell.click();
    await expect(page.locator('[data-testid="schedule-item-dialog"]')).toBeVisible();

    const newShift = testShifts.find((s) => s.id !== assignment.shiftId);
    expect(newShift).toBeDefined();

    const shiftSelect = page.locator('[data-testid="edit-assignment-shift-select"]');
    await shiftSelect.click();
    await page.locator(`[data-testid="shift-option-${newShift!.id}"]`).click();

    const saveButton = page.locator('[data-testid="save-assignment-button"]');
    await saveButton.click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    const AR5 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const updatedAssignments = AR5.assignmentsRead;
    const updatedAssignment = updatedAssignments.find((a) => a.id === assignment.id);
    expect(updatedAssignment).toBeDefined();
    expect(updatedAssignment!.shiftId).toBe(newShift!.id);
    console.log('✅ Assignment shift updated successfully');
  });

  test('should update assignment date', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const AR6 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const assignments = AR6.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments[0];

    const assignmentCell = page.locator(`[data-testid="assignment-cell-${assignment.id}"]`);
    await expect(assignmentCell).toBeVisible();
    await assignmentCell.click();
    await expect(page.locator('[data-testid="schedule-item-dialog"]')).toBeVisible();

    const newDate = dayjs.utc(assignment.date.format('YYYY-MM-DD')).add(2, 'day');
    await selectDate(page, newDate);

    const saveButton = page.locator('[data-testid="save-assignment-button"]');
    await saveButton.click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    const AR5 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const updatedAssignments = AR5.assignmentsRead;
    const updatedAssignment = updatedAssignments.find((a) => a.id === assignment.id);
    expect(updatedAssignment).toBeDefined();

    expect(updatedAssignment!.date.isSame(newDate, 'day')).toBe(true);
    console.log('✅ Assignment date updated successfully');
  });

  test('should cancel assignment editing without saving changes', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();

    const AR6 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const assignments = AR6.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments[0];
    const originalWorkerId = assignment.workerId;

    const assignmentCell = page.locator(`[data-testid="assignment-cell-${assignment.id}"]`);
    await expect(assignmentCell).toBeVisible();
    await assignmentCell.click();
    await expect(page.locator('[data-testid="schedule-item-dialog"]')).toBeVisible();

    const newWorker = testWorkers.find((w) => w.id !== assignment.workerId);
    expect(newWorker).toBeDefined();
    const workerSelect = page.locator('[data-testid="edit-assignment-worker-select"]');
    await workerSelect.click();
    await page.locator(`[data-testid="worker-option-${newWorker!.id}"]`).click();

    const closeButton = page.locator(
      '[data-testid="close-dialog-button"], [data-slot="dialog-close"]',
    );
    await closeButton.first().click();

    await expect(page.locator('[data-testid="schedule-item-dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    const AR7 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf('day'),
      dayjs.utc().add(2, 'month').endOf('day'),
    );
    const unchangedAssignments = AR7.assignmentsRead;
    const unchangedAssignment = unchangedAssignments.find((a) => a.id === assignment.id);
    expect(unchangedAssignment).toBeDefined();
    expect(unchangedAssignment!.workerId).toBe(originalWorkerId);
    console.log('✅ Assignment changes cancelled successfully');
  });
});
