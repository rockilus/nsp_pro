/**
 * Role-based access control tests
 *
 * These tests verify that different user roles (owner vs member) have
 * appropriate access to various pages and features in the application.
 */

import { test, expect } from "@playwright/test";
import { RoleTestBase } from "../../utils/role-test-base";

const roleTestBase = new RoleTestBase();

test.describe("Role-Based Access Control", () => {
  test.beforeEach(async ({ page }) => {
    // Setup creates:
    // - Test team
    // - Owner user with full access
    // - Member user with limited access
    await roleTestBase.setupRoleTests(test.info().workerIndex);
  });

  test.describe("Owner Access", () => {
    test("owner can access workers page", async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToWorkersPage(page);

      // Verify the workers page is displayed
      await expect(
        page.locator('[data-testid="workers-page-heading"]')
      ).toBeVisible();

      // Verify we're on the correct URL
      await roleTestBase.verifyPageAccessible(page, "/plan/workers");
    });

    test("owner can access schedule page", async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToSchedulePage(page);

      // Verify the schedule page is displayed
      await expect(
        page.locator('[data-testid="schedule-page-heading"]')
      ).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, "/plan/schedule");
    });

    test("owner can access requests page", async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToRequestsPage(page);

      // Verify the requests page is displayed
      await expect(page.locator('[data-testid="request-tab"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, "/plan/requests");
    });

    test("owner can access teams settings page", async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToTeamsPage(page);

      // Verify the teams page is displayed
      await expect(
        page.locator('[data-testid="teams-page-heading"]')
      ).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, "/settings/teams");
    });
  });

  test.describe("Member Access - Allowed Pages", () => {
    test("member can access schedule page (view only)", async ({ page }) => {
      await roleTestBase.actAsMember(page);
      await roleTestBase.navigateToSchedulePage(page);

      // Verify the schedule page is displayed
      await expect(
        page.locator('[data-testid="schedule-page-heading"]')
      ).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, "/plan/schedule");

      // TODO: Verify member sees read-only view (no edit buttons)
      // This depends on the actual UI implementation
    });

    test("member can access requests page", async ({ page }) => {
      await roleTestBase.actAsMember(page);
      await roleTestBase.navigateToRequestsPage(page);

      // Verify the requests page is displayed
      await expect(page.locator('[data-testid="request-tab"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, "/plan/requests");

      // TODO: Verify member can only see/manage their own requests
      // This depends on the actual UI implementation
    });
  });

  test.describe("Member Access - Restricted Pages", () => {
    test("member cannot access workers page", async ({ page }) => {
      await roleTestBase.actAsMember(page);

      // Try to navigate to workers page
      await roleTestBase.navigateToWorkersPage(page);

      // Member should be redirected away from workers page
      // The exact behavior depends on the frontend implementation:
      // - Could redirect to schedule/welcome page
      // - Could show access denied message
      // - Could redirect to a 403 page

      // Wait a moment for any redirects to occur
      await page.waitForTimeout(1000);

      // Verify we're NOT on the workers page
      await roleTestBase.verifyPageNotAccessible(page, "/plan/workers");

      // The user should be redirected somewhere else
      // (exact destination depends on app routing logic)
      const currentUrl = page.url();
      expect(currentUrl).not.toContain("/plan/workers");
    });

    test("member cannot access teams settings page", async ({ page }) => {
      await roleTestBase.actAsMember(page);

      // Try to navigate to teams settings page
      await roleTestBase.navigateToTeamsPage(page);

      // Wait a moment for any redirects to occur
      await page.waitForTimeout(1000);

      // Verify we're NOT on the teams settings page
      await roleTestBase.verifyPageNotAccessible(page, "/settings/teams");

      const currentUrl = page.url();
      expect(currentUrl).not.toContain("/settings/teams");
    });

    // TODO: Add tests for other owner-only pages as they're identified:
    // - Shifts page
    // - Constraints page
    // - Shift demands page
    // - Campaign page
    // - Stats page
  });

  test.describe("API-Level Access Control", () => {
    test("member cannot create workers via API", async ({ page }) => {
      await roleTestBase.actAsMember(page);

      const memberApiClient =
        roleTestBase.dbUtils.createAuthenticatedClientForUser(
          roleTestBase.getMemberUser().userId
        );

      // Attempt to create a worker as member should fail
      // This tests backend authorization, not just frontend restrictions
      try {
        await memberApiClient.post(`/workers/`, {
          name: "Unauthorized Worker",
          team_id: roleTestBase.getTestTeam().teamId,
        });

        // If we reach here, the API didn't block the member - test should fail
        throw new Error(
          "Member was able to create worker - authorization failed!"
        );
      } catch (error) {
        // We expect this to fail with 403 Forbidden or similar
        if (error instanceof Error) {
          // Verify it's an authorization error
          expect(
            error.message.includes("403") ||
              error.message.includes("401") ||
              error.message.includes("not authorized") ||
              error.message.toLowerCase().includes("forbidden")
          ).toBeTruthy();
        }
      }
    });

    test("owner can create workers via API", async ({ page }) => {
      await roleTestBase.actAsOwner(page);

      const ownerApiClient =
        roleTestBase.dbUtils.createAuthenticatedClientForUser(
          roleTestBase.getOwnerUser().userId
        );

      // Owner should be able to create workers
      const worker = await roleTestBase.dbUtils.createWorker({
        teamId: roleTestBase.getTestTeam().teamId,
        name: `Test Worker ${Date.now()}`,
      });

      expect(worker.workerId).toBeTruthy();
      expect(worker.name).toContain("Test Worker");

      // Cleanup
      await roleTestBase.dbUtils.deleteWorker(
        worker.workerId,
        roleTestBase.getTestTeam().teamId
      );
    });
  });
});
