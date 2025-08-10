import { test, expect } from "@playwright/test";

test.describe("Teams Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    // This hook runs before each test in this suite
    // It's a good place to put common setup, like navigation
    await page.goto("http://localhost:3000/en/plan/settings/teams/");
    // Wait for the page to be loaded, e.g. a title or a key element
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
    await teamNameInput.fill("Test Team 1");
    await page.getByRole("button", { name: "Create" }).click();

    // Verify that the new team appears in the list
    const newTeam = page.getByText("Test Team 1");
    await expect(newTeam).toBeVisible();
  });

  test("should navigate to the team's schedule page when the team name is clicked", async ({
    page,
  }) => {
    // Click on the team name
    const teamName = page.getByText("Test Team 1");
    await teamName.click();

    // Verify that the URL has changed to the team's schedule page
    await expect(page).toHaveURL("http://localhost:3000/en/plan/schedule/");
  });

  test('should open the team settings when the "Settings" button is pressed', async ({
    page,
  }) => {
    // Click the "Settings" button for the team
    const settingsButton = page.getByRole("button", { name: "Settings" });
    await settingsButton.click();

    // Verify that the settings modal or page is displayed
    await expect(page).toHaveURL(
      /http:\/\/localhost:3000\/en\/plan\/teams\/general\/\?teamId=[a-f0-9]+/
    );
  });
});
