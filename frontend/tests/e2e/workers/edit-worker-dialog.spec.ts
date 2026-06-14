import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { WorkerTestBase } from '../../utils/worker-test-base';
import dayjs from 'dayjs';
import { DimensionEntryType } from '../../../src/types/dimension';
import { WeeklySlotPreference, WeekParity } from '../../../src/types/worker';

test.describe('Worker Edit Dialog', () => {
  const testBasesMap = new Map<string, WorkerTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const workerTestBase = new WorkerTestBase();
    testBasesMap.set(testRunId, workerTestBase);
    (testInfo as any).testRunId = testRunId;

    await getTestBase(testInfo).setupWorkerTests(workerIndex);
    await getTestBase(testInfo).navigateToWorkersPage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  function getTestBase(testInfo: any): WorkerTestBase {
    const testRunId = testInfo.testRunId as string;
    const tb = testBasesMap.get(testRunId);
    if (!tb) throw new Error('Test base not found');
    return tb;
  }

  test('should open the edit dialog when the edit button is clicked', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Alice', weeklyHours: 39 });

    // Reload to see the API-created worker in the table
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Click the edit button
    await tb.openEditDialog(page, worker.id);

    // Verify dialog elements are visible
    await expect(page.locator('[data-testid="edit-worker-name-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="edit-worker-save-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="edit-worker-cancel-button"]')).toBeVisible();

    // Pre-filled name should match worker
    await expect(page.locator('[data-testid="edit-worker-name-input"]')).toHaveValue('Alice');

    console.log('✅ Edit dialog opened with correct pre-filled values');
  });

  test('should edit the name via the dialog and reflect in table and API', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Bob' });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogName(page, 'Robert');
    await tb.saveEditDialog(page);

    // Verify API — server-side state
    const updated = await tb.getWorkerById(worker.id);
    expect(updated.name).toBe('Robert');

    // Verify table — UI reflects the change
    const display = page.locator(`[data-testid="worker-name-display-${worker.id}"]`);
    await expect(display).toContainText('Robert');

    console.log('✅ Name updated via dialog — API and table both reflect the change');
  });

  test('should edit the acronym via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Carol', acronym: 'CAR' });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogAcronym(page, 'CL');
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.acronym).toBe('CL');

    const display = page.locator(`[data-testid="worker-acronym-display-${worker.id}"]`);
    await expect(display).toContainText('CL');

    console.log('✅ Acronym updated via dialog');
  });

  test('should edit employment start date via dialog and verify in API', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Dave' });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    const newStart = '2025-01-15';
    await tb.openEditDialog(page, worker.id);
    await tb.setDialogEmploymentStartDate(page, newStart);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(dayjs(updated.employmentStartDate).format('YYYY-MM-DD')).toBe(newStart);

    console.log('✅ Employment start date updated via dialog');
  });

  test('should set employment end date via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Eve' });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    const newEnd = '2026-12-31';
    await tb.openEditDialog(page, worker.id);

    // The end date input is disabled when "Permanent" is checked (no end date).
    // Uncheck "Permanent" to enable the date input.
    await tb.setDialogPermanentCheckbox(page, false);
    await page.waitForTimeout(100);
    await tb.setDialogEmploymentEndDate(page, newEnd);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(dayjs(updated.employmentEndDate).format('YYYY-MM-DD')).toBe(newEnd);

    // Table should show the new end date
    const display = page.locator(`[data-testid="worker-employment-end-display-${worker.id}"]`);
    // The display format in the table is the user's localised format
    await expect(display).not.toContainText('Permanent');

    console.log('✅ Employment end date updated via dialog');
  });

  test('should mark worker as permanent (no end date) via dialog', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    // Create a worker WITH an end date so we can clear it
    const worker = await tb.createTestWorker({
      name: 'Frank',
      employmentEndDate: dayjs('2027-06-01'),
    });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogPermanentCheckbox(page, true);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.employmentEndDate).toBeNull();

    const display = page.locator(`[data-testid="worker-employment-end-display-${worker.id}"]`);
    await expect(display).toContainText('Permanent');

    console.log('✅ Worker marked as permanent via dialog');
  });

  test('should edit weekly hours via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Grace', weeklyHours: 39 });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogWeeklyHours(page, 36);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.weeklyHours).toBe(36);

    const display = page.locator(`[data-testid="worker-weekly-hours-display-${worker.id}"]`);
    await expect(display).toContainText('36');

    console.log('✅ Weekly hours updated via dialog');
  });

  test('should edit desired weekly hours via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({
      name: 'Hank',
      weeklyHours: 39,
      weeklyHoursDesired: 39,
    });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogWeeklyHoursDesired(page, 30);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.weeklyHoursDesired).toBe(30);

    const display = page.locator(
      `[data-testid="worker-weekly-hours-desired-display-${worker.id}"]`,
    );
    await expect(display).toContainText('30');

    console.log('✅ Desired weekly hours updated via dialog');
  });

  test('should edit duties per month via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Ivy', dutiesPerMonth: 4 });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogDutiesPerMonth(page, 6);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.dutiesPerMonth).toBe(6);

    const display = page.locator(`[data-testid="worker-duties-per-month-display-${worker.id}"]`);
    await expect(display).toContainText('6');

    console.log('✅ Duties per month updated via dialog');
  });

  test('should edit annual leave via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Jack', annualLeave: 25 });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogAnnualLeave(page, 30);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.annualLeave).toBe(30);

    const display = page.locator(`[data-testid="worker-annual-leave-display-${worker.id}"]`);
    await expect(display).toContainText('30');

    console.log('✅ Annual leave updated via dialog');
  });

  test('should edit all fields at once via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({
      name: 'Kelly',
      acronym: 'KEL',
      weeklyHours: 39,
      weeklyHoursDesired: 39,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);

    await tb.setDialogName(page, 'Kendall');
    await tb.setDialogAcronym(page, 'KEN');
    await tb.setDialogWeeklyHours(page, 35);
    await tb.setDialogWeeklyHoursDesired(page, 32);
    await tb.setDialogDutiesPerMonth(page, 5);
    await tb.setDialogAnnualLeave(page, 28);

    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.name).toBe('Kendall');
    expect(updated.acronym).toBe('KEN');
    expect(updated.weeklyHours).toBe(35);
    expect(updated.weeklyHoursDesired).toBe(32);
    expect(updated.dutiesPerMonth).toBe(5);
    expect(updated.annualLeave).toBe(28);

    // Verify all fields in the table
    await expect(page.locator(`[data-testid="worker-name-display-${worker.id}"]`)).toContainText(
      'Kendall',
    );
    await expect(page.locator(`[data-testid="worker-acronym-display-${worker.id}"]`)).toContainText(
      'KEN',
    );
    await expect(
      page.locator(`[data-testid="worker-weekly-hours-display-${worker.id}"]`),
    ).toContainText('35');
    await expect(
      page.locator(`[data-testid="worker-weekly-hours-desired-display-${worker.id}"]`),
    ).toContainText('32');
    await expect(
      page.locator(`[data-testid="worker-duties-per-month-display-${worker.id}"]`),
    ).toContainText('5');
    await expect(
      page.locator(`[data-testid="worker-annual-leave-display-${worker.id}"]`),
    ).toContainText('28');

    console.log('✅ All fields updated at once via dialog');
  });

  test('should cancel dialog without changing the worker', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Liam', weeklyHours: 40 });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogName(page, 'ChangedName');
    await tb.setDialogWeeklyHours(page, 99);
    await tb.cancelEditDialog(page);

    // API should still have original values
    const unchanged = await tb.getWorkerById(worker.id);
    expect(unchanged.name).toBe('Liam');
    expect(unchanged.weeklyHours).toBe(40);

    // Table should still show original values
    await expect(page.locator(`[data-testid="worker-name-display-${worker.id}"]`)).toContainText(
      'Liam',
    );
    await expect(
      page.locator(`[data-testid="worker-weekly-hours-display-${worker.id}"]`),
    ).toContainText('40');

    console.log('✅ Cancel discards changes — API and table unchanged');
  });

  test('should edit specialties via dialog and verify in API', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);

    // Create two specialties
    const specialtyA = await tb.createTestSpecialty({ name: 'Surgery' });
    const specialtyB = await tb.createTestSpecialty({ name: 'Pediatrics' });

    const worker = await tb.createTestWorker({ name: 'Mia', weeklyHours: 39 });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Open dialog and add both specialties by clicking their badge toggles
    await tb.openEditDialog(page, worker.id);

    const badgeA = page.locator(`[data-testid="edit-worker-specialty-${specialtyA.id}"]`);
    const badgeB = page.locator(`[data-testid="edit-worker-specialty-${specialtyB.id}"]`);

    // Badges start as outline (unselected)
    await expect(badgeA).toBeVisible();
    await expect(badgeB).toBeVisible();
    await expect(badgeA).toHaveAttribute('data-variant', 'outline');
    await expect(badgeB).toHaveAttribute('data-variant', 'outline');

    // Click both to select them
    await badgeA.click();
    await badgeB.click();

    // Badges should now show as selected (default variant)
    await expect(badgeA).toHaveAttribute('data-variant', 'default');
    await expect(badgeB).toHaveAttribute('data-variant', 'default');

    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.specialtyIds).toContain(specialtyA.id);
    expect(updated.specialtyIds).toContain(specialtyB.id);

    console.log('✅ Specialties updated via dialog');
  });

  test('should toggle a Yes/No (BOOL) attribute via dialog and verify in API', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);

    // Create worker first so dimension creation auto-generates its attribute
    const worker = await tb.createTestWorker({ name: 'Nora' });

    // Create a BOOL dimension — auto-creates attributes on all existing workers
    const { newDimension } = await tb.createTestWorkerDimension('Senior', DimensionEntryType.BOOL);

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // The dimension was created while the worker existed, so the worker's
    // attributes array should contain an auto-generated BOOL with value false.
    const workerBefore = await tb.getWorkerById(worker.id);
    const boolAttr = workerBefore.attributes.find((a) => a.dimensionId === newDimension.id);
    expect(boolAttr).toBeDefined();
    expect(boolAttr!.value).toBe(false);

    // Open the dialog and toggle the checkbox
    await tb.openEditDialog(page, worker.id);
    const checkbox = page.locator(`[data-testid="edit-worker-attr-bool-${newDimension.id}"]`);
    await expect(checkbox).toBeVisible();
    // It should be unchecked initially (value = false)
    await expect(checkbox).not.toBeChecked();
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    await tb.saveEditDialog(page);

    // Verify API — worker's attributes array reflects the toggled value
    const workerAfter = await tb.getWorkerById(worker.id);
    const boolAttrAfter = workerAfter.attributes.find((a) => a.dimensionId === newDimension.id);
    expect(boolAttrAfter).toBeDefined();
    expect(boolAttrAfter!.value).toBe(true);

    console.log('✅ BOOL attribute toggled via dialog — API verified');
  });

  test('should select Tags (DIM_ENTRIES) attribute via dialog and verify in API', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);

    // Create worker first so dimension creation auto-generates its attribute
    const worker = await tb.createTestWorker({ name: 'Oscar' });

    // Create a DIM_ENTRIES dimension with two tag entries
    const { newDimension, newDimEntries } = await tb.createTestWorkerDimension(
      'Location',
      DimensionEntryType.DIM_ENTRIES,
      ['North Wing', 'South Wing'],
    );
    expect(newDimEntries).toHaveLength(2);

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Open the dialog and select "North Wing" tag
    await tb.openEditDialog(page, worker.id);

    // The DIM_ENTRIES attribute renders as clickable badges
    const northBadge = page.locator(
      `[data-testid="edit-worker-attr-dim-entry-${newDimEntries[0].id}"]`,
    );
    const southBadge = page.locator(
      `[data-testid="edit-worker-attr-dim-entry-${newDimEntries[1].id}"]`,
    );
    await expect(northBadge).toBeVisible();
    await expect(southBadge).toBeVisible();

    // Initially both should be "outline" (unselected)
    await expect(northBadge).toHaveAttribute('data-variant', 'outline');
    await expect(southBadge).toHaveAttribute('data-variant', 'outline');

    // Select North Wing
    await northBadge.click();
    await tb.saveEditDialog(page);

    // Verify API — the attribute's dimEntryIds should include north badge
    const workerAfter1 = await tb.getWorkerById(worker.id);
    const tagAttr = workerAfter1.attributes.find((a) => a.dimensionId === newDimension.id);
    expect(tagAttr).toBeDefined();
    expect(tagAttr!.dimEntryIds).toContain(newDimEntries[0].id);
    expect(tagAttr!.dimEntryIds).not.toContain(newDimEntries[1].id);

    // Re-open dialog, select South Wing too, then both should be selected
    await tb.openEditDialog(page, worker.id);
    await southBadge.click();
    await tb.saveEditDialog(page);

    const workerAfter2 = await tb.getWorkerById(worker.id);
    const tagAttr2 = workerAfter2.attributes.find((a) => a.dimensionId === newDimension.id);
    expect(tagAttr2!.dimEntryIds).toContain(newDimEntries[0].id);
    expect(tagAttr2!.dimEntryIds).toContain(newDimEntries[1].id);

    console.log('✅ DIM_ENTRIES (tags) attribute selected via dialog — API verified');
  });
});

// ─── Weekly Preferences Helpers ───────────────────────────────────────────

/** Sort-key for stable array comparison. */
function slotSortKey(s: WeeklySlotPreference): string {
  return `${s.weekParity}-${s.dayOfWeek}-${s.slot}`;
}

/** Assert that actual slots match the expected set (order-independent). */
function expectSlotsMatch(actual: WeeklySlotPreference[], expected: WeeklySlotPreference[]): void {
  const sortedActual = [...actual].sort((a, b) => slotSortKey(a).localeCompare(slotSortKey(b)));
  const sortedExpected = [...expected].sort((a, b) => slotSortKey(a).localeCompare(slotSortKey(b)));
  expect(sortedActual).toEqual(sortedExpected);
}

/** Build an expected WeeklySlotPreference. */
function sp(
  parity: WeekParity,
  day: number,
  slot: 'morning' | 'afternoon' | 'night',
  restriction: 'no_work' | 'no_normal' | 'no_duty' = 'no_work',
): WeeklySlotPreference {
  return { weekParity: parity, dayOfWeek: day, slot, restriction, shiftIds: [] };
}

test.describe('Worker Weekly Preferences', () => {
  const testBasesMap = new Map<string, WorkerTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const workerTestBase = new WorkerTestBase();
    testBasesMap.set(testRunId, workerTestBase);
    (testInfo as any).testRunId = testRunId;

    await getTestBase(testInfo).setupWorkerTests(workerIndex);
    await getTestBase(testInfo).navigateToWorkersPage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  function getTestBase(testInfo: any): WorkerTestBase {
    const testRunId = testInfo.testRunId as string;
    const tb = testBasesMap.get(testRunId);
    if (!tb) throw new Error('Test base not found');
    return tb;
  }

  // ─── 3.1 Mode Layout ──────────────────────────────────────────────────

  test('all weeks shows single grid', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-Mode1' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);

    // Default mode should be "single" (all weeks)
    await expect(page.locator('[data-testid="weekly-grid-cell-all-0-morning"]')).toBeVisible();
    await expect(page.locator('[data-testid="weekly-grid-cell-even-0-morning"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="weekly-grid-cell-odd-0-morning"]')).not.toBeVisible();
  });

  test('even/odd shows two grids', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-Mode2' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);

    await tb.setDialogWeekMode(page, 'even_odd');

    // Even and odd cells should be visible; all should NOT
    await expect(page.locator('[data-testid="weekly-grid-cell-even-0-morning"]')).toBeVisible();
    await expect(page.locator('[data-testid="weekly-grid-cell-odd-0-morning"]')).toBeVisible();
    await expect(page.locator('[data-testid="weekly-grid-cell-all-0-morning"]')).not.toBeVisible();
  });

  // ─── 3.2 Single Cell — All Weeks ──────────────────────────────────────

  test('all weeks: select no_work morning updates backend', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-SC1' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);

    await tb.setDialogRestriction(page, 'no_work');
    await tb.clickGridCell(page, 'all', 0, 'morning');
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], [sp('all', 0, 'morning', 'no_work')]);
  });

  test('all weeks: select no_normal afternoon updates backend', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-SC2' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);

    await tb.setDialogRestriction(page, 'no_normal');
    await tb.clickGridCell(page, 'all', 0, 'afternoon');
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], [
      sp('all', 0, 'afternoon', 'no_normal'),
    ]);
  });

  test('all weeks: select no_duty night updates backend', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-SC3' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);

    await tb.setDialogRestriction(page, 'no_duty');
    await tb.clickGridCell(page, 'all', 0, 'night');
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], [sp('all', 0, 'night', 'no_duty')]);
  });

  // ─── 3.2 Single Cell — Even/Odd ───────────────────────────────────────

  test('even/odd: select no_work morning (even) updates backend', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-SC4' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);
    await tb.setDialogWeekMode(page, 'even_odd');

    await tb.setDialogRestriction(page, 'no_work');
    await tb.clickGridCell(page, 'even', 0, 'morning');
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], [sp('even', 0, 'morning', 'no_work')]);
  });

  test('even/odd: select no_normal afternoon (even) updates backend', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-SC5' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);
    await tb.setDialogWeekMode(page, 'even_odd');

    await tb.setDialogRestriction(page, 'no_normal');
    await tb.clickGridCell(page, 'even', 0, 'afternoon');
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], [
      sp('even', 0, 'afternoon', 'no_normal'),
    ]);
  });

  test('even/odd: select no_duty night (even) updates backend', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-SC6' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);
    await tb.setDialogWeekMode(page, 'even_odd');

    await tb.setDialogRestriction(page, 'no_duty');
    await tb.clickGridCell(page, 'even', 0, 'night');
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], [sp('even', 0, 'night', 'no_duty')]);
  });

  // ─── 3.3 Full Day (column header) — All Weeks ─────────────────────────

  test('all weeks: full day click fills all slots for that day', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-FD1' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);

    await tb.setDialogRestriction(page, 'no_work');
    await tb.clickGridColumn(page, 'all', 2); // Wednesday

    await tb.saveEditDialog(page);
    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], [
      sp('all', 2, 'morning', 'no_work'),
      sp('all', 2, 'afternoon', 'no_work'),
      sp('all', 2, 'night', 'no_work'),
    ]);
  });

  test('all weeks: full day toggle removes slots', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-FD2' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);

    await tb.setDialogRestriction(page, 'no_normal');
    // Click to fill
    await tb.clickGridColumn(page, 'all', 4); // Friday
    // Click again to remove (all should match active restriction, so toggle off)
    await tb.clickGridColumn(page, 'all', 4);

    await tb.saveEditDialog(page);
    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], []);
  });

  // ─── 3.3 Full Day (column header) — Even/Odd ──────────────────────────

  test('even/odd: full day click fills all slots for that day/parity', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-FD3' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);
    await tb.setDialogWeekMode(page, 'even_odd');

    await tb.setDialogRestriction(page, 'no_duty');
    await tb.clickGridColumn(page, 'even', 1); // Tuesday even

    await tb.saveEditDialog(page);
    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], [
      sp('even', 1, 'morning', 'no_duty'),
      sp('even', 1, 'afternoon', 'no_duty'),
      sp('even', 1, 'night', 'no_duty'),
    ]);
  });

  test('even/odd: full day toggle removes slots', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-FD4' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);
    await tb.setDialogWeekMode(page, 'even_odd');

    await tb.setDialogRestriction(page, 'no_work');
    await tb.clickGridColumn(page, 'odd', 6); // Sunday odd
    await tb.clickGridColumn(page, 'odd', 6);

    await tb.saveEditDialog(page);
    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], []);
  });

  // ─── 3.4 Period for All Days (row header) — All Weeks ─────────────────

  test('all weeks: row header fills all days for that slot', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-RH1' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);

    await tb.setDialogRestriction(page, 'no_normal');
    await tb.clickGridRow(page, 'all', 'morning');

    await tb.saveEditDialog(page);
    const updated = await tb.getWorkerById(worker.id);
    const expected: WeeklySlotPreference[] = [0, 1, 2, 3, 4, 5, 6].map((d) =>
      sp('all', d, 'morning', 'no_normal'),
    );
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], expected);
  });

  test('all weeks: row header toggle removes all slots for that period', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-RH2' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);

    await tb.setDialogRestriction(page, 'no_duty');
    await tb.clickGridRow(page, 'all', 'afternoon');
    await tb.clickGridRow(page, 'all', 'afternoon');

    await tb.saveEditDialog(page);
    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], []);
  });

  // ─── 3.4 Period for All Days (row header) — Even/Odd ──────────────────

  test('even/odd: row header fills all days for that slot/parity', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-RH3' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);
    await tb.setDialogWeekMode(page, 'even_odd');

    await tb.setDialogRestriction(page, 'no_work');
    await tb.clickGridRow(page, 'even', 'night');

    await tb.saveEditDialog(page);
    const updated = await tb.getWorkerById(worker.id);
    const expected: WeeklySlotPreference[] = [0, 1, 2, 3, 4, 5, 6].map((d) =>
      sp('even', d, 'night', 'no_work'),
    );
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], expected);
  });

  test('even/odd: paired row header fills both parities', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-RH4' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);
    await tb.setDialogWeekMode(page, 'even_odd');

    // Set viewport wide enough for paired grid (md+)
    await page.setViewportSize({ width: 1280, height: 900 });

    await tb.setDialogRestriction(page, 'no_normal');
    // Click the paired row header (applies to BOTH even AND odd)
    await tb.clickGridRow(page, 'even_odd', 'morning');

    await tb.saveEditDialog(page);
    const updated = await tb.getWorkerById(worker.id);
    const expected: WeeklySlotPreference[] = [];
    for (const parity of ['even', 'odd'] as WeekParity[]) {
      for (let d = 0; d < 7; d++) {
        expected.push(sp(parity, d, 'morning', 'no_normal'));
      }
    }
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], expected);
  });

  // ─── 3.5 Random Combinations — All Weeks ───────────────────────────────

  test('all weeks: mixed restrictions on different cells', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-Mix1' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);

    // no_work: Mon morning
    await tb.setDialogRestriction(page, 'no_work');
    await tb.clickGridCell(page, 'all', 0, 'morning');
    // no_normal: Tue afternoon
    await tb.setDialogRestriction(page, 'no_normal');
    await tb.clickGridCell(page, 'all', 1, 'afternoon');
    // no_duty: Wed night
    await tb.setDialogRestriction(page, 'no_duty');
    await tb.clickGridCell(page, 'all', 2, 'night');

    await tb.saveEditDialog(page);
    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], [
      sp('all', 0, 'morning', 'no_work'),
      sp('all', 1, 'afternoon', 'no_normal'),
      sp('all', 2, 'night', 'no_duty'),
    ]);
  });

  // ─── 3.5 Random Combinations — Even/Odd ────────────────────────────────

  test('even/odd: mixed restrictions on different cells across parities', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-Mix2' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);
    await tb.setDialogWeekMode(page, 'even_odd');

    // no_work: Mon morning (even)
    await tb.setDialogRestriction(page, 'no_work');
    await tb.clickGridCell(page, 'even', 0, 'morning');
    // no_normal: Tue afternoon (odd)
    await tb.setDialogRestriction(page, 'no_normal');
    await tb.clickGridCell(page, 'odd', 1, 'afternoon');
    // no_duty: Fri night (even)
    await tb.setDialogRestriction(page, 'no_duty');
    await tb.clickGridCell(page, 'even', 4, 'night');

    await tb.saveEditDialog(page);
    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], [
      sp('even', 0, 'morning', 'no_work'),
      sp('odd', 1, 'afternoon', 'no_normal'),
      sp('even', 4, 'night', 'no_duty'),
    ]);
  });

  // ─── 3.6 Cross-Mode ────────────────────────────────────────────────────

  test('mixed all weeks and even/odd values coexist', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'WPref-Cross' });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');
    await tb.openEditDialog(page, worker.id);

    // Set a value in all weeks mode
    await tb.setDialogRestriction(page, 'no_work');
    await tb.clickGridCell(page, 'all', 0, 'morning');

    // Switch to even/odd and set a different value
    await tb.setDialogWeekMode(page, 'even_odd');
    await tb.setDialogRestriction(page, 'no_duty');
    await tb.clickGridCell(page, 'even', 1, 'afternoon');

    await tb.saveEditDialog(page);
    const updated = await tb.getWorkerById(worker.id);
    expectSlotsMatch(updated.weeklyPreferences?.slots ?? [], [
      sp('all', 0, 'morning', 'no_work'),
      sp('even', 1, 'afternoon', 'no_duty'),
    ]);
  });
});
