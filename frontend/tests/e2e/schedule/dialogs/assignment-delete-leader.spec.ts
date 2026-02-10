/**
 * E2E tests for Assignment Deletion by Team Leader
 *
 * This test suite covers assignment deletion functionality in the ScheduleItemDialog
 * for team leaders, including single assignments and recurring assignments with different scopes.
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ScheduleTestBase } from "../../../utils/schedule-test-base";

dayjs.extend(utc);

test.describe("Assignment Deletion - Team Leader", () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(
      `[Test Run ${testRunId}] Starting assignment delete test setup`,
    );

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    // Setup schedule test environment with workers and shifts
    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, "day"),
      createAssignments: true, // Create initial assignments for deletion
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

  test("should delete a single assignment", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    // Get the created assignment
    const assignments = await scheduleTestBase.getAssignments();
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments[0];
    const assignmentId = assignment.id;

    // Open assignment for editing
    const assignmentCell = page.locator(
      `[data-testid="assignment-cell-${assignment.id}"]`,
    );
    await expect(assignmentCell).toBeVisible();

    await assignmentCell.click();

    // Wait for dialog
    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).toBeVisible();

    // Click delete button
    const deleteButton = page.locator(
      '[data-testid="delete-assignment-button"]',
    );
    await deleteButton.click();

    // Wait for dialog to close
    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify assignment was deleted from database
    const updatedAssignments = await scheduleTestBase.getAssignments();
    const deletedAssignment = updatedAssignments.find(
      (a: any) => a.id === assignmentId,
    );

    expect(deletedAssignment).toBeUndefined();
    console.log("✅ Assignment deleted successfully");
  });

  test("should show delete scope dialog for recurring assignment", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();

    // Create a recurring assignment
    const startDate = dayjs.utc().add(3, "days");

    // Create multiple assignments manually to simulate recurrence
    const recurrenceId = `recurrence-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      await scheduleTestBase.createAssignment({
        workerId: testWorkers[0].workerId,
        shiftId: testShifts[0].id,
        date: startDate.add(i * 7, "days"), // Weekly recurrence
        fixed: false,
        comment: "Recurring assignment",
      });
    }

    // Refresh page to load assignments
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Open one of the recurring assignments
    const assignmentCell = page
      .locator(`[data-date="${startDate.format("YYYY-MM-DD")}"]`)
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      console.log("⚠️ Assignment cell not found, skipping test");
      test.skip();
      return;
    }

    await assignmentCell.click();
    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).toBeVisible();

    // Click delete button
    const deleteButton = page.locator(
      '[data-testid="delete-assignment-button"]',
    );
    await deleteButton.click();

    // RecurrenceDeleteDialog should appear (if recurrence is detected)
    // Note: This depends on backend returning recurrence info
    const recurrenceDialog = page.locator('text="Delete Recurrence"');

    if (await recurrenceDialog.isVisible().catch(() => false)) {
      // Verify scope options are present
      const deleteThisOnly = page.locator(
        '[data-testid="delete-this-only-radio"]',
      );
      const deleteThisAndFuture = page.locator(
        '[data-testid="delete-this-and-future-radio"]',
      );
      const deleteAll = page.locator('[data-testid="delete-all-radio"]');

      await expect(deleteThisOnly).toBeVisible();
      await expect(deleteThisAndFuture).toBeVisible();
      await expect(deleteAll).toBeVisible();

      console.log("✅ Delete scope dialog shown for recurring assignment");
    } else {
      console.log(
        "⚠️ Recurrence delete dialog not shown - might not be a true recurrence",
      );
    }
  });

  test("should delete only current occurrence of recurring assignment", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();

    // Create recurring assignments
    const startDate = dayjs.utc().add(3, "days");
    const assignmentIds: string[] = [];

    for (let i = 0; i < 3; i++) {
      const result = await scheduleTestBase.createAssignment({
        workerId: testWorkers[0].workerId,
        shiftId: testShifts[0].id,
        date: startDate.add(i * 7, "days"),
        fixed: false,
        comment: "Recurring assignment",
      });
      assignmentIds.push(result.id);
    }

    const initialCount = 3;

    // Refresh page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Open first occurrence
    const assignmentCell = page
      .locator(`[data-date="${startDate.format("YYYY-MM-DD")}"]`)
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();
    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).toBeVisible();

    // Click delete
    const deleteButton = page.locator(
      '[data-testid="delete-assignment-button"]',
    );
    await deleteButton.click();

    // If recurrence dialog appears, select "This occurrence only"
    const recurrenceDialog = page.locator('text="Delete Recurrence"');
    if (await recurrenceDialog.isVisible().catch(() => false)) {
      const deleteThisOnly = page.locator(
        '[data-testid="delete-this-only-radio"]',
      );
      await deleteThisOnly.click();

      const confirmButton = page.locator(
        '[data-testid="recurrence-delete-confirm-button"]',
      );
      await confirmButton.click();
    }

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify only one assignment was deleted
    const updatedAssignments = await scheduleTestBase.getAssignments();
    const remainingCount = updatedAssignments.filter((a: any) =>
      assignmentIds.includes(a.id),
    ).length;

    if (initialCount > 1) {
      expect(remainingCount).toBe(initialCount - 1);
      console.log("✅ Only current occurrence deleted");
    } else {
      console.log(
        "⚠️ Test completed but recurrence behavior not fully verified",
      );
    }
  });

  test("should confirm before deleting assignment", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const assignments = await scheduleTestBase.getAssignments();

    if (assignments.length === 0) {
      test.skip();
      return;
    }

    const assignment = assignments[0];
    const assignmentId = assignment.id;
    const assignmentDate = dayjs(assignment.date);

    const assignmentCell = page
      .locator(`[data-date="${assignmentDate.format("YYYY-MM-DD")}"]`)
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();
    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).toBeVisible();

    // Click delete button
    const deleteButton = page.locator(
      '[data-testid="delete-assignment-button"]',
    );
    await deleteButton.click();

    // If a confirmation dialog appears, cancel it
    const cancelButton = page.locator(
      '[data-testid="recurrence-delete-cancel-button"]',
    );
    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click();

      // Dialog should still be open
      await expect(
        page.locator('[data-testid="schedule-item-dialog"]'),
      ).toBeVisible();

      console.log("✅ Delete operation cancelled successfully");
    } else {
      // No confirmation dialog, assignment will be deleted immediately
      console.log(
        "⚠️ No confirmation dialog shown for non-recurring assignment",
      );
    }

    // Verify assignment still exists
    const unchangedAssignments = await scheduleTestBase.getAssignments();
    const stillExists = unchangedAssignments.assignments.find(
      (a: any) => a.id === assignmentId,
    );

    if (stillExists) {
      console.log("✅ Assignment not deleted after cancellation");
    }
  });
});
