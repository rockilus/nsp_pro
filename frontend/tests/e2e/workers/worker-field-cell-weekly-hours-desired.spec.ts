import { test, expect } from "@playwright/test";
import { WorkerTestBase } from "../../utils/worker-test-base";

const workerTestBase = new WorkerTestBase();

test.describe("Worker Weekly Hours Desired Field Cell", () => {
  let testWorker: { id: string; name: string; teamId: string };
  let initialWorkerName: string;
  let initialWeeklyHours: number;
  let initialWeeklyHoursDesired: number;

  test.beforeEach(async ({ page }) => {
    // Setup the common worker test environment
    await workerTestBase.setupWorkerTests(test.info().workerIndex);

    // Use a unique name per test to avoid conflicts
    initialWorkerName = `Test Worker ${test.info().workerIndex}-${Date.now()}`;
    initialWeeklyHours = 40;
    initialWeeklyHoursDesired = 40;

    // Create a fresh test worker for each test
    testWorker = await workerTestBase.createTestWorker({
      name: initialWorkerName,
      weeklyHours: initialWeeklyHours,
      weeklyHoursDesired: initialWeeklyHoursDesired,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    console.log(
      `Created test worker: ${testWorker.name} (${testWorker.id}) with weekly hours desired: ${initialWeeklyHoursDesired}`,
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
    if (testWorker?.id) {
      try {
        await workerTestBase.deleteTestWorker(testWorker.id);
        console.log(`Deleted test worker: ${testWorker.id}`);
      } catch (error) {
        console.warn(`Failed to delete test worker ${testWorker.id}:`, error);
      }
    }
  });

  test("should display weekly hours desired value in the cell", async ({
    page,
  }) => {
    // Get the weekly hours desired cell and display elements
    const weeklyHoursDesiredCell =
      workerTestBase.getWorkerWeeklyHoursDesiredCell(page);
    const weeklyHoursDesiredDisplay =
      workerTestBase.getWorkerWeeklyHoursDesiredDisplay(page);

    // Verify the cell is visible and displays the initial weekly hours desired
    await expect(weeklyHoursDesiredCell).toBeVisible();
    await expect(weeklyHoursDesiredDisplay).toContainText(
      initialWeeklyHoursDesired.toString(),
    );

    console.log(
      `✅ Weekly hours desired cell displays initial value: ${initialWeeklyHoursDesired}`,
    );
  });

  test("should show text field when clicking on the cell", async ({ page }) => {
    // Get the weekly hours desired cell and elements
    const weeklyHoursDesiredCell =
      workerTestBase.getWorkerWeeklyHoursDesiredCell(page);
    const weeklyHoursDesiredDisplay =
      workerTestBase.getWorkerWeeklyHoursDesiredDisplay(page);
    const weeklyHoursDesiredInput =
      workerTestBase.getWorkerWeeklyHoursDesiredInput(page);

    // Initially, the display should be visible and input should not exist
    await expect(weeklyHoursDesiredDisplay).toBeVisible();
    await expect(weeklyHoursDesiredInput).not.toBeVisible();

    // Click on the cell to edit
    await weeklyHoursDesiredCell.click();

    // After clicking, the input should appear and display should be hidden
    await expect(weeklyHoursDesiredInput).toBeVisible();
    await expect(weeklyHoursDesiredInput).toHaveValue(
      initialWeeklyHoursDesired.toString(),
    );
    await expect(weeklyHoursDesiredDisplay).not.toBeVisible();

    console.log("✅ Text field appears when clicking on the cell");
  });

  test("should only accept numeric input in the text field", async ({
    page,
  }) => {
    // Get the weekly hours desired cell and input
    const weeklyHoursDesiredCell =
      workerTestBase.getWorkerWeeklyHoursDesiredCell(page);
    const weeklyHoursDesiredInput =
      workerTestBase.getWorkerWeeklyHoursDesiredInput(page);

    // Click on the cell to edit
    await weeklyHoursDesiredCell.click();
    await expect(weeklyHoursDesiredInput).toBeVisible();

    // Clear the input and try to enter non-numeric text
    await weeklyHoursDesiredInput.clear();
    await weeklyHoursDesiredInput.type("abc");

    // The input should be empty because non-numeric characters are not accepted
    await expect(weeklyHoursDesiredInput).toHaveValue("");

    // Try entering a mix of numbers and letters
    await weeklyHoursDesiredInput.clear();
    await weeklyHoursDesiredInput.type("123abc456");

    // Should only contain the numeric parts (behavior may vary based on implementation)
    const inputValue = await weeklyHoursDesiredInput.inputValue();
    // The exact behavior depends on the TextField implementation, but it should handle non-numeric input gracefully
    expect(inputValue).toMatch(/^\d*$/); // Should only contain digits

    // Enter a valid number
    await weeklyHoursDesiredInput.clear();
    await weeklyHoursDesiredInput.type("35");
    await expect(weeklyHoursDesiredInput).toHaveValue("35");

    console.log("✅ Text field only accepts numeric input");
  });

  test("should update value when clicking away (blur event)", async ({
    page,
  }) => {
    // Get the weekly hours desired elements
    const weeklyHoursDesiredCell =
      workerTestBase.getWorkerWeeklyHoursDesiredCell(page);
    const weeklyHoursDesiredDisplay =
      workerTestBase.getWorkerWeeklyHoursDesiredDisplay(page);
    const weeklyHoursDesiredInput =
      workerTestBase.getWorkerWeeklyHoursDesiredInput(page);

    // Click on the cell to edit
    await weeklyHoursDesiredCell.click();
    await expect(weeklyHoursDesiredInput).toBeVisible();

    // Change the value
    const newWeeklyHoursDesired = 45;
    await weeklyHoursDesiredInput.clear();
    await weeklyHoursDesiredInput.type(newWeeklyHoursDesired.toString());
    await expect(weeklyHoursDesiredInput).toHaveValue(
      newWeeklyHoursDesired.toString(),
    );

    // Click on the page title "Workers" to trigger blur event
    const pageTitle = page.getByRole("heading", { name: "Workers" });
    await pageTitle.click();

    // Wait for the weekly hours desired update to complete
    await workerTestBase.waitForWeeklyHoursDesiredUpdate(
      page,
      newWeeklyHoursDesired,
    );

    console.log(
      `✅ Weekly hours desired updated to ${newWeeklyHoursDesired} via blur event`,
    );
  });

  test("should update value when pressing Enter", async ({ page }) => {
    // Get the weekly hours desired elements
    const weeklyHoursDesiredCell =
      workerTestBase.getWorkerWeeklyHoursDesiredCell(page);
    const weeklyHoursDesiredDisplay =
      workerTestBase.getWorkerWeeklyHoursDesiredDisplay(page);
    const weeklyHoursDesiredInput =
      workerTestBase.getWorkerWeeklyHoursDesiredInput(page);

    // Click on the cell to edit
    await weeklyHoursDesiredCell.click();
    await expect(weeklyHoursDesiredInput).toBeVisible();

    // Change the value
    const newWeeklyHoursDesired = 42;
    await weeklyHoursDesiredInput.clear();
    await weeklyHoursDesiredInput.type(newWeeklyHoursDesired.toString());
    await expect(weeklyHoursDesiredInput).toHaveValue(
      newWeeklyHoursDesired.toString(),
    );

    // Press Enter to save
    await weeklyHoursDesiredInput.press("Enter");

    // Wait for the weekly hours desired update to complete
    await workerTestBase.waitForWeeklyHoursDesiredUpdate(
      page,
      newWeeklyHoursDesired,
    );

    console.log(
      `✅ Weekly hours desired updated to ${newWeeklyHoursDesired} via Enter key`,
    );
  });

  test("should cancel edit and revert value when pressing Escape", async ({
    page,
  }) => {
    // Get the weekly hours desired elements
    const weeklyHoursDesiredCell =
      workerTestBase.getWorkerWeeklyHoursDesiredCell(page);
    const weeklyHoursDesiredDisplay =
      workerTestBase.getWorkerWeeklyHoursDesiredDisplay(page);
    const weeklyHoursDesiredInput =
      workerTestBase.getWorkerWeeklyHoursDesiredInput(page);

    // Verify initial value
    await expect(weeklyHoursDesiredDisplay).toContainText(
      initialWeeklyHoursDesired.toString(),
    );

    // Click on the cell to edit
    await weeklyHoursDesiredCell.click();
    await expect(weeklyHoursDesiredInput).toBeVisible();
    await expect(weeklyHoursDesiredInput).toHaveValue(
      initialWeeklyHoursDesired.toString(),
    );

    // Change the value to something different
    const tempWeeklyHoursDesired = 50;
    await weeklyHoursDesiredInput.clear();
    await weeklyHoursDesiredInput.type(tempWeeklyHoursDesired.toString());
    await expect(weeklyHoursDesiredInput).toHaveValue(
      tempWeeklyHoursDesired.toString(),
    );

    // Press Escape to cancel editing
    await weeklyHoursDesiredInput.press("Escape");

    // Wait for the cancel operation to complete (should revert to original value)
    await workerTestBase.waitForWeeklyHoursDesiredUpdate(
      page,
      initialWeeklyHoursDesired,
    );

    // Verify it's not showing the temporary value
    await expect(weeklyHoursDesiredDisplay).not.toContainText(
      tempWeeklyHoursDesired.toString(),
    );

    console.log(
      `✅ Weekly hours desired edit canceled, reverted to original: ${initialWeeklyHoursDesired}`,
    );
  });

  test("should handle empty input by reverting to original value", async ({
    page,
  }) => {
    // Get the weekly hours desired elements
    const weeklyHoursDesiredCell =
      workerTestBase.getWorkerWeeklyHoursDesiredCell(page);
    const weeklyHoursDesiredDisplay =
      workerTestBase.getWorkerWeeklyHoursDesiredDisplay(page);
    const weeklyHoursDesiredInput =
      workerTestBase.getWorkerWeeklyHoursDesiredInput(page);

    // Click on the cell to edit
    await weeklyHoursDesiredCell.click();
    await expect(weeklyHoursDesiredInput).toBeVisible();

    // Clear the input (make it empty)
    await weeklyHoursDesiredInput.clear();
    await expect(weeklyHoursDesiredInput).toHaveValue("");

    // Press Enter to save the empty value
    await weeklyHoursDesiredInput.press("Enter");

    // Wait for the save operation to complete (should revert to original value)
    await workerTestBase.waitForWeeklyHoursDesiredUpdate(
      page,
      initialWeeklyHoursDesired,
    );

    console.log(
      `✅ Empty input reverted to original value: ${initialWeeklyHoursDesired}`,
    );
  });

  test("should not update value when no change is made", async ({ page }) => {
    // Get the weekly hours desired elements
    const weeklyHoursDesiredCell =
      workerTestBase.getWorkerWeeklyHoursDesiredCell(page);
    const weeklyHoursDesiredDisplay =
      workerTestBase.getWorkerWeeklyHoursDesiredDisplay(page);
    const weeklyHoursDesiredInput =
      workerTestBase.getWorkerWeeklyHoursDesiredInput(page);

    // Verify initial value
    await expect(weeklyHoursDesiredDisplay).toContainText(
      initialWeeklyHoursDesired.toString(),
    );

    // Click on the cell to edit
    await weeklyHoursDesiredCell.click();
    await expect(weeklyHoursDesiredInput).toBeVisible();
    await expect(weeklyHoursDesiredInput).toHaveValue(
      initialWeeklyHoursDesired.toString(),
    );

    // Don't change the value, just press Enter
    await weeklyHoursDesiredInput.press("Enter");

    // Wait for the operation to complete (no change should occur)
    await workerTestBase.waitForWeeklyHoursDesiredUpdate(
      page,
      initialWeeklyHoursDesired,
    );

    console.log(
      `✅ No update when value unchanged: ${initialWeeklyHoursDesired}`,
    );
  });

  test("should handle large numbers correctly", async ({ page }) => {
    // Get the weekly hours desired elements
    const weeklyHoursDesiredCell =
      workerTestBase.getWorkerWeeklyHoursDesiredCell(page);
    const weeklyHoursDesiredDisplay =
      workerTestBase.getWorkerWeeklyHoursDesiredDisplay(page);
    const weeklyHoursDesiredInput =
      workerTestBase.getWorkerWeeklyHoursDesiredInput(page);

    // Click on the cell to edit
    await weeklyHoursDesiredCell.click();
    await expect(weeklyHoursDesiredInput).toBeVisible();

    // Enter a large number
    const largeWeeklyHoursDesired = "168"; // Maximum hours in a week
    await weeklyHoursDesiredInput.clear();
    await weeklyHoursDesiredInput.type(largeWeeklyHoursDesired);
    await expect(weeklyHoursDesiredInput).toHaveValue(largeWeeklyHoursDesired);

    // Press Enter to save
    await weeklyHoursDesiredInput.press("Enter");

    // Wait for the weekly hours desired update to complete
    await workerTestBase.waitForWeeklyHoursDesiredUpdate(
      page,
      largeWeeklyHoursDesired,
    );

    // The input should no longer be visible
    await expect(weeklyHoursDesiredInput).not.toBeVisible();

    // The display should show the large number
    await expect(weeklyHoursDesiredDisplay).toBeVisible();
    await expect(weeklyHoursDesiredDisplay).toContainText(
      largeWeeklyHoursDesired,
    );

    console.log(
      `✅ Large weekly hours desired ${largeWeeklyHoursDesired} handled correctly`,
    );
  });

  test("should validate desired hours cannot be lower than weekly hours", async ({
    page,
  }) => {
    // Update the test worker to have specific weekly hours for validation testing
    const baseWeeklyHours = 40;
    await workerTestBase.updateTestWorker(testWorker.id, {
      weeklyHours: baseWeeklyHours,
      weeklyHoursDesired: baseWeeklyHours,
    });

    // Refresh the page to get updated data
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Get the weekly hours desired elements
    const weeklyHoursDesiredCell =
      workerTestBase.getWorkerWeeklyHoursDesiredCell(page);
    const weeklyHoursDesiredInput =
      workerTestBase.getWorkerWeeklyHoursDesiredInput(page);

    // Click on the cell to edit
    await weeklyHoursDesiredCell.click();
    await expect(weeklyHoursDesiredInput).toBeVisible();

    // Try to enter a value lower than weekly hours
    const invalidWeeklyHoursDesired = (baseWeeklyHours - 5).toString(); // 35
    await weeklyHoursDesiredInput.clear();
    await weeklyHoursDesiredInput.type(invalidWeeklyHoursDesired);
    await expect(weeklyHoursDesiredInput).toHaveValue(
      invalidWeeklyHoursDesired,
    );

    // Try to save by pressing Enter - should show error
    await weeklyHoursDesiredInput.press("Enter");

    // Wait for validation error to appear
    await expect(weeklyHoursDesiredInput).toHaveAttribute(
      "aria-invalid",
      "true",
    );

    // The input should still be visible (editing not completed due to validation error)
    await expect(weeklyHoursDesiredInput).toBeVisible();

    console.log(
      `✅ Validation prevents desired hours (${invalidWeeklyHoursDesired}) from being lower than weekly hours (${baseWeeklyHours})`,
    );
  });

  test("should handle validation error when clicking away with invalid value", async ({
    page,
  }) => {
    // Update the test worker to have specific weekly hours for validation testing
    const baseWeeklyHours = 40;
    await workerTestBase.updateTestWorker(testWorker.id, {
      weeklyHours: baseWeeklyHours,
      weeklyHoursDesired: baseWeeklyHours,
    });

    // Refresh the page to get updated data
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Get the weekly hours desired elements
    const weeklyHoursDesiredCell =
      workerTestBase.getWorkerWeeklyHoursDesiredCell(page);
    const weeklyHoursDesiredDisplay =
      workerTestBase.getWorkerWeeklyHoursDesiredDisplay(page);
    const weeklyHoursDesiredInput =
      workerTestBase.getWorkerWeeklyHoursDesiredInput(page);

    // Click on the cell to edit
    await weeklyHoursDesiredCell.click();
    await expect(weeklyHoursDesiredInput).toBeVisible();

    // Try to enter a value lower than weekly hours
    const invalidWeeklyHoursDesired = (baseWeeklyHours - 5).toString(); // 35
    await weeklyHoursDesiredInput.clear();
    await weeklyHoursDesiredInput.type(invalidWeeklyHoursDesired);
    await expect(weeklyHoursDesiredInput).toHaveValue(
      invalidWeeklyHoursDesired,
    );

    // Click away to trigger blur event
    const pageTitle = page.getByRole("heading", { name: "Workers" });
    await pageTitle.click();

    // Wait for the validation error handling and reversion to complete
    await workerTestBase.waitForWeeklyHoursDesiredUpdate(page, baseWeeklyHours);

    // Verify it's not showing the invalid value
    await expect(weeklyHoursDesiredDisplay).not.toContainText(
      invalidWeeklyHoursDesired,
    );

    console.log(
      `✅ Validation error on blur reverts to original value: ${baseWeeklyHours}`,
    );
  });
});
