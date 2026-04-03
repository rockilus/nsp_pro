import { test, expect } from '@playwright/test';
import { WorkerTestBase } from '../../utils/worker-test-base';

const workerTestBase = new WorkerTestBase();

test.describe('Worker Employment End Date Updates', () => {
  let testWorker: { id: string; name: string; teamId: string };
  let initialWorkerName: string;

  test.beforeEach(async ({ page }) => {
    // Setup the common worker test environment
    await workerTestBase.setupWorkerTests(test.info().workerIndex);

    // Use a unique name per test to avoid conflicts
    initialWorkerName = `John Doe ${test.info().workerIndex}-${Date.now()}`;

    // Create a fresh test worker for each test
    testWorker = await workerTestBase.createTestWorker({
      name: initialWorkerName,
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    console.log(`Created test worker: ${testWorker.name} (${testWorker.id})`);

    // Navigate to the workers page
    await workerTestBase.navigateToWorkersPage(page);

    // Wait for the worker table to load and our test worker to appear
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify our test worker is visible in the table
    const workerRows = workerTestBase.getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    // Verify the worker name is displayed
    const nameCell = workerTestBase.getWorkerNameCell(page);
    await expect(nameCell).toContainText(initialWorkerName);
  });

  test.afterEach(async () => {
    // Clean up: delete the worker created for this test
    if (testWorker?.id) {
      try {
        await workerTestBase.deleteTestWorker(testWorker.id);
        console.log(`Deleted test worker: ${testWorker.id}`);
      } catch (error) {
        console.warn(`Failed to delete test worker ${testWorker.id}:`, error);
      }
    }
  });

  test("should display 'Permanent' as default when creating a new worker", async ({ page }) => {
    // Get the employment end date cell
    const employmentEndCell = workerTestBase.getWorkerEmploymentEndCell(page);
    const employmentEndDisplay = workerTestBase.getWorkerEmploymentEndDisplay(page);

    // Verify the employment end date shows "Permanent" by default
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText('Permanent');

    console.log(`✅ New worker has 'Permanent' as default employment end date`);
  });

  test('should allow editing employment end date by clicking on it and show checkbox', async ({
    page,
  }) => {
    // Get the employment end date cell and display
    const employmentEndCell = workerTestBase.getWorkerEmploymentEndCell(page);
    const employmentEndDisplay = workerTestBase.getWorkerEmploymentEndDisplay(page);

    // Initially, the date should be displayed as text
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText('Permanent');

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // After clicking, the editor should appear with a date picker and checkbox
    const employmentEndEditor = workerTestBase.getWorkerEmploymentEndEditor(page);
    const permanentCheckbox = workerTestBase.getWorkerEmploymentEndPermanentCheckbox(page);
    const permanentCheckboxLabel =
      workerTestBase.getWorkerEmploymentEndPermanentCheckboxLabel(page);

    await expect(employmentEndEditor).toBeVisible();
    await expect(permanentCheckbox).toBeVisible();
    await expect(permanentCheckboxLabel).toBeVisible();

    // The display element should no longer be visible when editing
    await expect(employmentEndDisplay).not.toBeVisible();

    console.log(`✅ Employment end date cell shows date picker and checkbox when clicked`);
  });

  test('should have disabled date picker when permanent is selected', async ({ page }) => {
    // Get the employment end date cell
    const employmentEndCell = workerTestBase.getWorkerEmploymentEndCell(page);

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // Get the date picker input and permanent checkbox
    const employmentEndDatePickerInput = workerTestBase.getWorkerEmploymentEndDatePickerInput(page);
    const permanentCheckbox = workerTestBase.getWorkerEmploymentEndPermanentCheckbox(page);

    // Since default is permanent, the checkbox should be checked and date picker input disabled
    await expect(permanentCheckbox).toBeChecked();
    await expect(employmentEndDatePickerInput).toBeDisabled();

    console.log(`✅ Date picker is disabled when permanent is selected`);
  });

  test('should enable date picker when permanent checkbox is unchecked', async ({ page }) => {
    // Get the employment end date cell
    const employmentEndCell = workerTestBase.getWorkerEmploymentEndCell(page);

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // Get the date picker input and permanent checkbox
    const employmentEndDatePickerInput = workerTestBase.getWorkerEmploymentEndDatePickerInput(page);
    const permanentCheckbox = workerTestBase.getWorkerEmploymentEndPermanentCheckbox(page);

    // Initially, permanent should be checked and date picker input disabled
    await expect(permanentCheckbox).toBeChecked();
    await expect(employmentEndDatePickerInput).toBeDisabled();

    // Uncheck the permanent checkbox
    await permanentCheckbox.click();

    // Now the checkbox should be unchecked and date picker input enabled
    await expect(permanentCheckbox).not.toBeChecked();
    await expect(employmentEndDatePickerInput).toBeEnabled();

    console.log(`✅ Date picker becomes enabled when permanent checkbox is unchecked`);
  });

  test('should update employment end date when datepicker is changed and clicked away', async ({
    page,
  }) => {
    // Get the employment end date cell
    const employmentEndCell = workerTestBase.getWorkerEmploymentEndCell(page);
    const employmentEndDisplay = workerTestBase.getWorkerEmploymentEndDisplay(page);

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // Get the date picker input and permanent checkbox
    const employmentEndDatePickerInput = workerTestBase.getWorkerEmploymentEndDatePickerInput(page);
    const permanentCheckbox = workerTestBase.getWorkerEmploymentEndPermanentCheckbox(page);

    // Uncheck the permanent checkbox to enable the date picker
    await permanentCheckbox.click();
    await expect(employmentEndDatePickerInput).toBeEnabled();

    // Set a specific date using the helper method
    const newDate = '31/12/2025';
    await workerTestBase.setEmploymentEndDate(page, newDate);

    // Click somewhere else to trigger blur event (save)
    const pageTitle = page.getByRole('heading', { name: 'Workers' });
    await pageTitle.click();

    // Wait for the editor to disappear and display to show the updated date
    await expect(workerTestBase.getWorkerEmploymentEndEditor(page)).not.toBeVisible();
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText(newDate);

    console.log(`✅ Employment end date updated to ${newDate} via blur event`);
  });

  test('should update employment end date when datepicker is changed and Enter is pressed', async ({
    page,
  }) => {
    // Get the employment end date cell
    const employmentEndCell = workerTestBase.getWorkerEmploymentEndCell(page);
    const employmentEndDisplay = workerTestBase.getWorkerEmploymentEndDisplay(page);

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // Get the date picker input and permanent checkbox
    const employmentEndDatePickerInput = workerTestBase.getWorkerEmploymentEndDatePickerInput(page);
    const permanentCheckbox = workerTestBase.getWorkerEmploymentEndPermanentCheckbox(page);

    // Uncheck the permanent checkbox to enable the date picker
    await permanentCheckbox.click();
    await expect(employmentEndDatePickerInput).toBeEnabled();

    // Set a specific date using the helper method
    const newDate = '15/06/2025';
    await workerTestBase.setEmploymentEndDate(page, newDate);

    // Press Enter to save
    await employmentEndDatePickerInput.press('Enter');

    // Wait for the editor to disappear and display to show the updated date
    await expect(workerTestBase.getWorkerEmploymentEndEditor(page)).not.toBeVisible();
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText(newDate);

    console.log(`✅ Employment end date updated to ${newDate} via Enter key`);
  });

  test('should not update employment end date when Escape is pressed', async ({ page }) => {
    // Get the employment end date cell
    const employmentEndCell = workerTestBase.getWorkerEmploymentEndCell(page);
    const employmentEndDisplay = workerTestBase.getWorkerEmploymentEndDisplay(page);

    // Get the initial text (should be "Permanent")
    const initialText = await employmentEndDisplay.textContent();
    const initialDisplayText = initialText?.trim() || 'Permanent';

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // Get the date picker input and permanent checkbox
    const employmentEndDatePickerInput = workerTestBase.getWorkerEmploymentEndDatePickerInput(page);
    const permanentCheckbox = workerTestBase.getWorkerEmploymentEndPermanentCheckbox(page);

    // Uncheck the permanent checkbox to enable the date picker
    await permanentCheckbox.click();
    await expect(employmentEndDatePickerInput).toBeEnabled();

    // Set a temporary date (but don't save it) using the helper method
    const tempDate = '01/01/2026';
    await workerTestBase.setEmploymentEndDate(page, tempDate);

    // Press Escape to cancel editing
    await employmentEndDatePickerInput.press('Escape');

    // Wait for the editor to disappear and display to show the original text
    await expect(workerTestBase.getWorkerEmploymentEndEditor(page)).not.toBeVisible();
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText(initialDisplayText);
    await expect(employmentEndDisplay).not.toContainText(tempDate);

    console.log(
      `✅ Employment end date edit canceled, reverted to original: "${initialDisplayText}"`,
    );
  });

  test("should show 'Permanent' when permanent checkbox is selected for a worker with date", async ({
    page,
  }) => {
    // First, set the worker to have an end date (not permanent)
    const employmentEndCell = workerTestBase.getWorkerEmploymentEndCell(page);
    const employmentEndDisplay = workerTestBase.getWorkerEmploymentEndDisplay(page);

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // Get the date picker input and permanent checkbox
    const employmentEndDatePickerInput = workerTestBase.getWorkerEmploymentEndDatePickerInput(page);
    const permanentCheckbox = workerTestBase.getWorkerEmploymentEndPermanentCheckbox(page);

    // Uncheck the permanent checkbox to enable the date picker
    await permanentCheckbox.click();
    await expect(employmentEndDatePickerInput).toBeEnabled();

    // Set a specific date using the helper method
    const specificDate = '30/11/2025';
    await workerTestBase.setEmploymentEndDate(page, specificDate);

    // Save by pressing Enter
    await employmentEndDatePickerInput.press('Enter');

    // Wait for the editor to disappear and display to show the updated date
    await expect(workerTestBase.getWorkerEmploymentEndEditor(page)).not.toBeVisible();
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText(specificDate);

    // Now click again to edit and select permanent
    await employmentEndCell.click();

    // Get the updated elements
    const updatedPermanentCheckbox = workerTestBase.getWorkerEmploymentEndPermanentCheckbox(page);

    // The checkbox should not be checked since we have a date
    await expect(updatedPermanentCheckbox).not.toBeChecked();

    // Check the permanent checkbox
    await updatedPermanentCheckbox.click();

    // Save by clicking away
    const pageTitle = page.getByRole('heading', { name: 'Workers' });
    await pageTitle.click();

    // Wait for the editor to disappear and display to show "Permanent"
    await expect(workerTestBase.getWorkerEmploymentEndEditor(page)).not.toBeVisible();
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText('Permanent');
    await expect(employmentEndDisplay).not.toContainText(specificDate);

    console.log(
      `✅ Employment end date changed from specific date to 'Permanent' when checkbox selected`,
    );
  });
});
