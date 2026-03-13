# Plan: Phase 4 — Scope Pre-processing: `preprocess_scope` in `build_scope_context.py`

**TL;DR:** Compute the full set of `(worker_id, date_iso, shift_id)` variables in scope using the demand anchor as ground truth, then (1) lock out-of-scope WIP assignments, (2) prune `engine_inputs.shifts`, (3) prune `engine_inputs.shift_demands`. Return a `ScopeContext` with the complete 3-tuple set for downstream phases. `worker_ids_to_worker_dates` and all dates remain **full** — the solver needs the complete campaign timeline to evaluate constraints correctly.

**Called from** `core_to_engine_inputs` immediately after the initial `shifts_not_deleted` block, before any `build_*` call. Short-circuit: if `solve_scope is None or scope_type == FULL`, skip entirely and return `None`.

**New file:** `backend/solve_service/src/core_to_engine_service/build_scope_context.py`

---

## Step 4.0 — Define `ScopeContext` dataclass

```python
@dataclass
class ScopeContext:
    variables_in_scope:  Set[Tuple[str, str, str]]  # (worker_id, date_iso, shift_id)
    in_scope_dates:      Set[str]                   # {d for (_, d, _) in variables_in_scope}
    in_scope_shift_ids:  Set[str]                   # {s for (_, _, s) in variables_in_scope}
    in_scope_worker_ids: Set[str]                   # {w for (w, _, _) in variables_in_scope}
```

All three convenience sets are derived from `variables_in_scope` and stored to avoid repeated set comprehensions downstream. No `is_worker_anchored` flag is needed — the 3-tuple encodes all scope information unambiguously.

---

## Step 4.1 — Compute `raw_demand_pairs` (the demand anchor)

Read `engine_inputs.shift_demands` **before** any mutation:

- `raw_demand_pairs: Set[(shift_id, date_iso)]` — every campaign demand slot
- `raw_demand_dates: Set[date_iso]` — derived from `raw_demand_pairs`

A solver variable `(worker, date, shift)` is eligible for scope only if a demand exists for its `(shift_id, date)` slot. This is the demand anchor contract.

---

## Step 4.2 — Compute `variables_in_scope` (union / OR across all present criteria)

**Guard:** if `scope_type == CUSTOM and solve_view is None` → raise `ValueError` immediately.

Four cases, each produces `variables_in_scope: Set[Tuple[str, str, str]]` as `(worker_id, date_iso, shift_id)` 3-tuples via union of sub-contributions. An absent criterion (`None`) contributes nothing to the union. Let `W = {w.id for w in workers_not_deleted}`.

**Case A — DUTIES:**
- `duty_ids` = `{s.id for s in shifts_not_deleted if s.shift_type == DUTY}`
- For each `(s, d) ∈ raw_demand_pairs` where `s ∈ duty_ids`: add `(w, d, s)` for all `w ∈ W`
- **RECUPERATION addendum** (no demands, but free variables needed for duty-recup pairs):
  - `in_scope_duty_dates` = dates already present in `variables_in_scope`
  - For each RECUPERATION shift `r` in `shifts_not_deleted` where `r.recuperation_duty_id ∈ duty_ids`: add `(w, d, r.id)` for all `w ∈ W` and `d ∈ in_scope_duty_dates`

**Case B — NON_DUTIES:**
- `non_duty_ids` = `{s.id for s in shifts_not_deleted if s.shift_type != DUTY and not (s.shift_type == REST and s.rest_type == RECUPERATION)}`
- For each `(s, d) ∈ raw_demand_pairs` where `s ∈ non_duty_ids`: add `(w, d, s)` for all `w ∈ W`

**Case C — CUSTOM, `solve_view == "shift"`** (OR of up to 3 contributions, workers: all):
- c1 from `scope.shift_ids`: for each `(s, d) ∈ raw_demand_pairs` where `s ∈ scope.shift_ids`: add `(w, d, s)` for all `w ∈ W`
- c2 from `scope.dates`: for each `(s, d) ∈ raw_demand_pairs` where `d ∈ scope.dates`: add `(w, d, s)` for all `w ∈ W`
- c3 from `scope.shift_cells`: for each `(s, d) ∈ raw_demand_pairs` where `(s, d) ∈ {(c.shift_id, c.date) for c in scope.shift_cells}`: add `(w, d, s)` for all `w ∈ W`
- `variables_in_scope = c1 | c2 | c3`

**Case D — CUSTOM, `solve_view == "worker"`** (OR of up to 3 contributions):
- c1 from `scope.worker_ids`: for each `(s, d) ∈ raw_demand_pairs` and `w ∈ scope.worker_ids`: add `(w, d, s)`
- c2 from `scope.dates`: for each `(s, d) ∈ raw_demand_pairs` where `d ∈ scope.dates`: add `(w, d, s)` for all `w ∈ W`
- c3 from `scope.worker_cells`: for each `c ∈ scope.worker_cells` and each `(s, d) ∈ raw_demand_pairs` where `d == c.date`: add `(c.worker_id, d, s)`
- `variables_in_scope = c1 | c2 | c3`

---

## Step 4.3 — Derive convenience sets and construct `ScopeContext`

From `variables_in_scope`:
- `in_scope_dates` = `{d for (_, d, _) in variables_in_scope}`
- `in_scope_shift_ids` = `{s for (_, _, s) in variables_in_scope}`
- `in_scope_worker_ids` = `{w for (w, _, _) in variables_in_scope}`

---

## Step 4.4 — Lock out-of-scope WIP assignments

For each `a` in `engine_inputs.as_campaign_not_fixed`:
- `in_scope = (a.worker_id, a.date.isoformat(), a.shift_id) in context.variables_in_scope`

Out-of-scope assignments are dedup-appended to `engine_inputs.as_campaign_fixed` using the `_append_locked` key-set deduplication helper (migrated from `backend/solve_service/src/db_operations/apply_solve_scope.py` into `build_scope_context.py`).

---

## Step 4.5 — Prune `engine_inputs.shifts`

`engine_inputs.shifts = [s for s in engine_inputs.shifts if s.id ∈ context.in_scope_shift_ids]`

This is correct for all scope types without branching: for DUTIES/NON_DUTIES/CUSTOM shift view `in_scope_shift_ids` contains exactly the relevant shift types; for CUSTOM worker view `in_scope_shift_ids` contains all shift ids that appeared in any demand (effectively all shifts with demands), preserving shifts: all.

After `preprocess_scope` returns, the **caller** in `core_to_engine_inputs` re-computes `shifts_not_deleted`, `shift_not_deleted_ids`, `shifts_work`, `shift_duties`, `shift_duties_not_deleted`, and `shift_id_to_duration_dict` from the now-pruned `engine_inputs.shifts`.

---

## Step 4.6 — Prune `engine_inputs.shift_demands`

Derive `in_scope_shift_date_pairs = {(s, d) for (_, d, s) in context.variables_in_scope}`.

`engine_inputs.shift_demands = [sd for sd in engine_inputs.shift_demands if (sd.shift_id, sd.date.isoformat()) ∈ in_scope_shift_date_pairs]`

Works uniformly for all scope types — no branching needed.

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
| Phase 9 — `build_engine_constraints` | `variables_in_scope` (check `(w, d, s) in ctx.variables_in_scope`), `in_scope_dates`, `in_scope_shift_ids`, `in_scope_worker_ids` |
| Phase 10 — `build_engine_requests` | `variables_in_scope` (membership check), `in_scope_worker_ids`, `in_scope_shift_ids` |

Both consumers use the unambiguous 3-tuple check — no `is_worker_anchored` interpretation flag needed.

`worker_ids_to_worker_dates`, `dates_campaign`, `periods_*`, `w_to_work_times`, `w_to_nb_duties` — **all untouched**, full campaign context preserved.

---

## Verification (Phase 4 unit tests — `tests/test_preprocess_scope.py`)

1. **DUTIES** — `in_scope_shift_ids` contains no `ShiftType.NORMAL` ids; RECUP shift ids present in `in_scope_shift_ids` and their `(w, d, recup_id)` tuples in `variables_in_scope`; WIP with NORMAL `shift_id` is in `as_campaign_fixed`; `shift_demands` has only DUTY rows.
2. **NON_DUTIES** — `in_scope_shift_ids` contains no DUTY or RECUPERATION ids; WIP DUTY assignments locked.
3. **CUSTOM shift view, `shift_ids`** — `variables_in_scope` contains `(w, d, s)` tuples for all workers × demanded `(s, date)` pairs for those shifts; other WIP locked; `in_scope_worker_ids` equals all workers.
4. **CUSTOM worker view, `worker_ids`** — only tuples for those workers × all demanded `(shift, date)` pairs; `engine_inputs.shifts` contains all shifts with any demand (unchanged in practice); `in_scope_shift_ids` = all shifts with any demand.
5. **CUSTOM shift view, `dates`** — all `(w, date, s)` tuples for demanded `(s, date)` pairs on those dates, for all workers.
6. **CUSTOM worker view, `worker_cells`** — only `(worker_id, date, s)` tuples for each cell's date and all its demanded shifts.
7. **OR / union** — scope with both `shift_ids` and `dates` in shift view: `variables_in_scope` is the union of both contributions.
8. **FULL scope / `None`** — `preprocess_scope` not called; `engine_inputs` unchanged.
9. **CUSTOM without `solve_view`** — raises `ValueError` immediately.
