/**
 * Role-based test base functionality
 *
 * This module provides utilities for testing different user roles (owner vs member).
 * It handles creating multiple test users with different roles and switching between them
 * during test execution.
 */

import { Page, expect } from "@playwright/test";
import { DatabaseTestUtils, TestUserWithRole, TEST_USER_2 } from "./database-utils";
import { testConfig } from "./test-config";

export class RoleTestBase {
  public dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;
  protected ownerUser: TestUserWithRole | null = null;
  protected memberUser: TestUserWithRole | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Performs setup for role-based tests:
   * - Waits for API ready
   * - Verifies test utilities are available
   * - Creates a test team
   * - Creates an owner user and a member user
   */
  async setupRoleTests(workerIndex: number): Promise<void> {
    // Ensure the API is ready before running tests
    await this.dbUtils.waitForApiReady();

    // Verify test utilities are available
    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error(
        "Test utilities are not available - check environment configuration"
      );
    }

    // Create a test team
    const uniqueTeamName = `Role Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: uniqueTeamName });
    console.log(
      `Created test team: ${this.testTeam.name} (${this.testTeam.teamId})`
    );

    // Add TEST_USER_2 as a team member for consistent multi-user scenarios
    await this.dbUtils.addSecondUserToTeam(this.testTeam.teamId, "member");
    console.log(`✅ Added TEST_USER_2 (${TEST_USER_2.user_id}) as team member`);

    // Create owner user
    const ownerUserId = `owner-${workerIndex}-${Date.now()}`;
    this.ownerUser = await this.dbUtils.createUserWithRole(
      {
        userId: ownerUserId,
        email: `owner-${workerIndex}-${Date.now()}@test.com`,
        username: `owner-${workerIndex}`,
        firstName: "Owner",
        lastName: "User",
      },
      this.testTeam.teamId,
      "owner"
    );
    console.log(`✅ Created owner user: ${this.ownerUser.userId}`);

    // Create member user
    const memberUserId = `member-${workerIndex}-${Date.now()}`;
    this.memberUser = await this.dbUtils.createUserWithRole(
      {
        userId: memberUserId,
        email: `member-${workerIndex}-${Date.now()}@test.com`,
        username: `member-${workerIndex}`,
        firstName: "Member",
        lastName: "User",
      },
      this.testTeam.teamId,
      "member"
    );
    console.log(`✅ Created member user: ${this.memberUser.userId}`);
  }

  /**
   * Switch page context to act as the owner user
   * This sets the X-Dev-User-ID header for all subsequent requests
   */
  async actAsOwner(page: Page): Promise<void> {
    if (!this.ownerUser) {
      throw new Error("Owner user not created. Call setupRoleTests() first.");
    }

    await page.setExtraHTTPHeaders({
      "X-Dev-User-ID": this.ownerUser.userId,
      "X-API-Key": testConfig.devApiKey,
    });

    console.log(`🔄 Acting as owner: ${this.ownerUser.userId}`);
  }

  /**
   * Switch page context to act as the member user
   * This sets the X-Dev-User-ID header for all subsequent requests
   */
  async actAsMember(page: Page): Promise<void> {
    if (!this.memberUser) {
      throw new Error("Member user not created. Call setupRoleTests() first.");
    }

    await page.setExtraHTTPHeaders({
      "X-Dev-User-ID": this.memberUser.userId,
      "X-API-Key": testConfig.devApiKey,
    });

    console.log(`🔄 Acting as member: ${this.memberUser.userId}`);
  }

  /**
   * Switch page context to act as TEST_USER_2 (the second test user)
   * This sets the X-Dev-User-ID header for all subsequent requests
   */
  async actAsSecondTestUser(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRoleTests() first.");
    }

    await page.setExtraHTTPHeaders({
      "X-Dev-User-ID": TEST_USER_2.user_id,
      "X-API-Key": testConfig.devApiKey,
    });

    console.log(`🔄 Acting as TEST_USER_2: ${TEST_USER_2.user_id}`);
  }

  /**
   * Navigate to a specific page with team context set in localStorage
   * This bypasses UI navigation for faster test execution
   */
  async navigateToPageWithTeamContext(page: Page, path: string): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRoleTests() first.");
    }

    // Navigate to the page
    await page.goto(`${testConfig.frontendUrl}${path}`);

    // Set the selected team in localStorage
    await page.evaluate((teamId) => {
      localStorage.setItem("selectedTeamId", teamId);
    }, this.testTeam.teamId);

    // Reload to apply localStorage changes
    await page.reload();
    await page.waitForLoadState("networkidle");
  }

  /**
   * Navigate to workers page as current user
   */
  async navigateToWorkersPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(page, "/en/plan/workers/");
  }

  /**
   * Navigate to schedule page as current user
   */
  async navigateToSchedulePage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(page, "/en/plan/schedule/");
  }

  /**
   * Navigate to requests page as current user
   */
  async navigateToRequestsPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(page, "/en/plan/requests/");
  }

  /**
   * Navigate to teams settings page as current user
   */
  async navigateToTeamsPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(page, "/en/plan/settings/teams/");
  }

  /**
   * Navigate to shifts page as current user
   */
  async navigateToShiftsPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(page, "/en/plan/shifts/");
  }

  /**
   * Navigate to shift demands page as current user
   */
  async navigateToShiftDemandsPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(page, "/en/plan/shift-demands/");
  }

  /**
   * Navigate to constraints page as current user
   */
  async navigateToConstraintsPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(page, "/en/plan/constraints/");
  }

  /**
   * Navigate to campaign page as current user
   */
  async navigateToCampaignPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(page, "/en/plan/campaign/");
  }

  /**
   * Navigate to stats page as current user
   */
  async navigateToStatsPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(page, "/en/plan/stats/");
  }

  /**
   * Navigate to personal info settings page as current user
   */
  async navigateToPersonalInfoPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(
      page,
      "/en/plan/settings/personal-info/"
    );
  }

  /**
   * Navigate to security settings page as current user
   */
  async navigateToSecurityPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(
      page,
      "/en/plan/settings/security/"
    );
  }

  /**
   * Navigate to team general settings page as current user
   */
  async navigateToTeamGeneralPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(
      page,
      `/en/plan/teams/general?teamId=${this.testTeam?.teamId}`
    );
  }

  /**
   * Navigate to team members settings page as current user
   */
  async navigateToTeamMembersPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(
      page,
      `/en/plan/teams/members?teamId=${this.testTeam?.teamId}`
    );
  }

  /**
   * Navigate to dashboard page as current user (admin-only page)
   */
  async navigateToDashboardPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(page, "/en/plan/dashboard/");
  }

  /**
   * Verify that a page is accessible (no redirect or 403 error)
   */
  async verifyPageAccessible(page: Page, expectedUrl: string): Promise<void> {
    await expect(page).toHaveURL(new RegExp(expectedUrl));
  }

  /**
   * Verify that a page is NOT accessible (redirect or error)
   */
  async verifyPageNotAccessible(
    page: Page,
    forbiddenUrl: string
  ): Promise<void> {
    const currentUrl = page.url();
    expect(currentUrl).not.toContain(forbiddenUrl);
  }

  /**
   * Get the owner user details
   */
  getOwnerUser(): TestUserWithRole {
    if (!this.ownerUser) {
      throw new Error("Owner user not created. Call setupRoleTests() first.");
    }
    return this.ownerUser;
  }

  /**
   * Get the member user details
   */
  getMemberUser(): TestUserWithRole {
    if (!this.memberUser) {
      throw new Error("Member user not created. Call setupRoleTests() first.");
    }
    return this.memberUser;
  }

  /**
   * Get the second test user (TEST_USER_2) details
   * This user is automatically added as a member during setupRoleTests
   */
  getSecondTestUser(): typeof TEST_USER_2 {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRoleTests() first.");
    }
    return TEST_USER_2;
  }

  /**
   * Get the test team details
   */
  getTestTeam(): { teamId: string; name: string } {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRoleTests() first.");
    }
    return this.testTeam;
  }
}
