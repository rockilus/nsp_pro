import { test, expect } from '@playwright/test';
import { WorkerTestBase } from '../../utils/worker-test-base';

const workerTestBase = new WorkerTestBase();

test.describe('Worker Table Sorting & Filtering', () => {
  test.beforeAll(async () => {
    await workerTestBase.setupWorkerTests(test.info().workerIndex);
  });

  test.beforeEach(async ({ page }) => {
    await workerTestBase.navigateToWorkersPage(page);
    await page.waitForSelector('[aria-label="worker table"]');
  });

  // ── Helpers ──────────────────────────────────────────────

  /** Open the column sort/filter menu by clicking the three-dot button */
  async function openColumnMenu(page: any, columnId: string) {
    const menuBtn = page.locator(`[data-testid="column-menu-${columnId}"]`);
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
  }

  /** Click a sort option (asc/desc) in the open dropdown */
  async function clickSortOption(page: any, columnId: string, direction: 'asc' | 'desc') {
    const option = page.locator(`[data-testid="sort-${direction}-${columnId}"]`);
    await expect(option).toBeVisible();
    await option.click();
  }

  /** Click "Remove Sort" if visible */
  async function removeSort(page: any, columnId: string) {
    const option = page.locator(`[data-testid="remove-sort-${columnId}"]`);
    await option.click();
  }

  /** Open the filter sub-menu from the column dropdown */
  async function openFilterFromMenu(page: any, columnId: string) {
    await openColumnMenu(page, columnId);
    const filterMenuItem = page.locator(`[data-testid="filter-menu-${columnId}"]`);
    await expect(filterMenuItem).toBeVisible();
    await filterMenuItem.click();
  }

  /** Get the displayed text for the first two workers in the name column */
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

  test('should sort workers by name ascending', async ({ page }) => {
    // Create workers with names that sort alphabetically: Bob before Carol
    await workerTestBase.createTestWorker({ name: 'Carol', acronym: 'CA', weeklyHours: 39 });
    await workerTestBase.createTestWorker({ name: 'Bob', acronym: 'BO', weeklyHours: 39 });
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

  test('should sort workers by name descending', async ({ page }) => {
    await workerTestBase.createTestWorker({ name: 'Alice', acronym: 'AL', weeklyHours: 39 });
    await workerTestBase.createTestWorker({ name: 'Zara', acronym: 'ZA', weeklyHours: 39 });
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

  test('should remove sort when clicking Remove Sort', async ({ page }) => {
    await workerTestBase.createTestWorker({ name: 'Xander', acronym: 'XA', weeklyHours: 39 });
    await workerTestBase.createTestWorker({ name: 'Yvonne', acronym: 'YV', weeklyHours: 39 });
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

  test('should sort workers by weekly hours ascending', async ({ page }) => {
    await workerTestBase.createTestWorker({
      name: 'Low Hours',
      acronym: 'LH',
      weeklyHours: 30,
      weeklyHoursDesired: 30,
    });
    await workerTestBase.createTestWorker({
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

  test('should sort workers by weekly hours descending', async ({ page }) => {
    await workerTestBase.createTestWorker({
      name: 'Medium',
      acronym: 'MD',
      weeklyHours: 39,
      weeklyHoursDesired: 39,
    });
    await workerTestBase.createTestWorker({
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

  test('should sort workers by employment start date', async ({ page }) => {
    // Both workers get today's start date by default, so we sort by name
    // as a proxy to verify date column sorting works — the menu opens and
    // the sort chip appears
    await workerTestBase.createTestWorker({ name: 'First', acronym: 'FI', weeklyHours: 39 });
    await workerTestBase.createTestWorker({ name: 'Second', acronym: 'SE', weeklyHours: 39 });
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

  test('should filter workers by name', async ({ page }) => {
    await workerTestBase.createTestWorker({ name: 'FilterMeIn', acronym: 'FI', weeklyHours: 39 });
    await workerTestBase.createTestWorker({ name: 'FilterMeOut', acronym: 'FO', weeklyHours: 39 });
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

    // Only FilterMeIn should be visible
    const names = await getWorkerNames(page);
    expect(names).toEqual(['FilterMeIn']);

    console.log('✅ Filtered by name');
  });

  // ════════════════════════════════════════════════════════════
  //  Filter — weeklyHours (select filter, numeric)
  // ════════════════════════════════════════════════════════════

  test('should filter workers by weekly hours', async ({ page }) => {
    await workerTestBase.createTestWorker({
      name: 'PartTime',
      acronym: 'PT',
      weeklyHours: 20,
      weeklyHoursDesired: 20,
    });
    await workerTestBase.createTestWorker({
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

    const names = await getWorkerNames(page);
    expect(names).toEqual(['FullTime']);

    console.log('✅ Filtered by weekly hours');
  });

  // ════════════════════════════════════════════════════════════
  //  Filter — acronym (select filter, empty values)
  // ════════════════════════════════════════════════════════════

  test('should filter workers by acronym', async ({ page }) => {
    await workerTestBase.createTestWorker({ name: 'Alpha', acronym: 'AL', weeklyHours: 39 });
    await workerTestBase.createTestWorker({ name: 'Beta', acronym: 'BE', weeklyHours: 39 });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await openFilterFromMenu(page, 'acronym');

    const filterContainer = page.locator('[data-testid="select-filter-acronym"]');
    await expect(filterContainer).toBeVisible();

    await page.locator('[data-testid="filter-option-acronym-BE"]').click();
    await page.locator('[data-testid="filter-apply-acronym"]').click();

    const names = await getWorkerNames(page);
    expect(names).toEqual(['Beta']);

    console.log('✅ Filtered by acronym');
  });

  // ════════════════════════════════════════════════════════════
  //  Combined sort + filter
  // ════════════════════════════════════════════════════════════

  test('should allow combining sort and filter', async ({ page }) => {
    await workerTestBase.createTestWorker({
      name: 'Dan',
      acronym: 'DN',
      weeklyHours: 40,
      weeklyHoursDesired: 40,
    });
    await workerTestBase.createTestWorker({
      name: 'Ann',
      acronym: 'AN',
      weeklyHours: 40,
      weeklyHoursDesired: 40,
    });
    await workerTestBase.createTestWorker({
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

  test('should reset all filters and sorts via reset button', async ({ page }) => {
    await workerTestBase.createTestWorker({ name: 'One', acronym: 'ON', weeklyHours: 39 });
    await workerTestBase.createTestWorker({ name: 'Two', acronym: 'TW', weeklyHours: 39 });
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

  test('should filter workers by employment start date range', async ({ page }) => {
    await workerTestBase.createTestWorker({ name: 'DateWorker1', acronym: 'D1', weeklyHours: 39 });
    await workerTestBase.createTestWorker({ name: 'DateWorker2', acronym: 'D2', weeklyHours: 39 });
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

    const names = await getWorkerNames(page);
    expect(names.length).toBe(2);

    console.log('✅ Date range filter applied');
  });

  // ════════════════════════════════════════════════════════════
  //  Toggle sort direction
  // ════════════════════════════════════════════════════════════

  test('should toggle sort direction without removing first', async ({ page }) => {
    await workerTestBase.createTestWorker({ name: 'Charlie', acronym: 'CH', weeklyHours: 39 });
    await workerTestBase.createTestWorker({ name: 'Anna', acronym: 'AN', weeklyHours: 39 });
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Sort ascending
    await openColumnMenu(page, 'name');
    await clickSortOption(page, 'name', 'asc');
    let names = await getWorkerNames(page);
    expect(names[0]).toBe('Anna');

    // Toggle to descending without removing first
    await openColumnMenu(page, 'name');
    await clickSortOption(page, 'name', 'desc');
    names = await getWorkerNames(page);
    expect(names[0]).toBe('Charlie');

    console.log('✅ Sort direction toggled');
  });
});
