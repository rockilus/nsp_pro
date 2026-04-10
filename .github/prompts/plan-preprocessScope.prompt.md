# Plan: Phase 4 — Scope Pre-processing: `preprocess_scope` in `build_scope_context.py`

**TL;DR:** Compute the full set of `(worker_id, date_iso, shift_id)` variables in scope using the demand anchor as ground truth and return a `ScopeContext`. This function is a **pure computation** — it does not mutate `engine_inputs`. Mutations (locking WIP, pruning shifts, pruning demands) are applied separately in a subsequent step using the returned context.

**Called from** `core_to_engine_inputs` immediately after the initial `shifts_not_deleted` block, before any `build_*` call. Short-circuit: if `solve_scope is None or scope_type == FULL`, skip entirely and return `None`.

**New file:** `backend/solve_service/src/core_to_engine_service/build_scope_context.py`

---

## Step 4.0 — Define `ScopeContext` dataclass

```python
@dataclass
class ScopeContext:
    variables:        Set[Tuple[str, str, str]]  # (worker_id, date_iso, shift_id)
    dates:            Set[str]                   # {d for (_, d, _) in variables}
    shift_ids:        Set[str]                   # {s for (_, _, s) in variables}
    worker_ids:       Set[str]                   # {w for (w, _, _) in variables}
    shift_demand_ids: Set[str]                   # ids of ShiftDemandNew rows in scope
```

All four convenience sets are derived from `variables` and stored to avoid repeated set comprehensions downstream. No `is_worker_anchored` flag is needed — the 3-tuple encodes all scope information unambiguously.

---

## Step 4.1 — Compute `raw_demand_pairs` (the demand anchor)

Read `engine_inputs.shift_demands` **before** any mutation:

- `raw_demand_pairs: Set[(shift_id, date_iso)]` — every campaign demand slot
- `raw_demand_dates: Set[date_iso]` — derived from `raw_demand_pairs`

A solver variable `(worker, date, shift)` is eligible for scope only if a demand exists for its `(shift_id, date)` slot. This is the demand anchor contract.

---

## Step 4.2 — Compute `variables_in_scope` (union / OR across all present criteria)

**Guard:** if `scope_type == CUSTOM and solve_view is None` → raise `ValueError` immediately.

Four cases, each produces `variables: Set[Tuple[str, str, str]]` as `(worker_id, date_iso, shift_id)` 3-tuples via union of sub-contributions. An absent criterion (`None`) contributes nothing to the union. Let `W = {w.id for w in workers_not_deleted}`.

**Case A — DUTIES:**
- `duty_ids` = `{s.id for s in shifts_not_deleted if s.shift_type == DUTY}`
- For each `(s, d) ∈ raw_demand_pairs` where `s ∈ duty_ids`: add `(w, d, s)` for all `w ∈ W`
- **RECUPERATION addendum** (no demands, but free variables needed for duty-recup pairs):
  - `duty_dates` = dates already present in `variables`
  - For each RECUPERATION shift `r` in `shifts_not_deleted` where `r.recuperation_duty_id ∈ duty_ids`: add `(w, d, r.id)` for all `w ∈ W` and `d ∈ duty_dates`

**Case B — NON_DUTIES:**
- `non_duty_ids` = `{s.id for s in shifts_not_deleted if s.shift_type != DUTY and not (s.shift_type == REST and s.rest_type == RECUPERATION)}`
- For each `(s, d) ∈ raw_demand_pairs` where `s ∈ non_duty_ids`: add `(w, d, s)` for all `w ∈ W`

**Case C — CUSTOM, `solve_view == "shift"`** (OR of up to 3 contributions, workers: all):
- c1 from `scope.shift_ids`: for each `(s, d) ∈ raw_demand_pairs` where `s ∈ scope.shift_ids`: add `(w, d, s)` for all `w ∈ W`
- c2 from `scope.dates`: for each `(s, d) ∈ raw_demand_pairs` where `d ∈ scope.dates`: add `(w, d, s)` for all `w ∈ W`
- c3 from `scope.shift_cells`: for each `(s, d) ∈ raw_demand_pairs` where `(s, d) ∈ {(c.shift_id, c.date) for c in scope.shift_cells}`: add `(w, d, s)` for all `w ∈ W`
- `variables = c1 | c2 | c3`

**Case D — CUSTOM, `solve_view == "worker"`** (OR of up to 3 contributions):
- c1 from `scope.worker_ids`: for each `(s, d) ∈ raw_demand_pairs` and `w ∈ scope.worker_ids`: add `(w, d, s)`
- c2 from `scope.dates`: for each `(s, d) ∈ raw_demand_pairs` where `d ∈ scope.dates`: add `(w, d, s)` for all `w ∈ W`
- c3 from `scope.worker_cells`: for each `c ∈ scope.worker_cells` and each `(s, d) ∈ raw_demand_pairs` where `d == c.date`: add `(c.worker_id, d, s)`
- `variables = c1 | c2 | c3`

---

## Step 4.3 — Derive convenience sets and construct `ScopeContext`

From `variables`:
- `dates` = `{d for (_, d, _) in variables}`
- `shift_ids` = `{s for (_, _, s) in variables}`
- `worker_ids` = `{w for (w, _, _) in variables}`
- `shift_date_pairs` = `{(s, d) for (_, d, s) in variables}` (local intermediate)
- `shift_demand_ids` = `{sd.id for sd in engine_inputs.shift_demands if (sd.shift_id, sd.date.isoformat()) ∈ shift_date_pairs and sd.id is not None}`

---

## Public signature

```python
def preprocess_scope(
    scope: SolveScope,
    engine_inputs: EngineInputsAugmented,  # read-only; not mutated
    workers_not_deleted: List[Worker],
    shifts_not_deleted: List[Shift],
) -> ScopeContext:
```

---

## Downstream contract

| Consumer | Fields used from `ScopeContext` |
|---|---|
| Mutation step — lock WIP, prune shifts/demands | `variables`, `shift_ids`, `shift_demand_ids` |
| Phase 9 — `build_engine_constraints` | `variables` (check `(w, d, s) in ctx.variables`), `dates`, `shift_ids`, `worker_ids` |
| Phase 10 — `build_engine_requests` | `variables` (membership check), `worker_ids`, `shift_ids` |

All consumers use the unambiguous 3-tuple membership check — no `is_worker_anchored` interpretation flag needed.

`worker_ids_to_worker_dates`, `dates_campaign`, `periods_*`, `w_to_work_times`, `w_to_nb_duties` — **all untouched**, full campaign context preserved.

---

## Verification (Phase 4 unit tests — `tests/test_preprocess_scope.py`)

1. **DUTIES** — `ctx.shift_ids` contains no `ShiftType.NORMAL` ids; RECUP shift ids present in `ctx.shift_ids` and their `(w, d, recup_id)` tuples in `ctx.variables`; `ctx.shift_demand_ids` contains only DUTY demand ids; `engine_inputs` is unchanged.
2. **NON_DUTIES** — `ctx.shift_ids` contains no DUTY or RECUPERATION ids; `ctx.variables` has no DUTY/RECUP tuples.
3. **CUSTOM shift view, `shift_ids`** — `ctx.variables` contains `(w, d, s)` tuples for all workers × demanded `(s, date)` pairs for those shifts; `ctx.worker_ids` equals all workers.
4. **CUSTOM worker view, `worker_ids`** — only tuples for those workers × all demanded `(shift, date)` pairs; `ctx.shift_ids` = all shifts with any demand.
5. **CUSTOM shift view, `dates`** — all `(w, date, s)` tuples for demanded `(s, date)` pairs on those dates, for all workers.
6. **CUSTOM worker view, `worker_cells`** — only `(worker_id, date, s)` tuples for each cell's date and all its demanded shifts.
7. **OR / union** — scope with both `shift_ids` and `dates` in shift view: `ctx.variables` is the union of both contributions.
8. **FULL scope / `None`** — `preprocess_scope` not called; returns `None`.
9. **CUSTOM without `solve_view`** — raises `ValueError` immediately.
10. **Pure computation** — `engine_inputs` is identical before and after the call in all cases.
