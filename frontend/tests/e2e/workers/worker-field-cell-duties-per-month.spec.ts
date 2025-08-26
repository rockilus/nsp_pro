import { test, expect } from "@playwright/test";
import { WorkerTestBase } from "../../utils/worker-test-base";

const workerTestBase = new WorkerTestBase();

test.describe("Worker Duties Per Month Field Cell", () => {
  let testWorker: { workerId: string; name: string; teamId: string };
  let initialWorkerName: string;
  let initialDutiesPerMonth: number;

  test.beforeEach(async ({ page }) => {
    // Setup the common worker test environment
    await workerTestBase.setupWorkerTests(test.info().workerIndex);

    // Use a unique name per test to avoid conflicts
    initialWorkerName = `Test Worker ${test.info().workerIndex}-${Date.now()}`;
    initialDutiesPerMonth = 4;

    // Create a fresh test worker for each test
    testWorker = await workerTestBase.createTestWorker({
      name: initialWorkerName,
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: initialDutiesPerMonth,
      annualLeave: 25,
    });

    console.log(
      `Created test worker: ${testWorker.name} (${testWorker.workerId}) with duties per month: ${initialDutiesPerMonth}`
    );

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
    if (testWorker?.workerId) {
      try {
        await workerTestBase.deleteTestWorker(testWorker.workerId);
        console.log(`Cleaned up test worker: ${testWorker.workerId}`);
      } catch (error) {
        console.error(`Failed to clean up test worker: ${error}`);
      }
    }
  });

  test("should display duties per month value in the cell", async ({
    page,
  }) => {
    // Get the duties per month cell and display elements
    const dutiesPerMonthCell = workerTestBase.getWorkerDutiesPerMonthCell(page);
    const dutiesPerMonthDisplay =
      workerTestBase.getWorkerDutiesPerMonthDisplay(page);

    // Verify the cell is visible and displays the initial duties per month
    await expect(dutiesPerMonthCell).toBeVisible();
    await expect(dutiesPerMonthDisplay).toContainText(
      initialDutiesPerMonth.toString()
    );

    console.log(
      `✅ Duties per month cell displays initial value: ${initialDutiesPerMonth}`
    );
  });

  test("should show text field when clicking on the cell", async ({ page }) => {
    // Get the duties per month cell and elements
    const dutiesPerMonthCell = workerTestBase.getWorkerDutiesPerMonthCell(page);
    const dutiesPerMonthDisplay =
      workerTestBase.getWorkerDutiesPerMonthDisplay(page);
    const dutiesPerMonthInput =
      workerTestBase.getWorkerDutiesPerMonthInput(page);

    // Initially, the display should be visible and input should not exist
    await expect(dutiesPerMonthDisplay).toBeVisible();
    await expect(dutiesPerMonthInput).not.toBeVisible();

    // Click on the cell to edit
    await dutiesPerMonthCell.click();

    // After clicking, the input should appear and display should be hidden
    await expect(dutiesPerMonthInput).toBeVisible();
    await expect(dutiesPerMonthInput).toHaveValue(
      initialDutiesPerMonth.toString()
    );
    await expect(dutiesPerMonthDisplay).not.toBeVisible();

    console.log("✅ Text field appears when clicking on the cell");
  });

  test("should only accept numeric input in the text field", async ({
    page,
  }) => {
    // Get the duties per month cell and input
    const dutiesPerMonthCell = workerTestBase.getWorkerDutiesPerMonthCell(page);
    const dutiesPerMonthInput =
      workerTestBase.getWorkerDutiesPerMonthInput(page);

    // Click on the cell to edit
    await dutiesPerMonthCell.click();
    await expect(dutiesPerMonthInput).toBeVisible();

    // Clear the input and try to enter non-numeric text
    await dutiesPerMonthInput.clear();
    await dutiesPerMonthInput.type("abc");

    // The input should be empty because non-numeric characters are not accepted
    await expect(dutiesPerMonthInput).toHaveValue("");

    // Try entering a mix of numbers and letters
    await dutiesPerMonthInput.clear();
    await dutiesPerMonthInput.type("123abc456");

    // Should only contain the numeric parts (behavior may vary based on implementation)
    const inputValue = await dutiesPerMonthInput.inputValue();
    // The exact behavior depends on the TextField implementation, but it should handle non-numeric input gracefully
    expect(inputValue).toMatch(/^\d*$/); // Should only contain digits

    // Enter a valid number
    await dutiesPerMonthInput.clear();
    await dutiesPerMonthInput.type("6");
    await expect(dutiesPerMonthInput).toHaveValue("6");

    console.log("✅ Text field only accepts numeric input");
  });

  test("should update value when clicking away (blur event)", async ({
    page,
  }) => {
    // Get the duties per month elements
    const dutiesPerMonthCell = workerTestBase.getWorkerDutiesPerMonthCell(page);
    const dutiesPerMonthDisplay =
      workerTestBase.getWorkerDutiesPerMonthDisplay(page);
    const dutiesPerMonthInput =
      workerTestBase.getWorkerDutiesPerMonthInput(page);

    // Click on the cell to edit
    await dutiesPerMonthCell.click();
    await expect(dutiesPerMonthInput).toBeVisible();

    // Change the value
    const newDutiesPerMonth = 8;
    await dutiesPerMonthInput.clear();
    await dutiesPerMonthInput.type(newDutiesPerMonth.toString());
    await expect(dutiesPerMonthInput).toHaveValue(newDutiesPerMonth.toString());

    // Click on the page title "Workers" to trigger blur event
    const pageTitle = page.getByRole("heading", { name: "Workers" });
    await pageTitle.click();

    // Wait for the save operation to complete
    await page.waitForTimeout(500);

    // The input should no longer be visible
    await expect(dutiesPerMonthInput).not.toBeVisible();

    // The display should show the updated value
    await expect(dutiesPerMonthDisplay).toBeVisible();
    await expect(dutiesPerMonthDisplay).toContainText(
      newDutiesPerMonth.toString()
    );

    console.log(
      `✅ Duties per month updated to ${newDutiesPerMonth} via blur event`
    );
  });

  test("should update value when pressing Enter", async ({ page }) => {
    // Get the duties per month elements
    const dutiesPerMonthCell = workerTestBase.getWorkerDutiesPerMonthCell(page);
    const dutiesPerMonthDisplay =
      workerTestBase.getWorkerDutiesPerMonthDisplay(page);
    const dutiesPerMonthInput =
      workerTestBase.getWorkerDutiesPerMonthInput(page);

    // Click on the cell to edit
    await dutiesPerMonthCell.click();
    await expect(dutiesPerMonthInput).toBeVisible();

    // Change the value
    const newDutiesPerMonth = 6;
    await dutiesPerMonthInput.clear();
    await dutiesPerMonthInput.type(newDutiesPerMonth.toString());
    await expect(dutiesPerMonthInput).toHaveValue(newDutiesPerMonth.toString());

    // Press Enter to save
    await dutiesPerMonthInput.press("Enter");

    // Wait for the save operation to complete
    await page.waitForTimeout(500);

    // The input should no longer be visible
    await expect(dutiesPerMonthInput).not.toBeVisible();

    // The display should show the updated value
    await expect(dutiesPerMonthDisplay).toBeVisible();
    await expect(dutiesPerMonthDisplay).toContainText(
      newDutiesPerMonth.toString()
    );

    console.log(
      `✅ Duties per month updated to ${newDutiesPerMonth} via Enter key`
    );
  });

  test("should cancel edit and revert value when pressing Escape", async ({
    page,
  }) => {
    // Get the duties per month elements
    const dutiesPerMonthCell = workerTestBase.getWorkerDutiesPerMonthCell(page);
    const dutiesPerMonthDisplay =
      workerTestBase.getWorkerDutiesPerMonthDisplay(page);
    const dutiesPerMonthInput =
      workerTestBase.getWorkerDutiesPerMonthInput(page);

    // Verify initial value
    await expect(dutiesPerMonthDisplay).toContainText(
      initialDutiesPerMonth.toString()
    );

    // Click on the cell to edit
    await dutiesPerMonthCell.click();
    await expect(dutiesPerMonthInput).toBeVisible();
    await expect(dutiesPerMonthInput).toHaveValue(
      initialDutiesPerMonth.toString()
    );

    // Change the value to something different
    const tempDutiesPerMonth = 12;
    await dutiesPerMonthInput.clear();
    await dutiesPerMonthInput.type(tempDutiesPerMonth.toString());
    await expect(dutiesPerMonthInput).toHaveValue(
      tempDutiesPerMonth.toString()
    );

    // Press Escape to cancel editing
    await dutiesPerMonthInput.press("Escape");

    // Wait for the cancel operation to complete
    await page.waitForTimeout(500);

    // The input should no longer be visible
    await expect(dutiesPerMonthInput).not.toBeVisible();

    // The display should show the original value (not the temporary one)
    await expect(dutiesPerMonthDisplay).toBeVisible();
    await expect(dutiesPerMonthDisplay).toContainText(
      initialDutiesPerMonth.toString()
    );
    await expect(dutiesPerMonthDisplay).not.toContainText(
      tempDutiesPerMonth.toString()
    );

    console.log(
      `✅ Duties per month edit canceled, reverted to original: ${initialDutiesPerMonth}`
    );
  });

  test("should handle empty input by reverting to original value", async ({
    page,
  }) => {
    // Get the duties per month elements
    const dutiesPerMonthCell = workerTestBase.getWorkerDutiesPerMonthCell(page);
    const dutiesPerMonthDisplay =
      workerTestBase.getWorkerDutiesPerMonthDisplay(page);
    const dutiesPerMonthInput =
      workerTestBase.getWorkerDutiesPerMonthInput(page);

    // Click on the cell to edit
    await dutiesPerMonthCell.click();
    await expect(dutiesPerMonthInput).toBeVisible();

    // Clear the input (make it empty)
    await dutiesPerMonthInput.clear();
    await expect(dutiesPerMonthInput).toHaveValue("");

    // Press Enter to save the empty value
    await dutiesPerMonthInput.press("Enter");

    // Wait for the save operation to complete
    await page.waitForTimeout(500);

    // The input should no longer be visible
    await expect(dutiesPerMonthInput).not.toBeVisible();

    // The display should show the original value (component should revert empty to original)
    await expect(dutiesPerMonthDisplay).toBeVisible();
    await expect(dutiesPerMonthDisplay).toContainText(
      initialDutiesPerMonth.toString()
    );

    console.log(
      `✅ Empty input reverted to original value: ${initialDutiesPerMonth}`
    );
  });

  test("should not update value when no change is made", async ({ page }) => {
    // Get the duties per month elements
    const dutiesPerMonthCell = workerTestBase.getWorkerDutiesPerMonthCell(page);
    const dutiesPerMonthDisplay =
      workerTestBase.getWorkerDutiesPerMonthDisplay(page);
    const dutiesPerMonthInput =
      workerTestBase.getWorkerDutiesPerMonthInput(page);

    // Click on the cell to edit
    await dutiesPerMonthCell.click();
    await expect(dutiesPerMonthInput).toBeVisible();

    // Don't change the value, just press Enter
    await expect(dutiesPerMonthInput).toHaveValue(
      initialDutiesPerMonth.toString()
    );
    await dutiesPerMonthInput.press("Enter");

    // Wait for any potential save operation
    await page.waitForTimeout(500);

    // The input should no longer be visible
    await expect(dutiesPerMonthInput).not.toBeVisible();

    // The display should show the same value as before
    await expect(dutiesPerMonthDisplay).toBeVisible();
    await expect(dutiesPerMonthDisplay).toContainText(
      initialDutiesPerMonth.toString()
    );

    console.log(`✅ No change made - value remains: ${initialDutiesPerMonth}`);
  });

  test("should handle large numbers correctly", async ({ page }) => {
    // Get the duties per month elements
    const dutiesPerMonthCell = workerTestBase.getWorkerDutiesPerMonthCell(page);
    const dutiesPerMonthDisplay =
      workerTestBase.getWorkerDutiesPerMonthDisplay(page);
    const dutiesPerMonthInput =
      workerTestBase.getWorkerDutiesPerMonthInput(page);

    // Click on the cell to edit
    await dutiesPerMonthCell.click();
    await expect(dutiesPerMonthInput).toBeVisible();

    // Enter a large number
    const largeDutiesPerMonth = 999;
    await dutiesPerMonthInput.clear();
    await dutiesPerMonthInput.type(largeDutiesPerMonth.toString());
    await expect(dutiesPerMonthInput).toHaveValue(
      largeDutiesPerMonth.toString()
    );

    // Press Enter to save
    await dutiesPerMonthInput.press("Enter");

    // Wait for the save operation to complete
    await page.waitForTimeout(500);

    // The input should no longer be visible
    await expect(dutiesPerMonthInput).not.toBeVisible();

    // The display should show the large value
    await expect(dutiesPerMonthDisplay).toBeVisible();
    await expect(dutiesPerMonthDisplay).toContainText(
      largeDutiesPerMonth.toString()
    );

    console.log(
      `✅ Large duties per month ${largeDutiesPerMonth} handled correctly`
    );
  });
});
