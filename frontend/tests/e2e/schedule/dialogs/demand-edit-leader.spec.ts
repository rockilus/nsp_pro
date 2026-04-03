/**
 * E2E tests for Demand Editing by Team Leader
 *
 * This test suite covers shift demand editing functionality in the ScheduleItemDialog
 * for team leaders, including increasing/decreasing demand count and deleting demands.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { ScheduleTestBase } from '../../../utils/schedule-test-base';

dayjs.extend(utc);

test.describe('Demand Editing - Team Leader', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Test Run ${testRunId}] Starting demand editing test setup`);

    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);

    (testInfo as any).testRunId = testRunId;

    // Setup schedule test environment with shifts
    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: dayjs.utc().add(1, 'day'),
      createAssignments: false,
      linkMemberToWorker: false,
      createShiftDemands: true,
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

  test('should open edit dialog for existing demand', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();

    const demands = await scheduleTestBase.getShiftDemandsByPeriod(
      dayjs.utc(),
      dayjs.utc().add(2, 'months'),
    );
    expect(demands.length).toBeGreaterThan(0);
    const testDemand = demands[0];
    const testDemandDate = dayjs.unix(testDemand.date).utc();
    const testShift = testShifts.find((s) => s.id === testDemand.shiftId);
    expect(testShift).toBeDefined();

    // Set the schedule view to include the date of the occurrence to delete
    await scheduleTestBase.setScheduleViewSettings(
      page,
      {
        targetDate: testDemandDate,
        timeFrame: 'week',
      },
      true, // reload page
    );

    // Click on the demand cell in schedule grid
    const demandCell = page.locator(`[data-testid="demand-cell-${demands[0].id}"]`);
    expect(demandCell).toBeVisible({ timeout: 5000 });

    await demandCell.click();

    // Dialog should open in edit mode for demand
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Verify shift name is displayed
    const shiftName = page.locator('[data-testid="demand-shift-name"]');
    await expect(shiftName).toContainText(testShift!.name);

    // Verify count
    const countDisplay = page.locator('[data-testid="demand-count-display"]');
    await expect(countDisplay).toContainText(testDemand.count.toString());

    console.log('✅ Edit dialog opened for existing demand');
  });

  test('should increase demand count', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();

    const demands = await scheduleTestBase.getShiftDemandsByPeriod(
      dayjs.utc(),
      dayjs.utc().add(2, 'months'),
    );
    expect(demands.length).toBeGreaterThan(0);
    const testDemand = demands[0];
    const testDemandDate = dayjs.unix(testDemand.date).utc();
    const testShift = testShifts.find((s) => s.id === testDemand.shiftId);
    expect(testShift).toBeDefined();

    // Set the schedule view to include the date of the occurrence to delete
    await scheduleTestBase.setScheduleViewSettings(
      page,
      {
        targetDate: testDemandDate,
        timeFrame: 'week',
      },
      true, // reload page
    );

    // Click on the demand cell in schedule grid
    const demandCell = page.locator(`[data-testid="demand-cell-${demands[0].id}"]`);
    expect(demandCell).toBeVisible({ timeout: 5000 });

    await demandCell.click();

    // Dialog should open in edit mode for demand
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    const countDisplay = page.locator('[data-testid="demand-target-count"]');
    await expect(countDisplay).toContainText(testDemand.count.toString());

    // Click increase button
    const increaseButton = page.locator('[data-testid="increase-demand-button"]');
    await increaseButton.click();

    // Count should now be 3
    const countDisplayAfter = page.locator('[data-testid="demand-target-count"]');
    await expect(countDisplayAfter).toContainText((testDemand.count + 1).toString());

    // Verify in database
    const demandsAfter = await scheduleTestBase.getShiftDemandsByPeriod(
      dayjs.utc(),
      dayjs.utc().add(2, 'months'),
    );
    expect(demandsAfter.length).toBeGreaterThan(0);
    const testDemandAfter = demandsAfter.find((d) => d.id === testDemand.id);
    expect(testDemandAfter).toBeDefined();
    expect(testDemandAfter!.count).toBe(testDemand.count + 1);

    console.log('✅ Demand count increased successfully');
  });

  test('should decrease demand count', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();

    const demands = await scheduleTestBase.getShiftDemandsByPeriod(
      dayjs.utc(),
      dayjs.utc().add(2, 'months'),
    );
    expect(demands.length).toBeGreaterThan(0);
    const testDemand = demands[0];
    const testDemandDate = dayjs.unix(testDemand.date).utc();
    const testShift = testShifts.find((s) => s.id === testDemand.shiftId);
    expect(testShift).toBeDefined();

    // Set the schedule view to include the date of the occurrence to delete
    await scheduleTestBase.setScheduleViewSettings(
      page,
      {
        targetDate: testDemandDate,
        timeFrame: 'week',
      },
      true, // reload page
    );

    // Click on the demand cell in schedule grid
    const demandCell = page.locator(`[data-testid="demand-cell-${demands[0].id}"]`);
    expect(demandCell).toBeVisible({ timeout: 5000 });

    await demandCell.click();

    // Dialog should open in edit mode for demand
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    const countDisplay = page.locator('[data-testid="demand-target-count"]');
    await expect(countDisplay).toContainText(testDemand.count.toString());

    // Click increase button
    const increaseButton = page.locator('[data-testid="decrease-demand-button"]');
    await increaseButton.click();

    // Count should now be 3
    const countDisplayAfter = page.locator('[data-testid="demand-target-count"]');
    await expect(countDisplayAfter).toContainText((testDemand.count - 1).toString());

    // Verify in database
    const demandsAfter = await scheduleTestBase.getShiftDemandsByPeriod(
      dayjs.utc(),
      dayjs.utc().add(2, 'months'),
    );
    expect(demandsAfter.length).toBeGreaterThan(0);
    const testDemandAfter = demandsAfter.find((d) => d.id === testDemand.id);
    expect(testDemandAfter).toBeDefined();
    expect(testDemandAfter!.count).toBe(testDemand.count - 1);

    console.log('✅ Demand count decreased successfully');
  });

  test('should not allow decreasing count below 1', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();

    const demands = await scheduleTestBase.getShiftDemandsByPeriod(
      dayjs.utc(),
      dayjs.utc().add(2, 'months'),
    );
    expect(demands.length).toBeGreaterThan(0);
    const testDemand = demands[0];
    const testDemandDate = dayjs.unix(testDemand.date).utc();
    const testShift = testShifts.find((s) => s.id === testDemand.shiftId);
    expect(testShift).toBeDefined();

    // Set the schedule view to include the date of the occurrence to delete
    await scheduleTestBase.setScheduleViewSettings(
      page,
      {
        targetDate: testDemandDate,
        timeFrame: 'week',
      },
      true, // reload page
    );

    // Click on the demand cell in schedule grid
    const demandCell = page.locator(`[data-testid="demand-cell-${demands[0].id}"]`);
    expect(demandCell).toBeVisible({ timeout: 5000 });

    await demandCell.click();

    // Dialog should open in edit mode for demand
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    const countDisplay = page.locator('[data-testid="demand-target-count"]');
    await expect(countDisplay).toContainText(testDemand.count.toString());

    // Click increase button
    const increaseButton = page.locator('[data-testid="decrease-demand-button"]');

    for (let i = 0; i < testDemand.count + 1; i++) {
      await increaseButton.click();
    }

    // Count should now be 3
    const countDisplayAfter = page.locator('[data-testid="demand-target-count"]');
    await expect(countDisplayAfter).toContainText('1');

    await increaseButton.click();

    await expect(countDisplayAfter).toContainText('1');

    // Verify in database
    const demandsAfter = await scheduleTestBase.getShiftDemandsByPeriod(
      dayjs.utc(),
      dayjs.utc().add(2, 'months'),
    );
    expect(demandsAfter.length).toBeGreaterThan(0);
    const testDemandAfter = demandsAfter.find((d) => d.id === testDemand.id);
    expect(testDemandAfter).toBeDefined();
    expect(testDemandAfter!.count).toBe(1);

    console.log('✅ Cannot decrease demand count below 0');
  });

  test('should delete demand', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;
    const testShifts = scheduleTestBase.getTestShifts();

    const demands = await scheduleTestBase.getShiftDemandsByPeriod(
      dayjs.utc(),
      dayjs.utc().add(2, 'months'),
    );
    expect(demands.length).toBeGreaterThan(0);
    const testDemand = demands[0];
    const testDemandDate = dayjs.unix(testDemand.date).utc();
    const testShift = testShifts.find((s) => s.id === testDemand.shiftId);
    expect(testShift).toBeDefined();

    // Set the schedule view to include the date of the occurrence to delete
    await scheduleTestBase.setScheduleViewSettings(
      page,
      {
        targetDate: testDemandDate,
        timeFrame: 'week',
      },
      true, // reload page
    );

    // Click on the demand cell in schedule grid
    const demandCell = page.locator(`[data-testid="demand-cell-${demands[0].id}"]`);
    expect(demandCell).toBeVisible({ timeout: 5000 });

    await demandCell.click();

    // Dialog should open in edit mode for demand
    const dialog = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialog).toBeVisible();

    // Click delete button
    const deleteButton = page.locator('[data-testid="delete-demand-button"]');
    await deleteButton.click();

    // Wait for dialog to close
    const dialogClosed = page.locator('[data-testid="schedule-item-dialog"]');
    await expect(dialogClosed).not.toBeVisible({ timeout: 5000 });

    const demandsAfter = await scheduleTestBase.getShiftDemandsByPeriod(
      dayjs.utc(),
      dayjs.utc().add(2, 'months'),
    );

    const deletedDemand = demandsAfter.find((d) => d.id === testDemand.id);
    expect(deletedDemand).toBeUndefined();

    console.log('✅ Demand deleted successfully');
  });
});
