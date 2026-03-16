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
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { DatabaseTestUtils } from "./database-utils";
import { SolverScenarioResult } from "./database-utils";
import {
  createScopedSolveFixture,
  ScopedSolveFixtureResult,
} from "../fixtures/scoped-solve-fixture";
import { AssignmentsRecurrencesResultT, AssignmentT } from "@/types/assignment";
import { ShiftDemandDTO } from "@/types/shiftDemand";
import { ShiftType, ShiftRestType, ShiftT } from "@/types/shift";
import { SolveScope } from "@/types/solveTaskStatus";
import { ScheduleT } from "@/types/schedule";

dayjs.extend(utc);

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
  protected currentFixture: ScopedSolveFixtureResult | null = null;

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
      this.testTeam.teamId,
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
    scenarioName: string,
  ): Promise<SolverScenarioResult> {
    const scenario = await this.loadScenario(scenarioName);

    // Set authentication headers before any navigation
    await this.dbUtils.authenticatePageAsTestUser(page);

    // Navigate to schedule page FIRST to establish proper origin
    await page.goto(`${testConfig.frontendUrl}/en/plan/schedule/`);
    await page.waitForLoadState("domcontentloaded");

    // Now set selected team in localStorage (after page has valid origin)
    await page.evaluate((teamId) => {
      localStorage.setItem("selectedTeamId", teamId);
    }, this.testTeam!.teamId);

    // Reload to apply localStorage changes
    await page.reload();
    await page.waitForLoadState("networkidle");

    console.log(
      `✅ Navigated to schedule page for team: ${this.testTeam!.name}`,
    );

    return scenario;
  }

  /**
   * Create a schedule/campaign for the loaded data
   * This is required before running the solver
   */
  async createSchedule(
    startDate: string,
    endDate: string,
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
      },
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
    timeoutMs: number = 60000,
  ): Promise<void> {
    console.log("🔄 Triggering solver...");

    // Look for solve button using data-testid and click it
    const solveButton = page.locator('[data-testid="solve-button"]');
    await solveButton.waitFor({ state: "visible", timeout: 5000 });

    // Verify button is not disabled before clicking
    const isDisabled = await solveButton.isDisabled();
    if (isDisabled) {
      throw new Error("Solve button is disabled");
    }

    await solveButton.click();
    console.log("⏳ Waiting for solver to complete...");

    // Wait for the solve button to be disabled (solving in progress)
    await page.waitForSelector('[data-testid="solve-button"]:disabled', {
      timeout: 5000,
    });
    console.log("🔄 Solver is running...");

    // Wait for the solve button to be enabled again (solving complete)
    await page.waitForSelector('[data-testid="solve-button"]:not(:disabled)', {
      timeout: timeoutMs,
    });
    console.log("✅ Solver completed");

    // Wait for status chip to appear (indicating UI has updated)
    await page.waitForSelector('[data-testid^="solve-status-chip-"]', {
      state: "visible",
      timeout: 5000,
    });

    // Check that there are no error or success snackbars open
    const errorSnackbar = await page.locator(
      '[data-testid="solve-error-snackbar"]',
    );
    const successSnackbar = await page.locator(
      '[data-testid="solve-success-snackbar"]',
    );

    const isErrorVisible = await errorSnackbar.isVisible().catch(() => false);
    const isSuccessVisible = await successSnackbar
      .isVisible()
      .catch(() => false);

    if (isErrorVisible) {
      const errorAlert = await page.locator(
        '[data-testid="solve-error-alert"]',
      );
      const errorText = await errorAlert.textContent();
      throw new Error(`Solver failed with error: ${errorText}`);
    }

    // Success snackbar is acceptable but should close
    if (isSuccessVisible) {
      console.log(
        "ℹ️  Success notification visible, waiting for it to close...",
      );
      await page.waitForSelector('[data-testid="solve-success-snackbar"]', {
        state: "hidden",
        timeout: 7000, // autoHideDuration is 6000ms
      });
    }

    // Check that the status chip shows a valid solved state
    const validStatuses = [
      "SOLVED_NO_BREACH",
      "NO_SOLUTION",
      "SOLVED_SOFT_BREACHED",
      "SOLVED_HARD_BREACHED",
    ];

    let statusFound = false;
    for (const status of validStatuses) {
      const statusChip = await page.locator(
        `[data-testid="solve-status-chip-${status}"]`,
      );
      const isVisible = await statusChip.isVisible().catch(() => false);
      if (isVisible) {
        console.log(`✅ Solver completed with status: ${status}`);
        statusFound = true;
        break;
      }
    }

    if (!statusFound) {
      throw new Error(
        `Expected solve status chip to show one of: ${validStatuses.join(", ")}`,
      );
    }

    console.log("✅ Solver completed successfully with valid status");
  }

  /**
   * Verify solve results meet expected criteria
   */
  async verifySolveResults(
    page: Page,
    expectedCriteria: VerifyCriteria,
  ): Promise<void> {
    console.log("🔍 Verifying solve results...");

    // Wait for assignment cells to be present in the DOM
    // This indicates the calendar has rendered the solve results
    await page
      .waitForSelector('[data-testid^="assignment-"]', {
        state: "attached",
        timeout: 5000,
      })
      .catch(() => {
        // If no assignments exist, that's valid (could be NO_SOLUTION)
        console.log("   No assignment cells found (possibly NO_SOLUTION)");
      });

    // Count assignments in the calendar view
    // This will depend on your actual UI implementation
    const assignmentCells = page.locator('[data-testid^="assignment-"]');
    const assignmentCount = await assignmentCells.count();

    console.log(`   Found ${assignmentCount} assignments`);

    if (expectedCriteria.minAssignments !== undefined) {
      expect(assignmentCount).toBeGreaterThanOrEqual(
        expectedCriteria.minAssignments,
      );
      console.log(`   ✅ Assignments >= ${expectedCriteria.minAssignments}`);
    }

    // Check for breaches if displayed in UI
    if (expectedCriteria.maxBreaches !== undefined) {
      const breachIndicators = page.locator(
        '[data-testid="constraint-breach"], .breach-indicator, .constraint-violation',
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
          expectedCriteria.coveragePercentage,
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
    description: string = "",
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
    },
  ): Promise<void> {
    // Ensure page has loaded and has a valid origin
    await page.waitForLoadState("domcontentloaded");

    await page.evaluate(
      ({ teamId, settings }) => {
        const storageKey = `scheduleViewSettings_${teamId}`;

        // Base defaults
        const defaultSettings = {
          timeFrame: "week",
          groupBy: "shift",
          showBreaches: true,
          showAssignments: true,
          showDailyShiftDemands: true,
          showRequests: true,
          periodStartDate: new Date().toISOString(),
        };

        // Read existing settings so partial calls (e.g. just groupBy) preserve other values
        const existingRaw = localStorage.getItem(storageKey);
        const existingSettings = existingRaw ? JSON.parse(existingRaw) : {};

        // Merge: defaults → existing → new settings
        const updatedSettings = {
          ...defaultSettings,
          ...existingSettings,
          ...settings,
        };

        localStorage.setItem(storageKey, JSON.stringify(updatedSettings));
      },
      { teamId, settings },
    );

    console.log(
      `✅ Set schedule view settings for team ${teamId}:`,
      JSON.stringify(settings, null, 2),
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

  // -------------------------------------------------------------------
  // Scoped-solve helpers
  // -------------------------------------------------------------------

  /**
   * Build the scoped-solve fixture (workers/shifts/demands/schedule) for the
   * current test team and store it as `currentFixture`.
   */
  async setupScopedSolveScenario(
    teamId: string,
  ): Promise<ScopedSolveFixtureResult> {
    const fixture = await createScopedSolveFixture(this.dbUtils, teamId);
    this.currentFixture = fixture;
    return fixture;
  }

  /**
   * Get the current scoped-solve fixture (throws if not set).
   */
  getCurrentFixture(): ScopedSolveFixtureResult {
    if (!this.currentFixture) {
      throw new Error(
        "No scoped solve fixture loaded. Call setupScopedSolveScenario first.",
      );
    }
    return this.currentFixture;
  }

  /**
   * Open the solve-scope dropdown and select the given scope.
   *
   * Requires:
   * - `data-testid="solve-dropdown-button"` on the dropdown toggle
   * - `data-testid="solve-scope-menu-item-{scope}"` on each menu item
   */
  async selectSolveScope(
    page: Page,
    scope: "FULL" | "DUTIES" | "NON_DUTIES" | "CUSTOM",
  ): Promise<void> {
    const dropdownBtn = page.locator('[data-testid="solve-dropdown-button"]');
    await dropdownBtn.waitFor({ state: "visible", timeout: 5000 });
    await dropdownBtn.click();

    const menuItem = page.locator(
      `[data-testid="solve-scope-menu-item-${scope}"]`,
    );
    await menuItem.waitFor({ state: "visible", timeout: 5000 });
    await menuItem.click();

    console.log(`✅ Selected solve scope: ${scope}`);
  }

  /**
   * Trigger a CUSTOM solve using the shift-view selection.
   *
   * Assumes CUSTOM scope is already active.
   * For each (shiftId, date) pair, clicks the custom-select cell, then
   * clicks the solve button, confirms the dialog, and waits for completion.
   */
  async triggerCustomSolveInShiftView(
    page: Page,
    solveScope: SolveScope,
    shiftDemands: ShiftDemandDTO[],
    timeoutMs: number = 120000,
  ): Promise<void> {
    // Helper to normalise dates to YYYY-MM-DD (UTC)
    const normDate = (d: any) => {
      if (typeof d === "number")
        return dayjs.unix(d).utc().format("YYYY-MM-DD");
      if (typeof d === "string") return dayjs.utc(d).format("YYYY-MM-DD");
      return (d as dayjs.Dayjs).utc().format("YYYY-MM-DD");
    };

    // Based on SolveScope, perform selections in the shift (calendar) view
    //  - shift_ids -> click shift row sparkle buttons
    //  - dates -> click date column sparkle buttons
    //  - shift_cells -> click daily-shift-demand cell sparkle buttons by demand id

    // Select by shift rows
    const shiftIds = solveScope.shift_ids || [];
    for (const shiftId of shiftIds) {
      const rowBtn = page.locator(
        `[data-testid="shift-row-custom-select-${shiftId}"]`,
      );
      await rowBtn.waitFor({ state: "visible", timeout: 5000 });
      await rowBtn.click();
    }

    // Select by dates (YYYY-MM-DD)
    const dates = solveScope.dates || [];
    for (const d of dates) {
      const dateStr = normDate(d);
      const dateBtn = page.locator(
        `[data-testid="date-column-sparkle-${dateStr}"]`,
      );
      await dateBtn.waitFor({ state: "visible", timeout: 5000 });
      await dateBtn.click();
    }

    // Select specific shift cells (requires mapping to shiftDemand ids)
    const shiftCells = solveScope.shift_cells || [];
    if (shiftCells.length > 0) {
      for (const c of shiftCells) {
        const cShiftId = c.shift_id;
        const cDate = c.date;
        const match = shiftDemands.find((sd) => {
          const sdDate = normDate(dayjs(sd.date));
          return sd.shiftId === cShiftId && sdDate === cDate;
        });
        if (match && (match as any).id) {
          const dsdBtn = page.locator(
            `[data-testid="dsd-custom-select-${(match as any).id}"]`,
          );
          await dsdBtn.waitFor({ state: "visible", timeout: 5000 });
          await dsdBtn.click();
        }
      }
    }

    // Click the solve button — this opens the confirm dialog in CUSTOM mode
    const solveButton = page.locator('[data-testid="solve-button"]');
    await solveButton.waitFor({ state: "visible", timeout: 5000 });
    await solveButton.click();

    // Confirm in the custom-solve dialog
    const confirmBtn = page.locator(
      '[data-testid="custom-solve-confirm-button"]',
    );
    await confirmBtn.waitFor({ state: "visible", timeout: 5000 });
    await confirmBtn.click();

    // Wait for solve to finish using the existing triggerSolveAndWait polling logic
    console.log("⏳ Waiting for custom (shift view) solve to complete...");
    await page.waitForSelector('[data-testid="solve-button"]:disabled', {
      timeout: 5000,
    });
    await page.waitForSelector('[data-testid="solve-button"]:not(:disabled)', {
      timeout: timeoutMs,
    });
    await page.waitForSelector('[data-testid^="solve-status-chip-"]', {
      state: "visible",
      timeout: 5000,
    });
    console.log("✅ Custom (shift view) solve completed");
  }

  /**
   * Trigger a CUSTOM solve using the worker-view selection.
   *
   * Assumes CUSTOM scope is already active.
   */
  async triggerCustomSolveInWorkerView(
    page: Page,
    solveScope: SolveScope,
    timeoutMs: number = 120000,
  ): Promise<void> {
    // Helper to normalise dates to YYYY-MM-DD (UTC)
    const normDate = (d: any) => {
      if (typeof d === "number")
        return dayjs.unix(d).utc().format("YYYY-MM-DD");
      if (typeof d === "string") return dayjs.utc(d).format("YYYY-MM-DD");
      return (d as dayjs.Dayjs).utc().format("YYYY-MM-DD");
    };

    // Based on SolveScope, perform selections in the worker view
    //  - worker_ids -> click worker row sparkle buttons
    //  - dates -> click date column sparkle buttons
    //  - worker_cells -> click worker cell sparkle buttons by workerId+date

    const workerIds = solveScope.worker_ids || [];
    for (const workerId of workerIds) {
      const rowBtn = page.locator(
        `[data-testid="worker-row-custom-select-${workerId}"]`,
      );
      await rowBtn.waitFor({ state: "visible", timeout: 5000 });
      await rowBtn.click();
    }

    const dates = solveScope.dates || [];
    for (const d of dates) {
      const dateStr = normDate(d);
      const dateBtn = page.locator(
        `[data-testid="date-column-sparkle-${dateStr}"]`,
      );
      await dateBtn.waitFor({ state: "visible", timeout: 5000 });
      await dateBtn.click();
    }

    const workerCells = solveScope.worker_cells || [];
    for (const c of workerCells) {
      const wId = c.worker_id;
      const dateStr = normDate(c.date);
      const cellSelector = `[data-testid="worker-cell-custom-select-${wId}-${dateStr}"]`;
      const cell = page.locator(cellSelector);
      await cell.waitFor({ state: "visible", timeout: 5000 });
      await cell.click();
    }

    const solveButton = page.locator('[data-testid="solve-button"]');
    await solveButton.waitFor({ state: "visible", timeout: 5000 });
    await solveButton.click();

    const confirmBtn = page.locator(
      '[data-testid="custom-solve-confirm-button"]',
    );
    await confirmBtn.waitFor({ state: "visible", timeout: 5000 });
    await confirmBtn.click();

    console.log("⏳ Waiting for custom (worker view) solve to complete...");
    await page.waitForSelector('[data-testid="solve-button"]:disabled', {
      timeout: 5000,
    });
    await page.waitForSelector('[data-testid="solve-button"]:not(:disabled)', {
      timeout: timeoutMs,
    });
    await page.waitForSelector('[data-testid^="solve-status-chip-"]', {
      state: "visible",
      timeout: 5000,
    });
    console.log("✅ Custom (worker view) solve completed");
  }

  /**
   * Fetch all assignments for the current test team within the given date range.
   * Wraps dbUtils.getAssignmentsAndRecurrences for convenience.
   */
  async getAssignmentsForTeam(
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
  ): Promise<AssignmentsRecurrencesResultT> {
    if (!this.testTeam) {
      throw new Error("Test team not created. Call setupSolverTests first.");
    }
    return this.dbUtils.getAssignmentsAndRecurrences(
      this.testTeam.teamId,
      true, // include campaign assignments
      startDate,
      endDate,
    );
  }

  /**
   * Check whether the provided assignments exactly correspond to in-scope shift demands
   * - `solveScope` mirrors the engine SolveScope shape (minimal fields used below)
   * - `assignments` is the list of assignments produced by the solver
   * - `shiftDemands` is the list of all campaign shift demands
   *
   * Returns `true` only if:
   *  - every assignment maps to a demand that is considered "in scope", and
   *  - every in-scope demand is fulfilled (assignment count >= demand.count)
   */
  areAssignmentsFulfillingScope(
    solveScope: SolveScope,
    assignments: AssignmentT[],
    shiftDemands: ShiftDemandDTO[],
    schedule: ScheduleT,
    shifts: ShiftT[],
  ): boolean {
    // Helper to normalise dates to YYYY-MM-DD (UTC)
    const normDate = (d: dayjs.Dayjs | number | string) => {
      if (typeof d === "number")
        return dayjs.unix(d).utc().format("YYYY-MM-DD");
      if (typeof d === "string") return dayjs.utc(d).format("YYYY-MM-DD");
      return (d as dayjs.Dayjs).utc().format("YYYY-MM-DD");
    };

    // Filter assignments and demands to the campaign period
    const start = schedule.startDate.startOf("day");
    const end = schedule.endDate.endOf("day");

    // Build a lookup map from shift id -> ShiftT for fast access
    const shiftsMap: Record<string, ShiftT> = {};
    for (const s of shifts) {
      shiftsMap[s.id] = s;
    }

    const assignmentsInCampaign = assignments.filter((a) => {
      const ad = (a.date as dayjs.Dayjs).utc();
      // Must be inside campaign period
      if (ad.isBefore(start, "day") || ad.isAfter(end, "day")) return false;

      // Use the provided shifts list (lookup map) to only keep NORMAL or DUTY
      const shift = shiftsMap[a.shiftId];
      if (!shift) return false;
      return (
        shift.shiftType === ShiftType.NORMAL ||
        shift.shiftType === ShiftType.DUTY
      );
    });

    const shiftDemandsInCampaign = shiftDemands.filter((d) => {
      const dd =
        typeof d.date === "number"
          ? dayjs.unix(d.date).utc()
          : dayjs.utc(d.date);
      return !dd.isBefore(start, "day") && !dd.isAfter(end, "day");
    });

    // Build demand map keyed by `${date}|${shiftId}` -> count
    // Also keep demandIds for improved error messages when unmet
    const demandMap: Record<string, number> = {};
    const demandDetails: Record<string, string[]> = {};
    for (const d of shiftDemandsInCampaign) {
      const key = `${normDate(d.date)}|${d.shiftId}`;
      demandMap[key] = (demandMap[key] || 0) + (d.count || 0);
      demandDetails[key] = demandDetails[key] || [];
      if ((d as any).id) demandDetails[key].push(String((d as any).id));
    }

    // Compute in-scope keys based on solveScope
    const inScopeKeys = new Set<string>();

    const scopeType = solveScope.scope_type;

    // Helper: include all demands matching predicate
    const includeIf = (pred: (d: ShiftDemandDTO) => boolean) => {
      for (const d of shiftDemandsInCampaign) {
        if (pred(d)) inScopeKeys.add(`${normDate(d.date)}|${d.shiftId}`);
      }
    };

    if (scopeType === "FULL") {
      // everything
      for (const key of Object.keys(demandMap)) inScopeKeys.add(key);
    } else if (scopeType === "DUTIES") {
      // duty or recuperation shifts
      const dutyIds = new Set<string>();
      const svals = Object.values(shiftsMap) as any[];
      for (const s of svals) {
        if (
          s.shiftType === ShiftType.DUTY ||
          s.restType === ShiftRestType.RECUPERATION
        ) {
          dutyIds.add(s.id);
        }
      }
      includeIf((d) => dutyIds.has(d.shiftId));
    } else if (scopeType === "NON_DUTIES") {
      const nonDutyIds = new Set<string>();
      const svals = Object.values(shiftsMap) as any[];
      for (const s of svals) {
        if (s.shiftType === ShiftType.NORMAL) nonDutyIds.add(s.id);
      }
      includeIf((d) => nonDutyIds.has(d.shiftId));
    } else if (scopeType === "CUSTOM") {
      const solveView = solveScope?.solve_view || "shift";

      if (solveView === "shift") {
        const shiftIds: string[] = solveScope?.shift_ids || [];
        const dates: string[] = solveScope?.dates || [];
        const shiftCells: any[] = solveScope?.shift_cells || [];

        if (shiftIds.length > 0) includeIf((d) => shiftIds.includes(d.shiftId));
        if (dates.length > 0)
          includeIf((d) => dates.includes(normDate(d.date)));
        if (shiftCells.length > 0) {
          for (const c of shiftCells) {
            const key = `${normDate(c.date)}|${c.shift_id || c.shiftId}`;
            if (demandMap[key]) inScopeKeys.add(key);
          }
        }
      } else if (solveView === "worker") {
        // Worker view selections are typically dates or worker_cells
        const dates: string[] = solveScope?.dates || [];
        const workerCells: any[] = solveScope?.worker_cells || [];

        if (dates.length > 0)
          includeIf((d) => dates.includes(normDate(d.date)));
        if (workerCells.length > 0) {
          const ws = new Set<string>(workerCells.map((c) => normDate(c.date)));
          includeIf((d) => ws.has(normDate(d.date)));
        }
      }
    }

    // If no in-scope keys were computed, treat as empty scope (nothing should be assigned)

    // Count assignments per key and ensure they are in-scope
    const assignmentCounts: Record<string, number> = {};
    for (const a of assignmentsInCampaign) {
      const dateStr = (a.date as dayjs.Dayjs).utc().format("YYYY-MM-DD");
      const key = `${dateStr}|${a.shiftId}`;
      // assignment must be in-scope — if not, throw an explicit error with details
      if (!inScopeKeys.has(key)) {
        throw new Error(
          `Assignment (${a.workerId}, ${dateStr}, ${a.shiftId}) is not in scope`,
        );
      }
      assignmentCounts[key] = (assignmentCounts[key] || 0) + 1;
    }

    // Ensure all in-scope demands are fulfilled — throw informative error if not
    for (const key of Array.from(inScopeKeys)) {
      const demandCount = demandMap[key] || 0;
      const assigned = assignmentCounts[key] || 0;
      if (assigned !== demandCount) {
        const [dateStr, shiftId] = key.split("|");
        const demandIds = demandDetails[key] || [];
        throw new Error(
          `Demand ${
            demandIds.length ? demandIds.join(",") : "unknown"
          } for shift ${shiftId} on ${dateStr} requires ${demandCount} assignments but got ${assigned}`,
        );
      }
    }

    return true;
  }
}
