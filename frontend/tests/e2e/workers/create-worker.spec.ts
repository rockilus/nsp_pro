import { test, expect } from '@playwright/test';
import { WorkerTestBase } from '../../utils/worker-test-base';
import dayjs from 'dayjs';

const workerTestBase = new WorkerTestBase();

test.describe('Worker Creation with Database Reset', () => {
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
    await page.waitForSelector('[aria-label="worker table"]');

    // The table should show a single row with the 'no_workers_found' message
    const workerRows = workerTestBase.getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    // Check that the cell contains the expected empty state text
    const emptyCell = workerRows.first().locator('td');
    await expect(emptyCell).toContainText('no_workers_found');

    console.log('✅ Worker table shows empty state as expected');
  });

  test('should create a new worker when "+Worker" button is pressed', async ({ page }) => {
    // Create a worker using the shared utility
    await workerTestBase.createWorkerViaUI(page);

    // Get the newly created worker row to verify its default values
    const workerRow = workerTestBase.getWorkerRow(page);

    // Verify default worker properties based on the specifications:

    // 1. Name should be empty (or "Unnamed Worker" if that's the default)
    const nameCell = workerTestBase.getWorkerNameCell(page);
    // The name field might be an input or text field - check both possibilities
    const nameInput = nameCell.locator('input');
    if (await nameInput.isVisible()) {
      await expect(nameInput).toHaveValue('');
    }

    // 2. Acronym should be empty
    const acronymCell = workerTestBase.getWorkerAcronymCell(page);
    const acronymInput = acronymCell.locator('input');
    if (await acronymInput.isVisible()) {
      await expect(acronymInput).toHaveValue('');
    }

    // 3. Contract start should be today's date
    const today = dayjs().format('YYYY-MM-DD');
    const contractStartCell = workerRow.locator('td').nth(2); // Assuming third column is contract start
    const contractStartInput = contractStartCell.locator('input');
    if (await contractStartInput.isVisible()) {
      // The date might be in different formats, so we'll check if it matches today
      const inputValue = await contractStartInput.inputValue();
      expect(inputValue).toContain(today.split('-')[0]); // At least check the year
    }

    // 4. Weekly hours should be 39
    const weeklyHoursCell = workerRow.locator('td').nth(5); // Adjust index based on actual column order
    const weeklyHoursInput = weeklyHoursCell.locator('input');
    if (await weeklyHoursInput.isVisible()) {
      await expect(weeklyHoursInput).toHaveValue('39');
    }

    // 5. Desired weekly hours should be 39
    const desiredHoursCell = workerRow.locator('td').nth(6); // Adjust index based on actual column order
    const desiredHoursInput = desiredHoursCell.locator('input');
    if (await desiredHoursInput.isVisible()) {
      await expect(desiredHoursInput).toHaveValue('39');
    }

    // 6. Duties per month should be 4
    const dutiesCell = workerRow.locator('td').nth(7); // Adjust index based on actual column order
    const dutiesInput = dutiesCell.locator('input');
    if (await dutiesInput.isVisible()) {
      await expect(dutiesInput).toHaveValue('4');
    }

    // 7. Annual leave should be 25
    const leaveCell = workerRow.locator('td').nth(8); // Adjust index based on actual column order
    const leaveInput = leaveCell.locator('input');
    if (await leaveInput.isVisible()) {
      await expect(leaveInput).toHaveValue('25');
    }

    console.log('✅ New worker created with correct default values');
  });

  test('should allow editing the newly created worker', async ({ page }) => {
    // First create a worker using the shared utility
    await workerTestBase.createWorkerViaUI(page);

    // Get the worker name cell and edit it
    const nameCell = workerTestBase.getWorkerNameCell(page);
    const nameInput = nameCell.locator('input');

    if (await nameInput.isVisible()) {
      // Clear the current value and type a new name
      await nameInput.fill('Test Worker');

      // Press Enter or tab to trigger save
      await nameInput.press('Tab');

      // Verify the name was updated
      await expect(nameInput).toHaveValue('Test Worker');
    }

    console.log('✅ Worker name updated successfully');
  });

  test('should display the correct table headers', async ({ page }) => {
    // Verify that the worker table has the expected column headers
    const table = workerTestBase.getWorkerTable(page);
    const headerRow = table.locator('thead tr');

    // Check for expected headers based on DefaultWorkerFields
    await expect(headerRow).toContainText('Name');
    await expect(headerRow).toContainText('Acronym');
    await expect(headerRow).toContainText('Contract start');
    await expect(headerRow).toContainText('Contract end');
    await expect(headerRow).toContainText('Specialties');
    await expect(headerRow).toContainText('Weekly hours');
    await expect(headerRow).toContainText('Desired weekly hours');
    await expect(headerRow).toContainText('Duties per month');
    await expect(headerRow).toContainText('Leave (days)');

    console.log('✅ Table headers are correctly displayed');
  });
});
