import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { WorkerTestBase } from '../../utils/worker-test-base';

test.describe('Worker Name Updates', () => {
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
      acronym: 'JD',
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

  test('should allow editing worker name by clicking on it', async ({ page }, testInfo) => {
    // Get the name cell of our test worker
    const nameCell = getTestBase(testInfo).getWorkerNameCell(page);

    // Initially, the name should be displayed as text (not in an input field)
    await expect(nameCell).toContainText(initialWorkerName);

    // Click on the name to edit it
    await nameCell.click();

    // After clicking, the name cell should contain an input field with the current name
    const nameInput = nameCell.locator('input');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue(initialWorkerName);

    // Clear the input and type a new name
    const newName = 'Jane Smith';
    await nameInput.fill(newName);

    // Verify the input shows the new value
    await expect(nameInput).toHaveValue(newName);

    // Press Enter to save the changes
    await nameInput.press('Enter');

    // Wait for the input to disappear and the display to show the new name
    await expect(nameInput).not.toBeVisible();
    await expect(nameCell).toContainText(newName);

    // The cell should now display the updated name
    await expect(nameCell).toContainText(newName);

    console.log(`✅ Worker name updated from "${initialWorkerName}" to "${newName}"`);
  });

  test('should save worker name when clicking away (blur event)', async ({ page }, testInfo) => {
    // Get the name cell of our test worker
    const nameCell = getTestBase(testInfo).getWorkerNameCell(page);

    // Click on the name to edit it
    await nameCell.click();

    // Wait for the input field to appear
    const nameInput = nameCell.locator('input');
    await expect(nameInput).toBeVisible();

    // Type a new name
    const newName = 'Bob Johnson';
    await nameInput.fill(newName);

    // Click somewhere else to trigger blur event (save)
    // We'll click on the page title
    const pageTitle = page.locator('data-testid=workers-page-heading');
    await pageTitle.click();

    // Wait for the input to disappear and the display to show the new name
    await expect(nameInput).not.toBeVisible();
    await expect(nameCell).toContainText(newName);

    // The name cell should show the updated name
    await expect(nameCell).toContainText(newName);

    console.log(`✅ Worker name updated via blur event to "${newName}"`);
  });

  test('should cancel editing if Escape key is pressed', async ({ page }, testInfo) => {
    // Get the name cell of our test worker
    const nameCell = getTestBase(testInfo).getWorkerNameCell(page);
    const originalName = initialWorkerName;

    // Click on the name to edit it
    await nameCell.click();

    // Wait for the input field to appear
    const nameInput = nameCell.locator('input');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue(originalName);

    // Type a new name (but don't save it)
    const tempName = 'Temporary Name';
    await nameInput.fill(tempName);
    await expect(nameInput).toHaveValue(tempName);

    // Press Escape to cancel editing
    await nameInput.press('Escape');

    // Wait for the input to disappear and the display to revert to original name
    await expect(nameInput).not.toBeVisible();
    await expect(nameCell).toContainText(originalName);

    // The name cell should still show the original name (not the temporary one)
    await expect(nameCell).toContainText(originalName);
    await expect(nameCell).not.toContainText(tempName);

    console.log(`✅ Name edit canceled, reverted to original: "${originalName}"`);
  });

  test('should handle empty name validation', async ({ page }, testInfo) => {
    // Get the name cell of our test worker
    const nameCell = getTestBase(testInfo).getWorkerNameCell(page);

    // Click on the name to edit it
    await nameCell.click();

    // Wait for the input field to appear
    const nameInput = nameCell.locator('input');
    await expect(nameInput).toBeVisible();

    // Clear the name (make it empty)
    await nameInput.fill('');
    await expect(nameInput).toHaveValue('');

    // Try to save by pressing Enter
    await nameInput.press('Enter');

    // Wait for the input to disappear and the display to show "Unnamed Worker"
    await expect(nameInput).not.toBeVisible();
    await expect(nameCell).toContainText('Unnamed Worker');

    // The name cell should display "Unnamed Worker" when the name is empty
    await expect(nameCell).toContainText('Unnamed Worker');

    console.log("✅ Empty name displays 'Unnamed Worker' as expected");
  });

  test('should handle special characters in worker name', async ({ page }, testInfo) => {
    // Get the name cell of our test worker
    const nameCell = getTestBase(testInfo).getWorkerNameCell(page);

    // Click on the name to edit it
    await nameCell.click();

    // Wait for the input field to appear
    const nameInput = nameCell.locator('input');
    await expect(nameInput).toBeVisible();

    // Test a name with special characters
    const specialName = "Dr. María José O'Connor-Smith";
    await nameInput.fill(specialName);

    // Save by pressing Enter
    await nameInput.press('Enter');

    // Wait for the input to disappear and the display to show the special name
    await expect(nameInput).not.toBeVisible();
    await expect(nameCell).toContainText(specialName);

    // The name should be displayed correctly with special characters
    await expect(nameCell).toContainText(specialName);

    console.log(`✅ Special characters in name handled correctly: "${specialName}"`);
  });
});
