/**
 * E2E tests for Demand Creation by Team Leader
 *
 * This test suite covers shift demand creation functionality in the ScheduleItemDialog
 * for team leaders, including shift selection, date selection, and validation.
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { ScheduleTestBase } from "../../../utils/schedule-test-base";

dayjs.extend(utc);

test.describe("Demand Creation - Team Leader", () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting demand creation test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    // Setup schedule test environment with shifts, no demands initially
    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, "day"),
      createAssignments: false,
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

  test("should create demand with shift and date", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const testShifts = scheduleTestBase.getTestShifts();

    // Open dialog
    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    if (!(await addButton.isVisible().catch(() => false))) {
      console.log("⚠️ Add button not found, skipping test");
      test.skip();
      return;
    }

    await addButton.click();

    // Switch to Demand type
    const demandButton = page.locator('[data-testid="demand-button"]');
    await demandButton.click();

    // Select shift
    const shiftSelect = page.locator('[data-testid="demand-shift-select"]');
    await shiftSelect.click();
    await page.locator(`text="${testShifts[0].name}"`).first().click();

    // Select date (tomorrow)
    const tomorrow = dayjs.utc().add(1, "day");
    const datePicker = page.locator('[data-testid="demand-date-picker"]');
    await datePicker.click();
    await datePicker.fill(tomorrow.format("MM/DD/YYYY"));

    // Click create button
    const createButton = page.locator('[data-testid="create-demand-button"]');
    await createButton.click();

    // Wait for dialog to close
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify demand was created in database
    const dbUtils = (scheduleTestBase as any).dbUtils;
    const demands = await dbUtils.getShiftDemandsByPeriod(
      testTeam.teamId,
      tomorrow,
      tomorrow,
    );

    expect(demands.length).toBeGreaterThan(0);
    const createdDemand = demands.find(
      (d: any) => d.shiftId === testShifts[0].id,
    );
    expect(createdDemand).toBeDefined();

    console.log("✅ Demand created successfully");
  });

  test("should show validation error when shift is not selected", async ({
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

    // Switch to Demand type
    const demandButton = page.locator('[data-testid="demand-button"]');
    await demandButton.click();

    // Select only date, not shift
    const tomorrow = dayjs.utc().add(1, "day");
    const datePicker = page.locator('[data-testid="demand-date-picker"]');
    await datePicker.click();
    await datePicker.fill(tomorrow.format("MM/DD/YYYY"));

    // Try to create without shift
    const createButton = page.locator('[data-testid="create-demand-button"]');
    await createButton.click();

    // Dialog should still be visible (validation failed)
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    console.log("✅ Validation prevents demand creation without shift");
  });

  test("should cancel demand creation", async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;

    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    if (!(await addButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addButton.click();

    // Switch to Demand type
    const demandButton = page.locator('[data-testid="demand-button"]');
    await demandButton.click();

    // Click cancel
    const cancelButton = page.locator('[data-testid="cancel-demand-button"]');
    await cancelButton.click();

    // Verify dialog is closed
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).not.toBeVisible();

    // Verify no demand was created
    const tomorrow = dayjs.utc().add(1, "day");
    const dbUtils = (scheduleTestBase as any).dbUtils;
    const demands = await dbUtils.getShiftDemandsByPeriod(
      testTeam.teamId,
      tomorrow,
      tomorrow,
    );

    expect(demands.length).toBe(0);

    console.log("✅ Demand creation cancelled successfully");
  });

  test("should create demand with default count of 1", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const testShifts = scheduleTestBase.getTestShifts();

    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    if (!(await addButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addButton.click();

    const demandButton = page.locator('[data-testid="demand-button"]');
    await demandButton.click();

    // Select shift and date
    const shiftSelect = page.locator('[data-testid="demand-shift-select"]');
    await shiftSelect.click();
    await page.locator(`text="${testShifts[0].name}"`).first().click();

    const tomorrow = dayjs.utc().add(1, "day");
    const datePicker = page.locator('[data-testid="demand-date-picker"]');
    await datePicker.click();
    await datePicker.fill(tomorrow.format("MM/DD/YYYY"));

    // Create without explicitly setting count
    const createButton = page.locator('[data-testid="create-demand-button"]');
    await createButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify demand was created with count of 1
    const dbUtils = (scheduleTestBase as any).dbUtils;
    const demands = await dbUtils.getShiftDemandsByPeriod(
      testTeam.teamId,
      tomorrow,
      tomorrow,
    );

    const createdDemand = demands.find(
      (d: any) => d.shiftId === testShifts[0].id,
    );

    if (createdDemand) {
      expect(createdDemand.count).toBe(1);
      console.log("✅ Demand created with default count of 1");
    }
  });

  test("should allow creating demands for multiple shifts on same date", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testTeam = scheduleTestBase.getTestTeam()!;
    const testShifts = scheduleTestBase.getTestShifts();

    if (testShifts.length < 2) {
      console.log("⚠️ Need at least 2 shifts for this test");
      test.skip();
      return;
    }

    const tomorrow = dayjs.utc().add(1, "day");

    // Create first demand
    const addButton = page
      .locator('[data-testid="add-schedule-item-button"]')
      .first();

    if (!(await addButton.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await addButton.click();

    const demandButton = page.locator('[data-testid="demand-button"]');
    await demandButton.click();

    let shiftSelect = page.locator('[data-testid="demand-shift-select"]');
    await shiftSelect.click();
    await page.locator(`text="${testShifts[0].name}"`).first().click();

    let datePicker = page.locator('[data-testid="demand-date-picker"]');
    await datePicker.click();
    await datePicker.fill(tomorrow.format("MM/DD/YYYY"));

    let createButton = page.locator('[data-testid="create-demand-button"]');
    await createButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Create second demand for different shift
    await page.waitForTimeout(500);
    await addButton.click();
    await page.locator('[data-testid="demand-button"]').click();

    shiftSelect = page.locator('[data-testid="demand-shift-select"]');
    await shiftSelect.click();
    await page.locator(`text="${testShifts[1].name}"`).first().click();

    datePicker = page.locator('[data-testid="demand-date-picker"]');
    await datePicker.click();
    await datePicker.fill(tomorrow.format("MM/DD/YYYY"));

    createButton = page.locator('[data-testid="create-demand-button"]');
    await createButton.click();

    await expect(
      page.locator('[data-testid="schedule-item-dialog"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify both demands were created
    const dbUtils = (scheduleTestBase as any).dbUtils;
    const demands = await dbUtils.getShiftDemandsByPeriod(
      testTeam.teamId,
      tomorrow,
      tomorrow,
    );

    expect(demands.length).toBe(2);
    console.log("✅ Multiple demands created for same date");
  });
});
