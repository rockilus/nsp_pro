import { test, expect } from '@playwright/test';
import { DatabaseTestUtils } from '../../../utils/database-utils';
import { testConfig } from '../../../utils/test-config';

const dbUtils = new DatabaseTestUtils();

test.describe('Teams Settings Page with Database Reset', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the page using config
    await page.goto(`${testConfig.frontendUrl}/en/plan/settings/teams/`);
    // Wait for the page to be loaded
    await expect(page.locator('[data-testid="teams-page-heading"]')).toBeVisible();
  });

  test('should open the team creation form when the "New Team" button is pressed', async ({
    page,
  }) => {
    // Find the button using the recommended getByRole method
    const createTeamButton = page.getByRole('button', { name: 'New Team' });

    // Use an assertion to wait for the button to be ready before clicking it
    await expect(createTeamButton).toBeEnabled();

    // Click the button
    await createTeamButton.click();

    // Add an assertion to verify the expected result, like a modal appearing
    const modalTitle = page.getByRole('heading', { name: 'New team' });
    await expect(modalTitle).toBeVisible();
  });

  test('should create a new team when the "Create" button is pressed', async ({ page }) => {
    // Open the team creation form
    await page.getByRole('button', { name: 'New Team' }).click();

    // Fill in the team name
    const teamNameInput = page.getByRole('textbox', { name: 'Team name' });
    const uniqueTeamName = `Test Team ${test.info().workerIndex}-${Date.now()}`;
    await teamNameInput.fill(uniqueTeamName);

    // Wait for the API request to complete when clicking Create
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(`${testConfig.apiUrl}/teams`) &&
          response.request().method() === 'POST' &&
          response.status() === 200,
      ),
      page.getByRole('button', { name: 'Create' }).click(),
    ]);

    // Wait for the modal to close (indicates creation completed)
    const modalTitle = page.getByRole('heading', { name: 'New team' });
    await expect(modalTitle).not.toBeVisible();

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
    await expect(page.locator('[data-testid="teams-page-heading"]')).toBeVisible();

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

  test('should create a new team and select it', async ({ page }) => {
    // Open the team creation form
    await page.getByRole('button', { name: 'New Team' }).click();

    // Fill in the team name
    const teamNameInput = page.getByRole('textbox', { name: 'Team name' });
    const uniqueTeamName = `Test Team ${test.info().workerIndex}-${Date.now()}`;
    await teamNameInput.fill(uniqueTeamName);

    // Wait for the API request to complete when clicking Create
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(`${testConfig.apiUrl}/teams`) &&
          response.request().method() === 'POST' &&
          response.status() === 200,
      ),
      page.getByRole('button', { name: 'Create' }).click(),
    ]);

    // Wait for the modal to close (indicates creation completed)
    const modalTitle = page.getByRole('heading', { name: 'New team' });
    await expect(modalTitle).not.toBeVisible();

    // Verify that the new team appears in the list
    const newTeam = page.getByText(uniqueTeamName, { exact: true });
    await expect(newTeam).toBeVisible();

    // Click on the team name and wait for navigation
    await Promise.all([
      page.waitForURL(`${testConfig.frontendUrl}/en/plan/schedule/`),
      newTeam.click(),
    ]);

    // Verify that the URL has changed to the team's schedule page (no teamId in URL)
    await expect(page).toHaveURL(`${testConfig.frontendUrl}/en/plan/schedule/`);

    // Verify schedule option is visible in the nav bar
    const scheduleNavLink = page.locator('[data-testid="nav-link-schedule"]');
    await expect(scheduleNavLink).toBeVisible();

    // Verify that the no assignments display for owner is visible
    const noAssignmentsDisplay = page.locator('[data-testid="no-assignments-display-owner"]');
    await expect(noAssignmentsDisplay).toBeVisible();
  });

  test('should open the team settings when the "Settings" button is pressed', async ({ page }) => {
    // Create a team via API instead of UI
    // Create a unique team name per browser worker
    const uniqueTeamName = `Test Team ${test.info().workerIndex}-${Date.now()}`;
    const testTeam = await dbUtils.createTeam({ name: uniqueTeamName });

    // Refresh the page to load the newly created team
    await page.reload();
    await expect(page.locator('[data-testid="teams-page-heading"]')).toBeVisible();

    // Wait for the team to appear in the UI
    const teamElement = page.getByText(testTeam.name, { exact: true });
    await expect(teamElement).toBeVisible();

    // Scope the Settings button to the correct team list item
    const teamListItem = page.locator('.teams-list-item').filter({
      has: teamElement,
    });
    const settingsButton = teamListItem.getByRole('button', {
      name: 'Settings',
    });
    await Promise.all([
      page.waitForURL(
        new RegExp(
          `${testConfig.frontendUrl.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&',
          )}/en/plan/teams/general/\\?teamId=[a-f0-9]+`,
        ),
      ),
      settingsButton.click(),
    ]);

    // Verify that the settings page is displayed with correct teamId
    await expect(page).toHaveURL(
      new RegExp(
        `${testConfig.frontendUrl.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        )}/en/plan/teams/general/\\?teamId=[a-f0-9]+`,
      ),
    );

    // Optional: Verify the team ID in URL matches the created team
    const url = page.url();
    const teamIdFromUrl = new URL(url).searchParams.get('teamId');
    expect(teamIdFromUrl).toBe(testTeam.teamId);
  });

  // test("should redirect to teams page if no team is selected and user tries to access schedule", async ({
  //   page,
  // }) => {
  //   // Attempt to navigate directly to the schedule page without a team
  //   await page.goto(`${testConfig.frontendUrl}/en/plan/schedule/`);

  //   // Clear any selected team from localStorage to simulate no team selected
  //   await page.evaluate(() => localStorage.removeItem("selectedTeamId"));

  //   // Refresh the page to trigger the redirect logic
  //   await page.reload();

  //   // Verify that we are redirected to the teams settings page
  //   await expect(page).toHaveURL(
  //     `${testConfig.frontendUrl}/en/plan/settings/teams/`,
  //   );

  //   // Verify that the teams page heading is visible
  //   const heading = page.getByTestId("teams-page-heading");
  //   await expect(heading).toBeVisible();
  // });

  test('should redirect to teams page if selected team id is invalid and user tries to access schedule', async ({
    page,
  }) => {
    // Set an invalid team ID in localStorage
    await page.evaluate(() => localStorage.setItem('selectedTeamId', 'invalid-team-id'));

    // Attempt to navigate directly to the schedule page
    await page.goto(`${testConfig.frontendUrl}/en/plan/schedule/`);

    // Verify that we are redirected to the teams settings page
    await expect(page).toHaveURL(`${testConfig.frontendUrl}/en/plan/settings/teams/`);

    // Verify that the teams page heading is visible
    const heading = page.getByTestId('teams-page-heading');
    await expect(heading).toBeVisible();
  });

  test('should redirect to teams page if no team correspond to selected team id', async ({
    page,
  }) => {
    // Set an invalid team ID in localStorage
    await page.evaluate(() => localStorage.setItem('selectedTeamId', '6997559c394575f0483cc827'));

    // Attempt to navigate directly to the schedule page
    await page.goto(`${testConfig.frontendUrl}/en/plan/schedule/`);

    // Verify that we are redirected to the teams settings page
    await expect(page).toHaveURL(`${testConfig.frontendUrl}/en/plan/settings/teams/`);

    // Verify that the teams page heading is visible
    const heading = page.getByTestId('teams-page-heading');
    await expect(heading).toBeVisible();
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
