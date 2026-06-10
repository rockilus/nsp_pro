/**
 * E2E tests for AdminImportMergeStep2 — UI assertions.
 *
 * Verifies:
 * - Members: display, defaults (homonymous matching), color coding, full details dialog
 * - Shifts: display, defaults (acronym matching), color coding, full details dialog
 * - Requests: display, defaults, color coding, cascade-skip state
 * - Schedule: grid rendering, month navigation, cell coloring, existing schedule
 *   dialog, date filter with period selection, cascade-skip coloring
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ImportMergeTestBase } from '../../utils/import-merge-test-base';
import { testConfig } from '../../utils/test-config';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// ── Generated IDs from test base preview data ────────────────────────────────
const ALICE_ID = 'gen-alice';
const BOB_ID = 'gen-bob';
const CHARLIE_ID = 'gen-charlie';
const MORNING_ID = 'gen-morning';
const NIGHT_ID = 'gen-night';
const REQUEST_ID = 'gen-req-alice-leave';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function setupAndNavigateToStep2(
  page: import('@playwright/test').Page,
  testBase: ImportMergeTestBase,
) {
  const importId = await testBase.createImportViaApi();
  await testBase.actAsAdmin(page);
  await page.goto(`${testConfig.frontendUrl}/en/admin/import/merge?id=${importId}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('[data-testid="merge-teams-table"]', { timeout: 10000 });

  // Search for the test team by name so it appears on the current page
  const team = testBase.getTestTeam()!;
  const nameFilter = page.locator('[data-testid="filter-search_name"]');
  await nameFilter.fill(team.name);
  await page.waitForTimeout(500); // let debounced search settle
  await expect(page.locator(`[data-testid="team-row-${team.teamId}"]`)).toBeVisible({
    timeout: 5000,
  });

  // Select the test team and click "Review Matches" to go to step 2
  const teamRow = page.locator(`[data-testid="team-row-${team.teamId}"]`);
  await teamRow.click();

  const resolveBtn = page.locator('[data-testid="merge-resolve-btn"]');
  await expect(resolveBtn).not.toBeDisabled({ timeout: 3000 });
  await resolveBtn.click();

  // Wait for step 2 to load
  await page.waitForSelector('[data-testid="merge-step2-next"]', { timeout: 10000 });
  await expect(page.locator('[data-testid="merge-members-section"]')).toBeVisible({
    timeout: 5000,
  });
  return importId;
}

function getActionBgClass(action: 'add_new' | 'merge_into' | 'skip'): RegExp {
  switch (action) {
    case 'add_new':
      return /bg-green/;
    case 'merge_into':
      return /bg-orange/;
    case 'skip':
      return /bg-red/;
  }
}

// ── Members Section ──────────────────────────────────────────────────────────

test.describe('AdminImportMergeStep2 — Members', () => {
  const testBasesMap = new Map<string, ImportMergeTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const testBase = new ImportMergeTestBase();
    testBasesMap.set(testRunId, testBase);
    (testInfo as any).testRunId = testRunId;

    await testBase.setup(workerIndex);
    await setupAndNavigateToStep2(page, testBase);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('should show all imported members with correct names and acronyms', async ({ page }) => {
    // Alice, Bob, Charlie should all be visible
    const aliceRow = page.locator(`[data-testid="merge-worker-row-${ALICE_ID}"]`);
    await expect(aliceRow).toContainText('Alice');
    await expect(aliceRow).toContainText('AL');

    const bobRow = page.locator(`[data-testid="merge-worker-row-${BOB_ID}"]`);
    await expect(bobRow).toContainText('Bob');
    await expect(bobRow).toContainText('BO');

    const charlieRow = page.locator(`[data-testid="merge-worker-row-${CHARLIE_ID}"]`);
    await expect(charlieRow).toContainText('Charlie');
    await expect(charlieRow).toContainText('CH');
  });

  test('should default Alice to merge_into (homonymous match) and Bob/Charlie to add_new', async ({
    page,
  }) => {
    // Alice matches existing "Alice Worker" by name → merge_into
    const aliceAction = page.locator(`[data-testid="merge-worker-action-${ALICE_ID}"]`);
    await expect(aliceAction).toHaveAttribute('data-action', 'merge_into');

    // Bob has no match → add_new
    const bobAction = page.locator(`[data-testid="merge-worker-action-${BOB_ID}"]`);
    await expect(bobAction).toHaveAttribute('data-action', 'add_new');

    // Charlie has no match → add_new
    const charlieAction = page.locator(`[data-testid="merge-worker-action-${CHARLIE_ID}"]`);
    await expect(charlieAction).toHaveAttribute('data-action', 'add_new');
  });

  test('should color-code rows: green=add_new, orange=merge_into, red=skip', async ({ page }) => {
    const aliceRow = page.locator(`[data-testid="merge-worker-row-${ALICE_ID}"]`);
    await expect(aliceRow).toHaveClass(getActionBgClass('merge_into'));

    const bobRow = page.locator(`[data-testid="merge-worker-row-${BOB_ID}"]`);
    await expect(bobRow).toHaveClass(getActionBgClass('add_new'));
  });

  test('should change row color when action is changed to skip', async ({ page }) => {
    // Change Bob from add_new to skip
    const bobAction = page.locator(`[data-testid="merge-worker-action-${BOB_ID}"]`);
    await bobAction.click();
    await page.locator('[role="option"]', { hasText: 'Skip' }).click();
    await page.waitForTimeout(200);

    const bobRow = page.locator(`[data-testid="merge-worker-row-${BOB_ID}"]`);
    await expect(bobRow).toHaveClass(getActionBgClass('skip'));
  });

  test('should show target worker dropdown when merge_into is selected', async ({ page }) => {
    // Alice should already be merge_into with a target
    const aliceTarget = page.locator(`[data-testid="merge-target-worker-${ALICE_ID}"]`);
    await expect(aliceTarget).toBeVisible();

    // Change Bob to merge_into — target dropdown should appear
    const bobAction = page.locator(`[data-testid="merge-worker-action-${BOB_ID}"]`);
    await bobAction.click();
    await page.locator('[role="option"]', { hasText: 'Merge into' }).click();
    await page.waitForTimeout(200);

    const bobTarget = page.locator(`[data-testid="merge-target-worker-${BOB_ID}"]`);
    await expect(bobTarget).toBeVisible();
  });

  test('"View Full Details" dialog shows imported and existing members', async ({ page }) => {
    // Open the members full details dialog
    await page.locator('[data-testid="merge-view-full-members"]').click();

    // Wait for the dialog to appear
    const dialog = page.locator('[data-testid="full-table-dialog-members"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Imported members table should show Alice, Bob, Charlie
    const importedTable = page.locator('[data-testid="full-table-imported-members"]');
    await expect(importedTable).toContainText('Alice');
    await expect(importedTable).toContainText('Bob');
    await expect(importedTable).toContainText('Charlie');

    // Existing members table should show Alice Worker and Dave Worker
    const existingTable = page.locator('[data-testid="full-table-existing-members"]');
    await expect(existingTable).toContainText('Alice Worker');
    await expect(existingTable).toContainText('Dave Worker');
  });
});

// ── Shifts Section ───────────────────────────────────────────────────────────

test.describe('AdminImportMergeStep2 — Shifts', () => {
  const testBasesMap = new Map<string, ImportMergeTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const testBase = new ImportMergeTestBase();
    testBasesMap.set(testRunId, testBase);
    (testInfo as any).testRunId = testRunId;

    await testBase.setup(workerIndex);
    await setupAndNavigateToStep2(page, testBase);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('should show all imported shifts with correct names and acronyms', async ({ page }) => {
    const morningRow = page.locator(`[data-testid="merge-shift-row-${MORNING_ID}"]`);
    await expect(morningRow).toContainText('Morning');
    await expect(morningRow).toContainText('MS');

    const nightRow = page.locator(`[data-testid="merge-shift-row-${NIGHT_ID}"]`);
    await expect(nightRow).toContainText('Night');
    await expect(nightRow).toContainText('NS');
  });

  test('should default Morning to merge_into (acronym match MS) and Night to add_new', async ({
    page,
  }) => {
    // Morning matches existing "Morning Shift" by acronym MS → merge_into
    const morningAction = page.locator(`[data-testid="merge-shift-action-${MORNING_ID}"]`);
    await expect(morningAction).toHaveAttribute('data-action', 'merge_into');

    // Night has no match → add_new
    const nightAction = page.locator(`[data-testid="merge-shift-action-${NIGHT_ID}"]`);
    await expect(nightAction).toHaveAttribute('data-action', 'add_new');
  });

  test('should color-code rows correctly', async ({ page }) => {
    const morningRow = page.locator(`[data-testid="merge-shift-row-${MORNING_ID}"]`);
    await expect(morningRow).toHaveClass(getActionBgClass('merge_into'));

    const nightRow = page.locator(`[data-testid="merge-shift-row-${NIGHT_ID}"]`);
    await expect(nightRow).toHaveClass(getActionBgClass('add_new'));
  });

  test('"View Full Details" dialog shows imported and existing shifts', async ({ page }) => {
    await page.locator('[data-testid="merge-view-full-shifts"]').click();

    const dialog = page.locator('[data-testid="full-table-dialog-shifts"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const importedTable = page.locator('[data-testid="full-table-imported-shifts"]');
    await expect(importedTable).toContainText('Morning');
    await expect(importedTable).toContainText('Night');

    const existingTable = page.locator('[data-testid="full-table-existing-shifts"]');
    await expect(existingTable).toContainText('Morning Shift');
  });
});

// ── Requests Section ─────────────────────────────────────────────────────────

test.describe('AdminImportMergeStep2 — Requests', () => {
  const testBasesMap = new Map<string, ImportMergeTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const testBase = new ImportMergeTestBase();
    testBasesMap.set(testRunId, testBase);
    (testInfo as any).testRunId = testRunId;

    await testBase.setup(workerIndex);
    await setupAndNavigateToStep2(page, testBase);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('should show all imported requests', async ({ page }) => {
    const requestRow = page.locator(`[data-testid="merge-request-row-${REQUEST_ID}"]`);
    await expect(requestRow).toBeVisible();
    await expect(requestRow).toContainText('Alice');
  });

  test('should default to add_new with green background', async ({ page }) => {
    const requestAction = page.locator(`[data-testid="merge-request-action-${REQUEST_ID}"]`);
    await expect(requestAction).toHaveAttribute('data-action', 'add_new');

    const requestRow = page.locator(`[data-testid="merge-request-row-${REQUEST_ID}"]`);
    await expect(requestRow).toHaveClass(getActionBgClass('add_new'));
  });

  test('should change color when action is set to skip', async ({ page }) => {
    const requestAction = page.locator(`[data-testid="merge-request-action-${REQUEST_ID}"]`);
    await requestAction.click();
    await page.locator('[role="option"]', { hasText: 'Skip' }).click();
    await page.waitForTimeout(200);

    const requestRow = page.locator(`[data-testid="merge-request-row-${REQUEST_ID}"]`);
    await expect(requestRow).toHaveClass(getActionBgClass('skip'));
  });

  test('should cascade-skip request when parent worker is skipped', async ({ page }) => {
    // Skip Alice — her request should cascade to skipped state
    const aliceAction = page.locator(`[data-testid="merge-worker-action-${ALICE_ID}"]`);
    await aliceAction.click();
    await page.locator('[role="option"]', { hasText: 'Skip' }).click();
    await page.waitForTimeout(200);

    // The request row should now show cascade-skipped styling (red + line-through)
    const requestRow = page.locator(`[data-testid="merge-request-row-${REQUEST_ID}"]`);
    await expect(requestRow).toHaveClass(getActionBgClass('skip'));
    await expect(requestRow).toHaveClass(/line-through/);
  });
});

// ── Schedule Section ─────────────────────────────────────────────────────────

test.describe('AdminImportMergeStep2 — Schedule Grid', () => {
  const testBasesMap = new Map<string, ImportMergeTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const testBase = new ImportMergeTestBase();
    testBasesMap.set(testRunId, testBase);
    (testInfo as any).testRunId = testRunId;

    await testBase.setup(workerIndex);
    await setupAndNavigateToStep2(page, testBase);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('should show schedule grid with imported assignments', async ({ page }) => {
    // Grid should be visible in the schedule section
    const scheduleSection = page.locator('[data-testid="merge-schedule-section"]');
    await expect(scheduleSection).toBeVisible();

    // Imported workers (Alice, Bob, Charlie) should appear in the grid
    await expect(scheduleSection).toContainText('Alice');
    await expect(scheduleSection).toContainText('Bob');
    await expect(scheduleSection).toContainText('Charlie');
  });

  test('should navigate between months', async ({ page }) => {
    const monthLabel = page.locator('[data-testid="schedule-grid-month-label"]');
    const initialMonth = await monthLabel.textContent();

    // Click next month
    const nextBtn = page.locator('[data-testid="schedule-grid-next-month"]');
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      const newMonth = await monthLabel.textContent();
      expect(newMonth).not.toBe(initialMonth);
    }

    // Click previous month
    const prevBtn = page.locator('[data-testid="schedule-grid-prev-month"]');
    if (await prevBtn.isEnabled()) {
      await prevBtn.click();
      await page.waitForTimeout(500);
      const restoredMonth = await monthLabel.textContent();
      expect(restoredMonth).toBe(initialMonth);
    }
  });

  test('should show color-coded cells: green for add_new assignments', async ({ page }) => {
    // By default all workers and shifts are either add_new or merge_into,
    // so cells should have green (add_new) or orange (merge_into) backgrounds
    const scheduleSection = page.locator('[data-testid="merge-schedule-section"]');
    // At minimum we should see the green/orange colors on some cells
    const coloredCells = scheduleSection.locator('[class*="bg-green"], [class*="bg-orange"]');
    // At least some cells should have colored backgrounds
    const count = await coloredCells.count();
    expect(count).toBeGreaterThan(0);
  });

  test('"View Existing Schedule" dialog shows existing team assignments', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;
    const team = testBase.getTestTeam()!;
    const db = testBase['dbUtils'];

    const workers = testBase.getExistingWorkers();
    const shifts = testBase.getExistingShifts();
    const aliceWorker = workers[0]; // Alice Worker
    const morningShift = shifts[0]; // Morning Shift

    // Create + validate schedule, add demand, re-validate, then create assignment.
    const schedule = await db.createSchedule(team.teamId);
    await db.validateSchedule(schedule.id, team.teamId);

    const now = new Date();
    const targetDate = dayjs.utc(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    );
    await db.createShiftDemand({
      teamId: team.teamId,
      shiftId: morningShift.id,
      date: targetDate,
      count: 1,
      source: 'manual',
    });

    await db.validateSchedule(schedule.id, team.teamId);

    await db.createAssignmentAndRecurrence(
      {
        teamId: team.teamId,
        workerId: aliceWorker.id,
        shiftId: morningShift.id,
        date: targetDate,
        fixed: false,
        scheduleId: schedule.id,
      },
      null,
    );

    // Open the dialog — it should show the assignment
    await page.locator('[data-testid="merge-view-existing-schedule"]').click();

    const dialog = page.locator('[data-testid="full-table-dialog-schedule"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await expect(dialog).toContainText('Alice Worker', { timeout: 5000 });
  });

  test('should switch to "Filter by period" and show date inputs', async ({ page }) => {
    // Click filter by period radio
    await page.locator('[data-testid="merge-assignments-filter-period"]').click();

    // Date inputs should appear
    await expect(page.locator('[data-testid="merge-period-start"]')).toBeVisible();
    await expect(page.locator('[data-testid="merge-period-end"]')).toBeVisible();

    // Assignment count should be visible
    await expect(page.locator('[data-testid="merge-assignment-count"]')).toBeVisible();

    // Out-of-range legend should appear when filtering
    await expect(page.locator('[data-testid="merge-legend-out-of-range"]')).toBeVisible();
  });

  test('should cascade-skip assignments to red when worker is set to skip', async ({ page }) => {
    // Skip Alice
    const aliceAction = page.locator(`[data-testid="merge-worker-action-${ALICE_ID}"]`);
    await aliceAction.click();
    await page.locator('[role="option"]', { hasText: 'Skip' }).click();
    await page.waitForTimeout(500);

    // Some cells should now have red background (skip style)
    const scheduleSection = page.locator('[data-testid="merge-schedule-section"]');
    const redCells = scheduleSection.locator('[class*="bg-red"]');
    const count = await redCells.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should cascade-skip assignments to red when shift is set to skip', async ({ page }) => {
    // Skip Night shift
    const nightAction = page.locator(`[data-testid="merge-shift-action-${NIGHT_ID}"]`);
    await nightAction.click();
    await page.locator('[role="option"]', { hasText: 'Skip' }).click();
    await page.waitForTimeout(500);

    // Some cells should now have red background (skip style)
    const scheduleSection = page.locator('[data-testid="merge-schedule-section"]');
    const redCells = scheduleSection.locator('[class*="bg-red"]');
    const count = await redCells.count();
    expect(count).toBeGreaterThan(0);
  });
});
