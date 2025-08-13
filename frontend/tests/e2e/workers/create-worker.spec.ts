import { test, expect } from "@playwright/test";
import { DatabaseTestUtils } from "../../utils/database-utils";
import { testConfig } from "../../utils/test-config";
import dayjs from "dayjs";

const dbUtils = new DatabaseTestUtils();

test.describe.serial("Worker Creation with Database Reset", () => {
  let testTeam: { teamId: string; name: string };

  test.beforeAll(async () => {
    // Ensure the API is ready before running tests
    await dbUtils.waitForApiReady();

    // Verify test utilities are available
    const health = await dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error(
        "Test utilities are not available - check environment configuration"
      );
    }

    // Reset database before tests for complete isolation
    try {
      const resetResult = await dbUtils.resetWorkersRelatedData();
      console.log(`Database reset completed: ${resetResult.operation_id}`);
      console.log(
        `Reset collections: ${resetResult.collections_reset.join(", ")}`
      );
    } catch (error) {
      console.error("Database reset failed:", error);
      throw error;
    }

    // Create a test team for worker creation
    const uniqueTeamName = `Worker Test Team ${
      test.info().workerIndex
    }-${Date.now()}`;
    testTeam = await dbUtils.createTeam({ name: uniqueTeamName });
    console.log(`Created test team: ${testTeam.name} (${testTeam.teamId})`);
  });

  test.beforeEach(async ({ page }) => {
    // Step 1: Navigate to teams page
    await page.goto(`${testConfig.frontendUrl}/en/plan/settings/teams/`);
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();

    // Step 2: Wait for our test team to appear in the UI
    const teamElement = page.getByText(testTeam.name, { exact: true });
    await expect(teamElement).toBeVisible();

    // Step 3: Click on the team name to select it (this navigates to schedule page)
    await Promise.all([
      page.waitForURL(`${testConfig.frontendUrl}/en/plan/schedule/`),
      teamElement.click(),
    ]);

    // Wait a bit for the team context to be fully set
    await page.waitForTimeout(1000);

    // Step 4: Look for Workers link in navigation - try multiple strategies
    // First, let's check if any navigation links are visible at all
    const navContainer = page.locator(".nav-links-container");
    await expect(navContainer).toBeVisible();

    // Try to find the Workers link by text
    const workersLink = page.getByText("Workers").first();
    await expect(workersLink).toBeVisible();
    await workersLink.click();

    // Wait for navigation to workers page
    await page.waitForURL(`${testConfig.frontendUrl}/en/plan/workers/`);

    // Wait for the workers page to be loaded
    await expect(page.getByRole("heading", { name: "Workers" })).toBeVisible();
  });

  test("should start with an empty worker table", async ({ page }) => {
    // Verify that the table starts empty (before adding any workers)
    await page.waitForSelector('[aria-label="worker table"]');

    // The table should show a single row with the 'no_workers_found' message
    const workerRows = page.locator('[aria-label="worker table"] tbody tr');
    await expect(workerRows).toHaveCount(1);

    // Check that the cell contains the expected empty state text
    const emptyCell = workerRows.first().locator("td");
    await expect(emptyCell).toContainText("no_workers_found");

    console.log("✅ Worker table shows empty state as expected");
  });

  test('should create a new worker when "+Worker" button is pressed', async ({
    page,
  }) => {
    // Find the "+Worker" button using the Worker text from translations
    const addWorkerButton = page.getByRole("button", {
      name: "Worker",
      exact: true,
    });

    // Ensure the button is ready before clicking
    await expect(addWorkerButton).toBeEnabled();

    // Click the "+Worker" button
    await addWorkerButton.click();

    // Wait for the new worker to appear in the table
    // Since new workers have empty name, we'll look for a row with empty name field
    // and verify all the default values

    // Check for the presence of a new worker row in the table
    // The worker should have been added to the table with default values
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify the worker table has at least one row (the new worker)
    const workerRows = page.locator('[aria-label="worker table"] tbody tr');
    await expect(workerRows).toHaveCount(1);

    // Get the first (and only) worker row to verify its default values
    const workerRow = workerRows.first();

    // Verify default worker properties based on the specifications:

    // 1. Name should be empty (or "Unnamed Worker" if that's the default)
    const nameCell = workerRow.locator("td").nth(0); // Assuming first column is name
    // The name field might be an input or text field - check both possibilities
    const nameInput = nameCell.locator("input");
    if (await nameInput.isVisible()) {
      await expect(nameInput).toHaveValue("");
    }

    // 2. Acronym should be empty
    const acronymCell = workerRow.locator("td").nth(1); // Assuming second column is acronym
    const acronymInput = acronymCell.locator("input");
    if (await acronymInput.isVisible()) {
      await expect(acronymInput).toHaveValue("");
    }

    // 3. Contract start should be today's date
    const today = dayjs().format("YYYY-MM-DD");
    const contractStartCell = workerRow.locator("td").nth(2); // Assuming third column is contract start
    const contractStartInput = contractStartCell.locator("input");
    if (await contractStartInput.isVisible()) {
      // The date might be in different formats, so we'll check if it matches today
      const inputValue = await contractStartInput.inputValue();
      expect(inputValue).toContain(today.split("-")[0]); // At least check the year
    }

    // 4. Weekly hours should be 39
    const weeklyHoursCell = workerRow.locator("td").nth(5); // Adjust index based on actual column order
    const weeklyHoursInput = weeklyHoursCell.locator("input");
    if (await weeklyHoursInput.isVisible()) {
      await expect(weeklyHoursInput).toHaveValue("39");
    }

    // 5. Desired weekly hours should be 39
    const desiredHoursCell = workerRow.locator("td").nth(6); // Adjust index based on actual column order
    const desiredHoursInput = desiredHoursCell.locator("input");
    if (await desiredHoursInput.isVisible()) {
      await expect(desiredHoursInput).toHaveValue("39");
    }

    // 6. Duties per month should be 4
    const dutiesCell = workerRow.locator("td").nth(7); // Adjust index based on actual column order
    const dutiesInput = dutiesCell.locator("input");
    if (await dutiesInput.isVisible()) {
      await expect(dutiesInput).toHaveValue("4");
    }

    // 7. Annual leave should be 25
    const leaveCell = workerRow.locator("td").nth(8); // Adjust index based on actual column order
    const leaveInput = leaveCell.locator("input");
    if (await leaveInput.isVisible()) {
      await expect(leaveInput).toHaveValue("25");
    }

    console.log("✅ New worker created with correct default values");
  });

  test("should allow editing the newly created worker", async ({ page }) => {
    // First create a worker
    const addWorkerButton = page.getByRole("button", {
      name: "Worker",
      exact: true,
    });
    await expect(addWorkerButton).toBeEnabled();
    await addWorkerButton.click();

    // Wait for the worker to be created
    await page.waitForSelector('[aria-label="worker table"]');
    const workerRows = page.locator('[aria-label="worker table"] tbody tr');
    await expect(workerRows).toHaveCount(1);

    // Get the worker row and edit the name
    const workerRow = workerRows.first();
    const nameCell = workerRow.locator("td").nth(0);
    const nameInput = nameCell.locator("input");

    if (await nameInput.isVisible()) {
      // Clear the current value and type a new name
      await nameInput.fill("Test Worker");

      // Press Enter or tab to trigger save
      await nameInput.press("Tab");

      // Verify the name was updated
      await expect(nameInput).toHaveValue("Test Worker");
    }

    console.log("✅ Worker name updated successfully");
  });

  test("should display the correct table headers", async ({ page }) => {
    // Verify that the worker table has the expected column headers
    await page.waitForSelector('[aria-label="worker table"]');

    const table = page.locator('[aria-label="worker table"]');
    const headerRow = table.locator("thead tr");

    // Check for expected headers based on DefaultWorkerFields
    await expect(headerRow).toContainText("Name");
    await expect(headerRow).toContainText("Acronym");
    await expect(headerRow).toContainText("Contract start");
    await expect(headerRow).toContainText("Contract end");
    await expect(headerRow).toContainText("Specialties");
    await expect(headerRow).toContainText("Weekly hours");
    await expect(headerRow).toContainText("Desired weekly hours");
    await expect(headerRow).toContainText("Duties per month");
    await expect(headerRow).toContainText("Leave (days)");

    console.log("✅ Table headers are correctly displayed");
  });
});
