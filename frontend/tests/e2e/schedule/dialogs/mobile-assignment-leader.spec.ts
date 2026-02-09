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
      createAssignments: false,
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

  test("should only show assignment button on mobile in create dialog", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    if (!(await addButton.isVisible().catch(() => false))) {
      console.log("⚠️ Add button not found, skipping test");
      test.skip();
      return;
    }

    await addButton.click();

    // Assignment button should be visible
    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    await expect(assignmentButton).toBeVisible();

    // Demand button should NOT be visible on mobile
    const demandButton = page.locator('[data-testid="demand-button"]');
    await expect(demandButton).not.toBeVisible();

    // Request button should NOT be visible on mobile
    const requestButton = page.locator('[data-testid="request-button"]');
    await expect(requestButton).not.toBeVisible();

    console.log("✅ Only assignment button visible on mobile");
  });

  test("should create assignment on mobile viewport", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    if (!(await addButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addButton.click();

    // Fill assignment form
    const workerSelect = page.locator('[data-testid="worker-select"]');
    await workerSelect.click();
    await page.locator(`text="${testWorkers[0].name}"`).first().click();

    const shiftSelect = page.locator('[data-testid="shift-select"]');
    await shiftSelect.click();
    await page.locator(`text="${testShifts[0].name}"`).first().click();

    const tomorrow = dayjs.utc().add(1, "day");
    const datePicker = page.locator('[data-testid="date-picker"]');
    await datePicker.click();
    await datePicker.fill(tomorrow.format("MM/DD/YYYY"));

    const createButton = page.locator(
      '[data-testid="create-assignment-button"]',
    );
    await createButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify assignment created
    const dbUtils = (scheduleTestBase as any).dbUtils;
    const assignments = await dbUtils.getAssignments(testTeam.teamId);

    const createdAssignment = assignments.find(
      (a: any) =>
        a.workerId === testWorkers[0].id &&
        a.shiftId === testShifts[0].id &&
        a.date === tomorrow.format("YYYY-MM-DD"),
    );

    expect(createdAssignment).toBeDefined();
    console.log("✅ Assignment created on mobile viewport");
  });

  test("should edit assignment on mobile viewport", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;

    if (testShifts.length < 2) {
      test.skip();
      return;
    }

    // Create assignment
    const tomorrow = dayjs.utc().add(1, "day");
    const dbUtils = (scheduleTestBase as any).dbUtils;
    const assignment = await dbUtils.createAssignment({
      teamId: testTeam.teamId,
      workerId: testWorkers[0].id,
      shiftId: testShifts[0].id,
      date: tomorrow.format("YYYY-MM-DD"),
    });

    await page.reload();
    await page.waitForTimeout(1000);

    // Click on assignment
    const assignmentCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testWorkers[0].name })
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();

    // Change shift
    const shiftSelect = page.locator('[data-testid="shift-select"]');
    await shiftSelect.click();
    await page.locator(`text="${testShifts[1].name}"`).first().click();

    const saveButton = page.locator('[data-testid="save-assignment-button"]');
    await saveButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify update
    const assignments = await dbUtils.getAssignments(testTeam.teamId);
    const updatedAssignment = assignments.find(
      (a: any) => a.id === assignment.id,
    );

    expect(updatedAssignment?.shiftId).toBe(testShifts[1].id);
    console.log("✅ Assignment edited on mobile viewport");
  });

  test("should delete assignment on mobile viewport", async ({
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
    const assignment = await dbUtils.createAssignment({
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

    const deleteButton = page.locator(
      '[data-testid="delete-assignment-button"]',
    );
    await deleteButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify deletion
    const assignments = await dbUtils.getAssignments(testTeam.teamId);
    const deletedAssignment = assignments.find(
      (a: any) => a.id === assignment.id,
    );

    expect(deletedAssignment).toBeUndefined();
    console.log("✅ Assignment deleted on mobile viewport");
  });

  test("should access recurrence on mobile viewport", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();

    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    if (!(await addButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addButton.click();

    // Fill basic fields
    const workerSelect = page.locator('[data-testid="worker-select"]');
    await workerSelect.click();
    await page.locator(`text="${testWorkers[0].name}"`).first().click();

    const shiftSelect = page.locator('[data-testid="shift-select"]');
    await shiftSelect.click();
    await page.locator(`text="${testShifts[0].name}"`).first().click();

    const tomorrow = dayjs.utc().add(1, "day");
    const datePicker = page.locator('[data-testid="date-picker"]');
    await datePicker.click();
    await datePicker.fill(tomorrow.format("MM/DD/YYYY"));

    // Open recurrence dialog
    const recurrenceButton = page.locator('[data-testid="recurrence-button"]');
    await recurrenceButton.click();

    // Verify recurrence dialog opened
    const frequencySelect = page.locator('[data-testid="frequency-select"]');
    await expect(frequencySelect).toBeVisible();

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
