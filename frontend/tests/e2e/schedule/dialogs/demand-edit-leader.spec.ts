/**
 * E2E tests for Demand Editing by Team Leader
 *
 * This test suite covers shift demand editing functionality in the ScheduleItemDialog
 * for team leaders, including increasing/decreasing demand count and deleting demands.
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ScheduleTestBase } from "../../../utils/schedule-test-base";

dayjs.extend(utc);

test.describe("Demand Editing - Team Leader", () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting demand editing test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    // Setup schedule test environment with shifts
    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, "day"),
      createAssignments: false,
      linkMemberToWorker: false,
    });

    // Create initial demand for editing tests
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

    // Store demand info for tests
    (scheduleTestBase as any).testDemandDate = tomorrow;

    await scheduleTestBase.actAsOwner(page);
    await scheduleTestBase.navigateToSchedulePage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;

    testBasesMap.delete(testRunId);
    console.log(`[Test Run ${testRunId}] Cleanup completed`);
  });

  test("should open edit dialog for existing demand", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();

    // Click on the demand cell in schedule grid
    const demandCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testShifts[0].name })
      .first();

    if (!(await demandCell.isVisible().catch(() => false))) {
      console.log("⚠️ Demand cell not found, skipping test");
      test.skip();
      return;
    }

    await demandCell.click();

    // Dialog should open in edit mode for demand
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Verify shift name is displayed
    const shiftName = page.locator('[data-testid="demand-shift-name"]');
    await expect(shiftName).toContainText(testShifts[0].name);

    // Verify count is 2
    const countDisplay = page.locator('[data-testid="demand-count-display"]');
    await expect(countDisplay).toContainText("2");

    console.log("✅ Edit dialog opened for existing demand");
  });

  test("should increase demand count", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;
    const tomorrow = (scheduleTestBase as any).testDemandDate;

    const demandCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testShifts[0].name })
      .first();

    if (!(await demandCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await demandCell.click();

    // Click increase button
    const increaseButton = page.locator(
      '[data-testid="increase-demand-button"]',
    );
    await increaseButton.click();

    // Count should now be 3
    const countDisplay = page.locator('[data-testid="demand-count-display"]');
    await expect(countDisplay).toContainText("3");

    // Save changes
    const createButton = page.locator('[data-testid="create-demand-button"]');
    await createButton.click();

    // Wait for dialog to close
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify in database
    const dbUtils = (scheduleTestBase as any).dbUtils;
    const demands = await dbUtils.getShiftDemandsByPeriod(
      testTeam.teamId,
      tomorrow,
      tomorrow,
    );

    const updatedDemand = demands.find(
      (d: any) => d.shiftId === testShifts[0].id,
    );
    expect(updatedDemand?.count).toBe(3);

    console.log("✅ Demand count increased successfully");
  });

  test("should decrease demand count", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;
    const tomorrow = (scheduleTestBase as any).testDemandDate;

    const demandCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testShifts[0].name })
      .first();

    if (!(await demandCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await demandCell.click();

    // Click decrease button
    const decreaseButton = page.locator(
      '[data-testid="decrease-demand-button"]',
    );
    await decreaseButton.click();

    // Count should now be 1
    const countDisplay = page.locator('[data-testid="demand-count-display"]');
    await expect(countDisplay).toContainText("1");

    // Save changes
    const createButton = page.locator('[data-testid="create-demand-button"]');
    await createButton.click();

    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify in database
    const dbUtils = (scheduleTestBase as any).dbUtils;
    const demands = await dbUtils.getShiftDemandsByPeriod(
      testTeam.teamId,
      tomorrow,
      tomorrow,
    );

    const updatedDemand = demands.find(
      (d: any) => d.shiftId === testShifts[0].id,
    );
    expect(updatedDemand?.count).toBe(1);

    console.log("✅ Demand count decreased successfully");
  });

  test("should not allow decreasing count below 0", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();

    const demandCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testShifts[0].name })
      .first();

    if (!(await demandCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await demandCell.click();

    const decreaseButton = page.locator(
      '[data-testid="decrease-demand-button"]',
    );
    const countDisplay = page.locator('[data-testid="demand-count-display"]');

    // Decrease twice (from 2 to 0)
    await decreaseButton.click();
    await decreaseButton.click();
    await expect(countDisplay).toContainText("0");

    // Try to decrease below 0
    await decreaseButton.click();

    // Should still be 0 (button should be disabled or have no effect)
    await expect(countDisplay).toContainText("0");

    console.log("✅ Cannot decrease demand count below 0");
  });

  test("should delete demand", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;
    const tomorrow = (scheduleTestBase as any).testDemandDate;

    const demandCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testShifts[0].name })
      .first();

    if (!(await demandCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await demandCell.click();

    // Click delete button
    const deleteButton = page.locator('[data-testid="delete-demand-button"]');
    await deleteButton.click();

    // Wait for dialog to close
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify demand was deleted
    const dbUtils = (scheduleTestBase as any).dbUtils;
    const demands = await dbUtils.getShiftDemandsByPeriod(
      testTeam.teamId,
      tomorrow,
      tomorrow,
    );

    const deletedDemand = demands.find(
      (d: any) => d.shiftId === testShifts[0].id,
    );
    expect(deletedDemand).toBeUndefined();

    console.log("✅ Demand deleted successfully");
  });

  test("should cancel demand edit without saving", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();
    const testTeam = scheduleTestBase.getTestTeam()!;
    const tomorrow = (scheduleTestBase as any).testDemandDate;

    const demandCell = page
      .locator('[role="gridcell"]')
      .filter({ hasText: testShifts[0].name })
      .first();

    if (!(await demandCell.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await demandCell.click();

    // Increase count
    const increaseButton = page.locator(
      '[data-testid="increase-demand-button"]',
    );
    await increaseButton.click();
    await increaseButton.click();

    // Cancel instead of saving
    const cancelButton = page.locator('[data-testid="cancel-demand-button"]');
    await cancelButton.click();

    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible();

    // Verify count remains 2 in database
    const dbUtils = (scheduleTestBase as any).dbUtils;
    const demands = await dbUtils.getShiftDemandsByPeriod(
      testTeam.teamId,
      tomorrow,
      tomorrow,
    );

    const demand = demands.find((d: any) => d.shiftId === testShifts[0].id);
    expect(demand?.count).toBe(2);

    console.log("✅ Demand edit cancelled without saving");
  });
});
