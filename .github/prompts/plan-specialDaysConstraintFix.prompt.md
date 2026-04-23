# Plan: Fix special_days_target_nb_duties Constraint

## TL;DR
Three bugs to fix: (1) one-sided penalty — solver freely under-assigns, (2) max-of-workers aggregation — only worst offender penalized, (3) missing intra-worker day-type equity — Goal 2 (same # Thursdays as Fridays etc. per worker) is not modeled at all. Fixes 1+2 are localized to `model.py`. Fix 3 requires a new builder, new engine type, shared schema additions, and model method.

---

## Phase 1 — Shared schema additions

**Step 1.** Add `special_days_intra_worker_equity: bool = False` to `SystemConstraints` in `backend/shared/src/shared/schemas/core/engine.py` — after the existing `special_days_target_nb_duties` field. Default `False` ensures backward compat everywhere.

**Step 2.** Add `special_days_intra_worker_equity: int = 1` to `SystemConstraintPenalty` in `backend/shared/src/shared/schemas/core/constraint.py`. Default avoids breaking `replacement_service.py` and test fixtures.

---

## Phase 2 — Engine types

**Step 3.** Add new dataclass `WorkerSpecialDayPairEquityConstraint` to `backend/solve_service/src/engine/types.py`:
```python
@dataclass
class WorkerSpecialDayPairEquityConstraint:
    assignments_a: list[tuple[str, str, str]]  # duty assignments for day_type_i
    assignments_b: list[tuple[str, str, str]]  # duty assignments for day_type_j
    penalty: int
```
Add `special_days_intra_worker_equity: list[WorkerSpecialDayPairEquityConstraint]` field (with `field(default_factory=list)`) to `SystemConstraintInputs`. Export the new type from `backend/solve_service/src/engine/__init__.py`.

---

## Phase 3 — Fix model.py (Fixes 1, 2, 4, 5)

**Step 4.** Rewrite `add_special_days_constraints` in `backend/solve_service/src/engine/model/model.py` (lines 754–785):
- Replace `max(sum - target, 0)` → `AddAbsEquality` for true bidirectional deviation
- Append **each worker's `abs_diff` individually** to `self.obj` (sum semantics, not max-of-all)
- Guard: `[self.variables[a] for a in assignments if a in self.variables]`, skip empty lists

**Step 5.** Add new method `add_special_days_intra_worker_equity_constraints(constraints: list[WorkerSpecialDayPairEquityConstraint])` to `model.py` after `add_special_days_constraints`:
- For each constraint: `diff = sum(vars_a) - sum(vars_b)`, `AddAbsEquality`, append to obj with `constraint.penalty`
- Guard `if a in self.variables` for both sides; skip if either side is empty after filtering

**Step 6.** In `solve_model_hts_custom` (~line 290), call the new method immediately after the existing `add_special_days_constraints` call:
```python
self.add_special_days_intra_worker_equity_constraints(
    inputs.system_constraints.special_days_intra_worker_equity
)
```

---

## Phase 4 — Builder function

**Step 7.** Add `build_special_days_intra_worker_equity_constraints` to `backend/solve_service/src/core_to_engine_service/calculate_worker_special_days.py`:
- Signature: `(workers, worker_ids_to_worker_dates, shifts, penalty) -> list[WorkerSpecialDayPairEquityConstraint]`
- For each worker w, for each pair `(i, j)` in `itertools.combinations([3, 4, 5, 6], 2)`:
  - `assignments_a` = `[(w.id, d.isoformat(), s_id) for d in worker_ids_to_worker_dates[w.id].dates_campaign if d.weekday() == i for s_id in shift_duty_not_del_ids]`
  - `assignments_b` = same for `j`
  - Append `WorkerSpecialDayPairEquityConstraint(assignments_a, assignments_b, penalty)` — skip if both sides empty

---

## Phase 5 — Wire in core_to_engine_inputs.py

**Step 8.** Import `build_special_days_intra_worker_equity_constraints` in `backend/solve_service/src/core_to_engine_service/core_to_engine_inputs.py`.

**Step 9.** Add `special_days_intra_worker_equity=(...)` to the `SystemConstraintInputs(...)` block after `special_days_target_nb_duties` (mirroring lines 447–463):
```python
# special_days_intra_worker_equity=[],
special_days_intra_worker_equity=(
    build_special_days_intra_worker_equity_constraints(
        workers_not_deleted,
        worker_ids_to_worker_dates,
        engine_inputs.shifts,
        engine_inputs.penalties.system_constraint.special_days_intra_worker_equity,
    )
    if engine_inputs.model_config.system_constraints.special_days_intra_worker_equity
    else []
),
```

---

## Phase 6 — Config & penalties wiring

**Step 10.** Add `special_days_intra_worker_equity=not test_mode` to the `SystemConstraints(...)` block in `backend/solve_service/src/solve_service/model_config.py`.

**Step 11.** Add `special_days_intra_worker_equity=1` to `SystemConstraintPenalty(...)` in `backend/solve_service/src/solve_service/penalties.py`.

---

## Phase 7 — Breach debug

**Step 12.** In `backend/solve_service/src/engine_to_core_service/build_breaches/build_breaches_debug.py`, update the `SPECIAL_DAYS_TARGET` branch to use `abs(total - cstr_target)` (bidirectional) instead of the one-sided `max(total - cstr_target, 0)` inside `calculate_breach_penalty_nb_duties_target`. No new `ObjectiveCategory` enum value needed — intra-worker equity breaches are debug-only and the existing filter in `build_breaches.py` already suppresses `SPECIAL_DAYS_TARGET` from returned breaches.

---

## Relevant files
| File | Change |
|------|--------|
| `backend/shared/src/shared/schemas/core/engine.py` | Add `special_days_intra_worker_equity: bool = False` to `SystemConstraints` |
| `backend/shared/src/shared/schemas/core/constraint.py` | Add `special_days_intra_worker_equity: int = 1` to `SystemConstraintPenalty` |
| `backend/solve_service/src/engine/types.py` | New `WorkerSpecialDayPairEquityConstraint` dataclass; add field to `SystemConstraintInputs` |
| `backend/solve_service/src/engine/__init__.py` | Export new type |
| `backend/solve_service/src/engine/model/model.py` | Rewrite `add_special_days_constraints`; add `add_special_days_intra_worker_equity_constraints`; call in `solve_model_hts_custom` |
| `backend/solve_service/src/core_to_engine_service/calculate_worker_special_days.py` | New builder `build_special_days_intra_worker_equity_constraints` |
| `backend/solve_service/src/core_to_engine_service/core_to_engine_inputs.py` | Import + wire new field into `SystemConstraintInputs` |
| `backend/solve_service/src/solve_service/model_config.py` | Add flag |
| `backend/solve_service/src/solve_service/penalties.py` | Add penalty value |
| `backend/solve_service/src/engine_to_core_service/build_breaches/build_breaches_debug.py` | Fix `SPECIAL_DAYS_TARGET` breach penalty to use absolute deviation |

---

## Verification
1. `cd backend && just all shared` — no type errors on shared schema changes
2. `cd backend && just all api_service` — no breakage from `Penalties`/`SystemConstraints` changes
3. `cd backend && just all solve_service no tests` — format/lint/typecheck solve_service
4. `uv run pytest tests/engine_tests/target_special_day_constraints_test.py` — existing `test_target_special_day_constraints` must still pass (objective 0 in a clean scenario); update `test_target_special_day_constraints_w0_filtered_out` assertions which check `max(deltas) == 1` and an exact objective value (those will change with bidirectional penalty)
5. `uv run pytest tests/core_to_engine_tests/calculate_worker_special_days_test.py`

---

## Key design decisions
- `WorkerSpecialDayPairEquityConstraint` is a **new dedicated type** (not reusing `GroupsAssignmentsTargetConstraint`) because the target is implicit — equality between two counts — not an externally-specified integer
- Both new shared fields use **keyword defaults** to avoid breaking any existing construction sites (`replacement_service.py`, test fixtures)
- No new `ObjectiveCategory` enum value for intra-worker equity — those breaches are debug-only and the existing filter already suppresses them
- Fixes 1+2 change the objective value in `test_target_special_day_constraints_w0_filtered_out` — update that test's expected value after the change
