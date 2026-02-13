/**
 * E2E tests for Assignment Editing by Team Leader
 *
 * This test suite covers assignment editing functionality in the ScheduleItemDialog
 * for team leaders, including updating worker, shift, date, fixed status, and comments.
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ScheduleTestBase } from "../../../utils/schedule-test-base";

dayjs.extend(utc);

test.describe("Assignment Editing - Team Leader", () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting assignment edit test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    // Setup schedule test environment with workers and shifts
    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, "day"),
      createAssignments: true, // Create initial assignments for editing
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

  test("should open assignment in edit mode with populated fields", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const dbUtils = (scheduleTestBase as any).dbUtils;

    // Get the created assignment
    const AR = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments[0];

    // Click on assignment cell to open edit dialog
    // Note: Selector depends on schedule UI implementation
    const assignmentDate = dayjs(assignment.date);
    const assignmentCell = page.locator(
      `[data-testid="assignment-cell-${assignment.id}"]`,
    );
    await expect(assignmentCell).toBeVisible();

    await assignmentCell.click();

    // Verify dialog opens in edit mode
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Type toggle buttons should NOT be visible in edit mode
    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    await expect(assignmentButton).not.toBeVisible();

    // Save and Delete buttons should be visible
    const saveButton = page.locator('[data-testid="save-assignment-button"]');
    const deleteButton = page.locator(
      '[data-testid="delete-assignment-button"]',
    );
    await expect(saveButton).toBeVisible();
    await expect(deleteButton).toBeVisible();

    console.log("✅ Assignment opened in edit mode successfully");
  });

  test("should update assignment worker", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const dbUtils = (scheduleTestBase as any).dbUtils;

    // Get the created assignment
    const AR2 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR2.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments[0];
    const assignmentDate = dayjs(assignment.date);

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

    // Change worker to a different one
    const newWorker = testWorkers.find((w) => w.id !== assignment.workerId);
    expect(newWorker).toBeDefined();

    const workerSelect = page.locator(
      '[data-testid="edit-assignment-worker-select"]',
    );
    await workerSelect.click();
    await page
      .locator(`[data-testid="worker-option-${newWorker!.id}"]`)
      .click();

    // Save changes
    const saveButton = page.locator('[data-testid="save-assignment-button"]');
    await saveButton.click();

    // Wait for dialog to close
    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify assignment was updated in database
    const AR3 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const updatedAssignments = AR3.assignmentsRead;
    const updatedAssignment = updatedAssignments.find(
      (a) => a.id === assignment.id,
    );
    expect(updatedAssignment).toBeDefined();

    expect(updatedAssignment!.workerId).toBe(newWorker!.id);
    console.log("✅ Assignment worker updated successfully");
  });

  test("should update assignment shift", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const testShifts = scheduleTestBase.getTestShifts();
    const dbUtils = (scheduleTestBase as any).dbUtils;

    const AR4 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR4.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments[0];
    const assignmentDate = dayjs(assignment.date);

    const assignmentCell = page.locator(
      `[data-testid="assignment-cell-${assignment.id}"]`,
    );
    await expect(assignmentCell).toBeVisible();

    await assignmentCell.click();
    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).toBeVisible();

    // Change shift to a different one
    const newShift = testShifts.find((s) => s.id !== assignment.shiftId);
    expect(newShift).toBeDefined();

    const shiftSelect = page.locator(
      '[data-testid="edit-assignment-shift-select"]',
    );
    await shiftSelect.click();
    await page.locator(`[data-testid="shift-option-${newShift!.id}"]`).click();

    // Save changes
    const saveButton = page.locator('[data-testid="save-assignment-button"]');
    await saveButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify assignment was updated
    const AR5 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const updatedAssignments = AR5.assignmentsRead;
    const updatedAssignment = updatedAssignments.find(
      (a) => a.id === assignment.id,
    );
    expect(updatedAssignment).toBeDefined();

    expect(updatedAssignment!.shiftId).toBe(newShift!.id);
    console.log("✅ Assignment shift updated successfully");
  });

  test("should update assignment date", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const dbUtils = (scheduleTestBase as any).dbUtils;

    const AR6 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR6.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments[0];
    const assignmentDate = dayjs(assignment.date);

    const assignmentCell = page.locator(
      `[data-testid="assignment-cell-${assignment.id}"]`,
    );
    await expect(assignmentCell).toBeVisible();

    await assignmentCell.click();
    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).toBeVisible();

    // Change date to two days later
    const newDate = dayjs(assignment.date).add(2, "days");
    const datePicker = page.locator(
      '[data-testid="edit-assignment-date-picker"]',
    );
    await datePicker.waitFor({ state: "visible" });
    await datePicker.fill("", { force: true }); // Clear first
    await page.waitForTimeout(100);
    await datePicker.fill(newDate.format("DD/MM/YYYY"), { force: true });
    await datePicker.press("Enter");
    await page.waitForTimeout(300);

    // Save changes
    const saveButton = page.locator('[data-testid="save-assignment-button"]');
    await saveButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify assignment was updated
    const AR5 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const updatedAssignments = AR5.assignmentsRead;
    const updatedAssignment = updatedAssignments.find(
      (a) => a.id === assignment.id,
    );
    expect(updatedAssignment).toBeDefined();

    const updatedDate = dayjs(updatedAssignment!.date);
    expect(updatedDate.format("YYYY-MM-DD")).toBe(newDate.format("YYYY-MM-DD"));
    console.log("✅ Assignment date updated successfully");
  });

  test("should cancel assignment editing without saving changes", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const dbUtils = (scheduleTestBase as any).dbUtils;

    const AR6 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR6.assignmentsRead;
    await expect(assignments.length).toBeGreaterThan(0);

    const assignment = assignments[0];
    const originalWorkerId = assignment.workerId;
    const assignmentDate = dayjs(assignment.date);

    const assignmentCell = page.locator(
      `[data-testid="assignment-cell-${assignment.id}"]`,
    );
    await expect(assignmentCell).toBeVisible();

    await assignmentCell.click();
    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).toBeVisible();

    // Make a change
    const newWorker = testWorkers.find((w) => w.id !== assignment.workerId);
    expect(newWorker).toBeDefined();
    const workerSelect = page.locator(
      '[data-testid="edit-assignment-worker-select"]',
    );
    await workerSelect.click();
    await page.locator(`text="${newWorker!.name}"`).first().click();

    // Close dialog without saving
    const closeButton = page.locator('[data-testid="close-dialog-button"]');
    await closeButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible();

    // Verify assignment was NOT updated
    const AR7 = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const unchangedAssignments = AR7.assignmentsRead;
    const unchangedAssignment = unchangedAssignments.find(
      (a) => a.id === assignment.id,
    );
    expect(unchangedAssignment).toBeDefined();

    expect(unchangedAssignment!.workerId).toBe(originalWorkerId);
    console.log("✅ Assignment changes cancelled successfully");
  });
});
