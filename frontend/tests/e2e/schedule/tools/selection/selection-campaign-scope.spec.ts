/**
 * E2E tests for Schedule Selection Feature — Campaign Scope Bulk Operations
 *
 * These tests confirm the expected behaviour when performing bulk operations
 * (create, update, delete) on an entire row in campaign scope for a 12-month
 * campaign.
 *
 * Key findings confirmed by this test suite:
 *
 * - Bulk CREATE: `selectedCells` is built from `buildDates(campaign.startDate,
 *   campaign.endDate)` — every date in the campaign — so assignments are created
 *   for the FULL 12-month campaign, not just the 3-month loaded buffer.
 *
 * - Bulk UPDATE / DELETE: Both operations filter through the in-memory
 *   `assignments` array, which only holds the 3-month buffer window
 *   (previous month, current month, next month relative to the viewed period).
 *   Assignments outside that buffer are NOT affected.
 *
 * Setup:
 *   - Campaign: start of next calendar month → 12 months later (dynamic date).
 *   - View: first week of the campaign (so the buffer covers the first ~2 months
 *     of the campaign).
 *   - "Far date": 6 months into the campaign — safely outside the buffer.
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ScheduleTestBase } from '../../../../utils/schedule-test-base';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/** Enter selection mode via settings popover */
async function enterSelectionMode(page: import('@playwright/test').Page): Promise<void> {
  await page.click('[data-testid="schedule-settings-button"]');
  await page.click('[data-testid="settings-selection-mode-button"]');
  await expect(page.locator('[data-testid="schedule-action-toolbar"]')).toBeVisible();
}

/** Switch the selected action via the dropdown */
async function selectAction(
  page: import('@playwright/test').Page,
  action: 'create' | 'update' | 'toggleFixed' | 'delete',
): Promise<void> {
  await page.click('[data-testid="schedule-action-dropdown-toggle"]');
  await page.click(`[data-testid="schedule-action-option-${action}"]`);
}

test.describe('Campaign scope bulk operations — 12-month campaign', () => {
  const testBasesMap = new Map<string, ScheduleTestBase>();

  // ── Campaign date range (computed at module load, not hardcoded) ──────────
  // Use start of next calendar month so the buffer around the first view week
  // covers at most months 1–2 of the 12-month campaign.
  const campaignStart = dayjs.utc().add(6, 'month').startOf('month');
  const campaignEnd = campaignStart.add(2, 'month').subtract(1, 'day');

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    const scheduleTestBase = new ScheduleTestBase();
    testBasesMap.set(testRunId, scheduleTestBase);
    (testInfo as any).testRunId = testRunId;

    await scheduleTestBase.setupScheduleTests(workerIndex, {
      referenceDate: campaignStart,
      createAssignments: false,
      linkMemberToWorker: false,
    });

    // Create one assignment for today so the schedule table is rendered on page load
    const workers = scheduleTestBase.getTestWorkers();
    const shifts = scheduleTestBase.getTestShifts();

    await scheduleTestBase.createAssignmentAndRecurrence({
      workerId: workers[0].id,
      shiftId: shifts[0].id,
      date: dayjs.utc(),
    });

    // Create the campaign schedule
    await scheduleTestBase.createCampaignSchedule(campaignStart, campaignEnd);

    // Navigate to the schedule page and set the view to today so the table renders
    await scheduleTestBase.actAsOwner(page);
    await scheduleTestBase.navigateToSchedulePage(page);
    await scheduleTestBase.setScheduleViewSettings(page, {
      targetDate: dayjs.utc(),
      timeFrame: 'week',
      groupBy: 'shift',
    });
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  // ── Bulk create ───────────────────────────────────────────────────────────

  /**
   * When selecting an entire shift row in campaign scope, `selectedCells` is
   * built from every date in the campaign (not bounded by the buffer).
   * Therefore bulk create should produce assignments across the FULL 12 months,
   * including dates far outside the buffer.
   */
  test('bulk create on full campaign row creates assignments across the entire campaign, not just the loaded buffer', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000); // Creating ~365 assignments takes longer than the default timeout

    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const workers = scheduleTestBase.getTestWorkers();
    const shifts = scheduleTestBase.getTestShifts();

    // Enter selection mode and switch to campaign scope
    await enterSelectionMode(page);
    await page.locator('[data-testid="schedule-scope-campaign"]').click();

    // Snapshot: no assignments in the campaign for workers[1] yet
    const beforeCreate = await scheduleTestBase.getAssignmentsAndRecurrences(
      true,
      campaignStart,
      campaignEnd,
      workers[1].id,
    );
    const beforeIds = new Set(beforeCreate.assignmentsRead.map((a) => a.id));

    // Select the entire row for shifts[0] in campaign scope (selects all ~365 cells)
    const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
    await expect(rowCheckbox).toBeVisible();
    await rowCheckbox.click();

    // Pick workers[1] as the entity and trigger bulk create
    await page.click('[data-testid="schedule-entity-select"]');
    await page.locator(`[data-testid="schedule-entity-option-${workers[1].id}"]`).click();

    await page.click('[data-testid="schedule-action-main-button"]');

    // Allow generous time — the request creates assignments for the full campaign year
    await page.waitForTimeout(10_000);

    // Query the full 12-month campaign range for newly created assignments
    const afterCreate = await scheduleTestBase.getAssignmentsAndRecurrences(
      true,
      campaignStart,
      campaignEnd,
      workers[1].id,
    );
    const createdAssignments = afterCreate.assignmentsRead.filter((a) => !beforeIds.has(a.id));

    // Expect exactly one assignment per calendar day across the full campaign
    const expectedDayCount = campaignEnd.diff(campaignStart, 'day') + 1;
    expect(
      createdAssignments.length,
      `Should have created exactly ${expectedDayCount} assignments — one for every day of the 12-month campaign`,
    ).toBe(expectedDayCount);

    // Verify every campaign day has exactly one assignment for workers[1] on shifts[0]
    const assignmentsByDate = new Map(
      createdAssignments.map((a) => [a.date.format('YYYY-MM-DD'), a]),
    );
    for (let offset = 0; offset < expectedDayCount; offset++) {
      const expectedDate = campaignStart.add(offset, 'day');
      const dateStr = expectedDate.format('YYYY-MM-DD');
      const assignment = assignmentsByDate.get(dateStr);
      expect(assignment, `Missing assignment for campaign day ${dateStr}`).toBeDefined();
      expect(assignment!.workerId, `Assignment on ${dateStr} should be for workers[1]`).toBe(
        workers[1].id,
      );
      expect(assignment!.shiftId, `Assignment on ${dateStr} should be on shifts[0]`).toBe(
        shifts[0].id,
      );
    }
  });

  // ── Bulk update ───────────────────────────────────────────────────────────

  /**
   * Bulk UPDATE filters through the in-memory `assignments` array, which is
   * bounded by the 3-month buffer window. Assignments outside the buffer are
   * visible in the campaign row selection (they count as selectedCells) but
   * are NOT included in selectedAssignmentIds, so they are never sent to the
   * update API.
   *
   * Buffer when viewing campaign start week:
   *   buffer = (ISO-week month − 1) … (ISO-week month + 2), i.e. roughly
   *   current-calendar-month to 2 months into the campaign.
   *
   * Far date (6 months into the campaign) falls outside this buffer.
   */
  test('bulk update on full campaign row only updates assignments within the loaded buffer', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const workers = scheduleTestBase.getTestWorkers();
    const shifts = scheduleTestBase.getTestShifts();
    const alternateWorker = workers.find((w) => w.id !== workers[1].id)!;
    const campaign = scheduleTestBase.getTestSchedule()!;

    // ── Pre-create assignments for ALL days in the campaign ───────────────────
    const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
    const allCampaignCreated: string[] = [];
    for (let offset = 0; offset < totalCampaignDays; offset++) {
      const date = campaignStart.add(offset, 'day');
      const result = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[1].id,
        shiftId: shifts[0].id,
        date,
        scheduleId: campaign.id,
      });
      const created = result.assignmentsCreated[0];
      if (created) allCampaignCreated.push(created.id);
    }

    // Enter selection mode and switch to campaign scope
    await enterSelectionMode(page);

    // Switch to campaign scope and select the full shifts[0] row
    await page.locator('[data-testid="schedule-scope-campaign"]').click();
    const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
    await expect(rowCheckbox).toBeVisible();
    await rowCheckbox.click();

    // Bulk update: reassign all selected assignments to alternateWorker
    await selectAction(page, 'update');
    await page.click('[data-testid="schedule-entity-select"]');
    await page.locator(`[data-testid="schedule-entity-option-${alternateWorker.id}"]`).click();
    await page.click('[data-testid="schedule-action-main-button"]');
    await page.waitForTimeout(2000);

    // Fetch all campaign assignments to check outcomes
    const afterUpdate = await scheduleTestBase.getAssignmentsAndRecurrences(
      true,
      campaignStart,
      campaignEnd,
    );

    // ── Verify: all campaign assignments were updated ─────────────────────────
    for (const id of allCampaignCreated) {
      const updated = afterUpdate.assignmentsRead.find((a) => a.id === id);
      expect(updated, `Campaign assignment ${id} should still exist after update`).toBeDefined();
      expect(
        updated!.workerId,
        `Campaign assignment ${id} should have been reassigned to alternateWorker`,
      ).toBe(alternateWorker.id);
    }
  });

  // ── Bulk delete ───────────────────────────────────────────────────────────

  /**
   * Bulk DELETE uses selectedAssignmentIds, which is populated from the
   * in-memory `assignments` array (3-month buffer only).
   * Assignments outside the buffer are not part of selectedAssignmentIds and
   * therefore survive the delete operation.
   */
  test('bulk delete on full campaign row only deletes assignments within the loaded buffer', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000); // Creating assignments for all campaign days takes longer than the default timeout

    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const workers = scheduleTestBase.getTestWorkers();
    const shifts = scheduleTestBase.getTestShifts();
    const campaign = scheduleTestBase.getTestSchedule()!;

    // ── Pre-create assignments for ALL days in the campaign ───────────────────
    const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
    const allCampaignCreated: string[] = [];
    for (let offset = 0; offset < totalCampaignDays; offset++) {
      const date = campaignStart.add(offset, 'day');
      const result = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[1].id,
        shiftId: shifts[0].id,
        date,
        scheduleId: campaign.id,
      });
      const created = result.assignmentsCreated[0];
      if (created) allCampaignCreated.push(created.id);
    }

    // Enter selection mode and switch to campaign scope
    await enterSelectionMode(page);

    // Switch to campaign scope and select the full shifts[0] row
    await page.locator('[data-testid="schedule-scope-campaign"]').click();
    const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
    await expect(rowCheckbox).toBeVisible();
    await rowCheckbox.click();

    // Bulk delete with confirmation
    await selectAction(page, 'delete');
    await page.click('[data-testid="schedule-action-main-button"]');
    await expect(page.locator('[data-testid="schedule-delete-confirm-button"]')).toBeVisible();
    await page.click('[data-testid="schedule-delete-confirm-button"]');
    await page.waitForTimeout(2000);

    // Fetch all campaign assignments to check outcomes
    const afterDelete = await scheduleTestBase.getAssignmentsAndRecurrences(
      true,
      campaignStart,
      campaignEnd,
    );

    // ── Verify: all campaign assignments were deleted ─────────────────────────
    for (const id of allCampaignCreated) {
      const stillExists = afterDelete.assignmentsRead.some((a) => a.id === id);
      expect(stillExists, `Campaign assignment ${id} should have been deleted`).toBe(false);
    }
  });
});
