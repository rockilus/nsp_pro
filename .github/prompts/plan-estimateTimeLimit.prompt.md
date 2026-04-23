# Plan: Improve `estimate_time_limit` in model.py

## TL;DR
Replace the linear `alpha*vars + beta*constraints + gamma*obj_vars` heuristic with a better-calibrated estimator that uses (1) decision variable count as the branching-factor signal, (2) a super-linear n·log(n) complexity term, (3) a constraint-density multiplier, and (4) a HTS-stage softness ratio to give early (over-constrained, fail-fast) stages a shorter budget vs. the final (all-soft, optimization-heavy) stage. Also replace `print()` with `loguru` and drop the redundant `gamma` term.

## Steps

### Phase 1 — Signature + HTS softness ratio
1. Add `soft_ratio: float = 1.0` parameter to `estimate_time_limit(self, min_seconds, max_seconds, soft_ratio)`.
2. In `solve_model_hts_custom`, compute `soft_ratio` as the fraction of HTS flags that are `True` over 8 total flags (coverage_hts, worker_shift_filter_hts, duty_recup_hts, nb_duty_hts, work_time_desired_hts, constraint_hts, request_hts, work_time_hts). Pass it through `solve()` to `estimate_time_limit`.
3. `solve()` must accept and forward `soft_ratio` to `estimate_time_limit`.

### Phase 2 — Core estimator rewrite
4. Replace metric sources:
   - Remove `num_obj_vars` (gamma term) — it double-counts proto vars.
   - Use `len(self.variables)` as `num_decision_vars` (true branching factor).
   - Keep `num_constraints = len(proto.constraints)` for density signal.
5. Replace linear formula with:
   ```
   import math
   size_factor = num_decision_vars * math.log2(max(2, num_decision_vars))
   density = num_constraints / max(1, num_decision_vars)
   density_multiplier = 1.0 + 0.3 * min(density, 10.0)
   stage_multiplier = 0.3 + 0.7 * soft_ratio   # 0.3 for all-hard, 1.0 for all-soft
   estimate = (t0 + alpha * size_factor) * density_multiplier * stage_multiplier
   ```
6. Remove `gamma` coefficient constant.
7. Retune `alpha` and `beta` to match the new formula scale (starting point: derive from existing observed wall times vs. estimated budgets).

### Phase 3 — Observability
8. Replace all `print(...)` in `estimate_time_limit` with `logger.debug(...)` using loguru (`from loguru import logger`).
9. In `solve()`, after the solver returns, log actual wall time vs. estimated budget: `logger.debug(f"[Model] actual_wall_time={self.solver.WallTime():.2f}s estimated_budget={estimated_budget}s")`. This gives calibration data going forward.

### Phase 4 — Cleanup
10. Remove the dead commented-out `self.model_config.solver_params.max_time_in_seconds = 90` line in `solve()`.
11. Update the docstring of `estimate_time_limit` to reflect the new formula and parameters.

## Relevant files
- `backend/solve_service/src/engine/model/model.py` — `estimate_time_limit`, `solve`, `solve_model_hts_custom` (the only file touched)

## Verification
1. Run `cd backend && just all solve_service no tests` — format/lint/typecheck must pass.
2. Manually trigger a solve and confirm loguru debug output shows `soft_ratio`, `size_factor`, `density_multiplier`, `stage_multiplier`, and `actual_wall_time` vs `estimated_budget`.
3. Compare early (all-hard, stage 1) vs final (all-soft, last stage) estimated budgets — early should be ~30% of the final for the same model size.

## Decisions
- `soft_ratio` is computed from the 8 HTS booleans at the `solve_model_hts_custom` level and passed down through `solve()` — no schema changes needed.
- `gamma` / `num_obj_vars` term is removed entirely — it adds noise without new information.
- `density_multiplier` is capped at 4× (`min(density, 10.0) * 0.3`) to prevent wild overestimates for highly-constrained small models.
- `stage_multiplier` range is [0.3, 1.0] — early all-hard stages get 30% of the base estimate; HARD_TO_SOFT strategy (single solve, all-soft) gets 100%.
- No cross-service or shared DTO changes required — this is purely internal to `solve_service`.
