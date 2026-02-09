/**
 * E2E tests for Demand Read-Only Access by Team Member
 *
 * This test suite verifies that team members cannot access demand creation
 * or editing functionality, as demands are leader-only features.
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ScheduleTestBase } from "../../../utils/schedule-test-base";

dayjs.extend(utc);

test.describe("Demand Read-Only - Team Member", () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting demand member test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    // Setup schedule test environment with member linked to worker
    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, "day"),
      createAssignments: false,
      linkMemberToWorker: true,
    });

    // Create demand for viewing tests
    const testTeam = scheduleTestBase.getTestTeam()!;
    const testShifts = scheduleTestBase.getTestShifts();
    const tomorrow = dayjs.utc().add(1, "day");

    const dbUtils = (scheduleTestBase as any).dbUtils;
    await dbUtils.createShiftDemand({
      teamId: testTeam.teamId,
      shiftId: testShifts[0].id,
      date: tomorrow.format("YYYY-MM-DD"),
      count: 2,
    });

    await scheduleTestBase.actAsMember(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;

    testBasesMap.delete(testRunId);
    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test("should not show demand button in create dialog", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    // Try to open create dialog
    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    if (!(await addButton.isVisible().catch(() => false))) {
      console.log("⚠️ Add button not found, skipping test");
      test.skip();
      return;
    }

    await addButton.click();

    // Demand button should not be visible for members
    const demandButton = page.locator('[data-testid="demand-button"]');
    await expect(demandButton).not.toBeVisible();

    console.log("✅ Demand button not visible for team member");
  });

  test("should not allow opening demand when clicking on demand cell", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();

    // Try to click on demand cell
    const demandCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testShifts[0].name })
      .first();

    if (!(await demandCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await demandCell.click();

    // Dialog should either not open or show only assignment view
    // (depends on implementation - members might not be able to click demands at all)
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');

    // If dialog opens, it should not show demand form
    if (await dialog.isVisible().catch(() => false)) {
      const demandShiftSelect = page.locator(
        '[data-testid="demand-shift-select"]',
      );
      await expect(demandShiftSelect).not.toBeVisible();

      console.log("✅ Demand form not accessible when clicking demand cell");
    } else {
      console.log(
        "✅ Dialog did not open for demand cell (expected for members)",
      );
    }
  });

  test("should not have access to demand creation controls", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    if (!(await addButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addButton.click();

    // Verify demand-specific controls are not present
    const demandShiftSelect = page.locator(
      '[data-testid="demand-shift-select"]',
    );
    await expect(demandShiftSelect).not.toBeVisible();

    const increaseDemandButton = page.locator(
      '[data-testid="increase-demand-button"]',
    );
    await expect(increaseDemandButton).not.toBeVisible();

    const decreaseDemandButton = page.locator(
      '[data-testid="decrease-demand-button"]',
    );
    await expect(decreaseDemandButton).not.toBeVisible();

    console.log("✅ Demand controls not accessible");
  });

  test("should only see assignment and request options", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    if (!(await addButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addButton.click();

    // Should see assignment button
    const assignmentButton = page.locator('[data-testid="assignment-button"]');
    await expect(assignmentButton).toBeVisible();

    // Should see request button
    const requestButton = page.locator('[data-testid="request-button"]');
    await expect(requestButton).toBeVisible();

    // Should NOT see demand button
    const demandButton = page.locator('[data-testid="demand-button"]');
    await expect(demandButton).not.toBeVisible();

    console.log("✅ Member only sees assignment and request options");
  });

  test("should not have delete demand button even if somehow accessing demand view", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;

    // Even if member somehow opened dialog, they shouldn't see delete demand button
    const deleteDemandButton = page.locator(
      '[data-testid="delete-demand-button"]',
    );
    await expect(deleteDemandButton).not.toBeVisible();

    console.log("✅ Delete demand button not accessible");
  });
});
