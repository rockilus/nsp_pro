import { test, expect } from "@playwright/test";
import { WorkerTestBase } from "../../utils/worker-test-base";

const workerTestBase = new WorkerTestBase();

test.describe("Worker Property Updates", () => {
  let testWorker: { workerId: string; name: string; teamId: string };
  let initialWorkerName: string;

  test.beforeEach(async ({ page }) => {
    // Setup the common worker test environment
    await workerTestBase.setupWorkerTests(test.info().workerIndex);

    // Use a unique name per test to avoid conflicts
    initialWorkerName = `John Doe ${test.info().workerIndex}-${Date.now()}`;

    // Create a fresh test worker for each test
    testWorker = await workerTestBase.createTestWorker({
      name: initialWorkerName,
      acronym: "JD",
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    console.log(
      `Created test worker: ${testWorker.name} (${testWorker.workerId})`
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
        console.log(`Deleted test worker: ${testWorker.workerId}`);
      } catch (error) {
        console.warn(
          `Failed to delete test worker ${testWorker.workerId}:`,
          error
        );
      }
    }
  });

  test("should allow editing worker name by clicking on it", async ({
    page,
  }) => {
    // Get the name cell of our test worker
    const nameCell = workerTestBase.getWorkerNameCell(page);

    // Initially, the name should be displayed as text (not in an input field)
    await expect(nameCell).toContainText(initialWorkerName);

    // Click on the name to edit it
    await nameCell.click();

    // After clicking, the name cell should contain an input field with the current name
    const nameInput = nameCell.locator("input");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue(initialWorkerName);

    // Clear the input and type a new name
    const newName = "Jane Smith";
    await nameInput.fill(newName);

    // Verify the input shows the new value
    await expect(nameInput).toHaveValue(newName);

    // Press Enter to save the changes
    await nameInput.press("Enter");

    // Wait a moment for the save operation to complete
    await page.waitForTimeout(500);

    // After saving, the input should be replaced with text showing the new name
    // The input field should no longer be visible
    await expect(nameInput).not.toBeVisible();

    // The cell should now display the updated name
    await expect(nameCell).toContainText(newName);

    console.log(
      `✅ Worker name updated from "${initialWorkerName}" to "${newName}"`
    );
  });

  test("should save worker name when clicking away (blur event)", async ({
    page,
  }) => {
    // Get the name cell of our test worker
    const nameCell = workerTestBase.getWorkerNameCell(page);

    // Click on the name to edit it
    await nameCell.click();

    // Wait for the input field to appear
    const nameInput = nameCell.locator("input");
    await expect(nameInput).toBeVisible();

    // Type a new name
    const newName = "Bob Johnson";
    await nameInput.fill(newName);

    // Click somewhere else to trigger blur event (save)
    // We'll click on the page title
    const pageTitle = page.getByRole("heading", { name: "Workers" });
    await pageTitle.click();

    // Wait a moment for the save operation to complete
    await page.waitForTimeout(500);

    // The name input should no longer be visible
    await expect(nameInput).not.toBeVisible();

    // The name cell should show the updated name
    await expect(nameCell).toContainText(newName);

    console.log(`✅ Worker name updated via blur event to "${newName}"`);
  });

  test("should cancel editing if Escape key is pressed", async ({ page }) => {
    // Get the name cell of our test worker
    const nameCell = workerTestBase.getWorkerNameCell(page);
    const originalName = initialWorkerName;

    // Click on the name to edit it
    await nameCell.click();

    // Wait for the input field to appear
    const nameInput = nameCell.locator("input");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveValue(originalName);

    // Type a new name (but don't save it)
    const tempName = "Temporary Name";
    await nameInput.fill(tempName);
    await expect(nameInput).toHaveValue(tempName);

    // Press Escape to cancel editing
    await nameInput.press("Escape");

    // Wait a moment for the cancel operation to complete
    await page.waitForTimeout(500);

    // The input should no longer be visible
    await expect(nameInput).not.toBeVisible();

    // The name cell should still show the original name (not the temporary one)
    await expect(nameCell).toContainText(originalName);
    await expect(nameCell).not.toContainText(tempName);

    console.log(
      `✅ Name edit canceled, reverted to original: "${originalName}"`
    );
  });

  test("should handle empty name validation", async ({ page }) => {
    // Get the name cell of our test worker
    const nameCell = workerTestBase.getWorkerNameCell(page);

    // Click on the name to edit it
    await nameCell.click();

    // Wait for the input field to appear
    const nameInput = nameCell.locator("input");
    await expect(nameInput).toBeVisible();

    // Clear the name (make it empty)
    await nameInput.fill("");
    await expect(nameInput).toHaveValue("");

    // Try to save by pressing Enter
    await nameInput.press("Enter");

    // Wait a moment for the save operation to complete
    await page.waitForTimeout(500);

    // The input should be hidden after saving
    await expect(nameInput).not.toBeVisible();

    // The name cell should display "Unnamed Worker" when the name is empty
    await expect(nameCell).toContainText("Unnamed Worker");

    console.log("✅ Empty name displays 'Unnamed Worker' as expected");
  });

  test("should handle special characters in worker name", async ({ page }) => {
    // Get the name cell of our test worker
    const nameCell = workerTestBase.getWorkerNameCell(page);

    // Click on the name to edit it
    await nameCell.click();

    // Wait for the input field to appear
    const nameInput = nameCell.locator("input");
    await expect(nameInput).toBeVisible();

    // Test a name with special characters
    const specialName = "Dr. María José O'Connor-Smith";
    await nameInput.fill(specialName);

    // Save by pressing Enter
    await nameInput.press("Enter");

    // Wait for save to complete
    await page.waitForTimeout(500);

    // The input should be hidden
    await expect(nameInput).not.toBeVisible();

    // The name should be displayed correctly with special characters
    await expect(nameCell).toContainText(specialName);

    console.log(
      `✅ Special characters in name handled correctly: "${specialName}"`
    );
  });
});
