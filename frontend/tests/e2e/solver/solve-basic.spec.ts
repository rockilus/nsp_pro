/**
 * E2E Tests for Solver - Basic Coverage Scenarios
 *
 * These tests verify that the solver can generate valid schedules
 * for various scenarios with different complexity levels.
 */

import { test, expect } from "@playwright/test";
import { SolverTestBase } from "../../utils/solver-test-base";
import { ScheduleStatus } from "@/types/schedule";
import { ShiftType } from "@/types/shift";

// Hardcoded list of test scenarios
// This list is used across multiple tests to ensure consistency
const TEST_SCENARIOS = [
  "basic_coverage",
  "benoit_scenario_0",
  "benoit_scenario_1",
] as const;

test.describe("Solver - Basic Coverage", () => {
  test("should list available solver test scenarios", async ({}, testInfo) => {
    const solverTestBase = new SolverTestBase();
    await solverTestBase.setupSolverTests(testInfo.workerIndex);

    const scenarios = await solverTestBase.listAvailableScenarios();

    expect(scenarios.length).toBeGreaterThan(0);
    console.log(`Found ${scenarios.length} available scenarios:`);

    // Verify all test scenarios exist
    // Ensure every expected test scenario appears in the returned list
    for (const scenarioName of TEST_SCENARIOS) {
      expect(scenarios).toContain(scenarioName);
      console.log(`   ✓ ${scenarioName}`);
    }
  });

  // Parameterized test - runs individually for each scenario in UI mode
  for (const scenarioName of TEST_SCENARIOS) {
    test(`should load ${scenarioName} scenario successfully`, async ({
      page,
    }, testInfo) => {
      const solverTestBase = new SolverTestBase();
      await solverTestBase.setupSolverTests(testInfo.workerIndex);

      const scenario = await solverTestBase.navigateToScheduleWithScenario(
        page,
        scenarioName
      );

      expect(scenario.scenario_name).toBe(scenarioName);
      expect(scenario.workers.length).toBeGreaterThan(0);

      // Find the campaign schedule inside the scenario schedules
      const campaignSchedule = scenario.schedules.find(
        (s: any) => s.status === ScheduleStatus.CAMPAIGN
      );

      if (!campaignSchedule) {
        throw new Error("No campaign schedule found in scenario.schedules");
      }

      console.log(`✅ Loaded ${scenarioName} scenario:`);
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

      // Check that employed workers appear in the table row headers
      const employedWorkers = scenario.workers.filter((worker: any) => {
        // Employed if start <= campaignEndDate and (no end or end >= campaignStartDate)
        return (
          worker.startDate <= campaignSchedule.endDate &&
          (worker.endDate === null ||
            worker.endDate >= campaignSchedule.startDate)
        );
      });

      for (const worker of employedWorkers) {
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

      console.log(
        `✅ All ${employedWorkers.length} employed workers visible in table`
      );

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

      // Check that only NORMAL and DUTY shifts appear in the table row headers
      const visibleShifts = scenario.shifts.filter(
        (shift: any) =>
          shift.shiftType === ShiftType.NORMAL ||
          shift.shiftType === ShiftType.DUTY
      );

      for (const shift of visibleShifts) {
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

      console.log(
        `✅ All ${visibleShifts.length} NORMAL/DUTY shifts visible in table`
      );
    });
  }

  // Parameterized test - runs individually for each scenario in UI mode
  for (const scenarioName of TEST_SCENARIOS) {
    test(`should solve ${scenarioName} scenario successfully`, async ({
      page,
    }, testInfo) => {
      const solverTestBase = new SolverTestBase();
      await solverTestBase.setupSolverTests(testInfo.workerIndex);

      // Load the scenario
      const scenario = await solverTestBase.navigateToScheduleWithScenario(
        page,
        scenarioName
      );

      // Trigger solve
      await solverTestBase.triggerSolveAndWait(page, 120000);

      console.log(`✅ ${scenarioName} scenario solved successfully`);
    });
  }
});

// test.describe("Solver - Error Handling", () => {
//   const solverTestBase = new SolverTestBase();

//   test.beforeAll(async ({}, testInfo) => {
//     await solverTestBase.setupSolverTests(testInfo.workerIndex);
//   });

//   test.afterAll(async () => {
//     await solverTestBase.cleanup();
//   });

//   test("should handle invalid scenario name gracefully", async () => {
//     await expect(async () => {
//       await solverTestBase.loadScenario("non_existent_scenario");
//     }).rejects.toThrow();

//     console.log("✅ Invalid scenario handled correctly");
//   });

//   test("should handle solve with no shift demands", async ({ page }) => {
//     // Navigate to schedule without loading a scenario
//     await page.goto("http://localhost:3000/en/plan/schedule/");

//     await page.evaluate((teamId) => {
//       localStorage.setItem("selectedTeamId", teamId);
//     }, solverTestBase.getTestTeam()!.teamId);

//     await page.reload();

//     // Try to solve without any data
//     // Should either show an error or handle gracefully

//     const solveButton = page.locator('button:has-text("Solve")').first();

//     // Check if solve button is disabled or shows warning
//     const isDisabled = await solveButton.isDisabled().catch(() => true);

//     if (!isDisabled) {
//       // If enabled, clicking should show an error
//       await solveButton.click();

//       // Wait for error message
//       await page.waitForSelector(
//         '.MuiAlert-standardError, [data-testid="error-message"]',
//         { timeout: 5000 }
//       );
//     }

//     console.log("✅ No shift demands scenario handled correctly");
//   });
// });
