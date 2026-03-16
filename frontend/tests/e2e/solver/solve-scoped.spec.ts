/**
 * E2E Tests for Solver - Scoped Solve
 *
 * Tests covering all partial-solve behaviours:
 * FULL, DUTIES, NON_DUTIES, CUSTOM (shift-view & worker-view).
 *
 * Each test gets its own isolated team via setupSolverTests.
 * Fixture data is created dynamically by createScopedSolveFixture.
 */

import { test, expect, Page } from "@playwright/test";
import { randomUUID } from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { SolverTestBase } from "../../utils/solver-test-base";

dayjs.extend(utc);

const TEST_TIMEOUT_MS = 180_000;

const testConfig = {
  frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
};

/** Navigate to the schedule page and set the team in localStorage. */
async function navigateToSchedulePage(
  page: Page,
  solverTestBase: SolverTestBase,
): Promise<void> {
  // Authenticate before navigation
  await (solverTestBase as any).dbUtils.authenticatePageAsTestUser(page);

  await page.goto(`${testConfig.frontendUrl}/en/plan/schedule/`);
  await page.waitForLoadState("domcontentloaded");

  await page.evaluate((teamId: string) => {
    localStorage.setItem("selectedTeamId", teamId);
  }, solverTestBase.getTestTeam()!.teamId);

  await page.reload();
  await page.waitForLoadState("networkidle");
}

test.describe("Solver - Scoped Solve", () => {
  // Map from testRunId → SolverTestBase, one entry per concurrent worker
  const testBasesMap = new Map<string, SolverTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    (testInfo as any).testRunId = testRunId;

    const solverTestBase = new SolverTestBase();
    testBasesMap.set(testRunId, solverTestBase);

    // Fresh team per test
    await solverTestBase.setupSolverTests(workerIndex);

    const teamId = solverTestBase.getTestTeam()!.teamId;

    // Build workers / shifts / demands / schedule
    await solverTestBase.setupScopedSolveScenario(teamId);

    // Navigate to the schedule page
    await navigateToSchedulePage(page, solverTestBase);

    // Set monthly view on the campaign month (default groupBy: shift)
    const fixture = solverTestBase.getCurrentFixture();
    await solverTestBase.setScheduleViewSettings(page, teamId, {
      timeFrame: "month",
      groupBy: "shift",
      periodStartDate: fixture.campaignStart.toISOString(),
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    console.log(`[${testRunId}] beforeEach complete`);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (testRunId) {
      testBasesMap.delete(testRunId);
    }
  });

  // ------------------------------------------------------------------ //
  // Test 1 — Full campaign solve
  // ------------------------------------------------------------------ //
  test("Full campaign solve assigns morning, afternoon and duty shifts", async ({
    page,
  }, testInfo) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    const testRunId = (testInfo as any).testRunId as string;
    const solverTestBase = testBasesMap.get(testRunId)!;
    const fixture = solverTestBase.getCurrentFixture();

    // Default scope is FULL — just trigger solve
    await solverTestBase.triggerSolveAndWait(page, TEST_TIMEOUT_MS);

    // API assertion: assignments exist for morning+afternoon+duty
    const result = await solverTestBase.getAssignmentsForTeam(
      fixture.campaignStart,
      fixture.campaignEnd,
    );
    const assignments = result.assignmentsRead;

    // Verify all in-scope (FULL) shift demands are fulfilled by the assignments
    const allFulfilled = solverTestBase.areAssignmentsFulfillingScope(
      { scope_type: "FULL" },
      assignments,
      fixture.shiftDemands,
      fixture.schedule,
    );
    expect(allFulfilled).toBe(true);

    // UI assertion: at least one assignment-cell visible
    const assignmentCells = page.locator('[data-testid^="assignment-cell-"]');
    expect(await assignmentCells.count()).toBeGreaterThan(0);

    console.log("✅ Test 1: Full campaign solve — assignments found");
  });

  // ------------------------------------------------------------------ //
  // Test 2 — DUTIES scope: only duty assigned
  // ------------------------------------------------------------------ //
  test("DUTIES scope assigns only duty shifts", async ({ page }, testInfo) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    const testRunId = (testInfo as any).testRunId as string;
    const solverTestBase = testBasesMap.get(testRunId)!;
    const fixture = solverTestBase.getCurrentFixture();

    await solverTestBase.selectSolveScope(page, "DUTIES");
    await solverTestBase.triggerSolveAndWait(page, TEST_TIMEOUT_MS);

    const result = await solverTestBase.getAssignmentsForTeam(
      fixture.campaignStart,
      fixture.campaignEnd,
    );
    const assignments = result.assignmentsRead;

    const dutyAssignments = assignments.filter(
      (a) => a.shiftId === fixture.shifts.duty.id,
    );
    const morningAssignments = assignments.filter(
      (a) => a.shiftId === fixture.shifts.morning.id,
    );
    const afternoonAssignments = assignments.filter(
      (a) => a.shiftId === fixture.shifts.afternoon.id,
    );

    expect(dutyAssignments.length).toBeGreaterThan(0);
    expect(morningAssignments.length).toBe(0);
    expect(afternoonAssignments.length).toBe(0);

    // UI assertion
    const assignmentCells = page.locator('[data-testid^="assignment-cell-"]');
    expect(await assignmentCells.count()).toBeGreaterThan(0);

    console.log("✅ Test 2: DUTIES scope — only duty assignments found");
  });

  // ------------------------------------------------------------------ //
  // Test 3 — NON_DUTIES scope: only morning/afternoon assigned
  // ------------------------------------------------------------------ //
  test("NON_DUTIES scope assigns only morning and afternoon shifts", async ({
    page,
  }, testInfo) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    const testRunId = (testInfo as any).testRunId as string;
    const solverTestBase = testBasesMap.get(testRunId)!;
    const fixture = solverTestBase.getCurrentFixture();

    await solverTestBase.selectSolveScope(page, "NON_DUTIES");
    await solverTestBase.triggerSolveAndWait(page, TEST_TIMEOUT_MS);

    const result = await solverTestBase.getAssignmentsForTeam(
      fixture.campaignStart,
      fixture.campaignEnd,
    );
    const assignments = result.assignmentsRead;

    const dutyAssignments = assignments.filter(
      (a) => a.shiftId === fixture.shifts.duty.id,
    );
    const nonDutyAssignments = assignments.filter(
      (a) =>
        a.shiftId === fixture.shifts.morning.id ||
        a.shiftId === fixture.shifts.afternoon.id,
    );

    expect(nonDutyAssignments.length).toBeGreaterThan(0);
    expect(dutyAssignments.length).toBe(0);

    // UI assertion
    const assignmentCells = page.locator('[data-testid^="assignment-cell-"]');
    expect(await assignmentCells.count()).toBeGreaterThan(0);

    console.log(
      "✅ Test 3: NON_DUTIES scope — only non-duty assignments found",
    );
  });

  // ------------------------------------------------------------------ //
  // Test 4 — CUSTOM shift view: selected shifts covered
  // ------------------------------------------------------------------ //
  test("CUSTOM shift view assigns only selected shifts", async ({
    page,
  }, testInfo) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    const testRunId = (testInfo as any).testRunId as string;
    const solverTestBase = testBasesMap.get(testRunId)!;
    const fixture = solverTestBase.getCurrentFixture();

    // Shift view is already set by beforeEach; activate CUSTOM scope directly
    await solverTestBase.selectSolveScope(page, "CUSTOM");

    // Build weekday dates for the first week of the campaign month
    const firstMonday = fixture.firstMonday;
    const weekDates: string[] = [];
    for (let i = 0; i < 5; i++) {
      weekDates.push(firstMonday.add(i, "day").format("YYYY-MM-DD"));
    }

    const shiftIds = [fixture.shifts.morning.id, fixture.shifts.afternoon.id];

    await solverTestBase.triggerCustomSolveInShiftView(
      page,
      shiftIds,
      weekDates,
      TEST_TIMEOUT_MS,
    );

    const result = await solverTestBase.getAssignmentsForTeam(
      fixture.campaignStart,
      fixture.campaignEnd,
    );
    const assignments = result.assignmentsRead;

    const dutyAssignments = assignments.filter(
      (a) => a.shiftId === fixture.shifts.duty.id,
    );
    const morningOrAfternoon = assignments.filter(
      (a) =>
        a.shiftId === fixture.shifts.morning.id ||
        a.shiftId === fixture.shifts.afternoon.id,
    );

    expect(morningOrAfternoon.length).toBeGreaterThan(0);
    expect(dutyAssignments.length).toBe(0);

    // UI assertion
    const assignmentCells = page.locator('[data-testid^="assignment-cell-"]');
    expect(await assignmentCells.count()).toBeGreaterThan(0);

    console.log(
      "✅ Test 4: CUSTOM shift view — only morning/afternoon assignments",
    );
  });

  // ------------------------------------------------------------------ //
  // Test 5 — CUSTOM worker view: only selected workers covered
  // ------------------------------------------------------------------ //
  test("CUSTOM worker view assigns only selected workers", async ({
    page,
  }, testInfo) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    const testRunId = (testInfo as any).testRunId as string;
    const solverTestBase = testBasesMap.get(testRunId)!;
    const fixture = solverTestBase.getCurrentFixture();
    const teamId = solverTestBase.getTestTeam()!.teamId;

    // Switch to worker view (preserves campaign month periodStartDate from beforeEach)
    await solverTestBase.setScheduleViewSettings(page, teamId, {
      groupBy: "worker",
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Activate CUSTOM scope
    await solverTestBase.selectSolveScope(page, "CUSTOM");

    // Select first 2 workers
    const selectedWorkers = [fixture.workers[0], fixture.workers[1]];
    const selectedWorkerIds = selectedWorkers.map((w) => w.id);

    // Build weekday dates for the first week of the campaign month
    const firstMonday = fixture.firstMonday;
    const weekDates: string[] = [];
    for (let i = 0; i < 5; i++) {
      weekDates.push(firstMonday.add(i, "day").format("YYYY-MM-DD"));
    }

    await solverTestBase.triggerCustomSolveInWorkerView(
      page,
      selectedWorkerIds,
      weekDates,
      TEST_TIMEOUT_MS,
    );

    const result = await solverTestBase.getAssignmentsForTeam(
      fixture.campaignStart,
      fixture.campaignEnd,
    );
    const assignments = result.assignmentsRead;

    // Only selected workers should have assignments
    const unselectedWorkerAssignments = assignments.filter(
      (a) =>
        !selectedWorkerIds.includes(a.workerId) &&
        weekDates.includes(a.date.format("YYYY-MM-DD")),
    );

    expect(unselectedWorkerAssignments.length).toBe(0);

    // UI assertion
    const assignmentCells = page.locator('[data-testid^="assignment-cell-"]');
    expect(await assignmentCells.count()).toBeGreaterThan(0);

    console.log(
      "✅ Test 5: CUSTOM worker view — only selected workers have assignments",
    );
  });

  // ------------------------------------------------------------------ //
  // Test 6 — Out-of-scope assignments not deleted (DUTIES scope)
  // ------------------------------------------------------------------ //
  test("DUTIES scope does not delete existing non-duty assignments", async ({
    page,
  }, testInfo) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    const testRunId = (testInfo as any).testRunId as string;
    const solverTestBase = testBasesMap.get(testRunId)!;
    const fixture = solverTestBase.getCurrentFixture();
    const teamId = solverTestBase.getTestTeam()!.teamId;

    // Pre-create morning assignments for workers[0] and workers[1] on firstMonday
    const morningDate = fixture.firstMonday;
    const assignmentResult1 = await (
      solverTestBase as any
    ).dbUtils.createAssignmentAndRecurrence({
      teamId,
      workerId: fixture.workers[0].id,
      shiftId: fixture.shifts.morning.id,
      date: morningDate,
      scheduleId: fixture.schedule.id,
    });
    const assignmentResult2 = await (
      solverTestBase as any
    ).dbUtils.createAssignmentAndRecurrence({
      teamId,
      workerId: fixture.workers[1].id,
      shiftId: fixture.shifts.morning.id,
      date: morningDate,
      scheduleId: fixture.schedule.id,
    });

    const preAssignment1 = assignmentResult1.assignmentsRead[0];
    const preAssignment2 = assignmentResult2.assignmentsRead[0];

    expect(preAssignment1).toBeDefined();
    expect(preAssignment2).toBeDefined();

    // Run DUTIES solve
    await solverTestBase.selectSolveScope(page, "DUTIES");
    await solverTestBase.triggerSolveAndWait(page, TEST_TIMEOUT_MS);

    // Verify morning assignments still exist post-solve
    const result = await solverTestBase.getAssignmentsForTeam(
      fixture.campaignStart,
      fixture.campaignEnd,
    );
    const assignments = result.assignmentsRead;

    const morningAfterSolve = assignments.filter(
      (a) => a.shiftId === fixture.shifts.morning.id,
    );
    expect(morningAfterSolve.length).toBeGreaterThanOrEqual(2);

    // UI assertion: morning assignment-cells still visible
    const assignmentCell1 = page.locator(
      `[data-testid="assignment-cell-${preAssignment1.id}"]`,
    );
    const assignmentCell2 = page.locator(
      `[data-testid="assignment-cell-${preAssignment2.id}"]`,
    );
    await expect(assignmentCell1).toBeVisible({ timeout: 5000 });
    await expect(assignmentCell2).toBeVisible({ timeout: 5000 });

    console.log(
      "✅ Test 6: DUTIES scope — pre-existing morning assignments preserved",
    );
  });

  // ------------------------------------------------------------------ //
  // Test 7 — Fixed assignment unchanged (FULL scope)
  // ------------------------------------------------------------------ //
  test("FULL scope does not overwrite fixed assignments", async ({
    page,
  }, testInfo) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    const testRunId = (testInfo as any).testRunId as string;
    const solverTestBase = testBasesMap.get(testRunId)!;
    const fixture = solverTestBase.getCurrentFixture();
    const teamId = solverTestBase.getTestTeam()!.teamId;

    // Create a fixed assignment on firstMonday for worker[0] + morning
    const fixedResult = await (
      solverTestBase as any
    ).dbUtils.createAssignmentAndRecurrence({
      teamId,
      workerId: fixture.workers[0].id,
      shiftId: fixture.shifts.morning.id,
      date: fixture.firstMonday,
      fixed: true,
      scheduleId: fixture.schedule.id,
    });

    const fixedAssignment = fixedResult.assignmentsRead[0];
    expect(fixedAssignment).toBeDefined();
    expect(fixedAssignment.fixed).toBe(true);

    // Run FULL solve
    await solverTestBase.triggerSolveAndWait(page, TEST_TIMEOUT_MS);

    // Verify fixed assignment still present with same id and fixed=true
    const result = await solverTestBase.getAssignmentsForTeam(
      fixture.campaignStart,
      fixture.campaignEnd,
    );
    const afterSolveAssignment = result.assignmentsRead.find(
      (a) => a.id === fixedAssignment.id,
    );

    expect(afterSolveAssignment).toBeDefined();
    expect(afterSolveAssignment!.fixed).toBe(true);

    // UI assertion: assignment-cell still present
    const fixedCell = page.locator(
      `[data-testid="assignment-cell-${fixedAssignment.id}"]`,
    );
    await expect(fixedCell).toBeVisible({ timeout: 5000 });

    console.log(
      "✅ Test 7: FULL scope — fixed assignment preserved with fixed=true",
    );
  });

  // ------------------------------------------------------------------ //
  // Test 8 — CUSTOM shift cell with no demand (morning on Saturday)
  // ------------------------------------------------------------------ //
  test("CUSTOM shift view with no demand produces zero assignments", async ({
    page,
  }, testInfo) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    const testRunId = (testInfo as any).testRunId as string;
    const solverTestBase = testBasesMap.get(testRunId)!;
    const fixture = solverTestBase.getCurrentFixture();

    // Shift view is already set by beforeEach; activate CUSTOM scope directly
    await solverTestBase.selectSolveScope(page, "CUSTOM");

    const saturdayDate = fixture.firstSaturday.format("YYYY-MM-DD");

    // Request solve for morning on firstSaturday (no demand exists)
    await solverTestBase.triggerCustomSolveInShiftView(
      page,
      [fixture.shifts.morning.id],
      [saturdayDate],
      TEST_TIMEOUT_MS,
    );

    // No assignments expected for morning on firstSaturday
    const result = await solverTestBase.getAssignmentsForTeam(
      fixture.firstSaturday,
      fixture.firstSaturday,
    );
    const morningOnSaturday = result.assignmentsRead.filter(
      (a) => a.shiftId === fixture.shifts.morning.id,
    );
    expect(morningOnSaturday.length).toBe(0);

    // UI: shift cell for morning on firstSaturday should have no assignment-cell inside
    const shiftCellSelector = `[data-testid="shift-cell-${fixture.shifts.morning.id}-${saturdayDate}"]`;
    const assignmentCellsInCell = page.locator(
      `${shiftCellSelector} [data-testid^="assignment-cell-"]`,
    );
    expect(await assignmentCellsInCell.count()).toBe(0);

    console.log(
      "✅ Test 8: CUSTOM shift view on Saturday (no demand) — zero assignments",
    );
  });

  // ------------------------------------------------------------------ //
  // Test 9 — CUSTOM worker cell unfulfilled demand gets allocated
  // ------------------------------------------------------------------ //
  test("CUSTOM worker view fills unfulfilled demand for selected worker", async ({
    page,
  }, testInfo) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    const testRunId = (testInfo as any).testRunId as string;
    const solverTestBase = testBasesMap.get(testRunId)!;
    const fixture = solverTestBase.getCurrentFixture();
    const teamId = solverTestBase.getTestTeam()!.teamId;

    // Pre-assign workers[1..9] to afternoon and duty on firstMonday,
    // leaving only morning demand=1 unfulfilled; worker[0] is free
    const preDate = fixture.firstMonday;

    await (solverTestBase as any).dbUtils.createAssignmentAndRecurrence({
      teamId,
      workerId: fixture.workers[1].id,
      shiftId: fixture.shifts.afternoon.id,
      date: preDate,
      scheduleId: fixture.schedule.id,
    });
    await (solverTestBase as any).dbUtils.createAssignmentAndRecurrence({
      teamId,
      workerId: fixture.workers[2].id,
      shiftId: fixture.shifts.duty.id,
      date: preDate,
      scheduleId: fixture.schedule.id,
    });

    // Switch to worker view (preserves campaign month periodStartDate from beforeEach)
    await solverTestBase.setScheduleViewSettings(page, teamId, {
      groupBy: "worker",
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await solverTestBase.selectSolveScope(page, "CUSTOM");

    const mondayDateStr = preDate.format("YYYY-MM-DD");

    await solverTestBase.triggerCustomSolveInWorkerView(
      page,
      [fixture.workers[0].id],
      [mondayDateStr],
      TEST_TIMEOUT_MS,
    );

    // worker[0] should have ≥1 assignment on firstMonday
    const result = await solverTestBase.getAssignmentsForTeam(preDate, preDate);
    const worker0Assignments = result.assignmentsRead.filter(
      (a) => a.workerId === fixture.workers[0].id,
    );
    expect(worker0Assignments.length).toBeGreaterThanOrEqual(1);

    // UI: assignment-cell visible in worker[0] row for that date
    const workerRowSelector = `[data-testid="worker-row-header-${fixture.workers[0].id}"]`;
    await expect(page.locator(workerRowSelector)).toBeVisible({
      timeout: 5000,
    });

    console.log(
      "✅ Test 9: CUSTOM worker view — unfulfilled demand allocated to worker[0]",
    );
  });

  // ------------------------------------------------------------------ //
  // Test 10 — CUSTOM worker cell: all demands fulfilled → no allocation
  // ------------------------------------------------------------------ //
  test("CUSTOM worker view does not allocate when all demands are already fulfilled", async ({
    page,
  }, testInfo) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    const testRunId = (testInfo as any).testRunId as string;
    const solverTestBase = testBasesMap.get(testRunId)!;
    const fixture = solverTestBase.getCurrentFixture();
    const teamId = solverTestBase.getTestTeam()!.teamId;

    // Fill all demand=1 slots on firstMonday
    const preDate = fixture.firstMonday;
    await (solverTestBase as any).dbUtils.createAssignmentAndRecurrence({
      teamId,
      workerId: fixture.workers[1].id,
      shiftId: fixture.shifts.morning.id,
      date: preDate,
      scheduleId: fixture.schedule.id,
    });
    await (solverTestBase as any).dbUtils.createAssignmentAndRecurrence({
      teamId,
      workerId: fixture.workers[2].id,
      shiftId: fixture.shifts.afternoon.id,
      date: preDate,
      scheduleId: fixture.schedule.id,
    });
    await (solverTestBase as any).dbUtils.createAssignmentAndRecurrence({
      teamId,
      workerId: fixture.workers[3].id,
      shiftId: fixture.shifts.duty.id,
      date: preDate,
      scheduleId: fixture.schedule.id,
    });

    // Switch to worker view (preserves campaign month periodStartDate from beforeEach)
    await solverTestBase.setScheduleViewSettings(page, teamId, {
      groupBy: "worker",
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    await solverTestBase.selectSolveScope(page, "CUSTOM");

    const mondayDateStr = preDate.format("YYYY-MM-DD");

    await solverTestBase.triggerCustomSolveInWorkerView(
      page,
      [fixture.workers[0].id],
      [mondayDateStr],
      TEST_TIMEOUT_MS,
    );

    // worker[0] should have 0 new assignments on firstMonday
    const result = await solverTestBase.getAssignmentsForTeam(preDate, preDate);
    const worker0Assignments = result.assignmentsRead.filter(
      (a) => a.workerId === fixture.workers[0].id,
    );
    expect(worker0Assignments.length).toBe(0);

    console.log(
      "✅ Test 10: CUSTOM worker view — no allocation when all demands fulfilled",
    );
  });
});
