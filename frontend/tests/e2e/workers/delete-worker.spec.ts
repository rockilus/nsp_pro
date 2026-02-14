import { test, expect } from "@playwright/test";
import { WorkerTestBase } from "../../utils/worker-test-base";

const workerTestBase = new WorkerTestBase();

test.describe("Worker Deletion", () => {
  test.beforeAll(async () => {
    // Setup the common worker test environment
    await workerTestBase.setupWorkerTests(test.info().workerIndex);
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the workers page for each test
    await workerTestBase.navigateToWorkersPage(page);
  });

  test("should display delete button for each worker in the actions column", async ({
    page,
  }) => {
    // Create a test worker first
    const testWorker = await workerTestBase.createTestWorker({
      name: "Test Worker for Deletion",
      acronym: "TWD",
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 5,
      annualLeave: 20,
    });

    // Refresh the page to see the newly created worker
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify that the worker appears in the table
    const workerRows = workerTestBase.getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    // Check that the delete button is visible in the actions column
    const deleteButton = workerTestBase.getWorkerDeleteButton(
      page,
      testWorker.id,
    );
    await expect(deleteButton).toBeVisible();

    // Verify the button has the correct data-testid
    await expect(deleteButton).toHaveAttribute(
      "data-testid",
      `worker-delete-button-${testWorker.id}`,
    );

    // Verify the button contains a delete icon
    const deleteIcon = deleteButton.locator('svg[data-testid="DeleteIcon"]');
    await expect(deleteIcon).toBeVisible();

    console.log("✅ Delete button is displayed correctly for worker");

    // Clean up
    await workerTestBase.deleteTestWorker(testWorker.id);
  });

  test("should delete worker when delete button is clicked", async ({
    page,
  }) => {
    // Create a test worker
    const testWorker = await workerTestBase.createTestWorker({
      name: "Worker to Delete",
      acronym: "WTD",
      weeklyHours: 39,
      weeklyHoursDesired: 39,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    // Refresh the page to see the newly created worker
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify that the worker appears in the table
    let workerRows = workerTestBase.getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    // Verify the worker's name is displayed
    const nameCell = workerTestBase.getWorkerNameCell(page);
    await expect(nameCell).toContainText("Worker to Delete");

    // Click the delete button and wait for deletion to complete
    await workerTestBase.deleteWorkerViaUIAndWait(page, testWorker.id);

    // Verify the worker is no longer in the table
    // The table should now show the empty state
    workerRows = workerTestBase.getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    // Check that the cell contains the expected empty state text
    const emptyCell = workerRows.first().locator("td");
    await expect(emptyCell).toContainText("no_workers_found");

    console.log("✅ Worker successfully deleted from table");
  });

  test("should delete the correct worker when multiple workers exist", async ({
    page,
  }) => {
    // Create multiple test workers
    const worker1 = await workerTestBase.createTestWorker({
      name: "First Worker",
      acronym: "FW",
      weeklyHours: 35,
      weeklyHoursDesired: 35,
      dutiesPerMonth: 3,
      annualLeave: 28,
    });

    const worker2 = await workerTestBase.createTestWorker({
      name: "Second Worker",
      acronym: "SW",
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 5,
      annualLeave: 22,
    });

    const worker3 = await workerTestBase.createTestWorker({
      name: "Third Worker",
      acronym: "TW",
      weeklyHours: 30,
      weeklyHoursDesired: 30,
      dutiesPerMonth: 2,
      annualLeave: 30,
    });

    // Refresh the page to see all workers
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify that all three workers appear in the table
    let workerRows = workerTestBase.getWorkerRows(page);
    await expect(workerRows).toHaveCount(3);

    // Delete the second worker specifically and wait for completion
    await workerTestBase.deleteWorkerViaUIAndWait(page, worker2.id);

    // Verify we now have only 2 workers
    workerRows = workerTestBase.getWorkerRows(page);
    await expect(workerRows).toHaveCount(2);

    // Verify that the correct worker was deleted by checking remaining names
    const table = workerTestBase.getWorkerTable(page);
    await expect(table).toContainText("First Worker");
    await expect(table).toContainText("Third Worker");
    await expect(table).not.toContainText("Second Worker");

    console.log("✅ Correct worker deleted when multiple workers exist");

    // Clean up remaining workers
    await workerTestBase.deleteTestWorker(worker1.id);
    await workerTestBase.deleteTestWorker(worker3.id);
  });

  test("should handle deletion gracefully if worker is already deleted", async ({
    page,
  }) => {
    // Create a test worker
    const testWorker = await workerTestBase.createTestWorker({
      name: "Worker for Grace Test",
      acronym: "WGT",
      weeklyHours: 39,
      weeklyHoursDesired: 39,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    // Refresh the page to see the worker
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify worker is displayed
    let workerRows = workerTestBase.getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    // Delete the worker via API (simulating deletion from another session)
    await workerTestBase.deleteTestWorker(testWorker.id);

    // Try to delete via UI (button should still be there initially)
    const deleteButton = workerTestBase.getWorkerDeleteButton(
      page,
      testWorker.id,
    );

    // Click the delete button (this might result in an error or graceful handling)
    await deleteButton.click();

    // Wait for any UI updates to complete by checking for empty state
    // Since the worker was already deleted via API, the UI should eventually show empty state
    await expect(page.locator("text=no_workers_found")).toBeVisible();

    // Refresh to get the current state
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify the table shows empty state
    workerRows = workerTestBase.getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);

    const emptyCell = workerRows.first().locator("td");
    await expect(emptyCell).toContainText("no_workers_found");

    console.log("✅ Deletion handled gracefully for already deleted worker");
  });

  test("should show delete buttons for all workers in a populated table", async ({
    page,
  }) => {
    // Create multiple workers
    const workers = await Promise.all([
      workerTestBase.createTestWorker({
        name: "Alice Smith",
        acronym: "AS",
        weeklyHours: 40,
        weeklyHoursDesired: 40,
        dutiesPerMonth: 4,
        annualLeave: 25,
      }),
      workerTestBase.createTestWorker({
        name: "Bob Johnson",
        acronym: "BJ",
        weeklyHours: 35,
        weeklyHoursDesired: 35,
        dutiesPerMonth: 3,
        annualLeave: 28,
      }),
      workerTestBase.createTestWorker({
        name: "Carol Williams",
        acronym: "CW",
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
    const workerRows = workerTestBase.getWorkerRows(page);
    await expect(workerRows).toHaveCount(3);

    // Check that each worker has a delete button
    for (const worker of workers) {
      const deleteButton = workerTestBase.getWorkerDeleteButton(
        page,
        worker.id,
      );
      await expect(deleteButton).toBeVisible();
      await expect(deleteButton).toHaveAttribute(
        "data-testid",
        `worker-delete-button-${worker.id}`,
      );
    }

    console.log("✅ All workers have delete buttons in populated table");

    // Clean up all workers
    for (const worker of workers) {
      await workerTestBase.deleteTestWorker(worker.id);
    }
  });

  test("should maintain table structure after worker deletion", async ({
    page,
  }) => {
    // Create a worker
    const testWorker = await workerTestBase.createTestWorker({
      name: "Structure Test Worker",
      acronym: "STW",
      weeklyHours: 39,
      weeklyHoursDesired: 39,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    // Refresh the page
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify table headers are present before deletion
    const table = workerTestBase.getWorkerTable(page);
    const headerRow = table.locator("thead tr");
    await expect(headerRow).toContainText("Name");
    await expect(headerRow).toContainText("Acronym");
    await expect(headerRow).toContainText("actions"); // Note: lowercase in actual implementation

    // Delete the worker
    await workerTestBase.deleteWorkerViaUIAndWait(page, testWorker.id);

    // Verify table headers are still present after deletion
    await expect(headerRow).toContainText("Name");
    await expect(headerRow).toContainText("Acronym");
    await expect(headerRow).toContainText("actions"); // Note: lowercase in actual implementation

    // Verify table shows empty state
    const workerRows = workerTestBase.getWorkerRows(page);
    await expect(workerRows).toHaveCount(1);
    const emptyCell = workerRows.first().locator("td");
    await expect(emptyCell).toContainText("no_workers_found");

    console.log("✅ Table structure maintained after deletion");
  });
});
