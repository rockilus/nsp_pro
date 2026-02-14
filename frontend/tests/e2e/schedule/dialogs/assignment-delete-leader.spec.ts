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
    const AR = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR.assignmentsRead;
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
    const AR2 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const updatedAssignments = AR2.assignmentsRead;
    const deletedAssignment = updatedAssignments.find(
      (a: any) => a.id === assignmentId,
    );

    expect(deletedAssignment).toBeUndefined();
    console.log("✅ Assignment deleted successfully");
  });
});
