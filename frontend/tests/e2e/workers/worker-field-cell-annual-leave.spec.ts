import { test, expect } from "@playwright/test";
import { WorkerTestBase } from "../../utils/worker-test-base";

const workerTestBase = new WorkerTestBase();

test.describe("Worker Annual Leave Field Cell", () => {
  let testWorker: { id: string; name: string; teamId: string };
  let initialWorkerName: string;
  let initialAnnualLeave: number;

  test.beforeEach(async ({ page }) => {
    // Setup the common worker test environment
    await workerTestBase.setupWorkerTests(test.info().workerIndex);

    // Use a unique name per test to avoid conflicts
    initialWorkerName = `Test Worker ${test.info().workerIndex}-${Date.now()}`;
    initialAnnualLeave = 25;

    // Create a fresh test worker for each test
    testWorker = await workerTestBase.createTestWorker({
      name: initialWorkerName,
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 4,
      annualLeave: initialAnnualLeave,
    });

    console.log(
      `Created test worker: ${testWorker.name} (${testWorker.id}) with annual leave: ${initialAnnualLeave}`,
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
        console.warn(`Failed to delete test worker: ${error}`);
      }
    }
  });

  test("should display annual leave value in the cell", async ({ page }) => {
    // Get the annual leave cell and display elements
    const annualLeaveCell = workerTestBase.getWorkerAnnualLeaveCell(page);
    const annualLeaveDisplay = workerTestBase.getWorkerAnnualLeaveDisplay(page);

    // Verify the cell is visible and displays the initial annual leave
    await expect(annualLeaveCell).toBeVisible();
    await expect(annualLeaveDisplay).toContainText(
      initialAnnualLeave.toString(),
    );

    console.log(
      `✅ Annual leave cell displays initial value: ${initialAnnualLeave}`,
    );
  });

  test("should show text field when clicking on the cell", async ({ page }) => {
    // Get the annual leave cell and elements
    const annualLeaveCell = workerTestBase.getWorkerAnnualLeaveCell(page);
    const annualLeaveDisplay = workerTestBase.getWorkerAnnualLeaveDisplay(page);
    const annualLeaveInput = workerTestBase.getWorkerAnnualLeaveInput(page);

    // Initially, the display should be visible and input should not exist
    await expect(annualLeaveDisplay).toBeVisible();
    await expect(annualLeaveInput).not.toBeVisible();

    // Click on the cell to edit
    await annualLeaveCell.click();

    // After clicking, the input should appear and display should be hidden
    await expect(annualLeaveInput).toBeVisible();
    await expect(annualLeaveInput).toHaveValue(initialAnnualLeave.toString());
    await expect(annualLeaveDisplay).not.toBeVisible();

    console.log("✅ Text field appears when clicking on the cell");
  });

  test("should only accept numeric input in the text field", async ({
    page,
  }) => {
    // Get the annual leave cell and input
    const annualLeaveCell = workerTestBase.getWorkerAnnualLeaveCell(page);
    const annualLeaveInput = workerTestBase.getWorkerAnnualLeaveInput(page);

    // Click on the cell to edit
    await annualLeaveCell.click();
    await expect(annualLeaveInput).toBeVisible();

    // Clear the input and try to enter non-numeric text
    await annualLeaveInput.clear();
    await annualLeaveInput.type("abc");

    // The input should be empty because non-numeric characters are not accepted
    await expect(annualLeaveInput).toHaveValue("");

    // Try entering a mix of numbers and letters
    await annualLeaveInput.clear();
    await annualLeaveInput.type("123abc456");

    // Should only contain the numeric parts (behavior may vary based on implementation)
    const inputValue = await annualLeaveInput.inputValue();
    // The exact behavior depends on the TextField implementation, but it should handle non-numeric input gracefully
    expect(inputValue).toMatch(/^\d*$/); // Should only contain digits

    // Enter a valid number
    await annualLeaveInput.clear();
    await annualLeaveInput.type("30");
    await expect(annualLeaveInput).toHaveValue("30");

    console.log("✅ Text field only accepts numeric input");
  });

  test("should update value when clicking away (blur event)", async ({
    page,
  }) => {
    // Get the annual leave elements
    const annualLeaveCell = workerTestBase.getWorkerAnnualLeaveCell(page);
    const annualLeaveInput = workerTestBase.getWorkerAnnualLeaveInput(page);

    // Click on the cell to edit
    await annualLeaveCell.click();
    await workerTestBase.waitForAnnualLeaveEditMode(page);

    // Change the value
    const newAnnualLeave = 30;
    await annualLeaveInput.clear();
    await annualLeaveInput.type(newAnnualLeave.toString());
    await expect(annualLeaveInput).toHaveValue(newAnnualLeave.toString());

    // Click on the page title "Workers" to trigger blur event
    const pageTitle = page.getByRole("heading", { name: "Workers" });
    await pageTitle.click();

    // Wait for the update to complete using smart waiting
    await workerTestBase.waitForAnnualLeaveUpdateComplete(
      page,
      newAnnualLeave.toString(),
    );

    console.log(`✅ Annual leave updated to ${newAnnualLeave} via blur event`);
  });

  test("should update value when pressing Enter", async ({ page }) => {
    // Get the annual leave elements
    const annualLeaveCell = workerTestBase.getWorkerAnnualLeaveCell(page);
    const annualLeaveInput = workerTestBase.getWorkerAnnualLeaveInput(page);

    // Click on the cell to edit
    await annualLeaveCell.click();
    await workerTestBase.waitForAnnualLeaveEditMode(page);

    // Change the value
    const newAnnualLeave = 28;
    await annualLeaveInput.clear();
    await annualLeaveInput.type(newAnnualLeave.toString());
    await expect(annualLeaveInput).toHaveValue(newAnnualLeave.toString());

    // Press Enter to save
    await annualLeaveInput.press("Enter");

    // Wait for the update to complete using smart waiting
    await workerTestBase.waitForAnnualLeaveUpdateComplete(
      page,
      newAnnualLeave.toString(),
    );

    console.log(`✅ Annual leave updated to ${newAnnualLeave} via Enter key`);
  });

  test("should cancel edit and revert value when pressing Escape", async ({
    page,
  }) => {
    // Get the annual leave elements
    const annualLeaveCell = workerTestBase.getWorkerAnnualLeaveCell(page);
    const annualLeaveDisplay = workerTestBase.getWorkerAnnualLeaveDisplay(page);
    const annualLeaveInput = workerTestBase.getWorkerAnnualLeaveInput(page);

    // Verify initial value
    await expect(annualLeaveDisplay).toContainText(
      initialAnnualLeave.toString(),
    );

    // Click on the cell to edit
    await annualLeaveCell.click();
    await workerTestBase.waitForAnnualLeaveEditMode(page);
    await expect(annualLeaveInput).toHaveValue(initialAnnualLeave.toString());

    // Change the value to something different
    const tempAnnualLeave = 35;
    await annualLeaveInput.clear();
    await annualLeaveInput.type(tempAnnualLeave.toString());
    await expect(annualLeaveInput).toHaveValue(tempAnnualLeave.toString());

    // Press Escape to cancel editing
    await annualLeaveInput.press("Escape");

    // Wait for display mode to return with original value
    await workerTestBase.waitForAnnualLeaveDisplayMode(page);

    // The display should show the original value (not the temporary one)
    await expect(annualLeaveDisplay).toContainText(
      initialAnnualLeave.toString(),
    );
    await expect(annualLeaveDisplay).not.toContainText(
      tempAnnualLeave.toString(),
    );

    console.log(
      `✅ Annual leave edit canceled, reverted to original: ${initialAnnualLeave}`,
    );
  });

  test("should handle empty input by reverting to original value", async ({
    page,
  }) => {
    // Get the annual leave elements
    const annualLeaveCell = workerTestBase.getWorkerAnnualLeaveCell(page);
    const annualLeaveInput = workerTestBase.getWorkerAnnualLeaveInput(page);

    // Click on the cell to edit
    await annualLeaveCell.click();
    await workerTestBase.waitForAnnualLeaveEditMode(page);

    // Clear the input (make it empty)
    await annualLeaveInput.clear();
    await expect(annualLeaveInput).toHaveValue("");

    // Press Enter to save the empty value
    await annualLeaveInput.press("Enter");

    // Wait for display mode to return with original value
    await workerTestBase.waitForAnnualLeaveDisplayMode(page);

    // The display should show the original value (component should revert empty to original)
    const annualLeaveDisplay = workerTestBase.getWorkerAnnualLeaveDisplay(page);
    await expect(annualLeaveDisplay).toContainText(
      initialAnnualLeave.toString(),
    );

    console.log(
      `✅ Empty input reverted to original value: ${initialAnnualLeave}`,
    );
  });

  test("should not update value when no change is made", async ({ page }) => {
    // Get the annual leave elements
    const annualLeaveCell = workerTestBase.getWorkerAnnualLeaveCell(page);
    const annualLeaveInput = workerTestBase.getWorkerAnnualLeaveInput(page);

    // Click on the cell to edit
    await annualLeaveCell.click();
    await workerTestBase.waitForAnnualLeaveEditMode(page);

    // Don't change the value, just press Enter
    await annualLeaveInput.press("Enter");

    // Wait for display mode to return
    await workerTestBase.waitForAnnualLeaveDisplayMode(page);

    // The display should show the same original value
    const annualLeaveDisplay = workerTestBase.getWorkerAnnualLeaveDisplay(page);
    await expect(annualLeaveDisplay).toContainText(
      initialAnnualLeave.toString(),
    );

    console.log(`✅ No change made, value remains: ${initialAnnualLeave}`);
  });

  test("should handle large numbers correctly", async ({ page }) => {
    // Get the annual leave elements
    const annualLeaveCell = workerTestBase.getWorkerAnnualLeaveCell(page);
    const annualLeaveInput = workerTestBase.getWorkerAnnualLeaveInput(page);

    // Click on the cell to edit
    await annualLeaveCell.click();
    await workerTestBase.waitForAnnualLeaveEditMode(page);

    // Enter a large number
    const largeAnnualLeave = 999;
    await annualLeaveInput.clear();
    await annualLeaveInput.type(largeAnnualLeave.toString());
    await expect(annualLeaveInput).toHaveValue(largeAnnualLeave.toString());

    // Press Enter to save
    await annualLeaveInput.press("Enter");

    // Wait for the update to complete using smart waiting
    await workerTestBase.waitForAnnualLeaveUpdateComplete(
      page,
      largeAnnualLeave.toString(),
    );

    console.log(`✅ Large number ${largeAnnualLeave} handled correctly`);
  });
});
