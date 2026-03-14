# Plan: Scoped Solve Engine Test Suite

## TL;DR
Add a test suite `TestScopedSolveEngine` in engine_tests that validates partial/scoped solve behaviour. The fixture (10w, 4 shifts, 1 month) lives in its own file `scoped_solve_fixture.py` and is wired via a class-level pytest fixture (same pattern as `ei_filters` in `TestWorkerShiftFiltersEngine`). The existing `engine_solve_engine_inputs` helper gets an optional `solve_scope` + `wip_assignments` parameter so callers can run scoped solves with a single call. Tests cover all scope types plus edge cases for fixed assignments, empty-demand cells, and worker-cell demand fulfillment.

---

## Phase 1 – Fixture & Helper

**Step 1 – Create `scoped_solve_fixture.py`** (new file, _parallel with step 2_)
- Path: `backend/solve_service/src/tests/engine_tests/scoped_solve_fixture.py`
- Exports a pure Python factory function: `build_ei_scoped(penalties: Penalties, model_config: ModelConfig) -> EngineInputsAugmented`
- **Dynamic test month**: computed at call time as the month after next relative to today.
  Formula:
  ```python
  today = date.today()
  month_offset = (today.month - 1 + 2) % 12 + 1
  year_offset = today.year + (today.month + 1) // 12 if today.month > 10 else today.year
  # simpler: use relativedelta or manual arithmetic
  # e.g. today=2026-03-14 → test_month=2026-05, today=2026-09-25 → test_month=2026-11
  start_date = date(year_offset, month_offset, 1)
  end_date = date(year_offset, month_offset, calendar.monthrange(year_offset, month_offset)[1])
  ```
  Use `import calendar` + manual `(month + 2)` arithmetic (no third-party `relativedelta` needed).
- Fixture parameters:
  - Schedule: first day → last day of test month, id="sch_s", team_id="t0", status=CAMPAIGN
  - 10 workers w0–w9: duties_per_month=5, weekly_hours=40, weekly_hours_desired=40
  - 4 shifts (start/end datetimes use the first two days of test month as anchors for time-of-day):
    - "s_morning" NORMAL 08:00–14:00
    - "s_afternoon" NORMAL 14:00–20:00 (back-to-back with morning)
    - "s_duty" DUTY day1 08:00 → day2 08:00 (24h), recuperation_time=24
    - "s_recup" REST/RECUPERATION day2 08:00 → day3 08:00 (24h), recuperation_duty_id="s_duty"
  - ShiftDemandNew (dates span the full test month):
    - s_morning: count=1 on each weekday (Mon–Fri) of test month
    - s_afternoon: same as morning
    - s_duty: count=1 every calendar day of test month
    - s_recup: NO explicit demands (handled by duty-recup constraint automatically)
  - Blank: dimensions=[], dim_entries=[], attributes=[], as_hist=[], as_campaign_fixed=[], as_campaign_not_fixed=[], cbs_augmented=[], link_shifts=[], requests_work=[], requests_leave=[], model_output=None
  - Helper: expose `test_month_start`, `test_month_end`, and convenience helpers `first_monday(start)` and `first_saturday(start)` — used by tests when they need a specific weekday/weekend date within the test month

**Step 2 – Update `engine_solve.py`** (_parallel with step 1_)
- Path: `backend/solve_service/src/tests/engine_tests/engine_solve.py`
- Extend `engine_solve_engine_inputs` signature:
  ```
  engine_solve_engine_inputs(
      engine_inputs: EngineInputsAugmented,
      solve_scope: Optional[SolveScope] = None,
      wip_assignments: Optional[List[Assignment]] = None,
  ) -> Outputs
  ```
- When `solve_scope is not None`:  call `apply_solve_scope(engine_inputs, solve_scope, wip_assignments or [])`  **before** `core_to_engine_inputs(engine_inputs, solve_scope)`
- When `solve_scope is None` keep existing behaviour (no scope, no mutation)
- `apply_solve_scope` mutates engine_inputs in-place, so callers can inspect `engine_inputs.as_campaign_fixed` / `engine_inputs.shifts` after the call
- Add imports: `apply_solve_scope` from `db_operations.apply_solve_scope`; `SolveScope`, `Assignment` from `shared.schemas.core`; `Optional`, `List` from `typing`

---

## Phase 2 – Test Class

**Step 3 – Create `scoped_solve_engine_test.py`** (_depends on steps 1 & 2_)
- Path: `backend/solve_service/src/tests/engine_tests/scoped_solve_engine_test.py`
- Class: `TestScopedSolveEngine`
- Class fixture `ei_scoped(self, penalties_fix, model_config_fix) -> EngineInputsAugmented` calls `build_ei_scoped(penalties_fix, model_config_fix)`; function-scoped so each test gets a fresh instance

### Tests (in order):

**T1 `test_full_solve_no_scope_fulfils_all_shift_demands`**
- Call `engine_solve_engine_inputs(ei)` with no scope
- Parse breaches with `_parse_breaches_engine`
- Assert `outputs.is_solution is True`
- Assert no `DAILY_SHIFT_DEMAND` breaches

**T2 `test_duties_scope_assigns_only_duty_and_recup_shifts`**
- scope = `SolveScope(scope_type=DUTIES)`
- Call `engine_solve_engine_inputs(ei, scope)` — this calls `apply_solve_scope` (removes s_morning/s_afternoon from ei.shifts) then solves
- Assert all assignments in `outputs.assignments` have shift_id in {"s_duty", "s_recup"}
- Assert `outputs.is_solution is True`

**T3 `test_non_duties_scope_assigns_only_normal_shifts`**
- scope = `SolveScope(scope_type=NON_DUTIES)`
- Call `engine_solve_engine_inputs(ei, scope)` — removes s_duty/s_recup from ei.shifts
- Assert all assignments in `outputs.assignments` have shift_id in {"s_morning", "s_afternoon"}
- Assert `outputs.is_solution is True`

**T4a `test_custom_shift_view_assigns_only_selected_shift`**
- scope = `SolveScope(CUSTOM, shift_ids=["s_morning"], solve_view="shift")`
- Call `engine_solve_engine_inputs(ei, scope)`
- Assert all assignments have shift_id == "s_morning"

**T4b `test_custom_worker_view_assigns_only_selected_worker`**
- scope = `SolveScope(CUSTOM, worker_ids=["w0"], solve_view="worker")`
- Call `engine_solve_engine_inputs(ei, scope)`
- Assert all assignments have worker_id == "w0"

**T5 `test_out_of_scope_wip_assignments_are_preserved_not_deleted`**
- Use `first_monday(start)` from fixture helpers as the reference date
- Prepare three wip morning assignments (w0/w1/w2 on first Monday, shift=s_morning)
- scope = `SolveScope(DUTIES)`
- Call `engine_solve_engine_inputs(ei, scope, wip_assignments=wip_morning)` — apply_scope moves them to ei.as_campaign_fixed
- Assert each wip assignment's key (worker_id, date, shift_id) is present in `{(a.worker_id, a.date, a.shift_id) for a in ei.as_campaign_fixed}`

**T6 `test_fixed_assignments_unchanged_by_in_scope_solve`**
- Use `first_monday(start)` as reference date
- Pre-populate `ei.as_campaign_fixed = [Assignment(id=.., worker_id="w0", date=first_monday, shift_id="s_duty", fixed=True, ...)]`
- scope = `SolveScope(DUTIES)`
- Call `engine_solve_engine_inputs(ei, scope, wip_assignments=[])`
- Assert `outputs.assignments` contains an assignment for (w0, first_monday, s_duty)

**T7 `test_custom_shift_cell_with_no_demand_produces_no_assignment`**
- Use `first_saturday(start)` from fixture helpers — guaranteed no weekday demand
- scope = `SolveScope(CUSTOM, shift_cells=[ShiftDateCell(shift_id="s_morning", date=first_saturday.isoformat())], solve_view="shift")`
- Call `engine_solve_engine_inputs(ei, scope)`
- Assert no assignment in `outputs.assignments` where shift_id=="s_morning" and date==first_saturday

**T8a `test_worker_cell_with_unfulfilled_demand_creates_assignment`**
- Use `first_monday(start)` — guaranteed morning and afternoon demands
- `ei.as_campaign_fixed = []` (clean)
- scope = `SolveScope(CUSTOM, worker_cells=[WorkerDateCell(worker_id="w0", date=first_monday.isoformat())], solve_view="worker")`
- Call `engine_solve_engine_inputs(ei, scope, wip_assignments=[])`
- Assert `[a for a in outputs.assignments if a.worker_id=="w0" and a.date==first_monday]` is non-empty

**T8b `test_worker_cell_assigns_only_unfulfilled_shift_when_one_demand_met`**
- Use `first_monday(start)`
- `ei.as_campaign_fixed = [Assignment(w1, first_monday, "s_morning", fixed=True, ...)]` — morning demand met
- scope = worker_cell (w0, first_monday)
- Call `engine_solve_engine_inputs(ei, scope, wip_assignments=[])`
- `_effective_worker_view_variables` sees morning demand met by w1 (out-of-scope fixed) → scope only has (w0, first_monday, s_afternoon)
- Assert w0 has s_afternoon assignment on first_monday
- Assert w0 does NOT have s_morning assignment on first_monday

**T8c `test_worker_cell_with_all_demands_met_produces_no_assignment`**
- Use `first_monday(start)`
- `ei.as_campaign_fixed = [Assignment(w1, first_monday, s_morning), Assignment(w2, first_monday, s_afternoon)]`
- scope = worker_cell (w0, first_monday)
- Call `engine_solve_engine_inputs(ei, scope, wip_assignments=[])`
- Both demands already met by fixed out-of-scope workers → no scope variables for w0
- Assert no assignment for w0 on first_monday in `outputs.assignments`

---

## Relevant Files

- `backend/solve_service/src/tests/engine_tests/engine_solve.py` — add `solve_scope` and `wip_assignments` optional params; add imports
- `backend/solve_service/src/tests/engine_tests/scoped_solve_fixture.py` — **new** factory fn `build_ei_scoped`
- `backend/solve_service/src/tests/engine_tests/scoped_solve_engine_test.py` — **new** test class
- Reference: `backend/solve_service/src/tests/engine_tests/worker_shift_filters_engine_test.py` — ei_filters pattern
- Reference: `backend/solve_service/src/tests/conftest.py` — `shifts_3n_2d`, `workers_10`, `daily_shift_demands_shifts_3n_2d` patterns
- Reference: `backend/solve_service/src/db_operations/apply_solve_scope.py` — `apply_solve_scope(ei, scope, wip)` mutates in-place
- Reference: `backend/solve_service/src/core_to_engine_service/build_scope_context.py` — `_effective_worker_view_variables` logic (used by T8b/T8c)
- Schemas: `SolveScope`, `SolveScopeType`, `WorkerDateCell`, `ShiftDateCell` from `shared.schemas.core.solve_task_status`; `Assignment`, `AssignmentSource` from `shared.schemas.core.assignment`

---

## Verification

1. Review `engine_solve.py` diff — confirm optional params are backward-compatible (no signature break for existing callers)
2. Review `scoped_solve_fixture.py` — confirm dynamic month formula, helper functions, and all 4 shift definitions are correct
3. Review `scoped_solve_engine_test.py` — confirm all 11 tests use `first_monday`/`first_saturday` with no hard-coded dates

---

## Decisions & Scope

- Fixture is a **class-level pytest fixture** (function scope) wrapping `build_ei_scoped()` — same as `ei_filters`; each test gets independent fresh state
- `engine_solve_engine_inputs` gets optional scope params (not a new function) per user request; callers can pass scope for scoped tests or omit for existing tests
- Full solve assertion: `is_solution is True` + zero `DAILY_SHIFT_DEMAND` breaches (not objective_value == 0 to avoid noise from duty-target soft constraints)
- NOT included: testing DB persistence layer (`save_engine_outputs`), SQS flow, or boundary cases for other scope types beyond what's requested
- Assignment fields used in fixture pre-population: `id, team_id, schedule_id, worker_id, date, shift_id, fixed, source`
