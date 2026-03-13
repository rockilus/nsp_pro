# Plan: Scope-Aware Assignment Deletion via ProcessingCache

The solver returns a **desired state** for its scope — not a diff. The correct pattern is a **scoped authoritative replace**: delete only WIP assignments within the solver's scope, then insert solver outputs. `ProcessingCache` carries the scope boundary from where it's computed (`core_to_engine_inputs`) to where it's needed (`save_assignments`).

---

## Phase 1 — Move `ScopeContext` into engine types

**Files:** `engine/types.py`, `engine/__init__.py`, `build_scope_context.py`

1. Move the `ScopeContext` dataclass definition from `build_scope_context.py` into `engine/types.py` (Annex section, above `ProcessingCache`).
2. In `build_scope_context.py`, replace the local definition with an import: `from engine import ScopeContext`.
3. Export `ScopeContext` from `engine/__init__.py`.
4. Add `scope_ctx: ScopeContext | None = None` as the **last field** of `ProcessingCache` (must be last — it has a default, all existing fields are required).

---

## Phase 2 — Populate `scope_ctx` in `core_to_engine_inputs`

**File:** `core_to_engine_inputs.py`

5. At the `ProcessingCache(...)` instantiation (bottom of function), add `scope_ctx=_scope_ctx`. No other changes needed — `_scope_ctx` is already computed there.

---

## Phase 3 — Scope-aware deletion in `save_assignments`

**File:** `assignment_services.py`

6. Import `ScopeContext` from `engine`.
7. Add `scope_ctx: ScopeContext | None = None` parameter to `save_assignments`.
8. Replace the unconditional `delete_assignments_by_dates(...)` with branched logic:
   - **Full solve** (`scope_ctx is None`): existing call — unchanged.
   - **Partial solve** (`scope_ctx` present):
     1. `get_assignments_by_dates(team_id, start_date, end_date, fixed=False)`
     2. Filter: `a.worker_id in scope_ctx.worker_ids AND a.date.isoformat() in scope_ctx.dates`
     3. `delete_assignments([a.id for a in scoped_wip])`

---

## Phase 4 — Thread through `save_engine_outputs`

**File:** `save_engine_outputs.py`

9. Pass `processing_cache.scope_ctx` to `save_assignments(...)`.

---

## Relevant files

- `backend/solve_service/src/engine/types.py` — add `ScopeContext`, update `ProcessingCache`
- `backend/solve_service/src/engine/__init__.py` — export `ScopeContext`
- `backend/solve_service/src/core_to_engine_service/build_scope_context.py` — remove local `ScopeContext` definition, import from `engine`
- `backend/solve_service/src/core_to_engine_service/core_to_engine_inputs.py` — add `scope_ctx=_scope_ctx` to `ProcessingCache`
- `backend/solve_service/src/db_operations/assignment_services.py` — scoped deletion logic
- `backend/solve_service/src/db_operations/save_engine_outputs.py` — thread `scope_ctx`

## DB methods used (no new methods needed)

- `get_assignments_by_dates(team_id, start_date, end_date, fixed=False)` — fetch WIP to filter
- `delete_assignments(List[str])` — bulk delete by IDs
- `delete_assignments_by_dates(...)` — unchanged full-solve path

---

## Verification

1. `make solve_service_format` — format the solve_service code
2. `make solve_service_check_no_test` — lint/typecheck without running tests
3. Manual smoke: trigger a partial (DUTIES) solve → confirm non-duty WIP assignments survive in DB after save
4. Manual smoke: trigger a full solve → confirm all WIP are replaced as before

## Decisions

- `ScopeContext` moved to `engine/types.py` to avoid circular import (`engine` must not import from `core_to_engine_service`)
- `ProcessingCache.scope_ctx` defaults to `None` — all existing callers compile without change
- Return shape of `save_assignments` unchanged: new scope assignments + existing fixed. Non-scope WIP stay in DB but are not included in the `ResultModel`
