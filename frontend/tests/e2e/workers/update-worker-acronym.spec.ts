import { test, expect } from "@playwright/test";
import { WorkerTestBase } from "../../utils/worker-test-base";

const workerTestBase = new WorkerTestBase();

test.describe("Worker Acronym Updates", () => {
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
      // Don't specify acronym - let it be auto-generated to ensure acronymCustom = false
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

  test("should update acronym automatically when worker name changes to different initials", async ({
    page,
  }) => {
    // Get the name and acronym cells
    const nameCell = workerTestBase.getWorkerNameCell(page);
    const acronymCell = workerTestBase.getWorkerAcronymCell(page);

    // Get the current acronym to use as baseline (could be "JOH" or "JD" depending on implementation)
    const acronymDisplay = workerTestBase.getWorkerAcronymDisplay(page);
    const currentAcronym = await acronymDisplay.textContent();
    const trimmedCurrentAcronym = currentAcronym?.trim() || "";

    console.log(
      `Current acronym for "${initialWorkerName}": "${trimmedCurrentAcronym}"`
    );

    // Click on the name to edit it
    await nameCell.click();

    // Change the name to something with different initials
    const nameInput = nameCell.locator("input");
    await expect(nameInput).toBeVisible();
    const newName = "Alice Smith";
    await nameInput.fill(newName);

    // Save the name change
    await nameInput.press("Enter");

    // Wait for the save operation to complete
    await page.waitForTimeout(500);

    // The acronym should automatically update - could be "AS" or "ALI" depending on implementation
    const newAcronym = await acronymDisplay.textContent();
    const trimmedNewAcronym = newAcronym?.trim() || "";

    // Verify that the acronym has changed from the original
    expect(trimmedNewAcronym).not.toBe(trimmedCurrentAcronym);

    // The new acronym should either be "AS" (initials) or "ALI" (first 3 letters)
    expect(["AS", "ALI"]).toContain(trimmedNewAcronym);

    console.log(
      `✅ Acronym automatically updated from "${trimmedCurrentAcronym}" to "${trimmedNewAcronym}" when name changed to "${newName}"`
    );
  });

  test("should create unique acronym when worker has same acronym as existing worker", async ({
    page,
  }) => {
    // Create a second worker with the same initials (different name but would generate same acronym)
    const secondWorkerName = `Jane Davis ${
      test.info().workerIndex
    }-${Date.now()}`;
    const secondWorker = await workerTestBase.createTestWorker({
      name: secondWorkerName,
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    try {
      // Refresh the page to see both workers
      await page.reload();
      await page.waitForSelector('[aria-label="worker table"]');

      // Should now have 2 workers
      const workerRows = workerTestBase.getWorkerRows(page);
      await expect(workerRows).toHaveCount(2);

      // Check the acronyms in both rows
      const firstRowAcronymDisplay = workerTestBase.getWorkerAcronymDisplay(
        page,
        0
      );
      const secondRowAcronymDisplay = workerTestBase.getWorkerAcronymDisplay(
        page,
        1
      );

      // Get the actual acronym values
      const firstAcronym = await firstRowAcronymDisplay.textContent();
      const secondAcronym = await secondRowAcronymDisplay.textContent();

      const acronyms = [firstAcronym?.trim(), secondAcronym?.trim()];

      // Both should start with "J" (from John/Jane), but should be different
      // Could be "JOH"/"JAN", "JD"/"JD-2", etc. depending on implementation
      expect(acronyms[0]).not.toBe(acronyms[1]);

      // Both should have content
      expect(acronyms[0]).toBeTruthy();
      expect(acronyms[1]).toBeTruthy();

      console.log(
        `✅ Created unique acronyms: "${firstAcronym}" and "${secondAcronym}"`
      );
    } finally {
      // Clean up the second worker
      await workerTestBase.deleteTestWorker(secondWorker.workerId);
    }
  });

  test("should have empty acronym when worker name is empty", async ({
    page,
  }) => {
    // Skip this test for now - empty names might not be allowed by backend validation
    // This test needs to be revised based on actual backend behavior
    // test.skip();

    // Get the name and acronym cells
    const nameCell = workerTestBase.getWorkerNameCell(page);
    const acronymDisplay = workerTestBase.getWorkerAcronymDisplay(page);

    // Click on the name to edit it
    await nameCell.click();

    // Clear the name
    const nameInput = nameCell.locator("input");
    await expect(nameInput).toBeVisible();
    await nameInput.fill("");

    // Save the name change
    await nameInput.press("Enter");

    // Wait for the save operation to complete
    await page.waitForTimeout(500);

    // The name cell should display "Unnamed Worker" when the name is empty
    await expect(nameCell).toContainText("Unnamed Worker");

    // The acronym should be empty when the name is empty
    await expect(acronymDisplay).toBeVisible();
    const acronymText = await acronymDisplay.textContent();
    expect(acronymText?.trim()).toBe("");

    console.log("✅ Empty name displays 'Unnamed Worker' and acronym is empty");
  });

  test("should allow editing acronym by clicking on it", async ({ page }) => {
    // Get the acronym cell
    const acronymCell = workerTestBase.getWorkerAcronymCell(page);
    const acronymDisplay = workerTestBase.getWorkerAcronymDisplay(page);

    // Get the current acronym value (could be "JOH" or similar)
    const currentAcronym = await acronymDisplay.textContent();
    const trimmedCurrentAcronym = currentAcronym?.trim() || "";

    // Initially, the acronym should be displayed as text (not in an input field)
    await expect(acronymDisplay).toContainText(trimmedCurrentAcronym);

    // Click on the acronym to edit it
    await acronymCell.click();

    // After clicking, the acronym cell should contain an input field with the current acronym
    const acronymInput = workerTestBase.getWorkerAcronymInput(page);
    await expect(acronymInput).toBeVisible();
    await expect(acronymInput).toHaveValue(trimmedCurrentAcronym);

    // Clear the input and type a new acronym
    const newAcronym = "ABC";
    await acronymInput.fill(newAcronym);

    // Verify the input shows the new value
    await expect(acronymInput).toHaveValue(newAcronym);

    // Press Enter to save the changes
    await acronymInput.press("Enter");

    // Wait a moment for the save operation to complete
    await page.waitForTimeout(500);

    // After saving, the input should be replaced with text showing the new acronym
    await expect(acronymInput).not.toBeVisible();

    // The display should now show the updated acronym
    await expect(acronymDisplay).toContainText(newAcronym);

    console.log(
      `✅ Acronym updated from "${trimmedCurrentAcronym}" to "${newAcronym}"`
    );
  });

  test("should save acronym when clicking away (blur event)", async ({
    page,
  }) => {
    // Get the acronym cell
    const acronymCell = workerTestBase.getWorkerAcronymCell(page);
    const acronymDisplay = workerTestBase.getWorkerAcronymDisplay(page);

    // Click on the acronym to edit it
    await acronymCell.click();

    // Wait for the input field to appear
    const acronymInput = workerTestBase.getWorkerAcronymInput(page);
    await expect(acronymInput).toBeVisible();

    // Type a new acronym
    const newAcronym = "XYZ";
    await acronymInput.fill(newAcronym);

    // Click somewhere else to trigger blur event (save)
    // We'll click on the page title
    const pageTitle = page.getByRole("heading", { name: "Workers" });
    await pageTitle.click();

    // Wait a moment for the save operation to complete
    await page.waitForTimeout(500);

    // The acronym input should no longer be visible
    await expect(acronymInput).not.toBeVisible();

    // The acronym display should show the updated acronym
    await expect(acronymDisplay).toContainText(newAcronym);

    console.log(`✅ Acronym updated via blur event to "${newAcronym}"`);
  });

  test("should save acronym when Enter key is pressed", async ({ page }) => {
    // Get the acronym cell
    const acronymCell = workerTestBase.getWorkerAcronymCell(page);
    const acronymDisplay = workerTestBase.getWorkerAcronymDisplay(page);

    // Click on the acronym to edit it
    await acronymCell.click();

    // Wait for the input field to appear
    const acronymInput = workerTestBase.getWorkerAcronymInput(page);
    await expect(acronymInput).toBeVisible();

    // Type a new acronym
    const newAcronym = "DEF";
    await acronymInput.fill(newAcronym);

    // Press Enter to save
    await acronymInput.press("Enter");

    // Wait a moment for the save operation to complete
    await page.waitForTimeout(500);

    // The input should no longer be visible
    await expect(acronymInput).not.toBeVisible();

    // The acronym display should show the updated acronym
    await expect(acronymDisplay).toContainText(newAcronym);

    console.log(`✅ Acronym updated via Enter key to "${newAcronym}"`);
  });

  test("should cancel acronym editing if Escape key is pressed", async ({
    page,
  }) => {
    // Get the acronym cell
    const acronymCell = workerTestBase.getWorkerAcronymCell(page);
    const acronymDisplay = workerTestBase.getWorkerAcronymDisplay(page);

    // Get the current acronym value
    const currentAcronym = await acronymDisplay.textContent();
    const originalAcronym = currentAcronym?.trim() || "";

    // Click on the acronym to edit it
    await acronymCell.click();

    // Wait for the input field to appear
    const acronymInput = workerTestBase.getWorkerAcronymInput(page);
    await expect(acronymInput).toBeVisible();
    await expect(acronymInput).toHaveValue(originalAcronym);

    // Type a new acronym (but don't save it)
    const tempAcronym = "TEMP";
    await acronymInput.fill(tempAcronym);
    await expect(acronymInput).toHaveValue(tempAcronym);

    // Press Escape to cancel editing
    await acronymInput.press("Escape");

    // Wait a moment for the cancel operation to complete
    await page.waitForTimeout(500);

    // The input should no longer be visible
    await expect(acronymInput).not.toBeVisible();

    // The acronym display should still show the original acronym (not the temporary one)
    await expect(acronymDisplay).toContainText(originalAcronym);
    await expect(acronymDisplay).not.toContainText(tempAcronym);

    console.log(
      `✅ Acronym edit canceled, reverted to original: "${originalAcronym}"`
    );
  });

  test("should not auto-update acronym after manual edit when name changes", async ({
    page,
  }) => {
    // Get the name and acronym cells
    const nameCell = workerTestBase.getWorkerNameCell(page);
    const acronymCell = workerTestBase.getWorkerAcronymCell(page);
    const acronymDisplay = workerTestBase.getWorkerAcronymDisplay(page);

    // First, manually edit the acronym to make it "custom"
    await acronymCell.click();
    const acronymInput = workerTestBase.getWorkerAcronymInput(page);
    await expect(acronymInput).toBeVisible();

    const customAcronym = "CUSTOM";
    await acronymInput.fill(customAcronym);
    await acronymInput.press("Enter");

    // Wait for the save operation to complete
    await page.waitForTimeout(500);

    // Verify the custom acronym is saved
    await expect(acronymDisplay).toContainText(customAcronym);

    // Now change the worker's name to something with different initials
    await nameCell.click();
    const nameInput = nameCell.locator("input");
    await expect(nameInput).toBeVisible();

    const newName = "Bob Wilson"; // Should normally generate "BW"
    await nameInput.fill(newName);
    await nameInput.press("Enter");

    // Wait for the save operation to complete
    await page.waitForTimeout(500);

    // The acronym should still be "CUSTOM" and NOT "BW"
    await expect(acronymDisplay).toContainText(customAcronym);
    await expect(acronymDisplay).not.toContainText("BW");

    // Verify the name was actually updated
    await expect(nameCell).toContainText(newName);

    console.log(
      `✅ Acronym remained "${customAcronym}" after name change to "${newName}" (custom acronym preserved)`
    );
  });
});
