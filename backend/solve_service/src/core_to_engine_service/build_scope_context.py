"""
Scope pre-processing for partial campaign solves.

`preprocess_scope` is a **pure computation** — it does not mutate engine_inputs.
`apply_scope_mutations` applies the derived ScopeContext to engine_inputs in-place.
"""

from dataclasses import dataclass
from typing import List, Set, Tuple

from shared.schemas.core import EngineInputsAugmented, Shift, Worker
from shared.schemas.core.assignment import Assignment
from shared.schemas.core.shift import ShiftRestType, ShiftType
from shared.schemas.core.solve_task_status import SolveScope, SolveScopeType

# Type alias for the 3-tuple (worker_id, date_iso, shift_id)
_Variables = Set[Tuple[str, str, str]]


@dataclass
class ScopeContext:
    variables: _Variables  # (worker_id, date_iso, shift_id)
    dates: Set[str]  # {d for (_, d, _) in variables}
    shift_ids: Set[str]  # {s for (_, _, s) in variables}
    worker_ids: Set[str]  # {w for (w, _, _) in variables}
    shift_demand_ids: Set[str]  # ids of ShiftDemandNew rows in scope


def _dedup_append_locked(
    engine_inputs: EngineInputsAugmented,
    to_lock: List[Assignment],
) -> None:
    """Append to_lock to as_campaign_fixed, skipping already-present keys."""
    existing_keys = {
        (a.worker_id, a.date, a.shift_id) for a in engine_inputs.as_campaign_fixed
    }
    new_locked = [
        a for a in to_lock if (a.worker_id, a.date, a.shift_id) not in existing_keys
    ]
    engine_inputs.as_campaign_fixed = engine_inputs.as_campaign_fixed + new_locked


def _expand_to_workers(pairs: Set[Tuple[str, str]], W: Set[str]) -> _Variables:
    """Return {(w, date, shift) for w in W for (shift, date) in pairs}."""
    return {(w, date_iso, shift_id) for shift_id, date_iso in pairs for w in W}


def _duties_variables(
    raw_demand_pairs: Set[Tuple[str, str]],
    shifts_not_deleted: List[Shift],
    W: Set[str],
) -> _Variables:
    duty_ids = {s.id for s in shifts_not_deleted if s.shift_type == ShiftType.DUTY}
    variables = _expand_to_workers(
        {(s, d) for s, d in raw_demand_pairs if s in duty_ids}, W
    )
    # RECUPERATION addendum — no demands exist for recup shifts, but free
    # variables are needed so duty-recup pairs can be enforced.
    duty_dates = {d for (_, d, _) in variables}
    recup_ids = {
        s.id
        for s in shifts_not_deleted
        if s.shift_type == ShiftType.REST
        and s.rest_type == ShiftRestType.RECUPERATION
        and s.recuperation_duty_id in duty_ids
    }
    return variables | _expand_to_workers(
        {(s_id, d) for s_id in recup_ids for d in duty_dates}, W
    )


def _non_duties_variables(
    raw_demand_pairs: Set[Tuple[str, str]],
    shifts_not_deleted: List[Shift],
    W: Set[str],
) -> _Variables:
    non_duty_ids = {
        s.id
        for s in shifts_not_deleted
        if s.shift_type != ShiftType.DUTY
        and not (
            s.shift_type == ShiftType.REST and s.rest_type == ShiftRestType.RECUPERATION
        )
    }
    return _expand_to_workers(
        {(s, d) for s, d in raw_demand_pairs if s in non_duty_ids}, W
    )


def _custom_shift_view_variables(
    scope: SolveScope,
    raw_demand_pairs: Set[Tuple[str, str]],
    W: Set[str],
) -> _Variables:
    c1: _Variables = set()
    if scope.shift_ids is not None:
        shift_ids_set = set(scope.shift_ids)
        c1 = _expand_to_workers(
            {(s, d) for s, d in raw_demand_pairs if s in shift_ids_set}, W
        )
    c2: _Variables = set()
    if scope.dates is not None:
        dates_set = set(scope.dates)
        c2 = _expand_to_workers(
            {(s, d) for s, d in raw_demand_pairs if d in dates_set}, W
        )
    c3: _Variables = set()
    if scope.shift_cells is not None:
        cell_pairs = {(c.shift_id, c.date) for c in scope.shift_cells}
        c3 = _expand_to_workers(
            {(s, d) for s, d in raw_demand_pairs if (s, d) in cell_pairs}, W
        )
    return c1 | c2 | c3


def _custom_worker_view_variables(
    scope: SolveScope,
    raw_demand_pairs: Set[Tuple[str, str]],
    W: Set[str],
) -> _Variables:
    c1: _Variables = set()
    if scope.worker_ids is not None:
        worker_ids_set = set(scope.worker_ids)
        c1 = {
            (w, date_iso, shift_id)
            for shift_id, date_iso in raw_demand_pairs
            for w in worker_ids_set
        }
    c2: _Variables = set()
    if scope.dates is not None:
        dates_set = set(scope.dates)
        c2 = _expand_to_workers(
            {(s, d) for s, d in raw_demand_pairs if d in dates_set}, W
        )
    c3: _Variables = set()
    if scope.worker_cells is not None:
        c3 = {
            (cell.worker_id, date_iso, shift_id)
            for cell in scope.worker_cells
            for shift_id, date_iso in raw_demand_pairs
            if date_iso == cell.date
        }
    return c1 | c2 | c3


def _build_scope_context(
    variables: _Variables, engine_inputs: EngineInputsAugmented
) -> ScopeContext:
    dates = {d for (_, d, _) in variables}
    shift_ids = {s for (_, _, s) in variables}
    worker_ids = {w for (w, _, _) in variables}
    shift_date_pairs = {(s, d) for (_, d, s) in variables}
    shift_demand_ids = {
        sd.id
        for sd in engine_inputs.shift_demands
        if (sd.shift_id, sd.date.isoformat()) in shift_date_pairs and sd.id is not None
    }
    return ScopeContext(
        variables=variables,
        dates=dates,
        shift_ids=shift_ids,
        worker_ids=worker_ids,
        shift_demand_ids=shift_demand_ids,
    )


def preprocess_scope(
    scope: SolveScope,
    engine_inputs: EngineInputsAugmented,  # read-only; not mutated
    workers_not_deleted: List[Worker],
    shifts_not_deleted: List[Shift],
) -> ScopeContext:
    """
    Compute the full set of (worker_id, date_iso, shift_id) variables in scope
    using the demand anchor as ground truth.

    Returns a ScopeContext with all derived convenience sets.
    Does NOT mutate engine_inputs.

    Raises ValueError if scope_type is CUSTOM and solve_view is None.
    """
    if scope.scope_type == SolveScopeType.CUSTOM and scope.solve_view is None:
        raise ValueError("solve_view must be set when scope_type is CUSTOM")

    raw_demand_pairs: Set[Tuple[str, str]] = {
        (sd.shift_id, sd.date.isoformat()) for sd in engine_inputs.shift_demands
    }
    W: Set[str] = {w.id for w in workers_not_deleted}

    if scope.scope_type == SolveScopeType.DUTIES:
        variables = _duties_variables(raw_demand_pairs, shifts_not_deleted, W)
    elif scope.scope_type == SolveScopeType.NON_DUTIES:
        variables = _non_duties_variables(raw_demand_pairs, shifts_not_deleted, W)
    elif scope.solve_view == "shift":
        variables = _custom_shift_view_variables(scope, raw_demand_pairs, W)
    else:
        variables = _custom_worker_view_variables(scope, raw_demand_pairs, W)

    return _build_scope_context(variables, engine_inputs)


def apply_scope_mutations(
    engine_inputs: EngineInputsAugmented,
    ctx: ScopeContext,
) -> None:
    """
    Apply scope mutations to engine_inputs in-place using a pre-computed ScopeContext.

    Steps:
    1. Lock WIP assignments outside scope into as_campaign_fixed.
    2. Prune engine_inputs.shifts to in-scope shift ids.
    3. Prune engine_inputs.shift_demands to in-scope (shift_id, date) pairs.
    """
    # 1. WIP locking — out-of-scope WIP assignments become fixed
    to_lock = [
        a
        for a in engine_inputs.as_campaign_not_fixed
        if (a.worker_id, a.date.isoformat(), a.shift_id) not in ctx.variables
    ]
    _dedup_append_locked(engine_inputs, to_lock)

    # 2. Shift pruning — keep only in-scope shifts
    engine_inputs.shifts = [s for s in engine_inputs.shifts if s.id in ctx.shift_ids]

    # 3. Shift demands pruning — keep only (shift_id, date) pairs in scope
    shift_date_pairs_in_scope = {(s, d) for (_, d, s) in ctx.variables}
    engine_inputs.shift_demands = [
        sd
        for sd in engine_inputs.shift_demands
        if (sd.shift_id, sd.date.isoformat()) in shift_date_pairs_in_scope
    ]
