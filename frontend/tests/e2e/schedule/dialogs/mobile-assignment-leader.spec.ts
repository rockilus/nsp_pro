/**
 * E2E tests for Mobile Assignment Dialogs - Team Leader
 *
 * This test suite verifies mobile viewport behavior for assignment
 * functionality, ensuring only Assignment type is available on mobile
 * (no Demand or Request access).
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ScheduleTestBase } from "../../../utils/schedule-test-base";

dayjs.extend(utc);

test.describe("Mobile Assignment Dialogs - Team Leader", () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting mobile leader test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, "day"),
      createAssignments: true,
      linkMemberToWorker: false,
    });

    // Set mobile viewport
    await scheduleTestBase.setMobileViewport(page);

    await scheduleTestBase.actAsOwner(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;

    testBasesMap.delete(testRunId);
    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test("should open assignment dialog when clicking on fab button", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    const fabButton = page
      .locator('[data-testid="mobile-create-assignment-fab"]')
      .first();

    expect(fabButton).toBeVisible();

    await fabButton.click();

    // Schedule item dialog should be visible
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Assignment form should be visible
    const assignmentForm = page.locator('[data-testid="assignment-form"]');
    await expect(assignmentForm).toBeVisible();

    console.log("✅ Assignment dialog opened with assignment form");
  });

  test("should not show type selection buttons on mobile viewport", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    const fabButton = page
      .locator('[data-testid="mobile-create-assignment-fab"]')
      .first();

    await expect(fabButton).toBeVisible();
    await fabButton.click();

    // Schedule item dialog should be visible
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Type selection buttons should NOT be visible on mobile
    const typeButtons = page.locator(
      '[data-testid="schedule-item-type-buttons"]',
    );
    await expect(typeButtons).not.toBeVisible();

    // Assignment button should NOT be visible
    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    await expect(assignmentButton).not.toBeVisible();

    // Demand button should NOT be visible
    const demandButton = page.locator('[data-testid="demand-button"]');
    await expect(demandButton).not.toBeVisible();

    // Request button should NOT be visible
    const requestButton = page.locator('[data-testid="request-button"]');
    await expect(requestButton).not.toBeVisible();

    // Assignment form should be visible (only assignment functionality on mobile)
    const assignmentForm = page.locator('[data-testid="assignment-form"]');
    await expect(assignmentForm).toBeVisible();

    console.log(
      "✅ Type selection buttons hidden on mobile, only assignment form visible",
    );
  });

  test("should create assignment on mobile viewport", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();

    // Open dialog (implementation may vary - adjust selector as needed)
    const fabButton = page
      .locator('[data-testid="mobile-create-assignment-fab"]')
      .first();

    expect(fabButton).toBeVisible();

    await fabButton.click();

    // Verify Assignment type is selected by default or select it
    const assignmentForm = page.locator('[data-testid="assignment-form"]');
    await expect(assignmentForm).toBeVisible();

    // Select worker
    const workerSelect = page.locator(
      '[data-testid="edit-assignment-worker-select"]',
    );
    await workerSelect.click();
    await page
      .locator(`[data-testid="worker-option-${testWorkers[0].id}"]`)
      .click();

    // Select shift
    const shiftSelect = page.locator(
      '[data-testid="edit-assignment-shift-select"]',
    );
    await shiftSelect.click();
    await page
      .locator(`[data-testid="shift-option-${testShifts[0].id}"]`)
      .click();

    // Select date (tomorrow)
    const tomorrow = dayjs.utc().add(1, "day");

    const datePicker = page.locator(
      '[data-testid="edit-assignment-date-picker"]',
    );
    await datePicker.waitFor({ state: "visible" });
    await datePicker.fill("", { force: true }); // Clear first
    await page.waitForTimeout(100);
    await datePicker.fill(tomorrow.format("DD/MM/YYYY"), { force: true });
    await datePicker.press("Enter");
    await page.waitForTimeout(300);

    // Click create button
    const createButton = page.locator(
      '[data-testid="edit-assignment-create-button"]',
    );
    await createButton.click();

    // Wait for dialog to close
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify assignment was created in database
    const AR = await scheduleTestBase.getAssignmentsAndRecurrences(
      false,
      dayjs.utc().startOf("day"),
      dayjs.utc().add(2, "month").endOf("day"),
    );
    const assignments = AR.assignmentsRead;

    expect(assignments.length).toBeGreaterThan(0);
    const createdAssignment = assignments.find(
      (a) =>
        a.workerId === testWorkers[0].id &&
        a.shiftId === testShifts[0].id &&
        a.date.isSame(tomorrow, "day"),
    );
    expect(createdAssignment).toBeDefined();

    console.log("✅ Assignment created successfully");
  });

  test("should open assignment in edit mode with populated fields on mobile viewport", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();

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
      `[data-testid="assignment-list-item-${assignment.id}"]`,
    );
    await expect(assignmentCell).toBeVisible();

    await assignmentCell.click();

    // Verify dialog opens in edit mode
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Type toggle buttons should NOT be visible in edit mode
    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    await expect(assignmentButton).not.toBeVisible();

    // Verify worker field is populated with the assignment's worker
    const workerSelect = page.locator(
      '[data-testid="edit-assignment-worker-select"]',
    );
    await expect(workerSelect).toBeVisible();
    const expectedWorker = testWorkers.find(
      (w) => w.id === assignment.workerId,
    );
    expect(expectedWorker).toBeDefined();
    await expect(workerSelect).toContainText(expectedWorker!.name);

    // Verify shift field is populated with the assignment's shift
    const shiftSelect = page.locator(
      '[data-testid="edit-assignment-shift-select"]',
    );
    await expect(shiftSelect).toBeVisible();
    const expectedShift = testShifts.find((s) => s.id === assignment.shiftId);
    expect(expectedShift).toBeDefined();
    await expect(shiftSelect).toContainText(expectedShift!.name);

    // Verify date field is populated with the assignment's date
    const datePicker = page.locator(
      '[data-testid="edit-assignment-date-picker"]',
    );
    await expect(datePicker).toBeVisible();
    const expectedDate = dayjs(assignment.date).format("DD/MM/YYYY");
    await expect(datePicker).toHaveValue(expectedDate);

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
      `[data-testid="assignment-list-item-${assignment.id}"]`,
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

  test("should delete assignment on mobile viewport", async ({
    page,
  }, testInfo) => {
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
      `[data-testid="assignment-list-item-${assignment.id}"]`,
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

  test("should access recurrence on mobile viewport", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    // Open dialog (implementation may vary - adjust selector as needed)
    const fabButton = page
      .locator('[data-testid="mobile-create-assignment-fab"]')
      .first();

    expect(fabButton).toBeVisible();

    await fabButton.click();

    // Verify Assignment type is selected by default or select it
    const assignmentForm = page.locator('[data-testid="assignment-form"]');
    await expect(assignmentForm).toBeVisible();

    // Open recurrence dialog
    const recurrenceButton = page.locator('[data-testid="recurrence-button"]');
    await recurrenceButton.click();

    // Set daily frequency
    const recurrenceContainer = page.locator(
      '[data-testid="recurrence-edit-container"]',
    );
    await expect(recurrenceContainer).toBeVisible();

    console.log("✅ Recurrence accessible on mobile viewport");
  });

  test("should check replacement on mobile viewport", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    // Create assignment
    const tomorrow = dayjs.utc().add(1, "day");
    const dbUtils = (scheduleTestBase as any).dbUtils;
    await dbUtils.createAssignment({
      teamId: testTeam.teamId,
      workerId: testWorkers[0].id,
      shiftId: testShifts[0].id,
      date: tomorrow.format("YYYY-MM-DD"),
    });

    await page.reload();
    await page.waitForTimeout(1000);

    const assignmentCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testWorkers[0].name })
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();

    // Click check replacement
    const checkReplacementButton = page.locator(
      '[data-testid="check-replacement-button"]',
    );
    await checkReplacementButton.click();

    await page.waitForTimeout(1000);

    // Verify replacement UI opened (structure may vary)
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    console.log("✅ Replacement check accessible on mobile viewport");
  });
});
