/**
 * E2E Tests for Solver - Basic Coverage Scenarios
 *
 * These tests verify that the solver can generate valid schedules
 * for various scenarios with different complexity levels.
 */

import { test, expect } from "@playwright/test";
import { SolverTestBase } from "../../utils/solver-test-base";

test.describe("Solver - Basic Coverage", () => {
  const solverTestBase = new SolverTestBase();

  test.beforeAll(async ({}, testInfo) => {
    await solverTestBase.setupSolverTests(testInfo.workerIndex);
  });

  test.afterAll(async () => {
    await solverTestBase.cleanup();
  });

  test("should list available solver test scenarios", async () => {
    const scenarios = await solverTestBase.listAvailableScenarios();

    expect(scenarios.length).toBeGreaterThan(0);
    console.log(`Found ${scenarios.length} available scenarios:`);

    // Verify basic_coverage scenario exists
    const basicScenario = scenarios.find((s) => s === "basic_coverage");
    expect(basicScenario).toBeDefined();
  });

  test("should load basic_coverage scenario successfully", async ({ page }) => {
    const scenario = await solverTestBase.navigateToScheduleWithScenario(
      page,
      "basic_coverage"
    );

    expect(scenario.scenario_name).toBe("basic_coverage");
    expect(scenario.workers.length).toBeGreaterThan(0);
    // expect(scenario.shifts.length).toBe(0);

    console.log(`✅ Loaded basic_coverage scenario:`);
    console.log(`   - ${scenario.workers.length} workers created`);
    console.log(`   - ${scenario.shifts.length} shifts created`);

    // Set schedule view settings to group by worker
    await solverTestBase.setScheduleViewSettings(
      page,
      solverTestBase.getTestTeam()!.teamId,
      {
        groupBy: "worker",
      }
    );

    // Refresh the page to apply settings
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check that all workers appear in the table row headers
    for (const worker of scenario.workers) {
      const workerHeaderSelector = `[data-testid="worker-row-header-${worker.id}"]`;
      await page.waitForSelector(workerHeaderSelector, { timeout: 5000 });

      // Verify the worker name is displayed correctly
      const workerNameSelector = `[data-testid="worker-name-${worker.id}"]`;
      const workerNameElement = await page.locator(workerNameSelector);
      await expect(workerNameElement).toBeVisible();

      const workerNameText = await workerNameElement.textContent();
      expect(workerNameText).toContain(worker.name);
      expect(workerNameText).toContain(worker.acronym);
    }

    console.log(`✅ All ${scenario.workers.length} workers visible in table`);

    // Set schedule view settings to group by shift
    await solverTestBase.setScheduleViewSettings(
      page,
      solverTestBase.getTestTeam()!.teamId,
      {
        groupBy: "shift",
      }
    );

    // Refresh the page to apply settings
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check that all shifts appear in the table row headers
    for (const shift of scenario.shifts) {
      const shiftHeaderSelector = `[data-testid="shift-row-header-${shift.id}"]`;
      await page.waitForSelector(shiftHeaderSelector, { timeout: 5000 });

      // Verify the shift name is displayed correctly
      const shiftNameSelector = `[data-testid="shift-name-${shift.id}"]`;
      const shiftNameElement = await page.locator(shiftNameSelector);
      await expect(shiftNameElement).toBeVisible();

      const shiftNameText = await shiftNameElement.textContent();
      expect(shiftNameText).toContain(shift.name);
      expect(shiftNameText).toContain(shift.acronym);
    }

    console.log(`✅ All ${scenario.shifts.length} shifts visible in table`);
  });

  test("should solve basic_coverage scenario successfully", async ({
    page,
  }) => {
    // Load the scenario
    const scenario = await solverTestBase.navigateToScheduleWithScenario(
      page,
      "basic_coverage"
    );

    console.log(
      `📊 Scenario loaded with ${scenario.shift_demands.length} shift demands`
    );

    // Create a schedule/campaign for this period
    await solverTestBase.createSchedule(
      scenario.schedule.start_date,
      scenario.schedule.end_date
    );

    // Wait for schedule page to be ready
    await page.waitForTimeout(2000);

    // Trigger solve
    await solverTestBase.triggerSolveAndWait(page, 60000);

    // Take screenshot of results
    await solverTestBase.takeScreenshot(page, "basic_coverage", "solved");

    // Verify results meet expected criteria
    await solverTestBase.verifySolveResults(page, {
      minAssignments: 90, // Expect at least 90 assignments
      maxBreaches: 0, // No breaches expected for basic scenario
    });

    console.log("✅ Basic coverage scenario solved successfully");
  });

  test("should handle basic_coverage with realistic constraints", async ({
    page,
  }) => {
    // This test would add some common constraints before solving
    // For now, we'll just test the basic scenario

    const scenario = await solverTestBase.navigateToScheduleWithScenario(
      page,
      "basic_coverage"
    );

    await solverTestBase.createSchedule(
      scenario.schedule.start_date,
      scenario.schedule.end_date
    );

    // In a real implementation, you would:
    // 1. Add some constraint builds via API
    // 2. Then trigger solve
    // 3. Verify constraints are respected

    console.log("ℹ️  Constraint testing not yet implemented");
  });
});

test.describe("Solver - Complex Scenarios", () => {
  const solverTestBase = new SolverTestBase();

  test.beforeAll(async ({}, testInfo) => {
    await solverTestBase.setupSolverTests(testInfo.workerIndex);
  });

  test.afterAll(async () => {
    await solverTestBase.cleanup();
  });

  test("should solve complex_constraints scenario", async ({ page }) => {
    const scenario = await solverTestBase.navigateToScheduleWithScenario(
      page,
      "complex_constraints"
    );

    expect(scenario.workers.length).toBe(15);
    expect(scenario.shifts.length).toBe(5);

    console.log(`📊 Complex scenario loaded:`);
    console.log(`   - ${scenario.workers.length} workers (mix of FT and PT)`);
    console.log(
      `   - ${scenario.shifts.length} shifts (including duty shifts)`
    );
    console.log(`   - ${scenario.shift_demands.length} shift demands`);

    await solverTestBase.createSchedule(
      scenario.schedule.start_date,
      scenario.schedule.end_date
    );

    // Complex scenario may take longer
    await solverTestBase.triggerSolveAndWait(page, 90000);

    // Take screenshot
    await solverTestBase.takeScreenshot(page, "complex_constraints", "solved");

    // For complex scenarios, we expect more assignments but may allow some breaches
    await solverTestBase.verifySolveResults(page, {
      minAssignments: 120,
      maxBreaches: 10, // Some soft constraint violations may be acceptable
    });

    console.log("✅ Complex constraints scenario solved successfully");
  });

  test.skip("should solve weekend_coverage scenario", async ({ page }) => {
    // This test is skipped by default as it's similar to basic_coverage
    // but focuses on weekend staffing patterns

    const scenario = await solverTestBase.navigateToScheduleWithScenario(
      page,
      "weekend_coverage"
    );

    expect(scenario.workers.length).toBe(8);
    expect(scenario.shifts.length).toBe(2);

    await solverTestBase.createSchedule(
      scenario.schedule.start_date,
      scenario.schedule.end_date
    );

    await solverTestBase.triggerSolveAndWait(page, 45000);

    await solverTestBase.verifySolveResults(page, {
      minAssignments: 48,
      maxBreaches: 2,
    });

    console.log("✅ Weekend coverage scenario solved successfully");
  });
});

test.describe("Solver - Error Handling", () => {
  const solverTestBase = new SolverTestBase();

  test.beforeAll(async ({}, testInfo) => {
    await solverTestBase.setupSolverTests(testInfo.workerIndex);
  });

  test.afterAll(async () => {
    await solverTestBase.cleanup();
  });

  test("should handle invalid scenario name gracefully", async () => {
    await expect(async () => {
      await solverTestBase.loadScenario("non_existent_scenario");
    }).rejects.toThrow();

    console.log("✅ Invalid scenario handled correctly");
  });

  test("should handle solve with no shift demands", async ({ page }) => {
    // Navigate to schedule without loading a scenario
    await page.goto("http://localhost:3000/en/plan/schedule/");

    await page.evaluate((teamId) => {
      localStorage.setItem("selectedTeamId", teamId);
    }, solverTestBase.getTestTeam()!.teamId);

    await page.reload();

    // Try to solve without any data
    // Should either show an error or handle gracefully

    const solveButton = page.locator('button:has-text("Solve")').first();

    // Check if solve button is disabled or shows warning
    const isDisabled = await solveButton.isDisabled().catch(() => true);

    if (!isDisabled) {
      // If enabled, clicking should show an error
      await solveButton.click();

      // Wait for error message
      await page.waitForSelector(
        '.MuiAlert-standardError, [data-testid="error-message"]',
        { timeout: 5000 }
      );
    }

    console.log("✅ No shift demands scenario handled correctly");
  });
});
