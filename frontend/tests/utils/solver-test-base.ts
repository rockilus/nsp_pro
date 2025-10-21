/**
 * Solver Test Base Utilities
 *
 * This module provides utilities for E2E testing of the solver functionality.
 * It includes methods to:
 * - Load predefined test scenarios from backend fixtures
 * - Navigate to schedule pages
 * - Trigger solver runs
 * - Verify solver results
 */

import { Page, expect } from "@playwright/test";
import { DatabaseTestUtils } from "./database-utils";
import { SolverScenarioResult } from "./database-utils";

const testConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:8000",
  frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
};

export interface ScenarioMetadata {
  name: string;
  description: string;
  worker_count: number;
  shift_count: number;
  expected_solve_time_seconds: number;
  expected_min_assignments: number;
  expected_max_breaches: number;
}

export interface VerifyCriteria {
  minAssignments?: number;
  maxBreaches?: number;
  coveragePercentage?: number;
}

export class SolverTestBase {
  protected dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;
  protected currentScheduleId: string | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Setup solver tests environment
   * Creates a test team and verifies test utilities are available
   */
  async setupSolverTests(workerIndex: number): Promise<void> {
    await this.dbUtils.waitForApiReady();

    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error("Test utilities not available");
    }

    // Create test team with unique name
    const uniqueTeamName = `Solver Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: uniqueTeamName });
    console.log(`✅ Created test team: ${this.testTeam.name}`);
  }

  /**
   * Load a predefined scenario from backend fixtures
   * This creates all workers, shifts, and shift demands in one API call
   * Note: The backend API returns a simple confirmation, so we fetch the created data separately
   */
  async loadScenario(scenarioName: string): Promise<SolverScenarioResult> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupSolverTests first.");
    }

    console.log(`📦 Loading scenario: ${scenarioName}`);

    // Load scenario using DatabaseTestUtils which handles authentication properly
    const scenario = await this.dbUtils.loadSolverScenario(
      scenarioName,
      this.testTeam.teamId
    );

    console.log(`✅ Loaded scenario: ${scenarioName}`);
    console.log(`   - Workers: ${scenario.workers.length}`);
    console.log(`   - Shifts: ${scenario.shifts.length}`);

    return scenario;
  }

  /**
   * Get list of all available scenarios
   */
  async listAvailableScenarios(): Promise<string[]> {
    // Use DatabaseTestUtils which handles authentication properly
    return await this.dbUtils.listSolverScenarios();
  }

  /**
   * Navigate to schedule page with loaded scenario
   * Sets the team in localStorage and waits for page to load
   */
  async navigateToScheduleWithScenario(
    page: Page,
    scenarioName: string
  ): Promise<SolverScenarioResult> {
    const scenario = await this.loadScenario(scenarioName);

    // Set selected team in localStorage
    await page.evaluate((teamId) => {
      localStorage.setItem("selectedTeamId", teamId);
    }, this.testTeam!.teamId);

    // Navigate to schedule page
    await page.goto(`${testConfig.frontendUrl}/en/plan/schedule/`);

    // Reload to apply localStorage changes
    // await page.reload();
    await page.waitForLoadState("networkidle");

    console.log(
      `✅ Navigated to schedule page for team: ${this.testTeam!.name}`
    );

    return scenario;
  }

  /**
   * Create a schedule/campaign for the loaded data
   * This is required before running the solver
   */
  async createSchedule(
    startDate: string,
    endDate: string
  ): Promise<{ scheduleId: string }> {
    if (!this.testTeam) {
      throw new Error("Test team not created");
    }

    console.log(`📅 Creating schedule: ${startDate} to ${endDate}`);

    const result = await this.dbUtils.makeAuthenticatedRequest<{ id: string }>(
      "POST",
      "/schedules",
      {
        teamId: this.testTeam.teamId,
        startDate: startDate,
        endDate: endDate,
        status: "CAMPAIGN",
      }
    );

    this.currentScheduleId = result.id;

    console.log(`✅ Created schedule: ${this.currentScheduleId}`);

    return { scheduleId: result.id };
  }

  /**
   * Trigger solve and wait for completion
   * This will wait for the solver to finish (success or failure)
   */
  async triggerSolveAndWait(
    page: Page,
    timeoutMs: number = 60000
  ): Promise<void> {
    console.log("🔄 Triggering solver...");

    // Look for solve button and click it
    const solveButton = page.locator('button:has-text("Solve")').first();
    await solveButton.waitFor({ state: "visible", timeout: 5000 });
    await solveButton.click();

    console.log("⏳ Waiting for solver to complete...");

    // Wait for solve to complete - look for success or failure indicators
    // This depends on your UI implementation
    try {
      await page.waitForSelector(
        '[data-testid="solve-status-success"], [data-testid="solve-status-complete"], .solver-success, .MuiAlert-standardSuccess:has-text("Solve")',
        { timeout: timeoutMs }
      );
      console.log("✅ Solver completed successfully");
    } catch (error) {
      // Check if there was a failure
      const failureElement = await page.$(
        '[data-testid="solve-status-failure"], [data-testid="solve-status-error"], .solver-error, .MuiAlert-standardError'
      );

      if (failureElement) {
        const errorText = await failureElement.textContent();
        throw new Error(`Solver failed: ${errorText}`);
      }

      throw new Error(`Solver did not complete within ${timeoutMs}ms`);
    }
  }

  /**
   * Verify solve results meet expected criteria
   */
  async verifySolveResults(
    page: Page,
    expectedCriteria: VerifyCriteria
  ): Promise<void> {
    console.log("🔍 Verifying solve results...");

    // Wait for results to be displayed
    await page.waitForTimeout(2000);

    // Count assignments in the calendar view
    // This will depend on your actual UI implementation
    const assignmentCells = page.locator('[data-testid^="assignment-"]');
    const assignmentCount = await assignmentCells.count();

    console.log(`   Found ${assignmentCount} assignments`);

    if (expectedCriteria.minAssignments !== undefined) {
      expect(assignmentCount).toBeGreaterThanOrEqual(
        expectedCriteria.minAssignments
      );
      console.log(`   ✅ Assignments >= ${expectedCriteria.minAssignments}`);
    }

    // Check for breaches if displayed in UI
    if (expectedCriteria.maxBreaches !== undefined) {
      const breachIndicators = page.locator(
        '[data-testid="constraint-breach"], .breach-indicator, .constraint-violation'
      );
      const breachCount = await breachIndicators.count();

      console.log(`   Found ${breachCount} breaches`);

      expect(breachCount).toBeLessThanOrEqual(expectedCriteria.maxBreaches);
      console.log(`   ✅ Breaches <= ${expectedCriteria.maxBreaches}`);
    }

    // Check coverage percentage if applicable
    if (expectedCriteria.coveragePercentage !== undefined) {
      const coverageText = await page
        .locator('[data-testid="coverage-percentage"], .coverage-stat')
        .textContent();

      if (coverageText) {
        const coverage = parseFloat(coverageText.replace(/[^\d.]/g, ""));
        expect(coverage).toBeGreaterThanOrEqual(
          expectedCriteria.coveragePercentage
        );
        console.log(`   ✅ Coverage: ${coverage}%`);
      }
    }

    console.log("✅ All verification criteria passed");
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async takeScreenshot(
    page: Page,
    scenarioName: string,
    description: string = ""
  ): Promise<void> {
    const timestamp = Date.now();
    const filename = `test-results/solver-${scenarioName}${
      description ? "-" + description : ""
    }-${timestamp}.png`;

    await page.screenshot({
      path: filename,
      fullPage: true,
    });

    console.log(`📸 Screenshot saved: ${filename}`);
  }

  /**
   * Cleanup resources after tests
   */
  async cleanup(): Promise<void> {
    // Team and data will be cleaned up by database reset
    // But we can add specific cleanup here if needed
    this.testTeam = null;
    this.currentScheduleId = null;
  }

  /**
   * Wait for schedule page to fully load
   */
  async waitForSchedulePageReady(page: Page): Promise<void> {
    // Wait for key elements to be visible
    await page.waitForSelector('[data-testid="schedule-calendar"]', {
      timeout: 10000,
      state: "visible",
    });

    // Wait for any loading indicators to disappear
    await page
      .waitForSelector('[data-testid="loading-indicator"]', {
        state: "hidden",
        timeout: 5000,
      })
      .catch(() => {
        // Loading indicator might not exist, that's okay
      });

    console.log("✅ Schedule page is ready");
  }

  /**
   * Set schedule view settings in localStorage
   * This allows configuring how the schedule is displayed (groupBy, timeFrame, etc.)
   * Note: This uses default settings as the base and only overrides the provided settings
   */
  async setScheduleViewSettings(
    page: Page,
    teamId: string,
    settings: {
      timeFrame?: "week" | "month";
      groupBy?: "shift" | "worker";
      showBreaches?: boolean;
      showAssignments?: boolean;
      showDailyShiftDemands?: boolean;
      showRequests?: boolean;
      periodStartDate?: string; // ISO string
    }
  ): Promise<void> {
    await page.evaluate(
      ({ teamId, settings }) => {
        const storageKey = `scheduleViewSettings_${teamId}`;

        // Start with default settings
        const now = new Date().toISOString();
        const defaultSettings = {
          timeFrame: "week",
          groupBy: "shift",
          showBreaches: true,
          showAssignments: true,
          showDailyShiftDemands: true,
          showRequests: true,
          periodStartDate: now,
        };

        // Merge defaults with provided settings
        const updatedSettings = {
          ...defaultSettings,
          ...settings,
        };

        localStorage.setItem(storageKey, JSON.stringify(updatedSettings));
      },
      { teamId, settings }
    );

    console.log(
      `✅ Set schedule view settings for team ${teamId}:`,
      JSON.stringify(settings, null, 2)
    );
  }

  /**
   * Get the current schedule ID
   */
  getScheduleId(): string | null {
    return this.currentScheduleId;
  }

  /**
   * Get the test team
   */
  getTestTeam(): { teamId: string; name: string } | null {
    return this.testTeam;
  }
}
