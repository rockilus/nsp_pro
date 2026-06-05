import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { WorkerTestBase } from '../../utils/worker-test-base';

test.describe('Worker Weekly Hours Field Cell', () => {
  const testBasesMap = new Map<string, WorkerTestBase>();

  let testWorker: { id: string; name: string; teamId: string };
  let initialWorkerName: string;
  let initialWeeklyHours: number;

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const workerTestBase = new WorkerTestBase();
    testBasesMap.set(testRunId, workerTestBase);
    (testInfo as any).testRunId = testRunId;

    // Setup the common worker test environment
    await getTestBase(testInfo).setupWorkerTests(workerIndex);

    // Use a unique name per test to avoid conflicts
    initialWorkerName = `Test Worker ${workerIndex}-${Date.now()}`;
    initialWeeklyHours = 40;

    // Create a fresh test worker for each test
    testWorker = await getTestBase(testInfo).createTestWorker({
      name: initialWorkerName,
      weeklyHours: initialWeeklyHours,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    console.log(
      `Created test worker: ${testWorker.name} (${testWorker.id}) with weekly hours: ${initialWeeklyHours}`,
    );

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

  test('should display weekly hours value in the cell', async ({ page }, testInfo) => {
    // Get the weekly hours cell and display elements
    const weeklyHoursCell = getTestBase(testInfo).getWorkerWeeklyHoursCell(page);
    const weeklyHoursDisplay = getTestBase(testInfo).getWorkerWeeklyHoursDisplay(page);

    // Verify the cell is visible and displays the initial weekly hours
    await expect(weeklyHoursCell).toBeVisible();
    await expect(weeklyHoursDisplay).toContainText(initialWeeklyHours.toString());

    console.log(`✅ Weekly hours cell displays initial value: ${initialWeeklyHours}`);
  });

  test('should show text field when clicking on the cell', async ({ page }, testInfo) => {
    // Get the weekly hours cell and elements
    const weeklyHoursCell = getTestBase(testInfo).getWorkerWeeklyHoursCell(page);
    const weeklyHoursDisplay = getTestBase(testInfo).getWorkerWeeklyHoursDisplay(page);
    const weeklyHoursInput = getTestBase(testInfo).getWorkerWeeklyHoursInput(page);

    // Initially, the display should be visible and input should not exist
    await expect(weeklyHoursDisplay).toBeVisible();
    await expect(weeklyHoursInput).not.toBeVisible();

    // Click on the cell to edit
    await weeklyHoursCell.click();

    // After clicking, the input should appear and display should be hidden
    await expect(weeklyHoursInput).toBeVisible();
    await expect(weeklyHoursInput).toHaveValue(initialWeeklyHours.toString());
    await expect(weeklyHoursDisplay).not.toBeVisible();

    console.log('✅ Text field appears when clicking on the cell');
  });

  test('should only accept numeric input in the text field', async ({ page }, testInfo) => {
    // Get the weekly hours cell and input
    const weeklyHoursCell = getTestBase(testInfo).getWorkerWeeklyHoursCell(page);
    const weeklyHoursInput = getTestBase(testInfo).getWorkerWeeklyHoursInput(page);

    // Click on the cell to edit
    await weeklyHoursCell.click();
    await expect(weeklyHoursInput).toBeVisible();

    // Clear the input and try to enter non-numeric text
    await weeklyHoursInput.clear();
    await weeklyHoursInput.type('abc');

    // The input should be empty because non-numeric characters are not accepted
    await expect(weeklyHoursInput).toHaveValue('');

    // Try entering a mix of numbers and letters
    await weeklyHoursInput.clear();
    await weeklyHoursInput.type('123abc456');

    // Should only contain the numeric parts (behavior may vary based on implementation)
    const inputValue = await weeklyHoursInput.inputValue();
    // The exact behavior depends on the TextField implementation, but it should handle non-numeric input gracefully
    expect(inputValue).toMatch(/^\d*$/); // Should only contain digits

    // Enter a valid number
    await weeklyHoursInput.clear();
    await weeklyHoursInput.type('35');
    await expect(weeklyHoursInput).toHaveValue('35');

    console.log('✅ Text field only accepts numeric input');
  });

  test('should update value when clicking away (blur event)', async ({ page }, testInfo) => {
    // Get the weekly hours elements
    const weeklyHoursCell = getTestBase(testInfo).getWorkerWeeklyHoursCell(page);
    const weeklyHoursDisplay = getTestBase(testInfo).getWorkerWeeklyHoursDisplay(page);
    const weeklyHoursInput = getTestBase(testInfo).getWorkerWeeklyHoursInput(page);

    // Click on the cell to edit
    await weeklyHoursCell.click();
    await expect(weeklyHoursInput).toBeVisible();

    // Change the value
    const newWeeklyHours = 35;
    await weeklyHoursInput.clear();
    await weeklyHoursInput.type(newWeeklyHours.toString());
    await expect(weeklyHoursInput).toHaveValue(newWeeklyHours.toString());

    // Click on the page title "Workers" to trigger blur event
    const pageTitle = page.locator('data-testid=workers-page-heading');
    await pageTitle.click();

    // Wait for the update to complete
    await getTestBase(testInfo).waitForWeeklyHoursUpdate(page, newWeeklyHours);

    console.log(`✅ Weekly hours updated to ${newWeeklyHours} via blur event`);
  });

  test('should update value when pressing Enter', async ({ page }, testInfo) => {
    // Get the weekly hours elements
    const weeklyHoursCell = getTestBase(testInfo).getWorkerWeeklyHoursCell(page);
    const weeklyHoursDisplay = getTestBase(testInfo).getWorkerWeeklyHoursDisplay(page);
    const weeklyHoursInput = getTestBase(testInfo).getWorkerWeeklyHoursInput(page);

    // Click on the cell to edit
    await weeklyHoursCell.click();
    await expect(weeklyHoursInput).toBeVisible();

    // Change the value
    const newWeeklyHours = 42;
    await weeklyHoursInput.clear();
    await weeklyHoursInput.type(newWeeklyHours.toString());
    await expect(weeklyHoursInput).toHaveValue(newWeeklyHours.toString());

    // Press Enter to save
    await weeklyHoursInput.press('Enter');

    // Wait for the update to complete
    await getTestBase(testInfo).waitForWeeklyHoursUpdate(page, newWeeklyHours);

    console.log(`✅ Weekly hours updated to ${newWeeklyHours} via Enter key`);
  });

  test('should cancel edit and revert value when pressing Escape', async ({ page }, testInfo) => {
    // Get the weekly hours elements
    const weeklyHoursCell = getTestBase(testInfo).getWorkerWeeklyHoursCell(page);
    const weeklyHoursDisplay = getTestBase(testInfo).getWorkerWeeklyHoursDisplay(page);
    const weeklyHoursInput = getTestBase(testInfo).getWorkerWeeklyHoursInput(page);

    // Verify initial value
    await expect(weeklyHoursDisplay).toContainText(initialWeeklyHours.toString());

    // Click on the cell to edit
    await weeklyHoursCell.click();
    await expect(weeklyHoursInput).toBeVisible();
    await expect(weeklyHoursInput).toHaveValue(initialWeeklyHours.toString());

    // Change the value to something different
    const tempWeeklyHours = 50;
    await weeklyHoursInput.clear();
    await weeklyHoursInput.type(tempWeeklyHours.toString());
    await expect(weeklyHoursInput).toHaveValue(tempWeeklyHours.toString());

    // Press Escape to cancel editing
    await weeklyHoursInput.press('Escape');

    // Wait for the cancel operation to complete (should revert to original value)
    await getTestBase(testInfo).waitForWeeklyHoursUpdate(page, initialWeeklyHours);

    // Verify the display does not contain the temporary value
    await expect(weeklyHoursDisplay).not.toContainText(tempWeeklyHours.toString());

    console.log(`✅ Weekly hours edit canceled, reverted to original: ${initialWeeklyHours}`);
  });

  test('should handle empty input by reverting to original value', async ({ page }, testInfo) => {
    // Get the weekly hours elements
    const weeklyHoursCell = getTestBase(testInfo).getWorkerWeeklyHoursCell(page);
    const weeklyHoursDisplay = getTestBase(testInfo).getWorkerWeeklyHoursDisplay(page);
    const weeklyHoursInput = getTestBase(testInfo).getWorkerWeeklyHoursInput(page);

    // Click on the cell to edit
    await weeklyHoursCell.click();
    await expect(weeklyHoursInput).toBeVisible();

    // Clear the input (make it empty)
    await weeklyHoursInput.clear();
    await expect(weeklyHoursInput).toHaveValue('');

    // Press Enter to save the empty value
    await weeklyHoursInput.press('Enter');

    // Wait for the operation to complete (should revert to original value)
    await getTestBase(testInfo).waitForWeeklyHoursUpdate(page, initialWeeklyHours);

    console.log(`✅ Empty input reverted to original value: ${initialWeeklyHours}`);
  });

  //   test("should handle decimal numbers correctly", async ({ page }, testInfo) => {
  //     // Get the weekly hours elements
  //     const weeklyHoursCell = getTestBase(testInfo).getWorkerWeeklyHoursCell(page);
  //     const weeklyHoursDisplay = getTestBase(testInfo).getWorkerWeeklyHoursDisplay(page);
  //     const weeklyHoursInput = getTestBase(testInfo).getWorkerWeeklyHoursInput(page);

  //     // Click on the cell to edit
  //     await weeklyHoursCell.click();
  //     await expect(weeklyHoursInput).toBeVisible();

  //     // Enter a decimal number
  //     const decimalWeeklyHours = "37.5";
  //     await weeklyHoursInput.clear();
  //     await weeklyHoursInput.type(decimalWeeklyHours);
  //     await expect(weeklyHoursInput).toHaveValue(decimalWeeklyHours);

  //     // Press Enter to save
  //     await weeklyHoursInput.press("Enter");

  //     // Wait for the save operation to complete
  //     await page.waitForTimeout(500);

  //     // The input should no longer be visible
  //     await expect(weeklyHoursInput).not.toBeVisible();

  //     // The display should show the decimal value
  //     await expect(weeklyHoursDisplay).toBeVisible();
  //     await expect(weeklyHoursDisplay).toContainText(decimalWeeklyHours);

  //     console.log(
  //       `✅ Decimal weekly hours ${decimalWeeklyHours} handled correctly`
  //     );
  //   });

  test('should not update value when no change is made', async ({ page }, testInfo) => {
    // Get the weekly hours elements
    const weeklyHoursCell = getTestBase(testInfo).getWorkerWeeklyHoursCell(page);
    const weeklyHoursDisplay = getTestBase(testInfo).getWorkerWeeklyHoursDisplay(page);
    const weeklyHoursInput = getTestBase(testInfo).getWorkerWeeklyHoursInput(page);

    // Verify initial value
    await expect(weeklyHoursDisplay).toContainText(initialWeeklyHours.toString());

    // Click on the cell to edit
    await weeklyHoursCell.click();
    await expect(weeklyHoursInput).toBeVisible();
    await expect(weeklyHoursInput).toHaveValue(initialWeeklyHours.toString());

    // Don't change the value, just press Enter
    await weeklyHoursInput.press('Enter');

    // Wait for the operation to complete (value should remain unchanged)
    await getTestBase(testInfo).waitForWeeklyHoursUpdate(page, initialWeeklyHours);

    console.log(`✅ No update when value unchanged: ${initialWeeklyHours}`);
  });

  test('should handle large numbers correctly', async ({ page }, testInfo) => {
    // Get the weekly hours elements
    const weeklyHoursCell = getTestBase(testInfo).getWorkerWeeklyHoursCell(page);
    const weeklyHoursDisplay = getTestBase(testInfo).getWorkerWeeklyHoursDisplay(page);
    const weeklyHoursInput = getTestBase(testInfo).getWorkerWeeklyHoursInput(page);

    // Click on the cell to edit
    await weeklyHoursCell.click();
    await expect(weeklyHoursInput).toBeVisible();

    // Enter a large number
    const largeWeeklyHours = '168'; // Maximum hours in a week
    await weeklyHoursInput.clear();
    await weeklyHoursInput.type(largeWeeklyHours);
    await expect(weeklyHoursInput).toHaveValue(largeWeeklyHours);

    // Press Enter to save
    await weeklyHoursInput.press('Enter');

    // Wait for the update to complete
    await getTestBase(testInfo).waitForWeeklyHoursUpdate(page, largeWeeklyHours);

    console.log(`✅ Large weekly hours ${largeWeeklyHours} handled correctly`);
  });
});
