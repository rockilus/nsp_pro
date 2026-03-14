# Plan: Scoped Solve E2E Test Suite

## TL;DR
Add a new fixture scenario `"scoped_solve_scenario"` to the backend JSON fixture file, add `data-testid` attributes to solve scope menu items / dialog / assignment cells, and create a new E2E spec file `solve-scoped.spec.ts` covering all requested partial-solve behaviours. Tests use the `testBasesMap` isolation pattern.

---

## Phases

### Phase 1 — Fixture Factory File (no external dependencies)
1. Create `frontend/tests/fixtures/scoped-solve-fixture.ts` — a TypeScript factory that computes all dates dynamically at call time and creates entities via the existing `DatabaseTestUtils` API methods.

   **Date computation** (called once per test run):
   - `campaignStart = dayjs.utc().add(2, 'month').startOf('month')` — first day of month-after-next
   - `campaignEnd = campaignStart.endOf('month')` — last day of same month
   - Examples: run on 2026-03-14 → May 2026; run on 2026-09-25 → November 2026

   **Exports one function:** `createScopedSolveFixture(dbUtils: DatabaseTestUtils, teamId: string): Promise<ScopedSolveFixtureResult>`

   **Creates (in order, via API):**
   - **10 workers** — distinct names/acronyms, `employmentStartDate` = campaign start minus 4 months, no end date, `weeklyHours` 35–40
   - **4 shifts**:
     - `shiftMorning` — NORMAL `shift_type=0`, 07:00–15:00 UTC
     - `shiftAfternoon` — NORMAL `shift_type=0`, 15:00–23:00 UTC
     - `shiftDuty` — DUTY `shift_type=1`, 08:00–08:00+1d UTC, `recuperationTime=24`
     - `shiftRecuperation` — REST `shift_type=2`, `restType=RECUPERATION`, `recuperationDutyId = shiftDuty.id`
   - **Shift demands** (count=1, source=`"manual"`), all created individually via `dbUtils.createShiftDemand`:
     - morning count=1 on every **weekday (Mon–Fri)** in the campaign month
     - afternoon count=1 on every **weekday (Mon–Fri)** in the campaign month
     - duty count=1 on every **calendar day** in the campaign month
   - **1 campaign schedule** — `startDate=campaignStart`, `endDate=campaignEnd`, `status=CAMPAIGN` via `dbUtils.createSchedule`

   **Returns `ScopedSolveFixtureResult`:**
   ```typescript
   {
     workers: WorkerT[];          // ordered [0..9]
     shifts: { morning: ShiftT; afternoon: ShiftT; duty: ShiftT; recuperation: ShiftT };
     shiftDemands: ShiftDemandDTO[];
     schedule: ScheduleT;
     campaignStart: dayjs.Dayjs;
     campaignEnd: dayjs.Dayjs;
     // Helper: first Monday in campaign month
     firstMonday: dayjs.Dayjs;
     // Helper: first Saturday in campaign month
     firstSaturday: dayjs.Dayjs;
   }
   ```

   Note: `dbUtils.createShiftDemand` is called individually per demand row (no bulk endpoint available). For a typical 31-day month: 21 weekday × 2 + 31 = ~73 calls. Group the async calls in batches with `Promise.all` for performance.

2. In `frontend/tests/utils/solver-test-base.ts`, add method `setupScopedSolveScenario(teamId)` that calls `createScopedSolveFixture(this.dbUtils, teamId)` and stores the result as `this.currentFixture`. The `beforeEach` in the spec calls this instead of `loadScenario()`.

### Phase 2 — Component data-testid additions (*parallel with Phase 1*)
2. `frontend/src/components/schedule/nav-bar/campaign-info.tsx` — add `data-testid` to the four scope MenuItems:
   - `solve-scope-menu-item-FULL`
   - `solve-scope-menu-item-DUTIES`
   - `solve-scope-menu-item-NON_DUTIES`
   - `solve-scope-menu-item-CUSTOM`
3. `frontend/src/components/schedule/nav-bar/CustomSolveDialog.tsx` — add:
   - `data-testid="custom-solve-dialog"` on Dialog
   - `data-testid="custom-solve-confirm-button"` on confirm Button
4. `frontend/src/components/schedule/table/shared/assignment-cell.tsx` — already has `data-testid={assignment-cell-${assignmentData.assignment.id}}` (confirmed). No change needed.

### Phase 3 — Test Utility Extensions (*depends on Phase 2 test IDs*)
5. Extend `frontend/tests/utils/solver-test-base.ts` with new helpers:
   - `selectSolveScope(page, scope: "FULL"|"DUTIES"|"NON_DUTIES"|"CUSTOM")`:
     click `solve-dropdown-button` → click `solve-scope-menu-item-{scope}`
   - `triggerCustomSolveInShiftView(page, shiftIds: string[], dates: string[])`:
     ensure CUSTOM mode active → for each (shiftId × date), click `shift-cell-custom-select-{shiftId}-{date}` → click `solve-button` → click `custom-solve-confirm-button` → wait for completion (calls `triggerSolveAndWait`)
   - `triggerCustomSolveInWorkerView(page, workerIds: string[], dates: string[])`:
     similar but uses `worker-cell-custom-select-{workerId}-{date}`
   - `getAssignmentsForTeam(startDate, endDate)`:
     wraps `dbUtils.makeAuthenticatedRequest` GET `/assignments/teams/{teamId}?startDate=...&endDate=...&includeCampaign=true`

### Phase 4 — Test Spec File (*depends on all previous phases*)
6. Create `frontend/tests/e2e/solver/solve-scoped.spec.ts`

**Structure:**
```
testBasesMap: Map<string, SolverTestBase>

test.beforeEach:
  - new SolverTestBase, stored by testRunId
  - setupSolverTests(workerIndex)          → fresh team per test
  - setupScopedSolveScenario(teamId)       → workers/shifts/demands/schedule created
  - authenticatePageAsTestUser(page)
  - navigate to /en/plan/schedule/
  - set team in localStorage + reload

test.afterEach:
  - delete from testBasesMap (no DB cleanup needed; unique team per test)
```

**11 test cases inside `test.describe("Solver - Scoped Solve")`:**

| # | Test name | Setup | Scope trigger | API assertion | UI assertion |
|---|-----------|-------|---------------|---------------|--------------|
| 1 | Full campaign solve | none | solve-button (default FULL) | assignments count > 0 for morning+afternoon+duty | status-chip shows SOLVED* |
| 2 | DUTIES scope — only duty assigned | none | selectScope("DUTIES") + solve-button | duty assignments exist; morning+afternoon = 0 | status-chip shows SOLVED* |
| 3 | NON_DUTIES scope — only morning/afternoon assigned | none | selectScope("NON_DUTIES") + solve-button | morning+afternoon assignments exist; duty = 0 | status-chip shows SOLVED* |
| 4 | CUSTOM shift view — selected shifts covered | switch to shift view; CUSTOM mode | select shift_morning + shift_afternoon rows; solve→confirm dialog | only morning/afternoon assignments exist | status-chip SOLVED*, assignment-cell elements visible in shift cells |
| 5 | CUSTOM worker view — selected workers covered | CUSTOM mode | select 2 workers; solve→confirm dialog | only those workers have assignments | status-chip SOLVED*, assignment-cell in worker rows for those workers |
| 6 | Out-of-scope assignments not deleted (DUTIES scope) | create morning assignments via API for 2 workers on `firstMonday` | DUTIES solve | morning assignments still present post-solve; duty assignments also created | morning assignment-cells visible |
| 7 | Fixed assignments unchanged (FULL scope) | create fixed assignment (worker 1, morning, `firstMonday`) via API with `fixed: true` | FULL solve | fixed assignment still exists with same id and `fixed=true` | its `assignment-cell-{id}` visible |
| 8 | CUSTOM shift cell with no demand (morning on Saturday) | switch to shift view, CUSTOM mode | select shift_morning + `firstSaturday` single cell | zero assignments for morning on `firstSaturday` | no assignment-cell in `shift-cell-{morningId}-{firstSaturday}` |
| 9 | CUSTOM worker cell — demand unfulfilled → allocation | pre-assign workers 2–10 to fill afternoon+duty on `firstMonday`; leave morning demand for `firstMonday` unfilled (count=1, no assignment yet); worker 1 free | CUSTOM worker view: worker 1 + `firstMonday` | worker 1 has ≥ 1 assignment on `firstMonday` | assignment-cell visible in worker-1 row for that date |
| 10 | CUSTOM worker cell — all demands fulfilled → no allocation | pre-assign worker 2 → morning, worker 3 → afternoon, worker 4 → duty on `firstMonday` (fills all count=1 demands) | CUSTOM worker view: worker 1 + `firstMonday` | 0 new assignments for worker 1 on `firstMonday` | no new assignment-cell for worker-1 on that date |
| 11 | All solve types show assignments on-screen | *(UI check embedded as final step in tests 1–5)* | — | — | after each solve, `[data-testid^="assignment-cell-"]` count > 0 in the relevant table |

Note: Test 11's UI check is embedded inside tests 1–5 rather than a standalone test.

---

## Relevant Files
- `frontend/tests/fixtures/scoped-solve-fixture.ts` — NEW TypeScript fixture factory (dynamic dates, creates workers/shifts/demands/schedule via API)
- `frontend/src/components/schedule/nav-bar/campaign-info.tsx` — add scope menu data-testid (lines ~398–410)
- `frontend/src/components/schedule/nav-bar/CustomSolveDialog.tsx` — add dialog + confirm button data-testid
- `frontend/src/components/schedule/table/shared/assignment-cell.tsx` — already has `assignment-cell-{id}`, no change needed
- `frontend/tests/utils/solver-test-base.ts` — add `setupScopedSolveScenario`, `selectSolveScope`, `triggerCustomSolveInShiftView`, `triggerCustomSolveInWorkerView`, `getAssignmentsForTeam`
- `frontend/tests/e2e/solver/solve-scoped.spec.ts` — NEW file with 11 tests

## Verification
1. `npx tsc --noEmit` from `frontend/` to check TypeScript after utility changes
2. Manual review: confirm `dayjs.utc().add(2, 'month').startOf('month')` produces the correct month (e.g., run in March → May, run in September → November)
3. Review test flow matches solver-test-base patterns (test isolation, API-first checks)
4. Do NOT run tests yet

## Decisions
- Fixture dates are dynamically computed at test runtime: `campaignStart = dayjs.utc().add(2, 'month').startOf('month')` — no hardcoded timestamps in any file; this correctly handles any run date
- No changes required to `backend/api_gateway/tests/test_data/solver_data.json`
- Each test creates its own isolated team via `setupSolverTests`; no DB cleanup needed
- Pre-existing assignments for tests 6–10 are created via `dbUtils.createAssignmentAndRecurrence`
- `assignment-cell.tsx` already has `data-testid="assignment-cell-{id}"` — UI verification uses `[data-testid^="assignment-cell-"]` query
- Test 11 (on-screen check) is embedded in tests 1–5 as a final UI step, not a separate test
- Tests assert expected SOLVER SPEC behavior; if the current save_assignments bug (non-scope-aware deletion) is present, tests 6/8/9/10 will fail — this is intentional
