import { test, expect } from "@playwright/test";
import { DatabaseTestUtils } from "./utils/database-utils";
import { testConfig } from "./config/test-config";

const dbUtils = new DatabaseTestUtils();

test.describe.serial("Teams Settings Page with Database Reset", () => {
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
    // Reset database before each test for complete isolation
    try {
      const resetResult = await dbUtils.resetTeamRelatedData();
      console.log(`Database reset completed: ${resetResult.operation_id}`);
      console.log(
        `Reset collections: ${resetResult.collections_reset.join(", ")}`
      );
    } catch (error) {
      console.error("Database reset failed:", error);
      throw error;
    }
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the page using config
    await page.goto(`${testConfig.frontendUrl}/en/plan/settings/teams/`);
    // Wait for the page to be loaded
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();
  });

  test('should open the team creation form when the "New Team" button is pressed', async ({
    page,
  }) => {
    // Find the button using the recommended getByRole method
    const createTeamButton = page.getByRole("button", { name: "New Team" });

    // Use an assertion to wait for the button to be ready before clicking it
    await expect(createTeamButton).toBeEnabled();

    // Click the button
    await createTeamButton.click();

    // Add an assertion to verify the expected result, like a modal appearing
    const modalTitle = page.getByRole("heading", { name: "New team" });
    await expect(modalTitle).toBeVisible();
  });

  test('should create a new team when the "Create" button is pressed', async ({
    page,
  }) => {
    // Open the team creation form
    await page.getByRole("button", { name: "New Team" }).click();

    // Fill in the team name
    const teamNameInput = page.getByRole("textbox", { name: "Team name" });
    const uniqueTeamName = `Test Team ${test.info().workerIndex}-${Date.now()}`;
    await teamNameInput.fill(uniqueTeamName);
    await page.getByRole("button", { name: "Create" }).click();

    // Verify that the new team appears in the list
    const newTeam = page.getByText(uniqueTeamName, { exact: true });
    await expect(newTeam).toBeVisible();
  });

  test("should navigate to the team's schedule page when the team name is clicked", async ({
    page,
  }) => {
    // Create a unique team via API instead of UI
    const uniqueTeamName = `Test Team ${test.info().workerIndex}-${Date.now()}`;
    const testTeam = await dbUtils.createTeam({ name: uniqueTeamName });

    // Refresh the page to load the newly created team
    await page.reload();
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();

    // Wait for the team to appear in the UI
    const teamElement = page.getByText(testTeam.name, { exact: true });
    await expect(teamElement).toBeVisible();

    // Click on the team name and wait for navigation
    await Promise.all([
      page.waitForURL(`${testConfig.frontendUrl}/en/plan/schedule/`),
      teamElement.click(),
    ]);

    // Verify that the URL has changed to the team's schedule page (no teamId in URL)
    await expect(page).toHaveURL(`${testConfig.frontendUrl}/en/plan/schedule/`);
  });

  test('should open the team settings when the "Settings" button is pressed', async ({
    page,
  }) => {
    // Create a team via API instead of UI
    // Create a unique team name per browser worker
    const uniqueTeamName = `Test Team ${test.info().workerIndex}-${Date.now()}`;
    const testTeam = await dbUtils.createTeam({ name: uniqueTeamName });

    // Refresh the page to load the newly created team
    await page.reload();
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();

    // Wait for the team to appear in the UI
    const teamElement = page.getByText(testTeam.name, { exact: true });
    await expect(teamElement).toBeVisible();

    // Scope the Settings button to the correct team list item
    const teamListItem = page.locator(".teams-list-item").filter({
      has: teamElement,
    });
    const settingsButton = teamListItem.getByRole("button", {
      name: "Settings",
    });
    await Promise.all([
      page.waitForURL(
        new RegExp(
          `${testConfig.frontendUrl.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}/en/plan/teams/general/\\?teamId=[a-f0-9]+`
        )
      ),
      settingsButton.click(),
    ]);

    // Verify that the settings page is displayed with correct teamId
    await expect(page).toHaveURL(
      new RegExp(
        `${testConfig.frontendUrl.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )}/en/plan/teams/general/\\?teamId=[a-f0-9]+`
      )
    );

    // Optional: Verify the team ID in URL matches the created team
    const url = page.url();
    const teamIdFromUrl = new URL(url).searchParams.get("teamId");
    expect(teamIdFromUrl).toBe(testTeam.teamId);
  });

  //   test("should show isolated test data across test runs", async ({ page }) => {
  //     // This test verifies that database reset is working properly
  //     // by ensuring we start with a clean state

  //     // Check that there are no existing teams
  //     const teamsList = page.locator('[data-testid="teams-list"]');

  //     // If teams list exists, it should be empty or show "no teams" message
  //     if (await teamsList.isVisible()) {
  //       const teamsCount = await teamsList
  //         .locator('[data-testid="team-item"]')
  //         .count();
  //       expect(teamsCount).toBe(0);
  //     }

  //     // Create a team to verify the page works correctly
  //     await page.getByRole("button", { name: "New Team" }).click();
  //     const teamNameInput = page.getByRole("textbox", { name: "Team name" });
  //     await teamNameInput.fill("Isolated Test Team");
  //     await page.getByRole("button", { name: "Create" }).click();

  //     // Verify the team was created
  //     await expect(page.getByText("Isolated Test Team")).toBeVisible();
  //   });
});

// test.describe("Database Reset Utilities", () => {
//   test("should be able to preview reset operations", async () => {
//     // Test the dry run functionality
//     const dryRunResult = await dbUtils.dryRunReset();

//     expect(dryRunResult.dry_run).toBe(true);
//     expect(Array.isArray(dryRunResult.collections_to_reset)).toBe(true);
//     expect(typeof dryRunResult.total_count).toBe("number");

//     console.log(
//       `Would reset ${dryRunResult.total_count} collections:`,
//       dryRunResult.collections_to_reset.join(", ")
//     );
//   });

//   test("should be able to reset specific collections", async () => {
//     const result = await dbUtils.resetDatabase({
//       collections: ["teams", "users"],
//       preserveSystemData: true,
//     });

//     expect(result.success).toBe(true);
//     expect(result.collections_reset).toContain("teams");
//     expect(result.collections_reset).toContain("users");
//     expect(result.operation_id).toBeTruthy();

//     console.log(
//       `Reset operation ${result.operation_id} completed successfully`
//     );
//   });

//   test("should maintain health check", async () => {
//     const health = await dbUtils.checkHealth();

//     expect(health.status).toBe("healthy");
//     expect(health.test_utilities_available).toBe(true);
//   });
// });
