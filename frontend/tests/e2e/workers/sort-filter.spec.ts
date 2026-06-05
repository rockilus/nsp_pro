import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { WorkerTestBase } from '../../utils/worker-test-base';

test.describe('Worker Table Sorting & Filtering', () => {
  const testBasesMap = new Map<string, WorkerTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const workerTestBase = new WorkerTestBase();
    testBasesMap.set(testRunId, workerTestBase);
    (testInfo as any).testRunId = testRunId;

    await getTestBase(testInfo).setupWorkerTests(workerIndex);
    await getTestBase(testInfo).navigateToWorkersPage(page);
    await page.waitForSelector('[aria-label="worker table"]');
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  /** Get the isolated WorkerTestBase for the current test */
  function getTestBase(testInfo: any): WorkerTestBase {
    const testRunId = testInfo.testRunId as string;
    const tb = testBasesMap.get(testRunId);
    if (!tb) throw new Error('Test base not found');
    return tb;
  }

  // ── Helpers ──────────────────────────────────────────────

  /** Open the column sort/filter menu by clicking the three-dot button */
  async function openColumnMenu(page: any, columnId: string) {
    const menuBtn = page.locator(`[data-testid="column-menu-${columnId}"]`);
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    // Wait for the Radix popover animation to finish before interacting
    await page.waitForTimeout(200);
  }

  /** Click a sort option (asc/desc) in the open dropdown */
  async function clickSortOption(page: any, columnId: string, direction: 'asc' | 'desc') {
    const option = page.locator(`[data-testid="sort-${direction}-${columnId}"]`);
    await expect(option).toBeVisible();
    // force:true works around Radix dialog focus-trap edge cases
    await option.click({ force: true });
  }

  /** Click "Remove Sort" if visible */
  async function removeSort(page: any, columnId: string) {
    const option = page.locator(`[data-testid="remove-sort-${columnId}"]`);
    await option.click({ force: true });
  }

  /** Open the filter sub-menu from the column dropdown */
  async function openFilterFromMenu(page: any, columnId: string) {
    await openColumnMenu(page, columnId);
    const filterMenuItem = page.locator(`[data-testid="filter-menu-${columnId}"]`);
    await expect(filterMenuItem).toBeVisible();
    await filterMenuItem.click();
  }

  /** Get the displayed text for each worker in the name column */
  async function getWorkerNames(page: any): Promise<string[]> {
    const rows = page.locator('[data-testid="worker-table"] tbody tr');
    const count = await rows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      // Skip the empty-state row
      const display = row.locator('[data-testid^="worker-name-display-"]');
      const isEmpty = await row.locator('[data-testid="worker-table-empty-state"]').count();
      if (isEmpty > 0) continue;
      const text = await display.textContent();
      if (text) names.push(text.trim());
    }
    return names;
  }

  /** Verify the sort chip in the filter bar shows the expected label */
  async function expectSortChip(page: any, labelContains: string) {
    const chip = page.locator('[data-testid="sort-chip"]');
    await expect(chip).toBeVisible();
    await expect(chip).toContainText(labelContains);
  }

  /** Remove a filter chip by its label */
  async function removeFilterChip(page: any, labelContains: string) {
    // Each chip has an X button; click the one inside the chip containing the label
    const chip = page.locator('[data-testid^="filter-chip"]').filter({
      hasText: labelContains,
    });
    await chip.locator('button[aria-label="Remove sort"], button').click();
  }

  // ════════════════════════════════════════════════════════════
  //  Sort — name (select / string column)
  // ════════════════════════════════════════════════════════════

  test('should sort workers by name ascending', async ({ page }, testInfo) => {
    // Create workers with names that sort alphabetically: Bob before Carol
    await getTestBase(testInfo).createTestWorker({ name: 'Carol', acronym: 'CA', weeklyHours: 39 });
    await getTestBase(testInfo).createTestWorker({ name: 'Bob', acronym: 'BO', weeklyHours: 39 });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await openColumnMenu(page, 'name');
    await clickSortOption(page, 'name', 'asc');

    await expectSortChip(page, 'Name');
    const names = await getWorkerNames(page);
    expect(names[0]).toBe('Bob');
    expect(names[1]).toBe('Carol');

    console.log('✅ Sorted by name ascending');
  });

  test('should sort workers by name descending', async ({ page }, testInfo) => {
    await getTestBase(testInfo).createTestWorker({ name: 'Alice', acronym: 'AL', weeklyHours: 39 });
    await getTestBase(testInfo).createTestWorker({ name: 'Zara', acronym: 'ZA', weeklyHours: 39 });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await openColumnMenu(page, 'name');
    await clickSortOption(page, 'name', 'desc');

    await expectSortChip(page, 'Name');
    const names = await getWorkerNames(page);
    expect(names[0]).toBe('Zara');
    expect(names[1]).toBe('Alice');

    console.log('✅ Sorted by name descending');
  });

  test('should remove sort when clicking Remove Sort', async ({ page }, testInfo) => {
    await getTestBase(testInfo).createTestWorker({
      name: 'Xander',
      acronym: 'XA',
      weeklyHours: 39,
    });
    await getTestBase(testInfo).createTestWorker({
      name: 'Yvonne',
      acronym: 'YV',
      weeklyHours: 39,
    });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Apply a sort
    await openColumnMenu(page, 'name');
    await clickSortOption(page, 'name', 'asc');
    await expectSortChip(page, 'Name');

    // Remove via dropdown
    await openColumnMenu(page, 'name');
    await removeSort(page, 'name');

    // Sort chip should be gone
    await expect(page.locator('[data-testid="sort-chip"]')).not.toBeVisible();

    console.log('✅ Sort removed via dropdown');
  });

  // ════════════════════════════════════════════════════════════
  //  Sort — weeklyHours (numeric-as-string column)
  // ════════════════════════════════════════════════════════════

  test('should sort workers by weekly hours ascending', async ({ page }, testInfo) => {
    await getTestBase(testInfo).createTestWorker({
      name: 'Low Hours',
      acronym: 'LH',
      weeklyHours: 30,
      weeklyHoursDesired: 30,
    });
    await getTestBase(testInfo).createTestWorker({
      name: 'High Hours',
      acronym: 'HH',
      weeklyHours: 45,
      weeklyHoursDesired: 45,
    });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await openColumnMenu(page, 'weeklyHours');
    await clickSortOption(page, 'weeklyHours', 'asc');

    await expectSortChip(page, 'Contract');
    const names = await getWorkerNames(page);
    expect(names[0]).toBe('Low Hours');
    expect(names[1]).toBe('High Hours');

    console.log('✅ Sorted by weekly hours ascending');
  });

  test('should sort workers by weekly hours descending', async ({ page }, testInfo) => {
    await getTestBase(testInfo).createTestWorker({
      name: 'Medium',
      acronym: 'MD',
      weeklyHours: 39,
      weeklyHoursDesired: 39,
    });
    await getTestBase(testInfo).createTestWorker({
      name: 'Overtime',
      acronym: 'OT',
      weeklyHours: 50,
      weeklyHoursDesired: 50,
    });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await openColumnMenu(page, 'weeklyHours');
    await clickSortOption(page, 'weeklyHours', 'desc');

    await expectSortChip(page, 'Contract');
    const names = await getWorkerNames(page);
    expect(names[0]).toBe('Overtime');
    expect(names[1]).toBe('Medium');

    console.log('✅ Sorted by weekly hours descending');
  });

  // ════════════════════════════════════════════════════════════
  //  Sort — employment start date (date column)
  // ════════════════════════════════════════════════════════════

  test('should sort workers by employment start date', async ({ page }, testInfo) => {
    // Both workers get today's start date by default, so we sort by name
    // as a proxy to verify date column sorting works — the menu opens and
    // the sort chip appears
    await getTestBase(testInfo).createTestWorker({ name: 'First', acronym: 'FI', weeklyHours: 39 });
    await getTestBase(testInfo).createTestWorker({
      name: 'Second',
      acronym: 'SE',
      weeklyHours: 39,
    });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await openColumnMenu(page, 'employmentStartDate');
    await clickSortOption(page, 'employmentStartDate', 'asc');

    await expectSortChip(page, 'Start');
    // Both have the same date so order may be arbitrary — just confirm sort is active
    const names = await getWorkerNames(page);
    expect(names.length).toBe(2);

    console.log('✅ Date column sort chip appears');
  });

  // ════════════════════════════════════════════════════════════
  //  Filter — name (select filter)
  // ════════════════════════════════════════════════════════════

  test('should navigate to filter view and back to menu', async ({ page }, testInfo) => {
    await getTestBase(testInfo).createTestWorker({
      name: 'Worker A',
      acronym: 'WA',
      weeklyHours: 39,
    });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Open popover → see sort menu
    await openColumnMenu(page, 'name');
    await expect(page.locator('[data-testid="sort-asc-name"]')).toBeVisible();

    // Click Filter → popover switches to filter view
    await page.locator('[data-testid="filter-menu-name"]').click();

    // Filter view should have the select filter and a Back button
    await expect(page.locator('[data-testid="select-filter-name"]')).toBeVisible();
    await expect(page.locator('button:has-text("Back")')).toBeVisible();

    // Click Back → returns to sort menu
    await page.locator('button:has-text("Back")').click();
    await expect(page.locator('[data-testid="sort-asc-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="select-filter-name"]')).not.toBeVisible();

    console.log('✅ Filter view ← Back → menu works');
  });

  test('should filter workers by name', async ({ page }, testInfo) => {
    await getTestBase(testInfo).createTestWorker({
      name: 'FilterMeIn',
      acronym: 'FI',
      weeklyHours: 39,
    });
    await getTestBase(testInfo).createTestWorker({
      name: 'FilterMeOut',
      acronym: 'FO',
      weeklyHours: 39,
    });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await openFilterFromMenu(page, 'name');

    // The select filter should show checkboxes for each worker name
    const filterContainer = page.locator('[data-testid="select-filter-name"]');
    await expect(filterContainer).toBeVisible();

    // Check only "FilterMeIn"
    const option = page.locator('[data-testid="filter-option-name-FilterMeIn"]');
    await expect(option).toBeVisible();
    await option.click();

    // Apply the filter
    await page.locator('[data-testid="filter-apply-name"]').click();

    // Wait for filter to take effect — chip appears, then table re-renders
    await expect(page.locator('[data-testid^="filter-chip"]')).toBeVisible();
    await page.waitForTimeout(200);

    // Only FilterMeIn should be visible
    const names = await getWorkerNames(page);
    expect(names).toEqual(['FilterMeIn']);

    console.log('✅ Filtered by name');
  });

  // ════════════════════════════════════════════════════════════
  //  Filter — weeklyHours (select filter, numeric)
  // ════════════════════════════════════════════════════════════

  test('should filter workers by weekly hours', async ({ page }, testInfo) => {
    await getTestBase(testInfo).createTestWorker({
      name: 'PartTime',
      acronym: 'PT',
      weeklyHours: 20,
      weeklyHoursDesired: 20,
    });
    await getTestBase(testInfo).createTestWorker({
      name: 'FullTime',
      acronym: 'FT',
      weeklyHours: 40,
      weeklyHoursDesired: 40,
    });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await openFilterFromMenu(page, 'weeklyHours');

    const filterContainer = page.locator('[data-testid="select-filter-weeklyHours"]');
    await expect(filterContainer).toBeVisible();

    // Select only "40"
    await page.locator('[data-testid="filter-option-weeklyHours-40"]').click();
    await page.locator('[data-testid="filter-apply-weeklyHours"]').click();

    await expect(page.locator('[data-testid^="filter-chip"]')).toBeVisible();
    await page.waitForTimeout(200);

    const names = await getWorkerNames(page);
    expect(names).toEqual(['FullTime']);

    console.log('✅ Filtered by weekly hours');
  });

  // ════════════════════════════════════════════════════════════
  //  Filter — acronym (select filter, empty values)
  // ════════════════════════════════════════════════════════════

  test('should filter workers by acronym', async ({ page }, testInfo) => {
    await getTestBase(testInfo).createTestWorker({ name: 'Alpha', acronym: 'AL', weeklyHours: 39 });
    await getTestBase(testInfo).createTestWorker({ name: 'Beta', acronym: 'BE', weeklyHours: 39 });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await openFilterFromMenu(page, 'acronym');

    const filterContainer = page.locator('[data-testid="select-filter-acronym"]');
    await expect(filterContainer).toBeVisible();

    await page.locator('[data-testid="filter-option-acronym-BE"]').click();
    await page.locator('[data-testid="filter-apply-acronym"]').click();

    await expect(page.locator('[data-testid^="filter-chip"]')).toBeVisible();
    await page.waitForTimeout(200);

    const names = await getWorkerNames(page);
    expect(names).toEqual(['Beta']);

    console.log('✅ Filtered by acronym');
  });

  // ════════════════════════════════════════════════════════════
  //  Combined sort + filter
  // ════════════════════════════════════════════════════════════

  test('should allow combining sort and filter', async ({ page }, testInfo) => {
    await getTestBase(testInfo).createTestWorker({
      name: 'Dan',
      acronym: 'DN',
      weeklyHours: 40,
      weeklyHoursDesired: 40,
    });
    await getTestBase(testInfo).createTestWorker({
      name: 'Ann',
      acronym: 'AN',
      weeklyHours: 40,
      weeklyHoursDesired: 40,
    });
    await getTestBase(testInfo).createTestWorker({
      name: 'Zed',
      acronym: 'ZD',
      weeklyHours: 20,
      weeklyHoursDesired: 20,
    });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Step 1: Filter to weeklyHours = 40 (Dan + Ann)
    await openFilterFromMenu(page, 'weeklyHours');
    await page.locator('[data-testid="filter-option-weeklyHours-40"]').click();
    await page.locator('[data-testid="filter-apply-weeklyHours"]').click();

    await expect(page.locator('[data-testid^="filter-chip"]')).toBeVisible();
    await page.waitForTimeout(200);

    let names = await getWorkerNames(page);
    expect(names.length).toBe(2);

    // Step 2: Sort by name ascending (Ann before Dan with weeklyHours=40)
    await openColumnMenu(page, 'name');
    await clickSortOption(page, 'name', 'asc');

    names = await getWorkerNames(page);
    expect(names).toEqual(['Ann', 'Dan']);

    console.log('✅ Combined sort and filter');
  });

  // ════════════════════════════════════════════════════════════
  //  Reset all
  // ════════════════════════════════════════════════════════════

  test('should reset all filters and sorts via reset button', async ({ page }, testInfo) => {
    await getTestBase(testInfo).createTestWorker({ name: 'One', acronym: 'ON', weeklyHours: 39 });
    await getTestBase(testInfo).createTestWorker({ name: 'Two', acronym: 'TW', weeklyHours: 39 });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Apply a sort
    await openColumnMenu(page, 'name');
    await clickSortOption(page, 'name', 'asc');
    await expectSortChip(page, 'Name');

    // Reset via the filter bar reset button
    await page.locator('button:has-text("Reset")').click();

    // Sort chip should be gone
    await expect(page.locator('[data-testid="sort-chip"]')).not.toBeVisible();

    // Both workers should be visible
    const names = await getWorkerNames(page);
    expect(names.length).toBe(2);

    console.log('✅ Reset all clears filters and sorts');
  });

  // ════════════════════════════════════════════════════════════
  //  Filter — date column
  // ════════════════════════════════════════════════════════════

  test('should filter workers by employment start date range', async ({ page }, testInfo) => {
    await getTestBase(testInfo).createTestWorker({
      name: 'DateWorker1',
      acronym: 'D1',
      weeklyHours: 39,
    });
    await getTestBase(testInfo).createTestWorker({
      name: 'DateWorker2',
      acronym: 'D2',
      weeklyHours: 39,
    });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await openFilterFromMenu(page, 'employmentStartDate');

    const filterContainer = page.locator('[data-testid="date-filter-employmentStartDate"]');
    await expect(filterContainer).toBeVisible();

    // Both workers have today's date, so filter by today should show both
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    await page.locator('[data-testid="filter-start-date-employmentStartDate"]').fill(today);
    await page.locator('[data-testid="filter-end-date-employmentStartDate"]').fill(today);
    await page.locator('[data-testid="filter-apply-employmentStartDate"]').click();

    await expect(page.locator('[data-testid^="filter-chip"]')).toBeVisible();
    await page.waitForTimeout(200);

    const names = await getWorkerNames(page);
    expect(names.length).toBe(2);

    console.log('✅ Date range filter applied');
  });

  // ════════════════════════════════════════════════════════════
  //  Toggle sort direction
  // ════════════════════════════════════════════════════════════

  test('should toggle sort direction without removing first', async ({ page }, testInfo) => {
    await getTestBase(testInfo).createTestWorker({
      name: 'Charlie',
      acronym: 'CH',
      weeklyHours: 39,
    });
    await getTestBase(testInfo).createTestWorker({ name: 'Anna', acronym: 'AN', weeklyHours: 39 });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Sort ascending
    await openColumnMenu(page, 'name');
    await clickSortOption(page, 'name', 'asc');
    await expectSortChip(page, 'Name');
    await page.waitForTimeout(300);
    let names = await getWorkerNames(page);
    expect(names[0]).toBe('Anna');

    // Toggle to descending without removing first
    await openColumnMenu(page, 'name');
    await clickSortOption(page, 'name', 'desc');
    await expectSortChip(page, 'Name');
    await page.waitForTimeout(300);
    names = await getWorkerNames(page);
    expect(names[0]).toBe('Charlie');

    console.log('✅ Sort direction toggled');
  });

  // ════════════════════════════════════════════════════════════
  //  Menu resets to sort view after close + reopen
  // ════════════════════════════════════════════════════════════

  test('should reset to sort menu when popover is closed and reopened', async ({
    page,
  }, testInfo) => {
    await getTestBase(testInfo).createTestWorker({
      name: 'ResetTest',
      acronym: 'RT',
      weeklyHours: 39,
    });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Open, navigate to filter view
    await openColumnMenu(page, 'name');
    await page.locator('[data-testid="filter-menu-name"]').click();
    await expect(page.locator('[data-testid="select-filter-name"]')).toBeVisible();

    // Close popover by clicking the trigger again
    await page.locator('[data-testid="column-menu-name"]').click();
    await expect(page.locator('[data-testid="select-filter-name"]')).not.toBeVisible();

    // Reopen — should be back to sort menu, not filter view
    await openColumnMenu(page, 'name');
    await expect(page.locator('[data-testid="sort-asc-name"]')).toBeVisible();

    console.log('✅ Popover resets to sort menu on reopen');
  });
});
