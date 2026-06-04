import { test, expect } from '@playwright/test';
import dayjs from 'dayjs';
import { randomUUID } from 'crypto';
import { WorkerTestBase } from '../../utils/worker-test-base';

test.describe('Worker Employment End Date Updates', () => {
  const testBasesMap = new Map<string, WorkerTestBase>();

  let testWorker: { id: string; name: string; teamId: string };
  let initialWorkerName: string;

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const workerTestBase = new WorkerTestBase();
    testBasesMap.set(testRunId, workerTestBase);
    (testInfo as any).testRunId = testRunId;

    // Setup the common worker test environment
    await getTestBase(testInfo).setupWorkerTests(workerIndex);

    // Use a unique name per test to avoid conflicts
    initialWorkerName = `John Doe ${workerIndex}-${Date.now()}`;

    // Create a fresh test worker for each test
    testWorker = await getTestBase(testInfo).createTestWorker({
      name: initialWorkerName,
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    console.log(`Created test worker: ${testWorker.name} (${testWorker.id})`);

    // Navigate to the workers page
    await getTestBase(testInfo).navigateToWorkersPage(page);

    // Wait for the worker table to load and our test worker to appear
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify our test worker is visible in the table
    const workerRows = getTestBase(testInfo).getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    // Verify the worker name is displayed
    const nameCell = getTestBase(testInfo).getWorkerNameCell(page);
    await expect(nameCell).toContainText(initialWorkerName);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;

    // Clean up: delete the worker created for this test
    if (testWorker?.id) {
      try {
        await getTestBase(testInfo).deleteTestWorker(testWorker.id);
        console.log(`Deleted test worker: ${testWorker.id}`);
      } catch (error) {
        console.warn(`Failed to delete test worker ${testWorker.id}:`, error);
      }
    }

    testBasesMap.delete(testRunId);
  });

  /** Get the isolated WorkerTestBase for the current test */
  function getTestBase(testInfo: any): WorkerTestBase {
    const testRunId = testInfo.testRunId as string;
    const tb = testBasesMap.get(testRunId);
    if (!tb) throw new Error('Test base not found');
    return tb;
  }

  test("should display 'Permanent' as default when creating a new worker", async ({
    page,
  }, testInfo) => {
    // Get the employment end date cell
    const employmentEndCell = getTestBase(testInfo).getWorkerEmploymentEndCell(page);
    const employmentEndDisplay = getTestBase(testInfo).getWorkerEmploymentEndDisplay(page);

    // Verify the employment end date shows "Permanent" by default
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText('Permanent');

    console.log(`✅ New worker has 'Permanent' as default employment end date`);
  });

  test('should allow editing employment end date by clicking on it and show checkbox', async ({
    page,
  }, testInfo) => {
    // Get the employment end date cell and display
    const employmentEndCell = getTestBase(testInfo).getWorkerEmploymentEndCell(page);
    const employmentEndDisplay = getTestBase(testInfo).getWorkerEmploymentEndDisplay(page);

    // Initially, the date should be displayed as text
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText('Permanent');

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // After clicking, the editor should appear with a date picker and checkbox
    const employmentEndEditor = getTestBase(testInfo).getWorkerEmploymentEndEditor(page);
    const permanentCheckbox = getTestBase(testInfo).getWorkerEmploymentEndPermanentCheckbox(page);
    const permanentCheckboxLabel =
      getTestBase(testInfo).getWorkerEmploymentEndPermanentCheckboxLabel(page);

    await expect(employmentEndEditor).toBeVisible();
    await expect(permanentCheckbox).toBeVisible();
    await expect(permanentCheckboxLabel).toBeVisible();

    // The display element should no longer be visible when editing
    await expect(employmentEndDisplay).not.toBeVisible();

    console.log(`✅ Employment end date cell shows date picker and checkbox when clicked`);
  });

  test('should have disabled date picker when permanent is selected', async ({
    page,
  }, testInfo) => {
    // Get the employment end date cell
    const employmentEndCell = getTestBase(testInfo).getWorkerEmploymentEndCell(page);

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // Get the date picker input and permanent checkbox
    const employmentEndDatePickerInput =
      getTestBase(testInfo).getWorkerEmploymentEndDatePickerInput(page);
    const permanentCheckbox = getTestBase(testInfo).getWorkerEmploymentEndPermanentCheckbox(page);

    // Since default is permanent, the checkbox should be checked and date picker input disabled
    await expect(permanentCheckbox).toBeChecked();
    await expect(employmentEndDatePickerInput).toBeDisabled();

    console.log(`✅ Date picker is disabled when permanent is selected`);
  });

  test('should enable date picker when permanent checkbox is unchecked', async ({
    page,
  }, testInfo) => {
    // Get the employment end date cell
    const employmentEndCell = getTestBase(testInfo).getWorkerEmploymentEndCell(page);

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // Get the date picker input and permanent checkbox
    const employmentEndDatePickerInput =
      getTestBase(testInfo).getWorkerEmploymentEndDatePickerInput(page);
    const permanentCheckbox = getTestBase(testInfo).getWorkerEmploymentEndPermanentCheckbox(page);

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
  }, testInfo) => {
    // Get the employment end date cell
    const employmentEndCell = getTestBase(testInfo).getWorkerEmploymentEndCell(page);
    const employmentEndDisplay = getTestBase(testInfo).getWorkerEmploymentEndDisplay(page);

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // Get the date picker input and permanent checkbox
    const employmentEndDatePickerInput =
      getTestBase(testInfo).getWorkerEmploymentEndDatePickerInput(page);
    const permanentCheckbox = getTestBase(testInfo).getWorkerEmploymentEndPermanentCheckbox(page);

    // Uncheck the permanent checkbox to enable the date picker
    await permanentCheckbox.click();
    await expect(employmentEndDatePickerInput).toBeEnabled();

    // Set a date 3 months from now using the helper method
    const newDate = dayjs().add(3, 'month').format('DD/MM/YYYY');
    await getTestBase(testInfo).setEmploymentEndDate(page, newDate);

    // Click somewhere else to trigger blur event (save)
    const pageTitle = page.locator('data-testid=workers-page-heading');
    await pageTitle.click();

    // Wait for the editor to disappear and display to show the updated date
    await expect(getTestBase(testInfo).getWorkerEmploymentEndEditor(page)).not.toBeVisible();
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText(newDate);

    console.log(`✅ Employment end date updated to ${newDate} via blur event`);
  });

  test('should update employment end date when datepicker is changed and Enter is pressed', async ({
    page,
  }, testInfo) => {
    // Get the employment end date cell
    const employmentEndCell = getTestBase(testInfo).getWorkerEmploymentEndCell(page);
    const employmentEndDisplay = getTestBase(testInfo).getWorkerEmploymentEndDisplay(page);

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // Get the date picker input and permanent checkbox
    const employmentEndDatePickerInput =
      getTestBase(testInfo).getWorkerEmploymentEndDatePickerInput(page);
    const permanentCheckbox = getTestBase(testInfo).getWorkerEmploymentEndPermanentCheckbox(page);

    // Uncheck the permanent checkbox to enable the date picker
    await permanentCheckbox.click();
    await expect(employmentEndDatePickerInput).toBeEnabled();

    // Set a date 3 months from now using the helper method
    const newDate = dayjs().add(3, 'month').format('DD/MM/YYYY');
    await getTestBase(testInfo).setEmploymentEndDate(page, newDate);

    // Press Enter to save
    await employmentEndDatePickerInput.press('Enter');

    // Wait for the editor to disappear and display to show the updated date
    await expect(getTestBase(testInfo).getWorkerEmploymentEndEditor(page)).not.toBeVisible();
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText(newDate);

    console.log(`✅ Employment end date updated to ${newDate} via Enter key`);
  });

  test('should not update employment end date when Escape is pressed', async ({
    page,
  }, testInfo) => {
    // Get the employment end date cell
    const employmentEndCell = getTestBase(testInfo).getWorkerEmploymentEndCell(page);
    const employmentEndDisplay = getTestBase(testInfo).getWorkerEmploymentEndDisplay(page);

    // Get the initial text (should be "Permanent")
    const initialText = await employmentEndDisplay.textContent();
    const initialDisplayText = initialText?.trim() || 'Permanent';

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // Get the date picker input and permanent checkbox
    const employmentEndDatePickerInput =
      getTestBase(testInfo).getWorkerEmploymentEndDatePickerInput(page);
    const permanentCheckbox = getTestBase(testInfo).getWorkerEmploymentEndPermanentCheckbox(page);

    // Uncheck the permanent checkbox to enable the date picker
    await permanentCheckbox.click();
    await expect(employmentEndDatePickerInput).toBeEnabled();

    // Set a temporary date (but don't save it) using the helper method
    const tempDate = dayjs().add(6, 'month').format('DD/MM/YYYY');
    await getTestBase(testInfo).setEmploymentEndDate(page, tempDate);

    // Press Escape to cancel editing
    await employmentEndDatePickerInput.press('Escape');

    // Wait for the editor to disappear and display to show the original text
    await expect(getTestBase(testInfo).getWorkerEmploymentEndEditor(page)).not.toBeVisible();
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText(initialDisplayText);
    await expect(employmentEndDisplay).not.toContainText(tempDate);

    console.log(
      `✅ Employment end date edit canceled, reverted to original: "${initialDisplayText}"`,
    );
  });

  test("should show 'Permanent' when permanent checkbox is selected for a worker with date", async ({
    page,
  }, testInfo) => {
    // First, set the worker to have an end date (not permanent)
    const employmentEndCell = getTestBase(testInfo).getWorkerEmploymentEndCell(page);
    const employmentEndDisplay = getTestBase(testInfo).getWorkerEmploymentEndDisplay(page);

    // Click on the employment end date to edit it
    await employmentEndCell.click();

    // Get the date picker input and permanent checkbox
    const employmentEndDatePickerInput =
      getTestBase(testInfo).getWorkerEmploymentEndDatePickerInput(page);
    const permanentCheckbox = getTestBase(testInfo).getWorkerEmploymentEndPermanentCheckbox(page);

    // Uncheck the permanent checkbox to enable the date picker
    await permanentCheckbox.click();
    await expect(employmentEndDatePickerInput).toBeEnabled();

    // Set a date 1 month from now using the helper method
    const specificDate = dayjs().add(1, 'month').format('DD/MM/YYYY');
    await getTestBase(testInfo).setEmploymentEndDate(page, specificDate);

    // Save by pressing Enter
    await employmentEndDatePickerInput.press('Enter');

    // Wait for the editor to disappear and display to show the updated date
    await expect(getTestBase(testInfo).getWorkerEmploymentEndEditor(page)).not.toBeVisible();
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText(specificDate);

    // Now click again to edit and select permanent
    await employmentEndCell.click();

    // Get the updated elements
    const updatedPermanentCheckbox =
      getTestBase(testInfo).getWorkerEmploymentEndPermanentCheckbox(page);

    // The checkbox should not be checked since we have a date
    await expect(updatedPermanentCheckbox).not.toBeChecked();

    // Check the permanent checkbox
    await updatedPermanentCheckbox.click();

    // Save by clicking away
    const pageTitle = page.locator('data-testid=workers-page-heading');
    await pageTitle.click();

    // Wait for the editor to disappear and display to show "Permanent"
    await expect(getTestBase(testInfo).getWorkerEmploymentEndEditor(page)).not.toBeVisible();
    await expect(employmentEndDisplay).toBeVisible();
    await expect(employmentEndDisplay).toContainText('Permanent');
    await expect(employmentEndDisplay).not.toContainText(specificDate);

    console.log(
      `✅ Employment end date changed from specific date to 'Permanent' when checkbox selected`,
    );
  });
});
