# Plan: Phase 4 — Scope Pre-processing: `preprocess_scope` in `build_scope_context.py`

**TL;DR:** Compute which `(shift/worker, date)` cells are in scope using the demand anchor as ground truth, then (1) lock out-of-scope WIP assignments, (2) prune `engine_inputs.shifts`, (3) prune `engine_inputs.shift_demands`. Return a `ScopeContext` for downstream phases. `worker_ids_to_worker_dates` and all dates remain **full** — the solver needs the complete campaign timeline to evaluate constraints correctly.

**Called from** `core_to_engine_inputs` immediately after the initial `shifts_not_deleted` block, before any `build_*` call. Short-circuit: if `solve_scope is None or scope_type == FULL`, skip entirely and return `None`.

**New file:** `backend/solve_service/src/core_to_engine_service/build_scope_context.py`

---

## Step 4.0 — Define `ScopeContext` dataclass

```python
@dataclass
class ScopeContext:
    in_scope_cells:      Set[Tuple[str, str]]   # shift-anchored: (shift_id, date_iso)
                                                 # worker-anchored: (worker_id, date_iso)
    in_scope_dates:      Set[str]                # ISO "YYYY-MM-DD" — for Phases 9 & 10
    in_scope_shift_ids:  Optional[Set[str]]      # None = all shifts (worker-anchored)
    in_scope_worker_ids: Optional[Set[str]]      # None = all workers (shift-anchored)
    is_worker_anchored:  bool                    # interpretation flag for in_scope_cells
```

---

## Step 4.1 — Compute `raw_demand_pairs` (the demand anchor)

Read `engine_inputs.shift_demands` **before** any mutation:

- `raw_demand_pairs: Set[(shift_id, date_iso)]` — every campaign demand slot
- `raw_demand_dates: Set[date_iso]` — derived from `raw_demand_pairs`

A solver variable `(worker, date, shift)` is eligible for scope only if a demand exists for its `(shift_id, date)` slot. This is the demand anchor contract.

---

## Step 4.2 — Compute `in_scope_cells` (union / OR across all present criteria)

**Guard:** if `scope_type == CUSTOM and solve_view is None` → raise `ValueError` immediately.

Four cases, each produces `in_scope_cells: Set[Tuple[str, str]]` via union of sub-contributions. An absent criterion (`None`) contributes nothing to the union.

**Case A — DUTIES** (shift-anchored):
- `duty_recup_ids` = `{s.id for s in shifts_not_deleted if s.shift_type == DUTY or (s.shift_type == REST and s.rest_type == RECUPERATION)}`
- `in_scope_cells` = `{(sid, d) ∈ raw_demand_pairs | sid ∈ duty_recup_ids}`
- Note: RECUPERATION shifts carry no own demands — handled explicitly in Step 4.3.

**Case B — NON_DUTIES** (shift-anchored):
- `non_duty_ids` = `{s.id for s in shifts_not_deleted if s.shift_type not in {DUTY} and not (s.shift_type == REST and s.rest_type == RECUPERATION)}`
- `in_scope_cells` = `{(sid, d) ∈ raw_demand_pairs | sid ∈ non_duty_ids}`

**Case C — CUSTOM, `solve_view == "shift"`** (shift-anchored, OR of up to 3 contributions):
- c1 from `scope.shift_ids`: `{(sid, d) ∈ raw_demand_pairs | sid ∈ scope.shift_ids}`
- c2 from `scope.dates`: `{(sid, d) ∈ raw_demand_pairs | d ∈ scope.dates}`
- c3 from `scope.shift_cells`: `{(sid, d) ∈ raw_demand_pairs | (sid, d) ∈ {(c.shift_id, c.date) for c in scope.shift_cells}}`
- `in_scope_cells = c1 | c2 | c3`

**Case D — CUSTOM, `solve_view == "worker"`** (worker-anchored, OR of up to 3 contributions):
- c1 from `scope.worker_ids`: `{(wid, d) | wid ∈ scope.worker_ids, d ∈ raw_demand_dates}`
- c2 from `scope.dates`: `{(w.id, d) | w ∈ workers_not_deleted, d ∈ scope.dates, d ∈ raw_demand_dates}`
- c3 from `scope.worker_cells`: `{(c.worker_id, c.date) | c ∈ scope.worker_cells, c.date ∈ raw_demand_dates}`
- `in_scope_cells = c1 | c2 | c3`

---

## Step 4.3 — Derive `ScopeContext` from `in_scope_cells`

**Shift-anchored (Cases A, B, C):**
- `in_scope_dates` = `{d for (_, d) in in_scope_cells}`
- `in_scope_shift_ids` = `{sid for (sid, _) in in_scope_cells}`
  - **DUTIES only:** also add RECUPERATION shift ids where `s.recuperation_duty_id ∈ in_scope_shift_ids` (they have no demands but must enter the model)
- `in_scope_worker_ids = None` (workers: all)
- `is_worker_anchored = False`

**Worker-anchored (Case D):**
- `in_scope_dates` = `{d for (_, d) in in_scope_cells}`
- `in_scope_worker_ids` = `{wid for (wid, _) in in_scope_cells}`
- `in_scope_shift_ids = None` (shifts: all)
- `is_worker_anchored = True`

---

## Step 4.4 — Lock out-of-scope WIP assignments

For each `a` in `engine_inputs.as_wip_campaign`:
- If shift-anchored: `in_scope = (a.shift_id, a.date.isoformat()) in context.in_scope_cells`
- If worker-anchored: `in_scope = (a.worker_id, a.date.isoformat()) in context.in_scope_cells`

Out-of-scope assignments are dedup-appended to `engine_inputs.as_campaign_fixed` using the `_append_locked` key-set deduplication helper (migrated from `backend/solve_service/src/db_operations/apply_solve_scope.py` into `build_scope_context.py`).

---

## Step 4.5 — Prune `engine_inputs.shifts`

- **Shift-anchored:** `engine_inputs.shifts = [s for s in engine_inputs.shifts if s.id ∈ context.in_scope_shift_ids]`
- **Worker-anchored:** no change — shifts: all.

After `preprocess_scope` returns, the **caller** in `core_to_engine_inputs` re-computes `shifts_not_deleted`, `shift_not_deleted_ids`, `shifts_work`, `shift_duties`, `shift_duties_not_deleted`, and `shift_id_to_duration_dict` from the now-pruned `engine_inputs.shifts`.

---

## Step 4.6 — Prune `engine_inputs.shift_demands`

- **Shift-anchored:** keep demands where `(d.shift_id, d.date.isoformat()) ∈ context.in_scope_cells`
- **Worker-anchored:** keep demands where `d.date.isoformat() ∈ context.in_scope_dates`

---

## Public signature

```python
def preprocess_scope(
    scope: SolveScope,
    engine_inputs: EngineInputsAugmented,  # mutated in-place: shifts, shift_demands, as_campaign_fixed
    workers_not_deleted: List[Worker],
    shifts_not_deleted: List[Shift],       # read-only snapshot before pruning
) -> ScopeContext:
```

---

## Downstream contract

| Consumer | Fields used from `ScopeContext` |
|---|---|
| Phase 9 — `build_engine_constraints` | `in_scope_cells`, `is_worker_anchored`, `in_scope_dates`, `in_scope_shift_ids`, `in_scope_worker_ids` |
| Phase 10 — `build_engine_requests` | `in_scope_cells`, `is_worker_anchored`, `in_scope_worker_ids`, `in_scope_shift_ids` |

`worker_ids_to_worker_dates`, `dates_campaign`, `periods_*`, `w_to_work_times`, `w_to_nb_duties` — **all untouched**, full campaign context preserved.

---

## Verification (Phase 4 unit tests — `tests/test_preprocess_scope.py`)

1. **DUTIES** — `shifts_not_deleted` contains no `ShiftType.NORMAL`; WIP with NORMAL `shift_id` appears in `as_campaign_fixed`; `shift_demands` has only DUTY/RECUP rows; RECUP shift ids present in `in_scope_shift_ids` even without demands.
2. **NON_DUTIES** — `in_scope_shift_ids` contains no DUTY or RECUPERATION ids; WIP DUTY assignments locked.
3. **CUSTOM shift view, `shift_ids`** — only demanded `(shift_id, date)` pairs in `in_scope_cells`; other WIP locked; `in_scope_dates` correct; `in_scope_worker_ids` is `None`.
4. **CUSTOM worker view, `worker_ids`** — only those workers' `(worker_id, date)` in `in_scope_cells`; `in_scope_shift_ids` is `None`; `engine_inputs.shifts` unchanged.
5. **CUSTOM with `dates`** — `in_scope_cells` includes all demand pairs for those dates regardless of shift/worker.
6. **CUSTOM with cells** — only cell-exact demand pairs in scope.
7. **OR / union** — scope with both `shift_ids` and `dates` produces union of both contributions, not intersection.
8. **FULL scope / `None`** — `preprocess_scope` not called; `engine_inputs` unchanged.
9. **CUSTOM without `solve_view`** — raises `ValueError` immediately.
