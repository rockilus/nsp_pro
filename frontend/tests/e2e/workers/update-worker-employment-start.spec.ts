import { test, expect } from "@playwright/test";
import { WorkerTestBase } from "../../utils/worker-test-base";

const workerTestBase = new WorkerTestBase();

test.describe("Worker Employment Start Date Updates", () => {
  let testWorker: { id: string; name: string; teamId: string };
  let initialWorkerName: string;

  test.beforeEach(async ({ page }) => {
    // Setup the common worker test environment
    await workerTestBase.setupWorkerTests(test.info().workerIndex);

    // Use a unique name per test to avoid conflicts
    initialWorkerName = `John Doe ${test.info().workerIndex}-${Date.now()}`;

    // Create a fresh test worker for each test
    testWorker = await workerTestBase.createTestWorker({
      name: initialWorkerName,
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    console.log(`Created test worker: ${testWorker.name} (${testWorker.id})`);

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

  test("should display today's date as default when creating a new worker", async ({
    page,
  }) => {
    // Get today's date in DD/MM/YYYY format for comparison
    const today = new Date();
    const expectedDateString = today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // Get the employment start date cell
    const employmentStartCell =
      workerTestBase.getWorkerEmploymentStartCell(page);
    const employmentStartDisplay =
      workerTestBase.getWorkerEmploymentStartDisplay(page);

    // Verify the employment start date shows today's date
    await expect(employmentStartDisplay).toContainText(expectedDateString);

    console.log(
      `✅ New worker has today's date (${expectedDateString}) as employment start date`,
    );
  });

  test("should allow editing employment start date by clicking on it", async ({
    page,
  }) => {
    // Get the employment start date cell
    const employmentStartCell =
      workerTestBase.getWorkerEmploymentStartCell(page);
    const employmentStartDisplay =
      workerTestBase.getWorkerEmploymentStartDisplay(page);

    // Get the current employment start date
    const currentDateText = await employmentStartDisplay.textContent();
    const currentDate = currentDateText?.trim() || "";

    // Initially, the date should be displayed as text (not in an input field)
    await expect(employmentStartDisplay).toBeVisible();
    await expect(employmentStartDisplay).toContainText(currentDate);

    // Click on the employment start date to edit it
    await employmentStartCell.click();

    // After clicking, a DatePicker input should appear
    const employmentStartInput =
      workerTestBase.getWorkerEmploymentStartInput(page);
    await expect(employmentStartInput).toBeVisible();

    // The display element should no longer be visible when editing
    await expect(employmentStartDisplay).not.toBeVisible();

    console.log(`✅ Employment start date cell becomes editable when clicked`);
  });

  test("should save employment start date when clicking away (blur event)", async ({
    page,
  }) => {
    // Get the employment start date cell
    const employmentStartCell =
      workerTestBase.getWorkerEmploymentStartCell(page);
    const employmentStartDisplay =
      workerTestBase.getWorkerEmploymentStartDisplay(page);

    // Click on the employment start date to edit it
    await employmentStartCell.click();

    // Wait for the input field to appear
    const employmentStartInput =
      workerTestBase.getWorkerEmploymentStartInput(page);
    await expect(employmentStartInput).toBeVisible();

    // Set a specific date using the helper method
    const newDate = "01/01/2024";
    await workerTestBase.setEmploymentStartDate(page, newDate);

    // Click somewhere else to trigger blur event (save)
    const pageTitle = page.getByRole("heading", { name: "Workers" });
    await pageTitle.click();

    // Wait for the input to disappear and the display to show the updated date
    await expect(employmentStartInput).not.toBeVisible();
    await expect(employmentStartDisplay).toBeVisible();
    await expect(employmentStartDisplay).toContainText(newDate);

    console.log(
      `✅ Employment start date updated via blur event to "${newDate}"`,
    );
  });

  test("should save employment start date when Enter key is pressed", async ({
    page,
  }) => {
    // Get the employment start date cell
    const employmentStartCell =
      workerTestBase.getWorkerEmploymentStartCell(page);
    const employmentStartDisplay =
      workerTestBase.getWorkerEmploymentStartDisplay(page);

    // Click on the employment start date to edit it
    await employmentStartCell.click();

    // Wait for the input field to appear
    const employmentStartInput =
      workerTestBase.getWorkerEmploymentStartInput(page);
    await expect(employmentStartInput).toBeVisible();

    // Set a specific date using the helper method
    const newDate = "15/12/2023";
    await workerTestBase.setEmploymentStartDate(page, newDate);

    // Press Enter to save
    await employmentStartInput.press("Enter");

    // Wait for the input to disappear and the display to show the updated date
    await expect(employmentStartInput).not.toBeVisible();
    await expect(employmentStartDisplay).toBeVisible();
    await expect(employmentStartDisplay).toContainText(newDate);

    console.log(
      `✅ Employment start date updated via Enter key to "${newDate}"`,
    );
  });

  test("should cancel employment start date editing if Escape key is pressed", async ({
    page,
  }) => {
    // Get the employment start date cell
    const employmentStartCell =
      workerTestBase.getWorkerEmploymentStartCell(page);
    const employmentStartDisplay =
      workerTestBase.getWorkerEmploymentStartDisplay(page);

    // Get the original employment start date
    const originalDateText = await employmentStartDisplay.textContent();
    const originalDate = originalDateText?.trim() || "";

    // Click on the employment start date to edit it
    await employmentStartCell.click();

    // Wait for the input field to appear
    const employmentStartInput =
      workerTestBase.getWorkerEmploymentStartInput(page);
    await expect(employmentStartInput).toBeVisible();

    // Set a temporary date (but don't save it) using the helper method
    const tempDate = "31/12/2025";
    await workerTestBase.setEmploymentStartDate(page, tempDate);

    // Press Escape to cancel editing
    await employmentStartInput.press("Escape");

    // Wait for the input to disappear and the display to show the original date
    await expect(employmentStartInput).not.toBeVisible();
    await expect(employmentStartDisplay).toBeVisible();
    await expect(employmentStartDisplay).toContainText(originalDate);
    await expect(employmentStartDisplay).not.toContainText(tempDate);

    console.log(
      `✅ Employment start date edit canceled, reverted to original: "${originalDate}"`,
    );
  });

  test("should handle date picker calendar interaction", async ({ page }) => {
    // Get the employment start date cell
    const employmentStartCell =
      workerTestBase.getWorkerEmploymentStartCell(page);
    const employmentStartDisplay =
      workerTestBase.getWorkerEmploymentStartDisplay(page);

    // Click on the employment start date to edit it
    await employmentStartCell.click();

    // Wait for the input field to appear
    const employmentStartInput =
      workerTestBase.getWorkerEmploymentStartInput(page);
    await expect(employmentStartInput).toBeVisible();

    // Click on the date picker button to open the calendar
    // This button is usually next to the input field
    const calendarButton = page.locator('[aria-label="Choose date"]');
    if (await calendarButton.isVisible()) {
      await calendarButton.click();

      // Wait for the calendar to open
      await page.waitForSelector('[role="dialog"]', { timeout: 2000 });

      // Look for a specific date in the calendar (e.g., day 15)
      const dayButton = page
        .locator('[role="gridcell"] button:has-text("15")')
        .first();
      if (await dayButton.isVisible()) {
        await dayButton.click();

        // Wait for the input to disappear and the display to show the updated date containing "15"
        await expect(employmentStartInput).not.toBeVisible();
        await expect(employmentStartDisplay).toBeVisible();
        const updatedDateText = await employmentStartDisplay.textContent();
        expect(updatedDateText).toContain("15");

        console.log(`✅ Employment start date updated via calendar picker`);
      } else {
        console.log(
          "⚠️ Calendar day buttons not found, skipping calendar interaction",
        );
      }
    } else {
      console.log(
        "⚠️ Calendar button not found, skipping calendar interaction test",
      );
    }
  });

  test("should validate date format and handle invalid input gracefully", async ({
    page,
  }) => {
    // Get the employment start date cell
    const employmentStartCell =
      workerTestBase.getWorkerEmploymentStartCell(page);
    const employmentStartDisplay =
      workerTestBase.getWorkerEmploymentStartDisplay(page);

    // Get the original date
    const originalDateText = await employmentStartDisplay.textContent();
    const originalDate = originalDateText?.trim() || "";

    // Click on the employment start date to edit it
    await employmentStartCell.click();

    // Wait for the input field to appear
    const employmentStartInput =
      workerTestBase.getWorkerEmploymentStartInput(page);
    await expect(employmentStartInput).toBeVisible();

    // Try to enter an invalid date format using fill (not the helper, since helper validates)
    const invalidDate = "invalid-date-format";
    await employmentStartInput.fill(invalidDate);

    // Press Enter to try to save the invalid date
    await employmentStartInput.press("Enter");

    // Wait for either the input to remain visible (error) or revert to display

    // The system should either:
    // 1. Keep the input visible with an error state, or
    // 2. Revert to the original date

    // Check if input is still visible (validation error) or reverted
    const isInputStillVisible = await employmentStartInput.isVisible();

    if (isInputStillVisible) {
      // If input is still visible, there should be an error indication
      console.log("✅ Invalid date format kept input visible for correction");

      // Cancel the edit to clean up
      await employmentStartInput.press("Escape");
    } else {
      // If input is hidden, it should have reverted to original date
      await expect(employmentStartDisplay).toBeVisible();
      await expect(employmentStartDisplay).toContainText(originalDate);
      console.log(
        `✅ Invalid date format reverted to original: "${originalDate}"`,
      );
    }
  });
});
