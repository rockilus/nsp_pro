# Plan: Total Variation + Consecutive Gap Duty Constraints

**TL;DR:** Add two new system constraints for better duty distribution. Both are toggleable via `SystemConstraints` bool flags, have configurable penalties in `SystemConstraintPenalty`, and follow the exact same wiring pattern as the existing `max_weekly_nb_duties` constraint. All changes flow through 9 files across 2 services.

---

## Phase 1 — Shared schema (depends on nothing)

**Step 1** — `constraint.py` (`SystemConstraintPenalty`): add two new int fields:
- `duty_total_variation: int`
- `duty_consecutive_gap: int`

**Step 2** — `engine.py` (`SystemConstraints`): add toggle + parameter fields:
- `duty_total_variation: bool`
- `duty_consecutive_gap: bool`
- `duty_consecutive_gap_min_days: int` (default `1`; controls the "no duty within N days" window)

**Step 3** — `breach.py` (`ObjectiveCategory` enum): add two new entries at the end:
- `DUTY_TOTAL_VARIATION = 14`
- `DUTY_CONSECUTIVE_GAP = 15`

---

## Phase 2 — Engine types (depends on Phase 1)

**Step 4** — `engine/types.py`:
- Mirror the same two `ObjectiveCategory` values (keeping parity with `breach.py`)
- Extend `SystemConstraintInputs` with two new fields:
  - `duty_total_variation: Tuple[List[List[List[Tuple[str, str, str]]]], int]` — shape is **workers × weeks × assignments** + penalty (note: outer dimension is workers, unlike `max_weekly_nb_duties` which is weeks-first)
  - `duty_consecutive_gap: Tuple[List[Tuple[List[Tuple[str, str, str]], List[Tuple[str, str, str]]]], int]` — list of `(day_d_vars, day_d+k_vars)` pairs + penalty

---

## Phase 3 — Variable builders (depends on Phase 1–2)

**Step 5** — `calculate_worker_nb_duties.py`: add two new builder functions:

- `build_total_variation_duty_vars(workers, shift_duties, periods_weekly, ws_to_dates) → List[List[List[Tuple]]]`
  - Iterates workers-first; for each worker, one list entry per week (empty lists kept to preserve week indexing for |sum_t - sum_{t-1}| computation); workers with fewer than 2 non-empty weeks omitted

- `build_consecutive_duty_gap_vars(workers, shift_duties, dates_campaign, dates_hist, ws_to_dates, min_gap_days) → List[Tuple[List[Tuple], List[Tuple]]]`
  - For each worker and each date `d` in `dates_hist + dates_campaign`, for each `k` in `1..min_gap_days`, if `d+k` is in `dates_campaign` (solver-controlled): collect duty vars on `d` and `d+k`; append as a pair if both sides are non-empty. Crossing the hist/campaign boundary is naturally handled because `d` can be historical (it will be fixed by the solver) while `d+k` is a campaign date

**Step 6** — `core_to_engine_inputs.py`:
- Import two new builder functions
- Call each conditionally (gated on the `SystemConstraints` bool flags), exactly mirroring the existing `max_weekly_nb_duties_vars` pattern at lines ~219–235
- Pass results to the `SystemConstraintInputs(...)` constructor with their respective penalty values

---

## Phase 4 — Model (depends on Phase 2–3)

**Step 7** — `model.py`: add two new constraint methods and call them:

- `add_total_variation_duty_constraints(constraint, obj_category)`:
  - Unpack `(workers_weeks_vars, penalty)`
  - For each worker's week list: create `sum_var` per week; for each consecutive pair `(sum_t, sum_t+1)`: `delta = NewIntVar(-N, N)`, `Add(delta == sum_t+1 - sum_t)`, `abs_delta = NewIntVar(0, N)`, `AddAbsEquality(abs_delta, delta)`; add `penalty * abs_delta` to objective

- `add_consecutive_duty_gap_constraints(constraint, obj_category)`:
  - Unpack `(pairs, penalty)`
  - For each `(vars_d, vars_next)`: create `has_duty_d = NewBoolVar`, `AddMaxEquality(has_duty_d, vars_d_model_vars)`; same for `has_duty_next`; create `excess = NewBoolVar`; enforce `excess ↔ has_duty_d + has_duty_next >= 2`; add `penalty * excess` to objective

- In `solve_model_hts_custom`, add both calls inside the existing `try/except` block next to the two `add_max_weekly_nb_duties_constraints` calls

---

## Phase 5 — Config (depends on Phase 1, parallel with Phase 2–4)

**Step 8** — `model_config.py`: extend `SystemConstraints(...)` instantiation with the three new fields. Recommended defaults: `duty_total_variation=True`, `duty_consecutive_gap=True`, `duty_consecutive_gap_min_days=1` for production; `False` for test mode (same pattern as other flags).

**Step 9** — `penalties.py`: extend `SystemConstraintPenalty(...)` with `duty_total_variation=` and `duty_consecutive_gap=` (start with small values near existing peers, e.g. 50–200 — to be tuned).

---

## Relevant files

- `backend/shared/src/shared/schemas/core/constraint.py` — `SystemConstraintPenalty` dataclass
- `backend/shared/src/shared/schemas/core/engine.py` — `SystemConstraints` dataclass
- `backend/shared/src/shared/schemas/core/breach.py` — `ObjectiveCategory` enum
- `backend/solve_service/src/engine/types.py` — mirrored `ObjectiveCategory`, `SystemConstraintInputs`
- `backend/solve_service/src/core_to_engine_service/calculate_worker_nb_duties.py` — two new builder functions, reuses `ws_to_dates` pattern from `build_max_weekly_nb_duties_vars`
- `backend/solve_service/src/core_to_engine_service/core_to_engine_inputs.py` — wiring of builders → `SystemConstraintInputs`
- `backend/solve_service/src/engine/model/model.py` — two new model methods + call sites
- `backend/solve_service/src/solve_service/model_config.py` — toggle flags
- `backend/solve_service/src/solve_service/penalties.py` — penalty values

---

## Verification

1. Run `cd backend && pytest -q` — all existing tests should pass (new fields have defaults or are off in test mode)
2. Run `make solve_service_check_no_test` — no new type errors
3. Manual smoke test: enable both flags, run a solve, verify the resulting schedule shows duties spread across the campaign without back-to-back occurrences

---

## Decisions

- Keep existing `max_weekly_nb_duties` + stepped approach — complements TV (different signals)
- TV input is **workers-first** (not weeks-first like `max_weekly_nb_duties`) to make consecutive-week diff iteration trivial in the model
- Consecutive gap includes hist/campaign boundary pairs — since historical assignments are fixed, the penalty naturally pushes the solver away from assigning campaign duties adjacent to fixed duty assignments
- Both constraints are always soft (no `hard_to_soft` parameter); penalty = 0 effectively disables the objective contribution
