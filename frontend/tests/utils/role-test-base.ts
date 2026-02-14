/**
 * Role-based test base functionality
 *
 * This module provides utilities for testing different user roles (owner vs member).
 * It handles creating multiple test users with different roles and switching between them
 * during test execution.
 */

import { Page, expect } from "@playwright/test";
import {
  DatabaseTestUtils,
  TestUserWithRole,
  TEST_USER_2,
} from "./database-utils";
import { testConfig } from "./test-config";
import { WorkerT } from "../../src/types/worker";

export class RoleTestBase {
  public dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;
  protected ownerUser: TestUserWithRole | null = null;
  protected memberUser: TestUserWithRole | null = null;
  protected memberWorker: WorkerT | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Performs setup for role-based tests:
   * - Waits for API ready
   * - Verifies test utilities are available
   * - Acts as TEST_USER (team owner) to create team
   * - Adds TEST_USER_2 as team member
   *
   * @param workerIndex - Worker index for unique naming
   */
  async setupRoleTests(workerIndex: number): Promise<void> {
    // Ensure the API is ready before running tests
    await this.dbUtils.waitForApiReady();

    // Verify test utilities are available
    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error(
        "Test utilities are not available - check environment configuration",
      );
    }

    // Import global test users
    const { TEST_USER } = await import("./database-utils");

    // Act as TEST_USER (will be the team owner when creating team)
    console.log(`🔄 Acting as TEST_USER (${TEST_USER.user_id}) to create team`);

    // Create a test team (TEST_USER becomes owner automatically)
    const uniqueTeamName = `Role Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: uniqueTeamName });
    console.log(
      `Created test team: ${this.testTeam.name} (${this.testTeam.teamId})`,
    );
    console.log(`✅ TEST_USER (${TEST_USER.user_id}) is now team owner`);

    // Store owner user reference
    this.ownerUser = {
      userId: TEST_USER.user_id,
      email: TEST_USER.email,
      teamId: this.testTeam.teamId,
      role: "owner",
      membershipId: "", // Will be set by the team creation
    };

    // Add TEST_USER_2 as team member
    const membershipResult = await this.dbUtils.addTeamMember(
      TEST_USER_2.user_id,
      this.testTeam.teamId,
      "member",
    );
    console.log(`✅ Added TEST_USER_2 (${TEST_USER_2.user_id}) as team member`);

    // Store member user reference
    this.memberUser = {
      userId: TEST_USER_2.user_id,
      email: TEST_USER_2.email,
      teamId: this.testTeam.teamId,
      role: "member",
      membershipId: membershipResult.membership_id,
    };
  }

  /**
   * Switch page context to act as the owner user
   * This sets the X-Dev-User-ID header for all subsequent requests
   */
  async actAsOwner(page: Page): Promise<void> {
    if (!this.ownerUser) {
      throw new Error("Owner user not created. Call setupRoleTests() first.");
    }

    await this.dbUtils.authenticatePageAsUser(page, this.ownerUser.userId);

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

    await this.dbUtils.authenticatePageAsUser(page, this.memberUser.userId);

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

    await this.dbUtils.authenticatePageAsTestUser2(page);

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
      "/en/plan/settings/personal-info/",
    );
  }

  /**
   * Navigate to security settings page as current user
   */
  async navigateToSecurityPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(
      page,
      "/en/plan/settings/security/",
    );
  }

  /**
   * Navigate to team general settings page as current user
   */
  async navigateToTeamGeneralPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(
      page,
      `/en/plan/teams/general?teamId=${this.testTeam?.teamId}`,
    );
  }

  /**
   * Navigate to team members settings page as current user
   */
  async navigateToTeamMembersPage(page: Page): Promise<void> {
    await this.navigateToPageWithTeamContext(
      page,
      `/en/plan/teams/members?teamId=${this.testTeam?.teamId}`,
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
    forbiddenUrl: string,
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

  /**
   * Create a worker and link it to a specific user
   * @param userId - The user ID to link the worker to
   * @param workerName - Name for the worker
   * @returns The created and linked worker
   */
  async createWorkerForUser(
    userId: string,
    workerName: string,
  ): Promise<WorkerT> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupRoleTests() first.");
    }

    // Create the worker via DatabaseTestUtils
    const worker = await this.dbUtils.createWorker({
      teamId: this.testTeam.teamId,
      name: workerName,
      acronym: workerName.substring(0, 3).toUpperCase(),
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 8,
      annualLeave: 25,
    });

    // Attach the user to the worker using DatabaseTestUtils
    await this.dbUtils.attachWorkerToUser(
      worker.id,
      userId,
      this.testTeam.teamId,
    );

    console.log(
      `✅ Created worker ${workerName} (${worker.id}) and linked to user ${userId}`,
    );

    return worker;
  }

  /**
   * Create a worker and link it to the member user
   * This is a convenience method that stores the worker for easy access
   * @param workerName - Name for the worker (optional, defaults to "Member Worker")
   * @returns The created and linked worker
   */
  async createWorkerForMember(workerName?: string): Promise<WorkerT> {
    if (!this.memberUser) {
      throw new Error("Member user not created. Call setupRoleTests() first.");
    }

    const name = workerName || `Member Worker ${Date.now()}`;
    this.memberWorker = await this.createWorkerForUser(
      this.memberUser.userId,
      name,
    );

    return this.memberWorker;
  }

  /**
   * Get the member's worker (if created via createWorkerForMember)
   * @returns The member's worker or null if not created
   */
  getMemberWorker(): WorkerT | null {
    return this.memberWorker;
  }
}
