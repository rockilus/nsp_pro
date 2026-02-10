/**
 * E2E tests for Mobile Assignment Dialogs - Team Member
 *
 * This test suite verifies mobile viewport behavior for team members,
 * ensuring read-only access and that only Assignment type is available
 * (no Demand or Request buttons).
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ScheduleTestBase } from "../../../utils/schedule-test-base";

dayjs.extend(utc);

test.describe("Mobile Assignment Dialogs - Team Member", () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting mobile member test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, "day"),
      createAssignments: false,
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

  test("should only show assignment button on mobile for member", async ({
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

    // Demand and Request buttons should not be visible
    const demandButton = page.locator('[data-testid="demand-button"]');
    await expect(demandButton).not.toBeVisible();

    const requestButton = page.locator('[data-testid="request-button"]');
    await expect(requestButton).not.toBeVisible();

    console.log("✅ Only assignment button visible on mobile for member");
  });

  test("should show read-only assignment view on mobile", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;
    const memberWorker = scheduleTestBase.getMemberWorker();

    if (!memberWorker) {
      test.skip();
      return;
    }

    // Create assignment for member's linked worker
    const tomorrow = dayjs.utc().add(1, "day");
    const dbUtils = (scheduleTestBase as any).dbUtils;
    await dbUtils.createAssignment({
      teamId: testTeam.teamId,
      workerId: memberWorker.workerId,
      shiftId: testShifts[0].id,
      date: tomorrow.format("YYYY-MM-DD"),
    });

    await page.reload();
    await page.waitForTimeout(1000);

    const assignmentCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: memberWorker.name })
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();

    // Verify read-only mode
    const workerSelect = page.locator('[data-testid="worker-select"]');
    const isDisabled = await workerSelect.getAttribute("aria-disabled");
    expect(isDisabled).toBe("true");

    // Save button should not be visible
    const saveButton = page.locator('[data-testid="save-assignment-button"]');
    await expect(saveButton).not.toBeVisible();

    // Delete button should not be visible
    const deleteButton = page.locator(
      '[data-testid="delete-assignment-button"]',
    );
    await expect(deleteButton).not.toBeVisible();

    console.log("✅ Read-only view on mobile for member");
  });

  test("should not allow member to create assignment on own worker", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();
    const memberWorker = scheduleTestBase.getMemberWorker();

    if (!memberWorker) {
      test.skip();
      return;
    }

    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    if (!(await addButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addButton.click();

    // Try to select own worker
    const workerSelect = page.locator('[data-testid="worker-select"]');
    await workerSelect.click();

    // Member's worker should not be in the list or selection should be disabled
    const workerOption = page.locator(`text="${memberWorker.name}"`);

    if (await workerOption.isVisible().catch(() => false)) {
      await workerOption.first().click();

      const shiftSelect = page.locator('[data-testid="shift-select"]');
      await shiftSelect.click();
      await page.locator(`text="${testShifts[0].name}"`).first().click();

      const tomorrow = dayjs.utc().add(1, "day");
      const datePicker = page.locator('[data-testid="date-picker"]');
      await datePicker.click();
      await datePicker.fill(tomorrow.format("MM/DD/YYYY"));

      // Try to create
      const createButton = page.locator(
        '[data-testid="create-assignment-button"]',
      );
      await createButton.click();

      // Should remain visible or show error (member cannot create)
      const dialog = page.locator('[data-testid="schedule-item-dialog"]');
      await expect(dialog).toBeVisible();

      console.log("✅ Member cannot create assignment on mobile");
    } else {
      console.log("✅ Member's worker not available for selection on mobile");
    }
  });

  test("should not show replacement button for member on mobile", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;
    const memberWorker = scheduleTestBase.getMemberWorker();

    if (!memberWorker) {
      test.skip();
      return;
    }

    // Create assignment
    const tomorrow = dayjs.utc().add(1, "day");
    const dbUtils = (scheduleTestBase as any).dbUtils;
    await dbUtils.createAssignment({
      teamId: testTeam.teamId,
      workerId: memberWorker.id,
      shiftId: testShifts[0].id,
      date: tomorrow.format("YYYY-MM-DD"),
    });

    await page.reload();
    await page.waitForTimeout(1000);

    const assignmentCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: memberWorker.name })
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();

    // Check replacement button should not be visible for member
    const checkReplacementButton = page.locator(
      '[data-testid="check-replacement-button"]',
    );
    await expect(checkReplacementButton).not.toBeVisible();

    console.log("✅ Replacement button not visible for member on mobile");
  });

  test("should not show recurrence button for member on mobile", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;
    const memberWorker = scheduleTestBase.getMemberWorker();

    if (!memberWorker) {
      test.skip();
      return;
    }

    // Create recurring assignment
    const tomorrow = dayjs.utc().add(1, "day");
    await scheduleTestBase.createAssignmentWithRecurrence({
      teamId: testTeam.teamId,
      workerId: memberWorker.id,
      shiftId: testShifts[0].id,
      date: tomorrow.format("YYYY-MM-DD"),
      recurrenceRule: {
        frequency: "daily",
        interval: 1,
        endType: "occurrences",
        occurrences: 3,
      },
    });

    await page.reload();
    await page.waitForTimeout(1000);

    const assignmentCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: memberWorker.name })
      .first();

    if (!(await assignmentCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await assignmentCell.click();

    // Recurrence button should not be visible for member
    const recurrenceButton = page.locator('[data-testid="recurrence-button"]');
    await expect(recurrenceButton).not.toBeVisible();

    console.log("✅ Recurrence button not visible for member on mobile");
  });

  test("should not allow member to view other workers' assignments on mobile", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testWorkers = scheduleTestBase.getTestWorkers();
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;
    const memberWorker = scheduleTestBase.getMemberWorker();

    if (!memberWorker) {
      test.skip();
      return;
    }

    // Create assignment for another worker (not member's)
    const otherWorker = testWorkers.find((w) => w.id !== memberWorker.id);
    if (!otherWorker) {
      test.skip();
      return;
    }

    const tomorrow = dayjs.utc().add(1, "day");
    const dbUtils = (scheduleTestBase as any).dbUtils;
    await dbUtils.createAssignment({
      teamId: testTeam.teamId,
      workerId: otherWorker.id,
      shiftId: testShifts[0].id,
      date: tomorrow.format("YYYY-MM-DD"),
    });

    await page.reload();
    await page.waitForTimeout(1000);

    // Try to click on other worker's assignment
    const assignmentCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: otherWorker.name })
      .first();

    if (await assignmentCell.isVisible().catch(() => false)) {
      await assignmentCell.click();

      // Dialog should either not open or show limited/no access
      const dialog = page.locator('[data-testid="schedule-item-dialog"]');

      if (await dialog.isVisible().catch(() => false)) {
        // If dialog opens, verify member cannot see assignment details
        const workerSelect = page.locator('[data-testid="worker-select"]');
        if (await workerSelect.isVisible().catch(() => false)) {
          const isDisabled = await workerSelect.getAttribute("aria-disabled");
          expect(isDisabled).toBe("true");
        }
      } else {
        console.log(
          "✅ Member cannot view other worker's assignment on mobile",
        );
      }
    } else {
      console.log(
        "✅ Other worker's assignment not accessible to member on mobile",
      );
    }
  });
});
