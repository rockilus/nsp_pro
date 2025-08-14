/**
 * Shared base functionality for worker E2E tests
 *
 * This module provides common setup and navigation utilities for worker tests,
 * reducing duplication across multiple worker test files.
 */

import { Page, expect } from "@playwright/test";
import { DatabaseTestUtils } from "./database-utils";
import { testConfig } from "./test-config";

export class WorkerTestBase {
  protected dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Performs the common setup for worker tests:
   * - Waits for API ready
   * - Verifies test utilities are available
   * - Resets worker-related database collections
   * - Creates a test team
   */
  async setupWorkerTests(workerIndex: number): Promise<void> {
    // Ensure the API is ready before running tests
    await this.dbUtils.waitForApiReady();

    // Verify test utilities are available
    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error(
        "Test utilities are not available - check environment configuration"
      );
    }

    // Create a test team for worker tests
    const uniqueTeamName = `Worker Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: uniqueTeamName });
    console.log(
      `Created test team: ${this.testTeam.name} (${this.testTeam.teamId})`
    );
  }

  /**
   * Navigates to the workers page for the test team
   * This should be called in beforeEach for consistent navigation
   */
  async navigateToWorkersPage(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    // Step 1: Navigate to teams page
    await page.goto(`${testConfig.frontendUrl}/en/plan/settings/teams/`);
    await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();

    // Step 2: Wait for our test team to appear in the UI
    const teamElement = page.getByText(this.testTeam.name, { exact: true });
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
  }

  /**
   * Creates a test worker using the API
   */
  async createTestWorker(workerData: {
    name: string;
    acronym?: string;
    weeklyHours?: number;
    weeklyHoursDesired?: number;
    dutiesPerMonth?: number;
    annualLeave?: number;
  }): Promise<{ workerId: string; name: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    return this.dbUtils.createWorker({
      teamId: this.testTeam.teamId,
      name: workerData.name,
      acronym: workerData.acronym,
      weeklyHours: workerData.weeklyHours,
      weeklyHoursDesired: workerData.weeklyHoursDesired,
      dutiesPerMonth: workerData.dutiesPerMonth,
      annualLeave: workerData.annualLeave,
    });
  }

  /**
   * Updates a test worker using the API
   */
  async updateTestWorker(
    workerId: string,
    updates: {
      name?: string;
      acronym?: string;
      weeklyHours?: number;
      weeklyHoursDesired?: number;
      dutiesPerMonth?: number;
      annualLeave?: number;
    }
  ): Promise<{ workerId: string; name: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    return this.dbUtils.updateWorker(workerId, this.testTeam.teamId, updates);
  }

  /**
   * Updates a test worker's name specifically (convenience method)
   */
  async updateTestWorkerName(
    workerId: string,
    newName: string
  ): Promise<{ workerId: string; name: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupWorkerTests() first.");
    }

    return this.dbUtils.updateWorkerName(
      workerId,
      this.testTeam.teamId,
      newName
    );
  }

  /**
   * Creates a worker via the UI by clicking the +Worker button
   */
  async createWorkerViaUI(page: Page): Promise<void> {
    const addWorkerButton = page.getByRole("button", {
      name: "Worker",
      exact: true,
    });
    await expect(addWorkerButton).toBeEnabled();
    await addWorkerButton.click();

    // Wait for the worker to appear in the table
    await page.waitForSelector('[aria-label="worker table"]');
    const workerRows = page.locator('[aria-label="worker table"] tbody tr');
    await expect(workerRows).toHaveCount(1);
  }

  /**
   * Gets the worker table element
   */
  getWorkerTable(page: Page) {
    return page.locator('[aria-label="worker table"]');
  }

  /**
   * Gets all worker rows from the table
   */
  getWorkerRows(page: Page) {
    return this.getWorkerTable(page).locator("tbody tr");
  }

  /**
   * Gets a specific worker row by index (0-based)
   */
  getWorkerRow(page: Page, index: number = 0) {
    return this.getWorkerRows(page).nth(index);
  }

  /**
   * Gets the name cell for a worker row
   */
  getWorkerNameCell(page: Page, rowIndex: number = 0) {
    return this.getWorkerRow(page, rowIndex).locator("td").nth(0);
  }

  /**
   * Gets the acronym cell for a worker row
   */
  getWorkerAcronymCell(page: Page, rowIndex: number = 0) {
    return this.getWorkerRow(page, rowIndex).locator("td").nth(1);
  }

  /**
   * Gets team information
   */
  getTestTeam(): { teamId: string; name: string } | null {
    return this.testTeam;
  }
}
