/**
 * Role-based access control tests
 *
 * These tests verify that different user roles (owner vs member) have
 * appropriate access to various pages and features in the application.
 */

import { test, expect } from '@playwright/test';
import { RoleTestBase } from '../../utils/role-test-base';
import { TeamApi } from '../../../src/app/lib/api/teamApi';

const roleTestBase = new RoleTestBase();

test.describe('Role-Based Access Control', () => {
  test.beforeEach(async ({ page }) => {
    // Setup creates:
    // - Test team
    // - Owner user with full access
    // - Member user with limited access
    await roleTestBase.setupRoleTests(test.info().workerIndex);
  });

  test.describe('Owner Access', () => {
    test('owner can access workers page', async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToWorkersPage(page);

      // Verify the workers page is displayed
      await expect(page.locator('[data-testid="workers-page-heading"]')).toBeVisible();

      // Verify we're on the correct URL
      await roleTestBase.verifyPageAccessible(page, '/plan/workers');
    });

    test('owner can access schedule page', async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToSchedulePage(page);

      // Verify the schedule page is displayed
      await expect(page.locator('[data-testid="schedule-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/plan/schedule');
    });

    test('owner can access requests page', async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToRequestsPage(page);

      // Verify the requests page is displayed
      await expect(page.locator('[data-testid="request-tab"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/plan/requests');
    });

    test('owner can access teams settings page', async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToTeamsPage(page);

      // Verify the teams page is displayed
      await expect(page.locator('[data-testid="teams-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/settings/teams');
    });

    test('owner can access shifts page', async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToShiftsPage(page);

      // Verify the shifts page is displayed
      await expect(page.locator('[data-testid="shifts-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/plan/shifts');
    });

    test('owner can access shift demands page', async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToShiftDemandsPage(page);

      // Verify the shift demands page is displayed
      await expect(page.locator('[data-testid="shift-demand-tab"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/plan/shift-demands');
    });

    test('owner can access constraints page', async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToConstraintsPage(page);

      // Verify the constraints page is displayed
      await expect(page.locator('[data-testid="constraints-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/plan/constraints');
    });

    test('owner can access campaign page', async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToCampaignPage(page);

      // Verify the campaign page is displayed
      await expect(page.locator('[data-testid="campaign-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/plan/campaign');
    });

    test('owner can access stats page', async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToStatsPage(page);

      // Verify the stats page is displayed
      await expect(page.locator('[data-testid="stats-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/plan/stats');
    });

    test('owner can access stats page regardless of showStats setting', async ({ page }) => {
      await roleTestBase.actAsOwner(page);

      const testTeam = roleTestBase.getTestTeam();
      const ownerClient = roleTestBase.dbUtils.createAuthenticatedClientForUser(
        roleTestBase.getOwnerUser().userId,
      );
      const team = await TeamApi.getTeamById(ownerClient, testTeam.teamId);
      await TeamApi.updateTeam(ownerClient, testTeam.teamId, {
        ...team,
        showStats: false,
      });

      await roleTestBase.navigateToStatsPage(page);

      await expect(page.locator('[data-testid="stats-page-heading"]')).toBeVisible();
      await roleTestBase.verifyPageAccessible(page, '/plan/stats');
    });

    test('owner can access personal info settings page', async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToPersonalInfoPage(page);

      // Verify the personal info page is displayed
      await expect(page.locator('[data-testid="personal-info-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/settings/personal-info');
    });

    test('owner can access security settings page', async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToSecurityPage(page);

      // Verify the security page is displayed
      await expect(page.locator('[data-testid="security-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/settings/security');
    });

    test('owner can access team general settings page', async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToTeamGeneralPage(page);

      // Verify the team general page is displayed
      await expect(page.locator('[data-testid="team-general-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/teams/general');
    });

    test('owner can access team members settings page', async ({ page }) => {
      await roleTestBase.actAsOwner(page);
      await roleTestBase.navigateToTeamMembersPage(page);

      // Verify the team members page is displayed
      await expect(page.locator('[data-testid="team-members-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/teams/members');
    });
  });

  test.describe('Member Access - Allowed Pages', () => {
    test('member can access schedule page (view only)', async ({ page }) => {
      await roleTestBase.actAsMember(page);
      await roleTestBase.navigateToSchedulePage(page);

      // Verify the schedule page is displayed
      await expect(page.locator('[data-testid="schedule-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/plan/schedule');

      // TODO: Verify member sees read-only view (no edit buttons)
      // This depends on the actual UI implementation
    });

    test('member can access requests page', async ({ page }) => {
      await roleTestBase.actAsMember(page);
      await roleTestBase.navigateToRequestsPage(page);

      // Verify the requests page is displayed
      await expect(page.locator('[data-testid="request-tab"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/plan/requests');

      // TODO: Verify member can only see/manage their own requests
      // This depends on the actual UI implementation
    });

    test('member can access stats page when showStats is enabled', async ({ page }) => {
      await roleTestBase.actAsOwner(page);

      const testTeam = roleTestBase.getTestTeam();
      const ownerClient = roleTestBase.dbUtils.createAuthenticatedClientForUser(
        roleTestBase.getOwnerUser().userId,
      );
      const team = await TeamApi.getTeamById(ownerClient, testTeam.teamId);
      await TeamApi.updateTeam(ownerClient, testTeam.teamId, {
        ...team,
        showStats: true,
      });

      await roleTestBase.actAsMember(page);
      await roleTestBase.navigateToStatsPage(page);

      await expect(page.locator('[data-testid="stats-page-heading"]')).toBeVisible();
      await roleTestBase.verifyPageAccessible(page, '/plan/stats');
    });

    test('member can access personal info settings page', async ({ page }) => {
      await roleTestBase.actAsMember(page);
      await roleTestBase.navigateToPersonalInfoPage(page);

      // Verify the personal info page is displayed
      await expect(page.locator('[data-testid="personal-info-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/settings/personal-info');
    });

    test('member can access security settings page', async ({ page }) => {
      await roleTestBase.actAsMember(page);
      await roleTestBase.navigateToSecurityPage(page);

      // Verify the security page is displayed
      await expect(page.locator('[data-testid="security-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/settings/security');
    });

    test('member can access teams settings page', async ({ page }) => {
      await roleTestBase.actAsMember(page);
      await roleTestBase.navigateToTeamsPage(page);

      // Verify the teams page is displayed
      await expect(page.locator('[data-testid="teams-page-heading"]')).toBeVisible();

      await roleTestBase.verifyPageAccessible(page, '/settings/teams');
    });
  });

  test.describe('Member Access - Restricted Pages', () => {
    test('member cannot access workers page', async ({ page }) => {
      await roleTestBase.actAsMember(page);

      // Try to navigate to workers page
      await roleTestBase.navigateToWorkersPage(page);

      // Should be redirected to schedule page
      await page.waitForURL(/\/plan\/schedule/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/plan\/schedule/);

      // Verify we're NOT on the workers page
      await roleTestBase.verifyPageNotAccessible(page, '/plan/workers');

      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/plan/workers');
    });

    test('member cannot access shifts page', async ({ page }) => {
      await roleTestBase.actAsMember(page);

      // Try to navigate to shifts page
      await roleTestBase.navigateToShiftsPage(page);

      // Should be redirected to schedule page
      await page.waitForURL(/\/plan\/schedule/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/plan\/schedule/);

      // Verify we're NOT on the shifts page
      await roleTestBase.verifyPageNotAccessible(page, '/plan/shifts');

      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/plan/shifts');
    });

    test('member cannot access shift demands page', async ({ page }) => {
      await roleTestBase.actAsMember(page);

      // Try to navigate to shift demands page
      await roleTestBase.navigateToShiftDemandsPage(page);

      // Should be redirected to schedule page
      await page.waitForURL(/\/plan\/schedule/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/plan\/schedule/);

      // Verify we're NOT on the shift demands page
      await roleTestBase.verifyPageNotAccessible(page, '/plan/shift-demands');

      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/plan/shift-demands');
    });

    test('member cannot access constraints page', async ({ page }) => {
      await roleTestBase.actAsMember(page);

      // Try to navigate to constraints page
      await roleTestBase.navigateToConstraintsPage(page);

      // Should be redirected to schedule page
      await page.waitForURL(/\/plan\/schedule/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/plan\/schedule/);

      // Verify we're NOT on the constraints page
      await roleTestBase.verifyPageNotAccessible(page, '/plan/constraints');

      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/plan/constraints');
    });

    test('member cannot access campaign page', async ({ page }) => {
      await roleTestBase.actAsMember(page);

      // Try to navigate to campaign page
      await roleTestBase.navigateToCampaignPage(page);

      // Should be redirected to schedule page
      await page.waitForURL(/\/plan\/schedule/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/plan\/schedule/);

      // Verify we're NOT on the campaign page
      await roleTestBase.verifyPageNotAccessible(page, '/plan/campaign');

      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/plan/campaign');
    });

    test('member cannot access stats page', async ({ page }) => {
      await roleTestBase.actAsMember(page);

      // Try to navigate to stats page
      await roleTestBase.navigateToStatsPage(page);

      // Should be redirected to schedule page
      await page.waitForURL(/\/plan\/schedule/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/plan\/schedule/);

      // Verify we're NOT on the stats page
      await roleTestBase.verifyPageNotAccessible(page, '/plan/stats');

      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/plan/stats');
    });

    test('member cannot access team general settings page', async ({ page }) => {
      await roleTestBase.actAsMember(page);

      // Try to navigate to team general settings page
      await roleTestBase.navigateToTeamGeneralPage(page);

      // Should be redirected to schedule page
      await page.waitForURL(/\/plan\/schedule/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/plan\/schedule/);

      // Verify we're NOT on the team general settings page
      await roleTestBase.verifyPageNotAccessible(page, '/teams/general');

      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/teams/general');
    });

    test('member cannot access team members settings page', async ({ page }) => {
      await roleTestBase.actAsMember(page);

      // Try to navigate to team members settings page
      await roleTestBase.navigateToTeamMembersPage(page);

      // Should be redirected to schedule page
      await page.waitForURL(/\/plan\/schedule/, { timeout: 5000 });
      await expect(page).toHaveURL(/\/plan\/schedule/);

      // Verify we're NOT on the team members settings page
      await roleTestBase.verifyPageNotAccessible(page, '/teams/members');

      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/teams/members');
    });
  });

  // test.describe("API-Level Access Control", () => {
  //   test("member cannot create workers via API", async ({ page }) => {
  //     await roleTestBase.actAsMember(page);

  //     const memberApiClient =
  //       roleTestBase.dbUtils.createAuthenticatedClientForUser(
  //         roleTestBase.getMemberUser().userId
  //       );

  //     // Attempt to create a worker as member should fail
  //     // This tests backend authorization, not just frontend restrictions
  //     try {
  //       await memberApiClient.post(`/workers/`, {
  //         name: "Unauthorized Worker",
  //         team_id: roleTestBase.getTestTeam().teamId,
  //       });

  //       // If we reach here, the API didn't block the member - test should fail
  //       throw new Error(
  //         "Member was able to create worker - authorization failed!"
  //       );
  //     } catch (error) {
  //       // We expect this to fail with 403 Forbidden or similar
  //       if (error instanceof Error) {
  //         // Verify it's an authorization error
  //         expect(
  //           error.message.includes("403") ||
  //             error.message.includes("401") ||
  //             error.message.includes("not authorized") ||
  //             error.message.toLowerCase().includes("forbidden")
  //         ).toBeTruthy();
  //       }
  //     }
  //   });

  //   test("owner can create workers via API", async ({ page }) => {
  //     await roleTestBase.actAsOwner(page);

  //     const ownerApiClient =
  //       roleTestBase.dbUtils.createAuthenticatedClientForUser(
  //         roleTestBase.getOwnerUser().userId
  //       );

  //     // Owner should be able to create workers
  //     const worker = await roleTestBase.dbUtils.createWorker({
  //       teamId: roleTestBase.getTestTeam().teamId,
  //       name: `Test Worker ${Date.now()}`,
  //     });

  //     expect(worker.workerId).toBeTruthy();
  //     expect(worker.name).toContain("Test Worker");

  //     // Cleanup
  //     await roleTestBase.dbUtils.deleteWorker(
  //       worker.workerId,
  //       roleTestBase.getTestTeam().teamId
  //     );
  //   });
  // });
});
