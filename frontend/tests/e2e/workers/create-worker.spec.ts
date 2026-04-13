import { test, expect } from '@playwright/test';
import { WorkerTestBase } from '../../utils/worker-test-base';
import dayjs from 'dayjs';

const workerTestBase = new WorkerTestBase();

test.describe('Worker Creation', () => {
  test.beforeAll(async () => {
    // Setup the common worker test environment
    await workerTestBase.setupWorkerTests(test.info().workerIndex);
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the workers page for each test
    await workerTestBase.navigateToWorkersPage(page);
  });

  test('should start with an empty worker table', async ({ page }) => {
    // Verify that the table starts empty (before adding any workers)
    await page.waitForSelector('[data-testid="worker-table"]');

    // The table should show a single row with the empty state cell
    const workerRows = workerTestBase.getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    // Check that the empty state cell is visible
    await expect(page.locator('[data-testid="worker-table-empty-state"]')).toBeVisible();

    console.log('✅ Worker table shows empty state as expected');
  });

  test('should create a new worker when "+Worker" button is pressed', async ({ page }) => {
    // Create a worker using the shared utility
    await workerTestBase.createWorkerViaUI(page);

    // Verify default worker properties based on the specifications:

    // 1. Name display should show the default placeholder
    const nameDisplay = workerTestBase.getWorkerNameDisplay(page);
    await expect(nameDisplay).toBeVisible();

    // 2. Acronym display should be visible and empty
    const acronymDisplay = workerTestBase.getWorkerAcronymDisplay(page);
    await expect(acronymDisplay).toBeVisible();

    // 3. Employment start should be today's date
    const today = dayjs().format('DD/MM/YYYY');
    const startDisplay = workerTestBase.getWorkerEmploymentStartDisplay(page);
    await expect(startDisplay).toBeVisible();
    await expect(startDisplay).toContainText(today);

    // 4. Weekly hours should default to 39
    const weeklyHoursDisplay = workerTestBase.getWorkerWeeklyHoursDisplay(page);
    await expect(weeklyHoursDisplay).toContainText('39');

    // 5. Desired weekly hours should default to 39
    const weeklyHoursDesiredDisplay = workerTestBase.getWorkerWeeklyHoursDesiredDisplay(page);
    await expect(weeklyHoursDesiredDisplay).toContainText('39');

    // 6. Duties per month should default to 4
    const dutiesDisplay = workerTestBase.getWorkerDutiesPerMonthDisplay(page);
    await expect(dutiesDisplay).toContainText('4');

    // 7. Annual leave should default to 25
    const annualLeaveDisplay = workerTestBase.getWorkerAnnualLeaveDisplay(page);
    await expect(annualLeaveDisplay).toContainText('25');

    console.log('✅ New worker created with correct default values');
  });

  test('should allow editing the newly created worker', async ({ page }) => {
    // First create a worker using the shared utility
    await workerTestBase.createWorkerViaUI(page);

    // Click the name cell to enter edit mode
    await workerTestBase.getWorkerNameCell(page).click();

    // Get the name input that appears in edit mode
    const nameInput = workerTestBase.getWorkerNameInput(page);
    await expect(nameInput).toBeVisible();

    // Clear the current value and type a new name
    await nameInput.fill('Test Worker');

    // Press Enter to confirm the edit
    await nameInput.press('Enter');

    // After confirming, the display should show the new name
    const nameDisplay = workerTestBase.getWorkerNameDisplay(page);
    await expect(nameDisplay).toContainText('Test Worker');

    console.log('✅ Worker name updated successfully');
  });

  test('should display the correct table headers', async ({ page }) => {
    // Verify that the worker table has the expected column header cells via data-testid
    const table = workerTestBase.getWorkerTable(page);

    await expect(table.locator('[data-testid="worker-name-header-cell"]')).toBeVisible();
    await expect(table.locator('[data-testid="worker-acronym-header-cell"]')).toBeVisible();
    await expect(
      table.locator('[data-testid="worker-employmentStartDate-header-cell"]'),
    ).toBeVisible();
    await expect(
      table.locator('[data-testid="worker-employmentEndDate-header-cell"]'),
    ).toBeVisible();
    await expect(table.locator('[data-testid="worker-specialty-header-cell"]')).toBeVisible();
    await expect(table.locator('[data-testid="worker-weeklyHours-header-cell"]')).toBeVisible();
    await expect(
      table.locator('[data-testid="worker-weeklyHoursDesired-header-cell"]'),
    ).toBeVisible();
    await expect(table.locator('[data-testid="worker-dutiesPerMonth-header-cell"]')).toBeVisible();
    await expect(table.locator('[data-testid="worker-annualLeave-header-cell"]')).toBeVisible();

    console.log('✅ Table headers are correctly displayed');
  });
});
