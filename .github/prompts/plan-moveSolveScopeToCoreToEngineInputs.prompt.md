# Plan: Move Solve Scope Logic into `core_to_engine_inputs`

**TL;DR:** Pull scope application out of `get_engine_inputs` (data layer) and apply it step-by-step inside `core_to_engine_inputs` (parsing layer). Add `as_campaign_not_fixed` (non-fixed campaign assignments) to `EngineInputs`, pass `solve_scope` as a separate parameter to `core_to_engine_inputs`, and prune entities (shift list, shift demands, constraints, requests) at each build step — making the model lighter by removing variables/constraints rather than injecting fixed=1 locks. `worker_ids_to_worker_dates` and all date ranges remain **full** throughout: the solver needs the complete campaign and historical timeline to correctly evaluate sequence constraints, work-time targets, and nb_duties targets.

---

## Phase 1 — Schema: add `as_campaign_not_fixed` to `EngineInputs` (Completed)

**File:** `backend/shared/src/shared/schemas/core/engine.py`

1. Add `as_campaign_not_fixed: List[Assignment]` to the `EngineInputs` dataclass (after `as_campaign_fixed`).
2. Update `to_dict()` and `from_dict()` on `EngineInputs` to include the new field.
3. `EngineInputsAugmented.from_engine_inputs` inherits it automatically — no extra change.

---

## Phase 2 — `get_engine_inputs`: purely fetch, zero scope logic (Completed)

**File:** `backend/solve_service/src/db_operations/get_engine_inputs.py`

4. Always call `get_wip_assignments(schedule, collections)` and place the result in `engine_inputs.as_campaign_not_fixed`.
5. Delete the `apply_solve_scope(...)` call and its `SolveScopeType.FULL` guard.
6. Remove imports of `apply_solve_scope` and `SolveScopeType` from this file.
7. `get_engine_inputs` no longer receives `solve_scope`; the caller holds the scope and passes it to `core_to_engine_inputs`.

---

## Phase 3 — `core_to_engine_inputs`: accept `solve_scope` parameter (Completed)

**File:** `backend/solve_service/src/core_to_engine_service/core_to_engine_inputs.py`

8. Change signature to `core_to_engine_inputs(engine_inputs: EngineInputsAugmented, solve_scope: Optional[SolveScope] = None)`.
9. Short-circuit: if `solve_scope is None or scope_type == FULL`, skip all scope logic.

---

## Phase 4 — Scope pre-processing (runs first, before any `build_*`)

New `preprocess_scope` function in `build_scope_context.py`. See `plan-preprocessScope.prompt.md` for the full detailed plan. Summary:

10. Compute `raw_demand_pairs` from `engine_inputs.shift_demands` as the demand anchor — a variable `(worker, date, shift)` is in scope only if a demand exists for its `(shift_id, date)` slot.
11. Build `variables_in_scope: Set[Tuple[str, str, str]]` — full `(worker_id, date_iso, shift_id)` 3-tuples — via union (OR) of all present criteria. Returns `ScopeContext` with `variables_in_scope`, `in_scope_dates`, `in_scope_shift_ids`, `in_scope_worker_ids` (all derived from the 3-tuple set).
12. **WIP locking** — for each `a` in `as_campaign_not_fixed`: if `(a.worker_id, a.date.isoformat(), a.shift_id) not in variables_in_scope`, dedup-append to `as_campaign_fixed` (locked); in-scope assignments remain free.
13. **Shift pruning** — `engine_inputs.shifts` filtered to `in_scope_shift_ids`; works uniformly for all scope types; caller re-derives `shifts_not_deleted` and related locals afterwards.
14. **Shift demands pruning** — `engine_inputs.shift_demands` filtered by `{(s, d) for (_, d, s) in variables_in_scope}`.

---

## Phase 5 — `worker_ids_to_worker_dates` and all dates: intentionally untouched

15. `worker_ids_to_worker_dates`, `dates_campaign`, `dates_hist`, and all `periods_*` remain **full** for every scope type. Pruning dates would silently break sequence constraints (minimum rest gaps, consecutive duty limits), work-time balancing across weeks, and nb_duties targets — all of which require the full timeline to be evaluated correctly.
16. Scope reduction is achieved entirely through Phase 4 (pruned shifts, pruned demands, locked WIP) and Phases 9–10 (constraint and request cell filtering), not through date truncation. The solver sees the full timeline with most out-of-scope cells already decided (locked WIP), freeing only the in-scope cells.

---

## Phase 6 — Work times & nb_duties: no code changes needed *(cascades from Phase 4)*

17. `calculate_worker_work_times` and `calculate_worker_nb_duties` receive the full `worker_ids_to_worker_dates` (unchanged) and the Phase 4-scoped `shifts_not_deleted` + `shift_demands` — targets are naturally computed over the full campaign with only in-scope shift types and demands, which is the correct behaviour.

---

## Phase 7 — Fixed values: no code changes needed *(cascades from Phase 4)*

18. `core_to_engine_fixed_values` already uses `shifts_not_deleted` (scoped in Phase 4) and `shift_demands` (scoped in Phase 4).
19. `_zero_shifts_without_demand` correctly zeros out-of-scope cells because no in-scope demand exists for them.
20. Out-of-scope WIP assignments are already in `as_campaign_fixed` (Phase 4 step 12) → they appear as fixed=1.

---

## Phase 8 — Variables & no-overlap: no code changes needed *(cascades from Phase 4)*

21. `build_engine_variables` uses the full `worker_ids_to_worker_dates` + Phase 4-scoped `shifts_not_deleted`. Variables exist for all campaign dates × in-scope shifts; out-of-scope cells are fixed=1 (locked WIP from Phase 4 step 12) so the solver cannot change them, preserving full timeline correctness.

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
| `backend/shared/src/shared/schemas/core/engine.py` | Add `as_campaign_not_fixed` field |
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
6. CUSTOM (dates) solve: in-scope shift demands filtered to those dates; out-of-scope WIP assignments locked; work-time targets computed over full campaign (correct — solver enforces global totals with out-of-scope cells already fixed).
7. Post-solve: assignments outside scope retain their pre-solve WIP values.

---

## Decisions

- `solve_scope` is a separate parameter (not in `EngineInputsAugmented`) — it is a processing directive, not engine data.
- `build_engine_constraints` gets explicit cell-level pruning.
- `worker_ids_to_worker_dates`, all date ranges, and all periods remain full — the solver needs the complete campaign timeline for sequence and work-time constraints to be correct.
- Work time / nb_duties targets are computed over the full campaign with scoped shift types and demands; this is intentional.
- Helper functions from `apply_solve_scope.py` are moved into `build_scope_context.py`, not re-implemented.
- Scope application reduces model size by pruning (not by adding fixed=1 locks beyond the WIP classification step).
