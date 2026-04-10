# Plan: Partial Campaign Solve — Solve Service Implementation

## TL;DR
`SolveScope` already travels end-to-end from the frontend through the SQS message, but is **silently dropped** in `sqs_consumer._solve_schedule` — it is never passed to `get_engine_inputs` or the solver. This plan implements the 4 remaining changes in the solve service to make partial solving functional.

---

## Current State
- Phases 1–2 (shared schemas + API gateway), 4–7 (frontend) — ALL DONE ✅
- `solve_scope` arrives correctly in the `SQSSolveMessage` consumed by the solve service ✅
- **Missing**: `sqs_consumer._solve_schedule` never uses `message.solve_scope` ❌
- **Missing**: `get_engine_inputs` has no scope parameter ❌
- **Missing**: `apply_solve_scope.py` does not exist ❌

---

## Architecture Summary

### Key data structures
- `EngineInputs.as_hist` — historical assignments before schedule start (all, no fixed filter)
- `EngineInputs.as_wip_fixed` — assignments within schedule window marked `fixed=True` in DB
- `EngineInputs.shifts` — list of `Shift` objects available to the solver
- `Assignment.fixed: bool` — not `is_fixed`
- `Assignment.date: date` — Python date object; ISO string via `.isoformat()`
- `ShiftType`: `NORMAL=0`, `DUTY=1`, `REST=2`, `LEAVE=3`
- `ShiftRestType`: `NONE=0`, `OFF=1`, `RECUPERATION=2`

### Partial solve strategy
For each scope type, determine which WIP (non-fixed) assignments are **out of scope** and lock them by adding to `as_wip_fixed`. Also, filter `engine_inputs.shifts` to remove shift types the solver should not create new assignments for.

---

## Implementation Steps

### Step 1 — `assignment_services.py`: Add `get_wip_assignments()`
Add a new function to fetch all currently non-fixed WIP assignments within the schedule window. These represent the solver's most recent output — the pool we scan to determine what to lock.

```python
def get_wip_assignments(schedule, collections) -> List[Assignment]:
    return collections.assignment_db.get_assignments_by_dates(
        team_id=schedule.team_id,
        start_date=schedule.start_date,
        end_date=schedule.end_date,
        fixed=False,
    )
```

Note: verify that `get_assignments_by_dates(fixed=False)` returns only non-fixed assignments; if the API only supports `fixed=True`, use no `fixed` param and filter in Python.

---

### Step 2 — `apply_solve_scope.py` (NEW): Core scope-filtering logic

Create `backend/solve_service/src/db_operations/apply_solve_scope.py`.

**Function signature:**
```python
def apply_solve_scope(
    engine_inputs: EngineInputs,
    solve_scope: SolveScope,
    wip_assignments: List[Assignment],
) -> EngineInputs:
```

Returns a modified `EngineInputs` (do not mutate in place; reassign fields).

**FULL** → return `engine_inputs` unchanged.

**DUTIES** logic:
- Build `duty_shift_ids: set[str]` = IDs of shifts where `shift.shift_type == ShiftType.DUTY` and all recuperation shifts (`shift.shift_type == ShiftType.REST and shift.rest_type == ShiftRestType.RECUPERATION`)
- `to_lock` = `[a for a in wip_assignments if a.shift_id not in duty_shift_ids]`
- Deduplicate against existing `engine_inputs.as_wip_fixed` using set of `(worker_id, date, shift_id)` tuples
- New `engine_inputs.as_wip_fixed` = old as_wip_fixed + deduplicated to_lock
- New `engine_inputs.shifts` = filter out `ShiftType.NORMAL` shifts (keep DUTY, REST, LEAVE)

**NON_DUTIES** logic:
- Build `duty_and_recup_shift_ids` = IDs where `shift.shift_type == ShiftType.DUTY` OR (`shift.shift_type == ShiftType.REST and shift.rest_type == ShiftRestType.RECUPERATION`)
- `to_lock` = `[a for a in wip_assignments if a.shift_id in duty_and_recup_shift_ids]`
- Deduplicate + append to `engine_inputs.as_wip_fixed`
- New `engine_inputs.shifts` = filter out DUTY and RECUPERATION-REST shifts (keep NORMAL, OFF-REST, LEAVE)

**CUSTOM** logic — dispatches on `solve_scope.solve_view`:

`solve_view = "worker"` — only `worker_ids`, `dates`, `worker_cells` define the perimeter (ignore `shift_ids` / `shift_cells`):
```python
def is_in_scope_worker_view(a, scope, dates_set, worker_cells_set) -> bool:
    date_str = a.date.isoformat()
    if scope.worker_ids is not None and a.worker_id not in scope.worker_ids:
        return False
    if scope.dates is not None and date_str not in dates_set:
        return False
    if scope.worker_cells is not None and (a.worker_id, date_str) not in worker_cells_set:
        return False
    return True
```

`solve_view = "shift"` — only `shift_ids`, `dates`, `shift_cells` define the perimeter (ignore `worker_ids` / `worker_cells`):
```python
def is_in_scope_shift_view(a, scope, dates_set, shift_cells_set) -> bool:
    date_str = a.date.isoformat()
    if scope.shift_ids is not None and a.shift_id not in scope.shift_ids:
        return False
    if scope.dates is not None and date_str not in dates_set:
        return False
    if scope.shift_cells is not None and (a.shift_id, date_str) not in shift_cells_set:
        return False
    return True
```

- Pre-compute `dates_set`, `worker_cells_set` / `shift_cells_set` once before iterating.
- Dispatch: `if solve_scope.solve_view == "worker"` → use worker helper; `else` → use shift helper.
- `to_lock` = WIP assignments that fail the active helper.
- Deduplicate + append to `engine_inputs.as_wip_fixed`.
- `engine_inputs.shifts` **not filtered** for CUSTOM (all shift types remain available).

---

### Step 3 — `get_engine_inputs.py`: Accept and apply scope

Modify signature:
```python
def get_engine_inputs(
    schedule: Schedule,
    collections: DatabaseCollections,
    solve_scope: Optional[SolveScope] = None,
) -> EngineInputs:
```

After building `engine_inputs` (existing code unchanged), add before `return`:
```python
if solve_scope and solve_scope.scope_type != SolveScopeType.FULL:
    wip_assignments = get_wip_assignments(schedule, collections)
    engine_inputs = apply_solve_scope(engine_inputs, solve_scope, wip_assignments)
```

Imports to add: `SolveScope`, `SolveScopeType` from `shared.schemas.core`; `get_wip_assignments` from `db_operations.assignment_services`; `apply_solve_scope` from `db_operations.apply_solve_scope`.

---

### Step 4 — `sqs_consumer.py`: Pass scope from message

In `_solve_schedule`, change the `get_engine_inputs` call from:
```python
engine_inputs = get_engine_inputs(schedule=schedule, collections=self.collections)
```
to:
```python
engine_inputs = get_engine_inputs(
    schedule=schedule,
    collections=self.collections,
    solve_scope=message.solve_scope,
)
```

No other changes needed in this file.

---

## Files Modified / Created

- `backend/solve_service/src/sqs_consumer.py` — pass `message.solve_scope` (1 line change)
- `backend/solve_service/src/db_operations/get_engine_inputs.py` — add `solve_scope` param + apply call (~10 lines)
- `backend/solve_service/src/db_operations/assignment_services.py` — add `get_wip_assignments()` (~8 lines)
- `backend/solve_service/src/db_operations/apply_solve_scope.py` — NEW: ~80–100 lines

## Test File (New)

- `backend/solve_service/src/tests/test_apply_solve_scope.py` — unit tests covering all 4 scope types

---

## Verification Steps

1. `cd backend && pytest` — confirm no import/schema errors
2. `cd backend/solve_service && pytest` — run existing + new tests
3. In `test_apply_solve_scope.py`, specific cases:
   - FULL: verify `engine_inputs` unchanged
   - DUTIES: verify NORMAL assignments moved to `as_wip_fixed`; NORMAL shifts removed from `engine_inputs.shifts`
   - NON_DUTIES: verify DUTY + recup assignments locked; DUTY + recup shifts removed
   - CUSTOM `solve_view="worker"` with `worker_ids`: out-of-scope worker assignments locked, in-scope untouched
   - CUSTOM `solve_view="worker"` with `dates`: out-of-date assignments locked
   - CUSTOM `solve_view="worker"` with `worker_cells`: exact `(worker_id, date)` intersection respected
   - CUSTOM `solve_view="shift"` with `shift_ids`: out-of-scope shift assignments locked
   - CUSTOM `solve_view="shift"` with `shift_cells`: exact `(shift_id, date)` intersection respected
   - No duplicates in `as_wip_fixed` after apply
4. End-to-end smoke test: run via docker-compose; trigger DUTIES and NON_DUTIES solve; inspect solver logs to confirm correct scope filtering

---

## Decisions / Scope Boundaries

- **`engine_inputs` immutability**: `apply_solve_scope` builds a new `EngineInputs` with replaced fields; it does not mutate the input.
- **Deduplication**: when adding to `as_wip_fixed`, deduplicate using `(worker_id, date, shift_id)` to prevent the solver receiving duplicate constraint assignments.
- **CUSTOM `solve_view` dispatch**: `solve_view = "worker"` uses only `worker_ids`, `dates`, `worker_cells`; `solve_view = "shift"` uses only `shift_ids`, `dates`, `shift_cells`. Worker-side and shift-side fields are never mixed within a single CUSTOM scope. This is enforced by the frontend (which knows the active view) and reflected in `apply_solve_scope` by branching on `solve_view`.
- **CUSTOM shifts list**: not filtered for CUSTOM scope — solver has access to all shift types; scoping is enforced solely via locked assignments.
- **LEAVE shifts**: always `fixed=True` in DB, so they're already in `as_wip_fixed` before scope logic runs. No special handling needed.
- **`EngineInputs` is a dataclass**: reassign fields using field assignment (not `copy()`) since it uses `@dataclass`.
- **FULL scope is a no-op**: the early-exit guard `scope_type != SolveScopeType.FULL` in `get_engine_inputs` ensures zero overhead for normal full solves.
