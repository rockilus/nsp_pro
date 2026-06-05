import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { WorkerTestBase } from '../../utils/worker-test-base';

test.describe('Worker Deletion', () => {
  const testBasesMap = new Map<string, WorkerTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const workerTestBase = new WorkerTestBase();
    testBasesMap.set(testRunId, workerTestBase);
    (testInfo as any).testRunId = testRunId;

    // Setup the common worker test environment
    await getTestBase(testInfo).setupWorkerTests(workerIndex);

    // Navigate to the workers page for each test
    await getTestBase(testInfo).navigateToWorkersPage(page);
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

  test('should display delete button for each worker in the actions column', async ({
    page,
  }, testInfo) => {
    // Create a test worker first
    const testWorker = await getTestBase(testInfo).createTestWorker({
      name: 'Test Worker for Deletion',
      acronym: 'TWD',
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 5,
      annualLeave: 20,
    });

    // Refresh the page to see the newly created worker
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify that the worker appears in the table
    const workerRows = getTestBase(testInfo).getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    // Check that the delete button is visible in the actions column
    const deleteButton = getTestBase(testInfo).getWorkerDeleteButton(page, testWorker.id);
    await expect(deleteButton).toBeVisible();

    // Verify the button has the correct data-testid
    await expect(deleteButton).toHaveAttribute(
      'data-testid',
      `worker-delete-button-${testWorker.id}`,
    );

    // Verify the button contains a delete icon (lucide-react Trash2)
    const deleteIcon = deleteButton.locator('svg');
    await expect(deleteIcon).toBeVisible();

    console.log('✅ Delete button is displayed correctly for worker');

    // Clean up
    await getTestBase(testInfo).deleteTestWorker(testWorker.id);
  });

  test('should delete worker when delete button is clicked', async ({ page }, testInfo) => {
    // Create a test worker
    const testWorker = await getTestBase(testInfo).createTestWorker({
      name: 'Worker to Delete',
      acronym: 'WTD',
      weeklyHours: 39,
      weeklyHoursDesired: 39,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    // Refresh the page to see the newly created worker
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify that the worker appears in the table
    let workerRows = getTestBase(testInfo).getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    // Verify the worker's name is displayed
    const nameCell = getTestBase(testInfo).getWorkerNameCell(page);
    await expect(nameCell).toContainText('Worker to Delete');

    // Click the delete button and wait for deletion to complete
    await getTestBase(testInfo).deleteWorkerViaUIAndWait(page, testWorker.id);

    // Verify the worker is no longer in the table
    // The table should now show the empty state
    workerRows = getTestBase(testInfo).getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    // Check that the cell contains the expected empty state text
    await expect(page.locator('[data-testid="worker-table-empty-state"]')).toBeVisible();

    console.log('✅ Worker successfully deleted from table');
  });

  test('should delete the correct worker when multiple workers exist', async ({
    page,
  }, testInfo) => {
    // Create multiple test workers
    const worker1 = await getTestBase(testInfo).createTestWorker({
      name: 'First Worker',
      acronym: 'FW',
      weeklyHours: 35,
      weeklyHoursDesired: 35,
      dutiesPerMonth: 3,
      annualLeave: 28,
    });

    const worker2 = await getTestBase(testInfo).createTestWorker({
      name: 'Second Worker',
      acronym: 'SW',
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 5,
      annualLeave: 22,
    });

    const worker3 = await getTestBase(testInfo).createTestWorker({
      name: 'Third Worker',
      acronym: 'TW',
      weeklyHours: 30,
      weeklyHoursDesired: 30,
      dutiesPerMonth: 2,
      annualLeave: 30,
    });

    // Refresh the page to see all workers
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify that all three workers appear in the table
    let workerRows = getTestBase(testInfo).getWorkerRows(page);
    await expect(workerRows).toHaveCount(3);

    // Delete the second worker specifically and wait for completion
    await getTestBase(testInfo).deleteWorkerViaUIAndWait(page, worker2.id);

    // Verify we now have only 2 workers
    workerRows = getTestBase(testInfo).getWorkerRows(page);
    await expect(workerRows).toHaveCount(2);

    // Verify that the correct worker was deleted by checking remaining names
    const table = getTestBase(testInfo).getWorkerTable(page);
    await expect(table).toContainText('First Worker');
    await expect(table).toContainText('Third Worker');
    await expect(table).not.toContainText('Second Worker');

    console.log('✅ Correct worker deleted when multiple workers exist');

    // Clean up remaining workers
    await getTestBase(testInfo).deleteTestWorker(worker1.id);
    await getTestBase(testInfo).deleteTestWorker(worker3.id);
  });

  test('should handle deletion gracefully if worker is already deleted', async ({
    page,
  }, testInfo) => {
    // Create a test worker
    const testWorker = await getTestBase(testInfo).createTestWorker({
      name: 'Worker for Grace Test',
      acronym: 'WGT',
      weeklyHours: 39,
      weeklyHoursDesired: 39,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    // Refresh the page to see the worker
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify worker is displayed
    let workerRows = getTestBase(testInfo).getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    // Delete the worker via API (simulating deletion from another session)
    await getTestBase(testInfo).deleteTestWorker(testWorker.id);

    // Try to delete via UI (button should still be there initially)
    const deleteButton = getTestBase(testInfo).getWorkerDeleteButton(page, testWorker.id);

    // Click the delete button (this might result in an error or graceful handling)
    await deleteButton.click();

    // Wait for any UI updates to complete by checking for empty state
    // Since the worker was already deleted via API, the UI should eventually show empty state
    await expect(page.locator('[data-testid="worker-table-empty-state"]')).toBeVisible();

    // Refresh to get the current state
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify the table shows empty state
    workerRows = getTestBase(testInfo).getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    await expect(page.locator('[data-testid="worker-table-empty-state"]')).toBeVisible();

    console.log('✅ Deletion handled gracefully for already deleted worker');
  });

  test('should show delete buttons for all workers in a populated table', async ({
    page,
  }, testInfo) => {
    // Create multiple workers
    const workers = await Promise.all([
      getTestBase(testInfo).createTestWorker({
        name: 'Alice Smith',
        acronym: 'AS',
        weeklyHours: 40,
        weeklyHoursDesired: 40,
        dutiesPerMonth: 4,
        annualLeave: 25,
      }),
      getTestBase(testInfo).createTestWorker({
        name: 'Bob Johnson',
        acronym: 'BJ',
        weeklyHours: 35,
        weeklyHoursDesired: 35,
        dutiesPerMonth: 3,
        annualLeave: 28,
      }),
      getTestBase(testInfo).createTestWorker({
        name: 'Carol Williams',
        acronym: 'CW',
        weeklyHours: 30,
        weeklyHoursDesired: 30,
        dutiesPerMonth: 2,
        annualLeave: 30,
      }),
    ]);

    // Refresh the page to see all workers
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify all workers are displayed
    const workerRows = getTestBase(testInfo).getWorkerRows(page);
    await expect(workerRows).toHaveCount(3);

    // Check that each worker has a delete button
    for (const worker of workers) {
      const deleteButton = getTestBase(testInfo).getWorkerDeleteButton(page, worker.id);
      await expect(deleteButton).toBeVisible();
      await expect(deleteButton).toHaveAttribute(
        'data-testid',
        `worker-delete-button-${worker.id}`,
      );
    }

    console.log('✅ All workers have delete buttons in populated table');

    // Clean up all workers
    for (const worker of workers) {
      await getTestBase(testInfo).deleteTestWorker(worker.id);
    }
  });

  test('should maintain table structure after worker deletion', async ({ page }, testInfo) => {
    // Create a worker
    const testWorker = await getTestBase(testInfo).createTestWorker({
      name: 'Structure Test Worker',
      acronym: 'STW',
      weeklyHours: 39,
      weeklyHoursDesired: 39,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    // Refresh the page
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify table headers are present before deletion
    const table = getTestBase(testInfo).getWorkerTable(page);
    const headerRow = table.locator('[data-testid="worker-name-header-cell"]');
    await expect(headerRow).toBeVisible();

    // Delete the worker
    await getTestBase(testInfo).deleteWorkerViaUIAndWait(page, testWorker.id);

    // Verify table headers are still present after deletion
    await expect(headerRow).toBeVisible();

    // Verify table shows empty state
    await expect(page.locator('[data-testid="worker-table-empty-state"]')).toBeVisible();

    console.log('✅ Table structure maintained after deletion');
  });
});
