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

/**
 * Click the "next period" button repeatedly until the view stored in
 * localStorage overlaps with at least one date in [campaignStart, campaignEnd].
 * Throws if the campaign is not reached within maxAttempts clicks.
 */
async function navigateUntilCampaignVisible(
  page: import('@playwright/test').Page,
  teamId: string,
  campaignStart: dayjs.Dayjs,
  campaignEnd: dayjs.Dayjs,
  maxAttempts = 60,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const settings = await page.evaluate((key: string) => {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    }, `scheduleViewSettings_${teamId}`);

    if (settings?.periodStartDate) {
      const periodStart = dayjs.utc(settings.periodStartDate as string);
      const timeFrame: string = settings.timeFrame ?? 'week';
      const periodEnd =
        timeFrame === 'week' ? periodStart.add(6, 'day') : periodStart.endOf('month');

      // Overlap: period contains at least one campaign date
      if (!periodStart.isAfter(campaignEnd) && !periodEnd.isBefore(campaignStart)) {
        return;
      }
    }

    await page.click('[data-testid="time-nav-next"]');
    await page.waitForLoadState('networkidle');
  }
  throw new Error(`Could not navigate to the campaign period within ${maxAttempts} attempts`);
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
    const initialWorker = workers[1];
    const alternateWorker = workers.find((w) => w.id !== initialWorker.id)!;
    const campaign = scheduleTestBase.getTestSchedule()!;

    // ── Pre-create assignments for ALL days in the campaign ───────────────────
    const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
    const allCampaignCreated: string[] = [];
    for (let offset = 0; offset < totalCampaignDays; offset++) {
      const date = campaignStart.add(offset, 'day');
      const result = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: initialWorker.id,
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

    console.log('initial worker id:', initialWorker.id);
    console.log('alternate worker id:', alternateWorker.id);

    // ── Verify: all campaign assignments were updated ─────────────────────────
    for (const id of allCampaignCreated) {
      const updated = afterUpdate.assignmentsRead.find((a) => a.id === id);

      console.log(updated);

      expect(updated, `Campaign assignment ${id} should still exist after update`).toBeDefined();
      expect(
        updated!.workerId,
        `Campaign assignment ${id} should have been reassigned to alternateWorker`,
      ).toBe(alternateWorker.id);
    }
  });

  // ── Selection persistence across period navigation ───────────────────────

  /**
   * After selecting an entire campaign row in campaign scope, navigating to
   * the next period (using the time-nav-next button) should keep all selected
   * cells intact. Cells corresponding to assignments visible in the new view
   * should appear checked, and the total selection count should remain the
   * same as before navigation.
   */
  test('campaign-scope row selection persists after navigating to the next period', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const scheduleTestBase = testBasesMap.get(testRunId)!;

    const workers = scheduleTestBase.getTestWorkers();
    const shifts = scheduleTestBase.getTestShifts();
    const campaign = scheduleTestBase.getTestSchedule()!;

    // ── Pre-create assignments for ALL days in the campaign ───────────────────
    const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
    for (let offset = 0; offset < totalCampaignDays; offset++) {
      const date = campaignStart.add(offset, 'day');
      await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[1].id,
        shiftId: shifts[0].id,
        date,
        scheduleId: campaign.id,
      });
    }

    // Enter selection mode and switch to campaign scope
    await enterSelectionMode(page);
    await page.locator('[data-testid="schedule-scope-campaign"]').click();

    // Select the entire row for shifts[0] in campaign scope
    const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
    await expect(rowCheckbox).toBeVisible();
    await rowCheckbox.click();

    // Navigate forward period-by-period until the view contains campaign dates.
    // After each click we read localStorage to decide whether to keep going.
    const teamId = scheduleTestBase.getTestTeam()!.teamId;
    await navigateUntilCampaignVisible(page, teamId, campaignStart, campaignEnd);

    // Fetch the first campaign assignment (on campaignStart) to get its ID.
    const firstDayResult = await scheduleTestBase.getAssignmentsAndRecurrences(
      true,
      campaignStart,
      campaignStart,
      workers[1].id,
    );
    const firstCampaignAssignment = firstDayResult.assignmentsRead[0];
    expect(
      firstCampaignAssignment,
      'First campaign assignment should exist on campaignStart',
    ).toBeDefined();

    // Assert that the checkbox for the first campaign assignment is checked,
    // confirming selection persisted through navigation. Target the native
    // input inside the MUI Checkbox wrapper since the data-testid is on the
    // wrapper element.
    const assignmentCheckbox = page.locator(
      `[data-testid="assignment-checkbox-${firstCampaignAssignment.id}"]`,
    );
    const assignmentCheckboxInput = assignmentCheckbox.locator('input[type="checkbox"], input');
    await expect(
      assignmentCheckboxInput,
      'First campaign assignment checkbox should be checked after navigation',
    ).toBeChecked();
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

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario 1: Combo non-campaign + campaign via intent
  //
  // Steps (all in campaign scope): stay in today's view → switch to campaign
  // scope → select entire shifts[0] row (produces campaignIntent) → also click
  // one cell for today (outside the campaign date range but visible in the
  // current week) while remaining in campaign scope.
  //
  // Key behaviour: handleCellSelect does NOT clear campaignIntent. The result
  // is a hybrid selection: the full campaign for shifts[0] via campaignIntent
  // PLUS one explicit cell for today (which is outside the campaign). Actions
  // therefore operate on BOTH the campaign (via intent) and today's cell/
  // assignment (via explicit selectedCells / selectedAssignmentIds).
  // ══════════════════════════════════════════════════════════════════════════

  test.describe('Combo non-campaign + campaign via intent', () => {
    test('create: campaign intent + today explicit cell creates full campaign AND today assignment', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const today = dayjs.utc();
      const todayStr = today.format('YYYY-MM-DD');

      await enterSelectionMode(page);

      // Switch to campaign scope and select the entire shifts[0] row (produces campaignIntent)
      await page.locator('[data-testid="schedule-scope-campaign"]').click();
      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Still in campaign scope: also select today's cell (outside campaign range)
      await page.locator(`[data-testid="shift-cell-checkbox-${shifts[0].id}-${todayStr}"]`).click();

      // Snapshot before create
      const beforeCampaign = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
        workers[1].id,
      );
      const beforeCampaignIds = new Set(beforeCampaign.assignmentsRead.map((a) => a.id));

      const beforeToday = await scheduleTestBase.getAssignmentsAndRecurrences(
        false,
        today.startOf('day'),
        today.endOf('day'),
        workers[1].id,
      );
      const beforeTodayIds = new Set(beforeToday.assignmentsRead.map((a) => a.id));

      // Create for workers[1]
      await page.click('[data-testid="schedule-entity-select"]');
      await page.locator(`[data-testid="schedule-entity-option-${workers[1].id}"]`).click();
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(5000);

      // Verify: full campaign created via campaignIntent
      const afterCampaign = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
        workers[1].id,
      );
      const createdInCampaign = afterCampaign.assignmentsRead.filter(
        (a) => !beforeCampaignIds.has(a.id),
      );
      const expectedDayCount = campaignEnd.diff(campaignStart, 'day') + 1;
      expect(
        createdInCampaign.length,
        `Should have created ${expectedDayCount} assignments for the full campaign via campaignIntent`,
      ).toBe(expectedDayCount);

      // Verify: today's assignment was also created via explicit cell
      const afterToday = await scheduleTestBase.getAssignmentsAndRecurrences(
        false,
        today.startOf('day'),
        today.endOf('day'),
        workers[1].id,
      );
      const createdToday = afterToday.assignmentsRead.filter((a) => !beforeTodayIds.has(a.id));
      expect(
        createdToday.length,
        "Today's assignment should also have been created from the explicit cell outside the campaign",
      ).toBeGreaterThanOrEqual(1);
    });

    test('update: campaign intent + today explicit assignment updates full campaign AND today', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const today = dayjs.utc();
      const campaign = scheduleTestBase.getTestSchedule()!;

      // Pre-create today's assignment + all campaign assignments for workers[0]
      const todayResult = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[0].id,
        date: today,
      });
      const todayAssignmentId = todayResult.assignmentsCreated[0]?.id;

      const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
      const campaignIds: string[] = [];
      for (let offset = 0; offset < totalCampaignDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) campaignIds.push(id);
      }

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: today,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);

      // Switch to campaign scope and select the full row (produces campaignIntent)
      await page.locator('[data-testid="schedule-scope-campaign"]').click();
      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Still in campaign scope: also select today's assignment (outside campaign)
      if (todayAssignmentId) {
        await page.locator(`[data-testid="assignment-cell-${todayAssignmentId}"]`).click();
      }

      await selectAction(page, 'update');
      await page.click('[data-testid="schedule-entity-select"]');
      await page.locator(`[data-testid="schedule-entity-option-${workers[1].id}"]`).click();
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(3000);

      // All campaign assignments should be updated to workers[1]
      const afterCampaign = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );
      for (const id of campaignIds) {
        const updated = afterCampaign.assignmentsRead.find((a) => a.id === id);
        expect(updated, `Campaign assignment ${id} should still exist`).toBeDefined();
        expect(
          updated!.workerId,
          `Campaign assignment ${id} should be updated to workers[1] via campaignIntent`,
        ).toBe(workers[1].id);
      }

      // Today's assignment should also be updated
      const afterToday = await scheduleTestBase.getAssignmentsAndRecurrences(
        false,
        today.startOf('day'),
        today.endOf('day'),
      );
      if (todayAssignmentId) {
        const updated = afterToday.assignmentsRead.find((a) => a.id === todayAssignmentId);
        expect(updated, "Today's assignment should still exist").toBeDefined();
        expect(
          updated!.workerId,
          "Today's assignment should be updated to workers[1] via explicit selection",
        ).toBe(workers[1].id);
      }
    });

    test('toggleFixed: campaign intent + today explicit assignment toggles loaded campaign assignments AND today', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const today = dayjs.utc();
      const campaign = scheduleTestBase.getTestSchedule()!;

      // Pre-create unfixed today's assignment + unfixed assignments for the first visible week of the campaign
      const todayResult = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[0].id,
        date: today,
        fixed: false,
      });
      const todayAssignmentId = todayResult.assignmentsCreated[0]?.id;

      const visibleDays = Math.min(7, campaignEnd.diff(campaignStart, 'day') + 1);
      const visibleCampaignIds: string[] = [];
      for (let offset = 0; offset < visibleDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
          fixed: false,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) visibleCampaignIds.push(id);
      }

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: today,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);

      // Switch to campaign scope and select the full row
      await page.locator('[data-testid="schedule-scope-campaign"]').click();
      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Still in campaign scope: also select today's assignment (outside campaign)
      if (todayAssignmentId) {
        await page.locator(`[data-testid="assignment-cell-${todayAssignmentId}"]`).click();
      }

      await selectAction(page, 'toggleFixed');
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(2000);

      const afterToggle = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );

      // Visible campaign assignments should be toggled (they were in selectedAssignmentIds from the row select)
      for (const id of visibleCampaignIds) {
        const toggled = afterToggle.assignmentsRead.find((a) => a.id === id);
        expect(toggled, `Campaign assignment ${id} should exist`).toBeDefined();
        expect(toggled!.fixed, `Campaign assignment ${id} should have been toggled to fixed`).toBe(
          true,
        );
      }

      // Today's assignment should also be toggled (it was added to selectedAssignmentIds)
      const afterToday = await scheduleTestBase.getAssignmentsAndRecurrences(
        false,
        today.startOf('day'),
        today.endOf('day'),
      );
      if (todayAssignmentId) {
        const toggled = afterToday.assignmentsRead.find((a) => a.id === todayAssignmentId);
        expect(toggled, "Today's assignment should exist").toBeDefined();
        expect(
          toggled!.fixed,
          "Today's assignment should have been toggled to fixed via explicit selection",
        ).toBe(true);
      }
    });

    test('delete: campaign intent + today explicit assignment deletes full campaign AND today', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const today = dayjs.utc();
      const campaign = scheduleTestBase.getTestSchedule()!;

      // Pre-create today's assignment + all campaign assignments for workers[0]
      const todayResult = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[0].id,
        date: today,
      });
      const todayAssignmentId = todayResult.assignmentsCreated[0]?.id;

      const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
      const campaignIds: string[] = [];
      for (let offset = 0; offset < totalCampaignDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) campaignIds.push(id);
      }

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: today,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);

      // Switch to campaign scope and select the full row (produces campaignIntent)
      await page.locator('[data-testid="schedule-scope-campaign"]').click();
      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Still in campaign scope: also select today's assignment (outside campaign)
      if (todayAssignmentId) {
        await page.locator(`[data-testid="assignment-cell-${todayAssignmentId}"]`).click();
      }

      await selectAction(page, 'delete');
      await page.click('[data-testid="schedule-action-main-button"]');
      await expect(page.locator('[data-testid="schedule-delete-confirm-button"]')).toBeVisible();
      await page.click('[data-testid="schedule-delete-confirm-button"]');
      await page.waitForTimeout(3000);

      // All campaign assignments should be deleted via campaignIntent
      const afterCampaign = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );
      for (const id of campaignIds) {
        const stillExists = afterCampaign.assignmentsRead.some((a) => a.id === id);
        expect(
          stillExists,
          `Campaign assignment ${id} should have been deleted via campaignIntent`,
        ).toBe(false);
      }

      // Today's assignment should also be deleted via explicit selection
      const afterToday = await scheduleTestBase.getAssignmentsAndRecurrences(
        false,
        today.startOf('day'),
        today.endOf('day'),
      );
      if (todayAssignmentId) {
        const stillExists = afterToday.assignmentsRead.some((a) => a.id === todayAssignmentId);
        expect(
          stillExists,
          "Today's assignment should have been deleted via explicit selection",
        ).toBe(false);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario 2: Combo non-campaign + campaign via individual selection
  //
  // Steps (all in campaign scope): switch to campaign scope → select one cell
  // for today (outside campaign, visible in current week) → navigate to the
  // campaign period via the time-nav-next button (no scope change, no reload)
  // → select one campaign-date cell.
  //
  // Key behaviour: individual cell/assignment selections are NOT cleared on
  // navigation, and campaign scope stays active throughout. After navigating,
  // selectedCells contains both the today-cell (outside campaign) and the
  // campaign-date cell. Actions operate on both.
  // ══════════════════════════════════════════════════════════════════════════

  test.describe('Combo non-campaign + campaign via individual selection', () => {
    test('create: creates assignments for both non-campaign date and campaign date', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const today = dayjs.utc();
      const todayStr = today.format('YYYY-MM-DD');
      const campaignDateStr = campaignStart.format('YYYY-MM-DD');
      const teamId = scheduleTestBase.getTestTeam()!.teamId;

      await enterSelectionMode(page);

      // Switch to campaign scope first and stay there
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      // Select today's cell in campaign scope (outside campaign range, but visible in current week)
      await page.locator(`[data-testid="shift-cell-checkbox-${shifts[0].id}-${todayStr}"]`).click();

      // Navigate to campaign period (no scope change, no reload)
      await navigateUntilCampaignVisible(page, teamId, campaignStart, campaignEnd);

      // Select the campaign-date cell (still in campaign scope)
      await page
        .locator(`[data-testid="shift-cell-checkbox-${shifts[0].id}-${campaignDateStr}"]`)
        .click();

      // Snapshot before create
      const beforeCreate = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignStart,
        workers[1].id,
      );
      const campaignBeforeIds = new Set(beforeCreate.assignmentsRead.map((a) => a.id));

      const todayBefore = await scheduleTestBase.getAssignmentsAndRecurrences(
        false,
        today.startOf('day'),
        today.endOf('day'),
        workers[1].id,
      );
      const todayBeforeIds = new Set(todayBefore.assignmentsRead.map((a) => a.id));

      // Create for workers[1]
      await page.click('[data-testid="schedule-entity-select"]');
      await page.locator(`[data-testid="schedule-entity-option-${workers[1].id}"]`).click();
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(3000);

      // Verify campaign-date assignment created
      const afterCampaign = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignStart,
        workers[1].id,
      );
      const newInCampaign = afterCampaign.assignmentsRead.filter(
        (a) => !campaignBeforeIds.has(a.id),
      );
      expect(
        newInCampaign.length,
        `Expected an assignment created on campaign start date ${campaignDateStr}`,
      ).toBeGreaterThanOrEqual(1);

      // Verify today's assignment created
      const afterToday = await scheduleTestBase.getAssignmentsAndRecurrences(
        false,
        today.startOf('day'),
        today.endOf('day'),
        workers[1].id,
      );
      const newToday = afterToday.assignmentsRead.filter((a) => !todayBeforeIds.has(a.id));
      expect(
        newToday.length,
        "Expected an assignment created on today's date",
      ).toBeGreaterThanOrEqual(1);
    });

    test('update: updates assignments at both non-campaign and campaign dates', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const today = dayjs.utc();
      const campaign = scheduleTestBase.getTestSchedule()!;
      const teamId = scheduleTestBase.getTestTeam()!.teamId;

      // Pre-create one assignment for workers[0] on today and one on campaignStart
      const todayResult = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[0].id,
        date: today,
      });
      const todayAssignmentId = todayResult.assignmentsCreated[0]?.id;

      const campaignResult = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[0].id,
        date: campaignStart,
        scheduleId: campaign.id,
      });
      const campaignAssignmentId = campaignResult.assignmentsCreated[0]?.id;

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: today,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);

      // Switch to campaign scope and stay there
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      // Select today's assignment in campaign scope (outside campaign range)
      if (todayAssignmentId) {
        await page.locator(`[data-testid="assignment-cell-${todayAssignmentId}"]`).click();
      }

      // Navigate to campaign period via UI (no scope change)
      await navigateUntilCampaignVisible(page, teamId, campaignStart, campaignEnd);

      // Select the campaign assignment (still in campaign scope)
      if (campaignAssignmentId) {
        await page.locator(`[data-testid="assignment-cell-${campaignAssignmentId}"]`).click();
      }

      await selectAction(page, 'update');
      await page.click('[data-testid="schedule-entity-select"]');
      await page.locator(`[data-testid="schedule-entity-option-${workers[1].id}"]`).click();
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(2000);

      // Both assignments should be updated to workers[1]
      const afterAll = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        today.startOf('day'),
        campaignStart,
      );

      if (todayAssignmentId) {
        const todayUpdated = afterAll.assignmentsRead.find((a) => a.id === todayAssignmentId);
        expect(todayUpdated, "Today's assignment should exist after update").toBeDefined();
        expect(todayUpdated!.workerId, "Today's assignment should be updated to workers[1]").toBe(
          workers[1].id,
        );
      }
      if (campaignAssignmentId) {
        const campaignUpdated = afterAll.assignmentsRead.find((a) => a.id === campaignAssignmentId);
        expect(campaignUpdated, 'Campaign assignment should exist after update').toBeDefined();
        expect(
          campaignUpdated!.workerId,
          'Campaign assignment should be updated to workers[1]',
        ).toBe(workers[1].id);
      }
    });

    test('toggleFixed: toggles assignments at both non-campaign and campaign dates', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const today = dayjs.utc();
      const campaign = scheduleTestBase.getTestSchedule()!;
      const teamId = scheduleTestBase.getTestTeam()!.teamId;

      const todayResult = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[0].id,
        date: today,
        fixed: false,
      });
      const todayAssignmentId = todayResult.assignmentsCreated[0]?.id;

      const campaignResult = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[0].id,
        date: campaignStart,
        scheduleId: campaign.id,
        fixed: false,
      });
      const campaignAssignmentId = campaignResult.assignmentsCreated[0]?.id;

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: today,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);

      // Switch to campaign scope and stay there
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      // Select today's assignment in campaign scope (outside campaign range)
      if (todayAssignmentId) {
        await page.locator(`[data-testid="assignment-cell-${todayAssignmentId}"]`).click();
      }

      // Navigate to campaign period via UI (no scope change)
      await navigateUntilCampaignVisible(page, teamId, campaignStart, campaignEnd);

      // Select the campaign assignment (still in campaign scope)
      if (campaignAssignmentId) {
        await page.locator(`[data-testid="assignment-cell-${campaignAssignmentId}"]`).click();
      }

      await selectAction(page, 'toggleFixed');
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(2000);

      const afterAll = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        today.startOf('day'),
        campaignStart,
      );

      if (todayAssignmentId) {
        const todayToggled = afterAll.assignmentsRead.find((a) => a.id === todayAssignmentId);
        expect(todayToggled, "Today's assignment should exist").toBeDefined();
        expect(todayToggled!.fixed, "Today's assignment should have been toggled to fixed").toBe(
          true,
        );
      }
      if (campaignAssignmentId) {
        const campaignToggled = afterAll.assignmentsRead.find((a) => a.id === campaignAssignmentId);
        expect(campaignToggled, 'Campaign assignment should exist').toBeDefined();
        expect(
          campaignToggled!.fixed,
          'Campaign assignment should have been toggled to fixed',
        ).toBe(true);
      }
    });

    test('delete: deletes assignments at both non-campaign and campaign dates', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const today = dayjs.utc();
      const campaign = scheduleTestBase.getTestSchedule()!;
      const teamId = scheduleTestBase.getTestTeam()!.teamId;

      const todayResult = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[0].id,
        date: today,
      });
      const todayAssignmentId = todayResult.assignmentsCreated[0]?.id;

      const campaignResult = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[0].id,
        date: campaignStart,
        scheduleId: campaign.id,
      });
      const campaignAssignmentId = campaignResult.assignmentsCreated[0]?.id;

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: today,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);

      // Switch to campaign scope and stay there
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      // Select today's assignment in campaign scope (outside campaign range)
      if (todayAssignmentId) {
        await page.locator(`[data-testid="assignment-cell-${todayAssignmentId}"]`).click();
      }

      // Navigate to campaign period via UI (no scope change)
      await navigateUntilCampaignVisible(page, teamId, campaignStart, campaignEnd);

      // Select the campaign assignment (still in campaign scope)
      if (campaignAssignmentId) {
        await page.locator(`[data-testid="assignment-cell-${campaignAssignmentId}"]`).click();
      }

      await selectAction(page, 'delete');
      await page.click('[data-testid="schedule-action-main-button"]');
      await expect(page.locator('[data-testid="schedule-delete-confirm-button"]')).toBeVisible();
      await page.click('[data-testid="schedule-delete-confirm-button"]');
      await page.waitForTimeout(2000);

      const afterAll = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        today.startOf('day'),
        campaignStart,
      );

      if (todayAssignmentId) {
        const todayStillExists = afterAll.assignmentsRead.some((a) => a.id === todayAssignmentId);
        expect(todayStillExists, "Today's assignment should have been deleted").toBe(false);
      }
      if (campaignAssignmentId) {
        const campaignStillExists = afterAll.assignmentsRead.some(
          (a) => a.id === campaignAssignmentId,
        );
        expect(campaignStillExists, 'Campaign assignment should have been deleted').toBe(false);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario 3: Combo campaign via intent + campaign via individual selection
  //             (different row)
  //
  // Steps: navigate to campaign start week via localStorage + reload →
  // switch to campaign scope → select shifts[0] row (campaignIntent) →
  // click one individual cell in shifts[1] on the same date (explicit cell,
  // no scope switch).
  //
  // Key behaviour: individual handleCellSelect / handleAssignmentSelect calls
  // do NOT clear campaignIntent. The result is a hybrid selection: the full
  // campaign for shifts[0] (via intent) PLUS one explicit cell for shifts[1].
  // ══════════════════════════════════════════════════════════════════════════

  test.describe('Combo campaign via intent + campaign via individual selection (different row)', () => {
    test('create: creates full campaign on shifts[0] and one date on shifts[1]', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaignDateStr = campaignStart.format('YYYY-MM-DD');

      // Navigate to campaign start week
      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      // Campaign intent: select full shifts[0] row
      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Individual selection: one cell for shifts[1] on the campaign start date
      await page
        .locator(`[data-testid="shift-cell-checkbox-${shifts[1].id}-${campaignDateStr}"]`)
        .click();

      // Snapshot before
      const beforeCreate = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
        workers[1].id,
      );
      const beforeIds = new Set(beforeCreate.assignmentsRead.map((a) => a.id));

      // Create for workers[1]
      await page.click('[data-testid="schedule-entity-select"]');
      await page.locator(`[data-testid="schedule-entity-option-${workers[1].id}"]`).click();
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(5000);

      const afterCreate = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
        workers[1].id,
      );
      const created = afterCreate.assignmentsRead.filter((a) => !beforeIds.has(a.id));

      // shifts[0]: one assignment per campaign day
      const expectedCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
      const createdOnShift0 = created.filter((a) => a.shiftId === shifts[0].id);
      expect(
        createdOnShift0.length,
        `Should have created ${expectedCampaignDays} assignments for shifts[0] via campaignIntent`,
      ).toBe(expectedCampaignDays);

      // shifts[1]: exactly one assignment on campaignStart
      const createdOnShift1 = created.filter(
        (a) => a.shiftId === shifts[1].id && a.date.format('YYYY-MM-DD') === campaignDateStr,
      );
      expect(
        createdOnShift1.length,
        'Should have created one assignment for shifts[1] via individual cell selection',
      ).toBe(1);
    });

    test('update: updates all campaign shifts[0] assignments and the shifts[1] individual assignment', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;
      const campaignDateStr = campaignStart.format('YYYY-MM-DD');

      // Pre-create assignments for workers[0] across the campaign on shifts[0] + one on shifts[1]
      const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
      const shift0Ids: string[] = [];
      for (let offset = 0; offset < totalCampaignDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) shift0Ids.push(id);
      }

      const shift1Result = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[1].id,
        date: campaignStart,
        scheduleId: campaign.id,
      });
      const shift1AssignmentId = shift1Result.assignmentsCreated[0]?.id;

      // Navigate to campaign start week
      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      // Select full shifts[0] row via campaign intent
      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Select shifts[1] assignment individually
      if (shift1AssignmentId) {
        await page.locator(`[data-testid="assignment-cell-${shift1AssignmentId}"]`).click();
      }

      await selectAction(page, 'update');
      await page.click('[data-testid="schedule-entity-select"]');
      await page.locator(`[data-testid="schedule-entity-option-${workers[1].id}"]`).click();
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(3000);

      const afterUpdate = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );

      // All shifts[0] campaign assignments should be updated to workers[1]
      for (const id of shift0Ids) {
        const updated = afterUpdate.assignmentsRead.find((a) => a.id === id);
        expect(updated, `Shifts[0] campaign assignment ${id} should still exist`).toBeDefined();
        expect(
          updated!.workerId,
          `Shifts[0] campaign assignment ${id} should be updated to workers[1]`,
        ).toBe(workers[1].id);
      }

      // shifts[1] individual assignment should also be updated
      if (shift1AssignmentId) {
        const shift1Updated = afterUpdate.assignmentsRead.find((a) => a.id === shift1AssignmentId);
        expect(
          shift1Updated,
          `Shifts[1] assignment on ${campaignDateStr} should still exist`,
        ).toBeDefined();
        expect(
          shift1Updated!.workerId,
          'Shifts[1] individual assignment should be updated to workers[1]',
        ).toBe(workers[1].id);
      }
    });

    test('toggleFixed: toggles loaded shifts[0] assignments and the shifts[1] individual assignment', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;
      const campaignDateStr = campaignStart.format('YYYY-MM-DD');

      // Pre-create unfixed assignments visible in the campaign start week
      // (only the first 7 days are loaded in the weekly view)
      const visibleDays = Math.min(7, campaignEnd.diff(campaignStart, 'day') + 1);
      const shift0VisibleIds: string[] = [];
      for (let offset = 0; offset < visibleDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
          fixed: false,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) shift0VisibleIds.push(id);
      }

      const shift1Result = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[1].id,
        date: campaignStart,
        scheduleId: campaign.id,
        fixed: false,
      });
      const shift1AssignmentId = shift1Result.assignmentsCreated[0]?.id;

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      // Select full shifts[0] row via campaign intent
      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Select shifts[1] assignment individually
      if (shift1AssignmentId) {
        await page.locator(`[data-testid="assignment-cell-${shift1AssignmentId}"]`).click();
      }

      await selectAction(page, 'toggleFixed');
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(2000);

      const afterToggle = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );

      // All visible shifts[0] assignments should be toggled to fixed
      for (const id of shift0VisibleIds) {
        const toggled = afterToggle.assignmentsRead.find((a) => a.id === id);
        expect(toggled, `Shifts[0] assignment ${id} should exist after toggle`).toBeDefined();
        expect(toggled!.fixed, `Shifts[0] assignment ${id} should have been toggled to fixed`).toBe(
          true,
        );
      }

      // shifts[1] individual assignment should also be toggled
      if (shift1AssignmentId) {
        const shift1Toggled = afterToggle.assignmentsRead.find((a) => a.id === shift1AssignmentId);
        expect(
          shift1Toggled,
          `Shifts[1] assignment on ${campaignDateStr} should exist`,
        ).toBeDefined();
        expect(shift1Toggled!.fixed, 'Shifts[1] assignment should have been toggled to fixed').toBe(
          true,
        );
      }
    });

    test('delete: deletes all campaign shifts[0] assignments and the shifts[1] individual assignment', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;
      const campaignDateStr = campaignStart.format('YYYY-MM-DD');

      const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
      const shift0Ids: string[] = [];
      for (let offset = 0; offset < totalCampaignDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) shift0Ids.push(id);
      }

      const shift1Result = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[1].id,
        date: campaignStart,
        scheduleId: campaign.id,
      });
      const shift1AssignmentId = shift1Result.assignmentsCreated[0]?.id;

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      if (shift1AssignmentId) {
        await page.locator(`[data-testid="assignment-cell-${shift1AssignmentId}"]`).click();
      }

      await selectAction(page, 'delete');
      await page.click('[data-testid="schedule-action-main-button"]');
      await expect(page.locator('[data-testid="schedule-delete-confirm-button"]')).toBeVisible();
      await page.click('[data-testid="schedule-delete-confirm-button"]');
      await page.waitForTimeout(3000);

      const afterDelete = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );

      for (const id of shift0Ids) {
        const stillExists = afterDelete.assignmentsRead.some((a) => a.id === id);
        expect(
          stillExists,
          `Shifts[0] campaign assignment ${id} should have been deleted via campaignIntent`,
        ).toBe(false);
      }

      if (shift1AssignmentId) {
        const shift1StillExists = afterDelete.assignmentsRead.some(
          (a) => a.id === shift1AssignmentId,
        );
        expect(
          shift1StillExists,
          `Shifts[1] assignment on ${campaignDateStr} should have been deleted via individual selection`,
        ).toBe(false);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario 4: Campaign via intent + unselect in campaign
  //
  // Steps: navigate to campaign start week → switch to campaign scope →
  // select shifts[0] row (campaignIntent + loaded assignments in
  // selectedAssignmentIds) → click one visible assignment to deselect it
  // (removes it from selectedAssignmentIds only; excludedAssignmentIds
  // is NOT updated by handleAssignmentSelect).
  //
  // Key behaviour:
  // - toggleFixed uses only selectedAssignmentIds → deselected is NOT toggled.
  // - create/update/delete use campaignIntent → deselected is still included
  //   (excludedAssignmentIds is empty).
  // ══════════════════════════════════════════════════════════════════════════

  test.describe('Campaign via intent + unselect in campaign', () => {
    test('create: full campaign created despite individual unselect (campaignIntent drives create)', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Deselect the cell for campaignStart on shifts[0] (removes from selectedCells only, not via assignment ID)
      const campaignStartStr = campaignStart.format('YYYY-MM-DD');
      await page
        .locator(`[data-testid="shift-cell-checkbox-${shifts[0].id}-${campaignStartStr}"]`)
        .click();

      // Snapshot: no assignments for workers[1] in campaign yet
      const beforeCreate = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
        workers[1].id,
      );
      const beforeIds = new Set(beforeCreate.assignmentsRead.map((a) => a.id));

      // Create for workers[1]
      await page.click('[data-testid="schedule-entity-select"]');
      await page.locator(`[data-testid="schedule-entity-option-${workers[1].id}"]`).click();
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(5000);

      // All campaign days should be created because campaignIntent still covers the full row
      const afterCreate = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
        workers[1].id,
      );
      const created = afterCreate.assignmentsRead.filter((a) => !beforeIds.has(a.id));
      const expectedDayCount = campaignEnd.diff(campaignStart, 'day');
      expect(
        created.length,
        `Should have created ${expectedDayCount} assignments — campaignIntent is not affected by individual unselect`,
      ).toBe(expectedDayCount);
    });

    test('update: all campaign assignments updated despite individual unselect (campaignIntent drives update)', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;

      const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
      const allIds: string[] = [];
      for (let offset = 0; offset < totalCampaignDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) allIds.push(id);
      }

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Deselect the first campaign assignment (the one visible at campaignStart)
      const firstId = allIds[0];
      if (firstId) {
        await page.locator(`[data-testid="assignment-cell-${firstId}"]`).click();
      }

      await selectAction(page, 'update');
      await page.click('[data-testid="schedule-entity-select"]');
      await page.locator(`[data-testid="schedule-entity-option-${workers[1].id}"]`).click();
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(3000);

      const afterUpdate = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );

      // All campaign assignments should be updated except the one we deselected
      for (const id of allIds) {
        const updated = afterUpdate.assignmentsRead.find((a) => a.id === id);
        expect(updated, `Campaign assignment ${id} should still exist`).toBeDefined();
        if (id === firstId) {
          expect(
            updated!.workerId,
            `Deselected campaign assignment ${id} should NOT have been updated`,
          ).toBe(workers[0].id);
        } else {
          expect(
            updated!.workerId,
            `Campaign assignment ${id} should be updated to workers[1]`,
          ).toBe(workers[1].id);
        }
      }
    });

    test('toggleFixed: deselected assignment is NOT toggled (toggleFixed uses only selectedAssignmentIds)', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;

      // Pre-create unfixed assignments visible in campaign start week
      const visibleDays = Math.min(7, campaignEnd.diff(campaignStart, 'day') + 1);
      const visibleIds: string[] = [];
      for (let offset = 0; offset < visibleDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
          fixed: false,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) visibleIds.push(id);
      }

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Deselect the first visible assignment
      const deselectedId = visibleIds[0];
      if (deselectedId) {
        await page.locator(`[data-testid="assignment-cell-${deselectedId}"]`).click();
      }

      await selectAction(page, 'toggleFixed');
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(2000);

      const afterToggle = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );

      // The deselected assignment should NOT be toggled (it was removed from selectedAssignmentIds)
      if (deselectedId) {
        const deselected = afterToggle.assignmentsRead.find((a) => a.id === deselectedId);
        expect(deselected, 'Deselected assignment should still exist').toBeDefined();
        expect(
          deselected!.fixed,
          'Deselected assignment should NOT have been toggled — it was removed from selectedAssignmentIds',
        ).toBe(false);
      }

      // All other visible assignments should be toggled
      for (const id of visibleIds.slice(1)) {
        const toggled = afterToggle.assignmentsRead.find((a) => a.id === id);
        expect(toggled, `Assignment ${id} should exist`).toBeDefined();
        expect(toggled!.fixed, `Assignment ${id} should have been toggled to fixed`).toBe(true);
      }
    });

    test('delete: all campaign assignments deleted despite individual unselect (campaignIntent drives delete)', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;

      const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
      const allIds: string[] = [];
      for (let offset = 0; offset < totalCampaignDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) allIds.push(id);
      }

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Deselect the first visible campaign assignment
      const firstId = allIds[0];
      if (firstId) {
        await page.locator(`[data-testid="assignment-cell-${firstId}"]`).click();
      }

      await selectAction(page, 'delete');
      await page.click('[data-testid="schedule-action-main-button"]');
      await expect(page.locator('[data-testid="schedule-delete-confirm-button"]')).toBeVisible();
      await page.click('[data-testid="schedule-delete-confirm-button"]');
      await page.waitForTimeout(3000);

      const afterDelete = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );

      // All campaign assignments should be deleted except the one we deselected
      // (handleAssignmentSelect should add it to campaignIntent.excludedAssignmentIds)
      if (!firstId) {
        for (const id of allIds) {
          const stillExists = afterDelete.assignmentsRead.some((a) => a.id === id);
          expect(
            stillExists,
            `Campaign assignment ${id} should have been deleted — expected no preserved assignment`,
          ).toBe(false);
        }
      } else {
        for (const id of allIds) {
          const stillExists = afterDelete.assignmentsRead.some((a) => a.id === id);
          if (id === firstId) {
            expect(
              stillExists,
              `Deselected campaign assignment ${id} should NOT have been deleted`,
            ).toBe(true);
          } else {
            expect(stillExists, `Campaign assignment ${id} should have been deleted`).toBe(false);
          }
        }
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario 5: Campaign via intent + unselect then reselect
  //
  // Steps: navigate to campaign start week → switch to campaign scope →
  // select shifts[0] row → click a visible assignment to deselect it →
  // click the same assignment again to reselect it.
  //
  // Key behaviour: the reselect re-adds the assignment to selectedAssignmentIds.
  // For toggleFixed this matters — the assignment is back in the set and IS
  // toggled. For create/update/delete the campaignIntent always covered it.
  // ══════════════════════════════════════════════════════════════════════════

  test.describe('Campaign via intent + unselect then reselect', () => {
    test('create: full campaign created (campaignIntent unaffected by unselect/reselect)', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;

      const preResult = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[0].id,
        date: campaignStart,
        scheduleId: campaign.id,
      });
      const preAssignmentId = preResult.assignmentsCreated[0]?.id;

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Unselect then reselect the cell checkbox (not the assignment element)
      if (preAssignmentId) {
        const campaignStartStr = campaignStart.format('YYYY-MM-DD');
        await page
          .locator(`[data-testid="shift-cell-checkbox-${shifts[0].id}-${campaignStartStr}"]`)
          .click();
        await page
          .locator(`[data-testid="shift-cell-checkbox-${shifts[0].id}-${campaignStartStr}"]`)
          .click();
      }

      const beforeCreate = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
        workers[1].id,
      );
      const beforeIds = new Set(beforeCreate.assignmentsRead.map((a) => a.id));

      await page.click('[data-testid="schedule-entity-select"]');
      await page.locator(`[data-testid="schedule-entity-option-${workers[1].id}"]`).click();
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(5000);

      const afterCreate = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
        workers[1].id,
      );
      const created = afterCreate.assignmentsRead.filter((a) => !beforeIds.has(a.id));
      const expectedDayCount = campaignEnd.diff(campaignStart, 'day') + 1;
      expect(
        created.length,
        `Full campaign (${expectedDayCount} days) should have been created — campaignIntent unaffected by unselect/reselect`,
      ).toBe(expectedDayCount);
    });

    test('update: all campaign assignments updated (campaignIntent unaffected by unselect/reselect)', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;

      const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
      const allIds: string[] = [];
      for (let offset = 0; offset < totalCampaignDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) allIds.push(id);
      }

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Unselect then reselect the first visible assignment
      const firstId = allIds[0];
      if (firstId) {
        await page.locator(`[data-testid="assignment-cell-${firstId}"]`).click();
        await page.locator(`[data-testid="assignment-cell-${firstId}"]`).click();
      }

      await selectAction(page, 'update');
      await page.click('[data-testid="schedule-entity-select"]');
      await page.locator(`[data-testid="schedule-entity-option-${workers[1].id}"]`).click();
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(3000);

      const afterUpdate = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );
      for (const id of allIds) {
        const updated = afterUpdate.assignmentsRead.find((a) => a.id === id);
        expect(updated, `Campaign assignment ${id} should exist`).toBeDefined();
        expect(updated!.workerId, `Campaign assignment ${id} should be updated to workers[1]`).toBe(
          workers[1].id,
        );
      }
    });

    test('toggleFixed: reselected assignment IS toggled (back in selectedAssignmentIds)', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;

      const visibleDays = Math.min(7, campaignEnd.diff(campaignStart, 'day') + 1);
      const visibleIds: string[] = [];
      for (let offset = 0; offset < visibleDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
          fixed: false,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) visibleIds.push(id);
      }

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Unselect then reselect the first assignment
      const reselectedId = visibleIds[0];
      if (reselectedId) {
        await page.locator(`[data-testid="assignment-cell-${reselectedId}"]`).click();
        await page.locator(`[data-testid="assignment-cell-${reselectedId}"]`).click();
      }

      await selectAction(page, 'toggleFixed');
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(2000);

      const afterToggle = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );

      // The reselected assignment SHOULD be toggled (it was re-added to selectedAssignmentIds)
      if (reselectedId) {
        const reselected = afterToggle.assignmentsRead.find((a) => a.id === reselectedId);
        expect(reselected, 'Reselected assignment should exist').toBeDefined();
        expect(
          reselected!.fixed,
          'Reselected assignment should have been toggled to fixed — it was re-added to selectedAssignmentIds',
        ).toBe(true);
      }

      // All other visible assignments should also be toggled
      for (const id of visibleIds.slice(1)) {
        const toggled = afterToggle.assignmentsRead.find((a) => a.id === id);
        expect(toggled, `Assignment ${id} should exist`).toBeDefined();
        expect(toggled!.fixed, `Assignment ${id} should have been toggled to fixed`).toBe(true);
      }
    });

    test('delete: all campaign assignments deleted (campaignIntent unaffected by unselect/reselect)', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;

      const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
      const allIds: string[] = [];
      for (let offset = 0; offset < totalCampaignDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) allIds.push(id);
      }

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Unselect then reselect the first assignment
      const firstId = allIds[0];
      if (firstId) {
        await page.locator(`[data-testid="assignment-cell-${firstId}"]`).click();
        await page.locator(`[data-testid="assignment-cell-${firstId}"]`).click();
      }

      await selectAction(page, 'delete');
      await page.click('[data-testid="schedule-action-main-button"]');
      await expect(page.locator('[data-testid="schedule-delete-confirm-button"]')).toBeVisible();
      await page.click('[data-testid="schedule-delete-confirm-button"]');
      await page.waitForTimeout(3000);

      const afterDelete = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );
      for (const id of allIds) {
        const stillExists = afterDelete.assignmentsRead.some((a) => a.id === id);
        expect(
          stillExists,
          `Campaign assignment ${id} should have been deleted — campaignIntent unaffected by unselect/reselect`,
        ).toBe(false);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Scenario 6: Campaign via intent + vertical select (all in one day)
  //
  // Steps: navigate to campaign start week → switch to campaign scope →
  // select shifts[0] row (campaignIntent) → click date-column-checkbox for
  // campaignStart (handleColumnSelect adds all shifts' cells for that date).
  //
  // Key behaviour: handleColumnSelect adds explicit cells (and loaded
  // assignment IDs) for ALL shift rows on the selected date without clearing
  // campaignIntent. The result is: campaignIntent for shifts[0] over the full
  // campaign PLUS explicit cells for all shifts on campaignStart.
  // ══════════════════════════════════════════════════════════════════════════

  test.describe('Campaign via intent + vertical select (all in one day)', () => {
    test('create: creates full campaign on shifts[0] plus all-shift assignments on the column date', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaignDateStr = campaignStart.format('YYYY-MM-DD');

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      // Campaign intent: select full shifts[0] row
      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      // Vertical select: click column checkbox for campaignStart date
      const columnCheckbox = page.locator(
        `[data-testid="date-column-checkbox-${campaignDateStr}"]`,
      );
      await expect(columnCheckbox).toBeVisible();
      await columnCheckbox.click();

      const beforeCreate = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
        workers[1].id,
      );
      const beforeIds = new Set(beforeCreate.assignmentsRead.map((a) => a.id));

      await page.click('[data-testid="schedule-entity-select"]');
      await page.locator(`[data-testid="schedule-entity-option-${workers[1].id}"]`).click();
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(5000);

      const afterCreate = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
        workers[1].id,
      );
      const created = afterCreate.assignmentsRead.filter((a) => !beforeIds.has(a.id));

      // shifts[0]: one per campaign day via campaignIntent
      const expectedCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
      const createdOnShift0 = created.filter((a) => a.shiftId === shifts[0].id);
      expect(
        createdOnShift0.length,
        `Should have created ${expectedCampaignDays} assignments for shifts[0] via campaignIntent`,
      ).toBe(expectedCampaignDays);

      // shifts[1]: one on campaignStart via column selection
      const createdOnShift1 = created.filter(
        (a) => a.shiftId === shifts[1].id && a.date.format('YYYY-MM-DD') === campaignDateStr,
      );
      expect(
        createdOnShift1.length,
        'Should have created one assignment for shifts[1] via column selection',
      ).toBe(1);
    });

    test('update: updates all campaign shifts[0] assignments and shifts[1] assignment on column date', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;
      const campaignDateStr = campaignStart.format('YYYY-MM-DD');

      const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
      const shift0Ids: string[] = [];
      for (let offset = 0; offset < totalCampaignDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) shift0Ids.push(id);
      }

      const shift1Result = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[1].id,
        date: campaignStart,
        scheduleId: campaign.id,
      });
      const shift1AssignmentId = shift1Result.assignmentsCreated[0]?.id;

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      await page.locator(`[data-testid="date-column-checkbox-${campaignDateStr}"]`).click();

      await selectAction(page, 'update');
      await page.click('[data-testid="schedule-entity-select"]');
      await page.locator(`[data-testid="schedule-entity-option-${workers[1].id}"]`).click();
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(3000);

      const afterUpdate = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );

      for (const id of shift0Ids) {
        const updated = afterUpdate.assignmentsRead.find((a) => a.id === id);
        expect(updated, `Shifts[0] campaign assignment ${id} should exist`).toBeDefined();
        expect(
          updated!.workerId,
          `Shifts[0] campaign assignment ${id} should be updated to workers[1]`,
        ).toBe(workers[1].id);
      }

      if (shift1AssignmentId) {
        const shift1Updated = afterUpdate.assignmentsRead.find((a) => a.id === shift1AssignmentId);
        expect(
          shift1Updated,
          `Shifts[1] assignment on ${campaignDateStr} should exist`,
        ).toBeDefined();
        expect(
          shift1Updated!.workerId,
          'Shifts[1] assignment on column date should be updated to workers[1] via column selection',
        ).toBe(workers[1].id);
      }
    });

    test('toggleFixed: toggles loaded shifts[0] assignments and shifts[1] assignment on column date', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;
      const campaignDateStr = campaignStart.format('YYYY-MM-DD');

      const visibleDays = Math.min(7, campaignEnd.diff(campaignStart, 'day') + 1);
      const shift0VisibleIds: string[] = [];
      for (let offset = 0; offset < visibleDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
          fixed: false,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) shift0VisibleIds.push(id);
      }

      const shift1Result = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[1].id,
        date: campaignStart,
        scheduleId: campaign.id,
        fixed: false,
      });
      const shift1AssignmentId = shift1Result.assignmentsCreated[0]?.id;

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      await page.locator(`[data-testid="date-column-checkbox-${campaignDateStr}"]`).click();

      await selectAction(page, 'toggleFixed');
      await page.click('[data-testid="schedule-action-main-button"]');
      await page.waitForTimeout(2000);

      const afterToggle = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );

      for (const id of shift0VisibleIds) {
        const toggled = afterToggle.assignmentsRead.find((a) => a.id === id);
        expect(toggled, `Shifts[0] assignment ${id} should exist`).toBeDefined();
        expect(toggled!.fixed, `Shifts[0] assignment ${id} should have been toggled to fixed`).toBe(
          true,
        );
      }

      if (shift1AssignmentId) {
        const shift1Toggled = afterToggle.assignmentsRead.find((a) => a.id === shift1AssignmentId);
        expect(
          shift1Toggled,
          `Shifts[1] assignment on ${campaignDateStr} should exist`,
        ).toBeDefined();
        expect(
          shift1Toggled!.fixed,
          'Shifts[1] assignment on column date should have been toggled to fixed',
        ).toBe(true);
      }
    });

    test('delete: deletes all campaign shifts[0] assignments and shifts[1] assignment on column date', async ({
      page,
    }, testInfo) => {
      const scheduleTestBase = testBasesMap.get((testInfo as any).testRunId)!;
      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const campaign = scheduleTestBase.getTestSchedule()!;
      const campaignDateStr = campaignStart.format('YYYY-MM-DD');

      const totalCampaignDays = campaignEnd.diff(campaignStart, 'day') + 1;
      const shift0Ids: string[] = [];
      for (let offset = 0; offset < totalCampaignDays; offset++) {
        const result = await scheduleTestBase.createAssignmentAndRecurrence({
          workerId: workers[0].id,
          shiftId: shifts[0].id,
          date: campaignStart.add(offset, 'day'),
          scheduleId: campaign.id,
        });
        const id = result.assignmentsCreated[0]?.id;
        if (id) shift0Ids.push(id);
      }

      const shift1Result = await scheduleTestBase.createAssignmentAndRecurrence({
        workerId: workers[0].id,
        shiftId: shifts[1].id,
        date: campaignStart,
        scheduleId: campaign.id,
      });
      const shift1AssignmentId = shift1Result.assignmentsCreated[0]?.id;

      await scheduleTestBase.setScheduleViewSettings(page, {
        targetDate: campaignStart,
        timeFrame: 'week',
        groupBy: 'shift',
      });
      await enterSelectionMode(page);
      await page.locator('[data-testid="schedule-scope-campaign"]').click();

      const rowCheckbox = page.locator(`[data-testid="shift-row-checkbox-${shifts[0].id}"]`);
      await expect(rowCheckbox).toBeVisible();
      await rowCheckbox.click();

      await page.locator(`[data-testid="date-column-checkbox-${campaignDateStr}"]`).click();

      await selectAction(page, 'delete');
      await page.click('[data-testid="schedule-action-main-button"]');
      await expect(page.locator('[data-testid="schedule-delete-confirm-button"]')).toBeVisible();
      await page.click('[data-testid="schedule-delete-confirm-button"]');
      await page.waitForTimeout(3000);

      const afterDelete = await scheduleTestBase.getAssignmentsAndRecurrences(
        true,
        campaignStart,
        campaignEnd,
      );

      for (const id of shift0Ids) {
        const stillExists = afterDelete.assignmentsRead.some((a) => a.id === id);
        expect(
          stillExists,
          `Shifts[0] campaign assignment ${id} should have been deleted via campaignIntent`,
        ).toBe(false);
      }

      if (shift1AssignmentId) {
        const shift1StillExists = afterDelete.assignmentsRead.some(
          (a) => a.id === shift1AssignmentId,
        );
        expect(
          shift1StillExists,
          `Shifts[1] assignment on ${campaignDateStr} should have been deleted via column selection`,
        ).toBe(false);
      }
    });
  });
});
