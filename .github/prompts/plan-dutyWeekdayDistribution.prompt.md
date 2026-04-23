# Plan: Duty Weekday Distribution via LTM Target + Stepped Penalty

## TL;DR

Extend the existing `special_days` machinery (currently Thu–Sun burden fairness) to cover all 7 weekdays for rotation variety. The data builder reuses `calculate_worker_speacial_days` with `special_day_indexes=[0..6]`. The model method gains a baked-in stepped secondary penalty (count ≥ 2 on same weekday). No new architecture — just a parallel field alongside `special_days_target_nb_duties`.

---

## Steps

### Phase 1 — Shared schema *(run `just all shared` after)*

1. `backend/shared/src/shared/schemas/core/engine.py`
   - Add `duty_weekday_distribution: bool = False` to `SystemConstraints`
   - Reference: `special_days_target_nb_duties: bool` is the existing field

2. `backend/shared/src/shared/schemas/core/constraint.py`
   - Add `duty_weekday_distribution: int = 1` to `SystemConstraintPenalty`
   - Reference: `duty_consecutive_gap: int = 0` is the pattern

### Phase 2 — Engine types *(depends on Phase 1)*

3. `backend/solve_service/src/engine/types.py`
   - Add `DUTY_WEEKDAY_DISTRIBUTION = 15` to `ObjectiveCategory` enum
   - Existing last value: `DUTY_CONSECUTIVE_GAP = 14`

4. `backend/solve_service/src/engine/types.py`
   - Add `duty_weekday_distribution: list[GroupsAssignmentsTargetConstraint] = field(default_factory=list)` to `SystemConstraintInputs`
   - Place after `special_days_target_nb_duties` field

### Phase 3 — Data builder *(parallel with Phase 2)*

5. `backend/solve_service/src/core_to_engine_service/calculate_worker_special_days.py`
   - Add `build_duty_weekday_distribution_constraints()` — identical to `build_duty_special_days_constraints` but calls `calculate_worker_speacial_days` with `special_day_indexes=[0, 1, 2, 3, 4, 5, 6]`
   - The inner function `calculate_worker_speacial_days` is directly reusable; only `special_day_indexes` changes

### Phase 4 — Model method *(depends on Phase 2)*

6. `backend/solve_service/src/engine/model/model.py`
   - Add `add_weekday_distribution_constraints()` — same body as `add_special_days_constraints` but:
     - Uses `ObjectiveCategory.DUTY_WEEKDAY_DISTRIBUTION` for the var name
     - After the existing `max_excess` objective term, appends stepped bool penalties per (worker × weekday) group:
       ```python
       stepped_weight = max(1, constraint.penalty // 20)
       sum_var = self.model.NewIntVar(0, len(constraint_vars), "")
       self.model.Add(sum_var == sum(constraint_vars))
       for threshold in range(max(2, target + 1), len(constraint_vars) + 1):
           exceeds = self.model.NewBoolVar("")
           self.model.Add(sum_var >= threshold).OnlyEnforceIf(exceeds)
           self.model.Add(sum_var < threshold).OnlyEnforceIf(exceeds.Not())
           self.obj.bool_vars.append(exceeds)
           self.obj.bool_coeffs.append(threshold * threshold * stepped_weight)
       ```
   - Threshold starts at `max(2, target+1)` to avoid double-penalizing the unit already caught by the primary excess
   - `stepped_weight = penalty // 20` matches the convention in `add_max_weekly_nb_duties_constraints`

### Phase 5 — Wiring *(depends on Phases 2, 3, 4)*

7. `backend/solve_service/src/core_to_engine_service/core_to_engine_inputs.py`
   - Import `build_duty_weekday_distribution_constraints` from `calculate_worker_special_days`
   - Add wiring block to `SystemConstraintInputs(...)` mirroring the `special_days_target_nb_duties` block (lines 447–463):
     ```python
     duty_weekday_distribution=(
         build_duty_weekday_distribution_constraints(
             workers_not_deleted,
             worker_ids_to_worker_dates,
             dates_hist,
             dates_campaign,
             engine_inputs.shifts,
             engine_inputs.requests_leave,
             engine_inputs.shift_demands,
             fixed_assignments,
             engine_inputs.penalties.system_constraint.duty_weekday_distribution,
         )
         if engine_inputs.model_config.system_constraints.duty_weekday_distribution
         else []
     ),
     ```

8. `backend/solve_service/src/engine/model/model.py → solve_model_hts_custom()`
   - Add call after `add_special_days_constraints`:
     ```python
     self.add_weekday_distribution_constraints(
         inputs.system_constraints.duty_weekday_distribution
     )
     ```

9. `backend/solve_service/src/solve_service/model_config.py`
   - Add `duty_weekday_distribution=not test_mode`
   - Reference: `special_days_target_nb_duties=not test_mode`

10. `backend/solve_service/src/solve_service/penalties.py`
    - Add `duty_weekday_distribution=1`
    - Reference: `special_days_target_nb_duties=1`

---

## Verification

1. `cd backend && just all shared` — confirms shared schema has no type errors
2. `cd backend && just all solve_service no tests` — lint/type pass
3. `cd solve_service && uv run pytest tests/core_to_engine_tests/calculate_worker_special_days_test.py` — existing special days tests still pass
4. `cd solve_service && uv run pytest tests/engine_tests/target_special_day_constraints_test.py` — existing engine integration tests still pass
5. Manual: solve a 4-week schedule, inspect that campaign duties are distributed across all 7 weekdays

---

## Design decisions

- **Separate field** from `special_days_target_nb_duties` — independent toggle, independent penalty, no behavioral coupling; existing Thu–Sun burden fairness is unchanged
- **Stepped threshold** starts at `max(2, target+1)` — when `target=1`, the primary excess fires at count=2 linearly; the step at the same threshold adds a convex bump that makes the solver prefer count=1 even when the linear penalty is affordable. When `target=0`, the primary excess fires at ≥1 and steps start at ≥2, so no double-penalizing on the first unit
- **`stepped_weight = penalty // 20`** — same scaling convention as `add_max_weekly_nb_duties_constraints`; light enough not to overwhelm coverage or worktime constraints but strong enough to break ties between equal-LTM-target weekdays
- **No new data structure** — reuses `list[GroupsAssignmentsTargetConstraint]`, which is already understood by the breach reporting pipeline
- **No history look-up in the model** — all history is folded into the integer `target` computed by the data builder; the solver sees only campaign variables
