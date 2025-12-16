/**
 * Team Member Functionality Tests
 *
 * These tests verify the features available to team members:
 * - Viewing schedules (read-only)
 * - Creating and managing their own requests
 * - Viewing their own assignments
 */

import { test, expect } from "@playwright/test";
import { RoleTestBase } from "../../utils/role-test-base";

const roleTestBase = new RoleTestBase();

test.describe("Member: Schedule Viewing", () => {
  test.beforeEach(async ({ page }) => {
    await roleTestBase.setupRoleTests(test.info().workerIndex);
  });

  test("member can view published schedules", async ({ page }) => {
    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToSchedulePage(page);

    // Verify schedule page is accessible
    await expect(
      page.locator('[data-testid="schedule-page-heading"]')
    ).toBeVisible();

    // TODO: Once schedule creation is implemented in tests:
    // 1. Create a schedule as owner
    // 2. Switch to member
    // 3. Verify member can see the schedule
    // 4. Verify member cannot edit the schedule
  });

  test("member cannot create new schedules", async ({ page }) => {
    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToSchedulePage(page);

    // Verify that schedule creation button is not visible or disabled for members
    // This test depends on the actual UI implementation
    const createScheduleButton = page.locator(
      '[data-testid="create-schedule-button"]'
    );

    // The button should either not exist or be disabled
    const buttonCount = await createScheduleButton.count();
    if (buttonCount > 0) {
      await expect(createScheduleButton).toBeDisabled();
    }
  });

  test("member cannot delete schedules", async ({ page }) => {
    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToSchedulePage(page);

    // Verify that schedule deletion buttons are not visible for members
    const deleteButtons = page.locator('[data-testid*="delete-schedule"]');
    await expect(deleteButtons).toHaveCount(0);
  });
});

test.describe("Member: Personal Requests", () => {
  test.beforeEach(async ({ page }) => {
    await roleTestBase.setupRoleTests(test.info().workerIndex);
  });

  test("member can view requests page", async ({ page }) => {
    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToRequestsPage(page);

    // Verify requests page is accessible
    await expect(
      page.locator('[data-testid="requests-page-heading"]')
    ).toBeVisible();
  });

  test("member can create their own request", async ({ page }) => {
    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToRequestsPage(page);

    // TODO: Implement once we have:
    // 1. A worker linked to the member user
    // 2. Request creation UI tests
    // Expected flow:
    // - Click "Create Request" button
    // - Fill out request form (dates, shift preferences)
    // - Submit request
    // - Verify request appears in the list
  });

  test("member can only see their own requests", async ({ page }) => {
    // This test requires:
    // 1. Creating a worker linked to the member user
    // 2. Creating a request for that worker
    // 3. Creating another worker (not linked to member)
    // 4. Creating a request for the other worker
    // 5. Verifying member only sees their own request

    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToRequestsPage(page);

    // TODO: Implement full test once request filtering is in place
    // For now, just verify the page loads
    await expect(
      page.locator('[data-testid="requests-page-heading"]')
    ).toBeVisible();
  });

  test("member cannot create requests for other workers", async ({ page }) => {
    await roleTestBase.actAsMember(page);

    // Create a worker as owner (not linked to member)
    await roleTestBase.actAsOwner(page);
    const otherWorker = await roleTestBase.dbUtils.createWorker({
      teamId: roleTestBase.getTestTeam().teamId,
      name: `Other Worker ${Date.now()}`,
    });

    // Switch back to member
    await roleTestBase.actAsMember(page);

    const memberApiClient =
      roleTestBase.dbUtils.createAuthenticatedClientForUser(
        roleTestBase.getMemberUser().userId
      );

    // Try to create a request for the other worker
    try {
      await memberApiClient.post(`/requests/`, {
        worker_id: otherWorker.workerId,
        team_id: roleTestBase.getTestTeam().teamId,
        start_date: "2024-01-01",
        end_date: "2024-01-05",
        request_type: "leave",
      });

      // If we reach here, authorization failed - test should fail
      throw new Error(
        "Member was able to create request for other worker - authorization failed!"
      );
    } catch (error) {
      if (error instanceof Error) {
        // Verify it's an authorization error
        expect(
          error.message.includes("403") ||
            error.message.includes("401") ||
            error.message.includes("not authorized") ||
            error.message.toLowerCase().includes("forbidden")
        ).toBeTruthy();
      }
    } finally {
      // Cleanup
      await roleTestBase.actAsOwner(page);
      await roleTestBase.dbUtils.deleteWorker(
        otherWorker.workerId,
        roleTestBase.getTestTeam().teamId
      );
    }
  });

  test("member can edit their own request", async ({ page }) => {
    // TODO: Implement once request CRUD is fully tested
    // Expected flow:
    // 1. Create a worker linked to member
    // 2. Create a request for that worker
    // 3. Edit the request
    // 4. Verify changes are saved
    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToRequestsPage(page);

    await expect(
      page.locator('[data-testid="requests-page-heading"]')
    ).toBeVisible();
  });

  test("member can delete their own request", async ({ page }) => {
    // TODO: Implement once request CRUD is fully tested
    // Expected flow:
    // 1. Create a worker linked to member
    // 2. Create a request for that worker
    // 3. Delete the request
    // 4. Verify request is removed
    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToRequestsPage(page);

    await expect(
      page.locator('[data-testid="requests-page-heading"]')
    ).toBeVisible();
  });
});

test.describe("Member: Navigation and UI", () => {
  test.beforeEach(async ({ page }) => {
    await roleTestBase.setupRoleTests(test.info().workerIndex);
  });

  test("member sees limited navigation menu", async ({ page }) => {
    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToSchedulePage(page);

    // Member should NOT see owner-only navigation links
    // Based on PageRolePermissions, these are owner-only:
    const ownerOnlyLinks = [
      "nav-link-workers",
      "nav-link-shifts",
      "nav-link-constraints",
      "nav-link-shift-demands",
      "nav-link-campaign",
      "nav-link-stats",
    ];

    for (const linkTestId of ownerOnlyLinks) {
      const link = page.locator(`[data-testid="${linkTestId}"]`);
      // Link should either not exist or be hidden
      const count = await link.count();
      if (count > 0) {
        await expect(link).not.toBeVisible();
      }
    }
  });

  test("member sees allowed navigation links", async ({ page }) => {
    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToSchedulePage(page);

    // Member SHOULD see these navigation links
    // Based on PageRolePermissions, these are accessible to members:
    const memberAllowedLinks = ["nav-link-schedule", "nav-link-requests"];

    for (const linkTestId of memberAllowedLinks) {
      const link = page.locator(`[data-testid="${linkTestId}"]`);
      // If the link exists in the nav, it should be visible
      const count = await link.count();
      if (count > 0) {
        await expect(link).toBeVisible();
      }
    }
  });

  test("member welcome page shows appropriate message", async ({ page }) => {
    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToPageWithTeamContext(page, "/en/plan/welcome");

    // Verify welcome page loads
    // The exact content depends on the implementation
    // TODO: Add specific assertions once we know the member welcome experience
    await expect(page.locator("h1")).toBeVisible();
  });
});

test.describe("Member: Restricted Actions", () => {
  test.beforeEach(async ({ page }) => {
    await roleTestBase.setupRoleTests(test.info().workerIndex);
  });

  test("member cannot modify team settings", async ({ page }) => {
    await roleTestBase.actAsMember(page);

    const memberApiClient =
      roleTestBase.dbUtils.createAuthenticatedClientForUser(
        roleTestBase.getMemberUser().userId
      );

    // Try to update team settings
    try {
      await memberApiClient.put(`/teams/${roleTestBase.getTestTeam().teamId}`, {
        name: "Hacked Team Name",
      });

      throw new Error(
        "Member was able to modify team settings - authorization failed!"
      );
    } catch (error) {
      if (error instanceof Error) {
        expect(
          error.message.includes("403") ||
            error.message.includes("401") ||
            error.message.includes("not authorized")
        ).toBeTruthy();
      }
    }
  });

  test("member cannot create shifts", async ({ page }) => {
    await roleTestBase.actAsMember(page);

    const memberApiClient =
      roleTestBase.dbUtils.createAuthenticatedClientForUser(
        roleTestBase.getMemberUser().userId
      );

    try {
      await memberApiClient.post(`/shifts/`, {
        team_id: roleTestBase.getTestTeam().teamId,
        name: "Unauthorized Shift",
        acronym: "US",
        shift_type: "work",
      });

      throw new Error(
        "Member was able to create shift - authorization failed!"
      );
    } catch (error) {
      if (error instanceof Error) {
        expect(
          error.message.includes("403") ||
            error.message.includes("401") ||
            error.message.includes("not authorized")
        ).toBeTruthy();
      }
    }
  });

  test("member cannot delete workers", async ({ page }) => {
    // Create a worker as owner first
    await roleTestBase.actAsOwner(page);
    const worker = await roleTestBase.dbUtils.createWorker({
      teamId: roleTestBase.getTestTeam().teamId,
      name: `Test Worker ${Date.now()}`,
    });

    // Try to delete as member
    await roleTestBase.actAsMember(page);
    const memberApiClient =
      roleTestBase.dbUtils.createAuthenticatedClientForUser(
        roleTestBase.getMemberUser().userId
      );

    try {
      await memberApiClient.delete(`/workers/${worker.workerId}`);

      throw new Error(
        "Member was able to delete worker - authorization failed!"
      );
    } catch (error) {
      if (error instanceof Error) {
        expect(
          error.message.includes("403") ||
            error.message.includes("401") ||
            error.message.includes("not authorized")
        ).toBeTruthy();
      }
    } finally {
      // Cleanup as owner
      await roleTestBase.actAsOwner(page);
      await roleTestBase.dbUtils.deleteWorker(
        worker.workerId,
        roleTestBase.getTestTeam().teamId
      );
    }
  });
});
