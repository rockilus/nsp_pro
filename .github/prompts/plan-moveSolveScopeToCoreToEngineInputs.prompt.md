# Plan: Move Solve Scope Logic into `core_to_engine_inputs`

**TL;DR:** Pull scope application out of `get_engine_inputs` (data layer) and apply it step-by-step inside `core_to_engine_inputs` (parsing layer). Add `as_wip_campaign` (non-fixed WIP assignments) to `EngineInputs`, pass `solve_scope` as a separate parameter to `core_to_engine_inputs`, and prune entities (shift list, shift demands, dates, constraints, requests) at each build step — making the model lighter by removing variables/constraints rather than injecting fixed=1 locks.

---

## Phase 1 — Schema: add `as_wip_campaign` to `EngineInputs`

**File:** `backend/shared/src/shared/schemas/core/engine.py`

1. Add `as_wip_campaign: List[Assignment]` to the `EngineInputs` dataclass (after `as_wip_fixed`).
2. Update `to_dict()` and `from_dict()` on `EngineInputs` to include the new field.
3. `EngineInputsAugmented.from_engine_inputs` inherits it automatically — no extra change.

---

## Phase 2 — `get_engine_inputs`: purely fetch, zero scope logic

**File:** `backend/solve_service/src/db_operations/get_engine_inputs.py`

4. Always call `get_wip_assignments(schedule, collections)` and place the result in `engine_inputs.as_wip_campaign`.
5. Delete the `apply_solve_scope(...)` call and its `SolveScopeType.FULL` guard.
6. Remove imports of `apply_solve_scope` and `SolveScopeType` from this file.
7. `get_engine_inputs` no longer receives `solve_scope`; the caller holds the scope and passes it to `core_to_engine_inputs`.

---

## Phase 3 — `core_to_engine_inputs`: accept `solve_scope` parameter

**File:** `backend/solve_service/src/core_to_engine_service/core_to_engine_inputs.py`

8. Change signature to `core_to_engine_inputs(engine_inputs: EngineInputsAugmented, solve_scope: Optional[SolveScope] = None)`.
9. Short-circuit: if `solve_scope is None or scope_type == FULL`, skip all scope logic.

---

## Phase 4 — Scope pre-processing (runs first, before any `build_*`)

New helper `_preprocess_scope` in `apply_scope.py` or inline in `core_to_engine_inputs.py`, reusing helpers from `apply_solve_scope.py` (`_is_in_scope_worker_view` / `_is_in_scope_shift_view`).

10. **Shift-type pruning** — mutates `engine_inputs.shifts`:
    - DUTIES → remove `ShiftType.NORMAL` shifts.
    - NON_DUTIES → remove `ShiftType.DUTY` and `REST/RECUPERATION` shifts.
    - CUSTOM → no shift-type pruning.

11. **WIP classification** — reuses `_is_in_scope_worker_view` / `_is_in_scope_shift_view`:
    - Out-of-scope `as_wip_campaign` assignments → deduplicate and append to `as_wip_fixed` (locked).
    - In-scope `as_wip_campaign` assignments → remain free for the solver.

12. **Shift demands pruning** — mutates `engine_inputs.shift_demands`:
    - DUTIES → keep demands only for DUTY shift_ids.
    - NON_DUTIES → keep demands only for NORMAL/REST non-recup shift_ids.
    - CUSTOM+`shift_ids` → filter by those ids.
    - CUSTOM+`dates` → filter by date.
    - CUSTOM+`shift_cells` → filter by `(shift_id, date)` pairs.

---

## Phase 5 — Date scoping in `worker_ids_to_worker_dates` (CUSTOM scope only)

13. After `build_worker_ids_to_worker_dates`, if CUSTOM scope specifies dates / worker_cells / shift_cells: intersect each worker's `dates_campaign` list with the resolved `scope_dates_set`.
14. This single change cascades automatically to: solver variables, no-overlap intervals, `ws_to_dates`, work time targets, nb_duties targets, constraint generation, and all downstream `build_*` calls.

---

## Phase 6 — Work times & nb_duties: no code changes needed *(cascades from Phase 5)*

15. `calculate_worker_work_times` and `calculate_worker_nb_duties` use the now-scoped `worker_ids_to_worker_dates` and scoped `shift_demands` → compute in-scope-only targets automatically.

---

## Phase 7 — Fixed values: no code changes needed *(cascades from Phases 4 & 5)*

16. `core_to_engine_fixed_values` already uses `shifts_not_deleted` (scoped in Phase 4) and `daily_shift_demands` (scoped in Phase 4).
17. `_zero_shifts_without_demand` correctly zeros out-of-scope cells because no in-scope demand exists for them.
18. Out-of-scope WIP assignments are already in `as_wip_fixed` (Phase 4 step 11) → they appear as fixed=1.

---

## Phase 8 — Variables & no-overlap: no code changes needed *(cascades from Phases 4 & 5)*

19. `build_engine_variables` uses scoped `worker_ids_to_worker_dates` + scoped `shifts_not_deleted` → only in-scope `(worker, date, shift)` tuples created.

---

## Phase 9 — `build_engine_constraints`: explicit cell-level pruning

**File:** `backend/solve_service/src/core_to_engine_service/build_engine_constraints.py`

20. Add `solve_scope: Optional[SolveScope] = None` parameter.
21. Build `scope_dates_set`, `scope_worker_ids_set`, `scope_shift_ids_set` from scope fields (`None` = all allowed).
22. After building each constraint set (sum, seq, ord, fil, fai), filter entries where the referenced `(worker, date, shift)` cell is outside scope.
23. Pass `solve_scope` through from `core_to_engine_inputs`.

---

## Phase 10 — `build_engine_requests`: filter to scope

**File:** `backend/solve_service/src/core_to_engine_service/build_engine_requests.py`

24. Add `solve_scope: Optional[SolveScope] = None` parameter.
25. When iterating deferred requests, additionally drop requests whose worker/dates/shifts fall entirely outside scope (reuse the `_is_in_scope_*` helpers).

---

## Phase 11 — Duty-recup pairs, link shift pairs, worker-shift filters: cascades only

26. `build_duty_recup_pairs` — no changes. Uses scoped `worker_ids_to_worker_dates` + scoped `shift_duties_not_deleted` (empty for NON_DUTIES → returns `[]`).
27. `build_link_shift_pairs` — no changes. Uses scoped `shift_demands` → links only exist for in-scope `(shift, date)`.
28. `build_worker_shift_filters` — no changes. Uses scoped `worker_ids_to_worker_dates` → forbidden tuples naturally scoped.

---

## Phase 12 — Caller update: thread `solve_scope` to `core_to_engine_inputs`

29. Find the SQS consumer / solve orchestrator that calls `core_to_engine_inputs` and plumb `SQSSolveMessage.solve_scope` through.
30. Confirm `get_engine_inputs` call-site no longer passes `solve_scope`.

---

## Phase 13 — Cleanup

31. Delete or archive `backend/solve_service/src/db_operations/apply_solve_scope.py` after moving/reusing its helper functions.
32. Remove stale imports from `get_engine_inputs.py`.

---

## Relevant files

| File | Change |
|---|---|
| `backend/shared/src/shared/schemas/core/engine.py` | Add `as_wip_campaign` field |
| `backend/solve_service/src/db_operations/get_engine_inputs.py` | Fetch WIP, remove scope call |
| `backend/solve_service/src/db_operations/apply_solve_scope.py` | Source for helpers to move; delete after |
| `backend/solve_service/src/core_to_engine_service/core_to_engine_inputs.py` | Main target: scope param + Phases 4–8 |
| `backend/solve_service/src/core_to_engine_service/build_engine_constraints.py` | Explicit cell-level pruning |
| `backend/solve_service/src/core_to_engine_service/build_engine_requests.py` | Scope filter on deferred requests |
| `backend/solve_service/src/core_to_engine_service/build_duty_recup_pairs.py` | No change (cascades) |
| `backend/solve_service/src/core_to_engine_service/build_link_shift_pairs.py` | No change (cascades) |
| `backend/solve_service/src/core_to_engine_service/build_worker_shift_filter.py` | No change (cascades) |

---

## Verification

1. `cd backend && pytest` — all existing tests pass after schema and signature changes.
2. `make solve_service_check` — no type errors.
3. FULL solve: behaviour identical to today.
4. DUTIES solve: NORMAL shifts absent from model; WIP NORMAL assignments locked.
5. NON_DUTIES solve: DUTY + RECUP shifts absent; `shift_duties_not_deleted` empty → no nb_duties constraints, no duty-recup pairs.
6. CUSTOM (dates) solve: only variables for those dates; out-of-scope WIP assignments locked; work-time targets scoped to those dates.
7. Post-solve: assignments outside scope retain their pre-solve WIP values.

---

## Decisions

- `solve_scope` is a separate parameter (not in `EngineInputsAugmented`) — it is a processing directive, not engine data.
- `build_engine_constraints` gets explicit cell-level pruning.
- Work time / nb_duties are computed only for in-scope dates via scoped `worker_ids_to_worker_dates`.
- Helper functions from `apply_solve_scope.py` (`_is_in_scope_worker_view`, `_is_in_scope_shift_view`) are moved/reused, not re-implemented.
- Scope application reduces model size by pruning (not by adding fixed=1 locks beyond the WIP classification step).
