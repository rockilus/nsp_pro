"""
Scope pre-processing for partial campaign solves.

`preprocess_scope` is a **pure computation** — it does not mutate engine_inputs.
`apply_scope_mutations` applies the derived ScopeContext to engine_inputs in-place.
"""

from typing import List, Set, Tuple

from shared.schemas.core import (
    Shift,
    ShiftDemandNew,
    ShiftRestType,
    ShiftType,
    SolveScope,
    SolveScopeType,
    Worker,
)

from engine import ScopeContext

# Type alias for the 3-tuple (worker_id, date_iso, shift_id)
_Variables = Set[Tuple[str, str, str]]


def _expand_to_workers(pairs: Set[Tuple[str, str]], W: Set[str]) -> _Variables:
    """Return {(w, date, shift) for w in W for (shift, date) in pairs}."""
    return {(w, date_iso, shift_id) for shift_id, date_iso in pairs for w in W}


def _duties_variables(
    raw_demand_pairs: Set[Tuple[str, str]],
    shifts_not_deleted: List[Shift],
    W: Set[str],
) -> _Variables:
    duty_ids = {
        s.id for s in shifts_not_deleted if s.shift_type == ShiftType.DUTY
    }
    return _expand_to_workers(
        {(s, d) for s, d in raw_demand_pairs if s in duty_ids}, W
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
            s.shift_type == ShiftType.REST
            and s.rest_type == ShiftRestType.RECUPERATION
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
    variables: _Variables, demands: List[ShiftDemandNew]
) -> ScopeContext:
    dates = {d for (_, d, _) in variables}
    shift_ids = {s for (_, _, s) in variables}
    worker_ids = {w for (w, _, _) in variables}
    shift_date_pairs = {(s, d) for (_, d, s) in variables}
    shift_demand_ids = {
        sd.id
        for sd in demands
        if (sd.shift_id, sd.date.isoformat()) in shift_date_pairs
        and sd.id is not None
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
    workers_not_deleted: List[Worker],
    shifts_not_deleted: List[Shift],
    demands: List[ShiftDemandNew],
    var_model: List[Tuple[str, str, str]],
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
        (sd.shift_id, sd.date.isoformat()) for sd in demands
    }
    W: Set[str] = {w.id for w in workers_not_deleted}

    if scope.scope_type == SolveScopeType.DUTIES:
        variables = _duties_variables(raw_demand_pairs, shifts_not_deleted, W)
    elif scope.scope_type == SolveScopeType.NON_DUTIES:
        variables = _non_duties_variables(
            raw_demand_pairs, shifts_not_deleted, W
        )
    elif scope.solve_view == "shift":
        variables = _custom_shift_view_variables(scope, raw_demand_pairs, W)
    else:
        variables = _custom_worker_view_variables(scope, raw_demand_pairs, W)

    # RECUPERATION addendum — no demands exist for recup shifts, but free
    # variables are needed so duty-recup pairs can be enforced for all scope types.
    all_duty_ids = {
        s.id for s in shifts_not_deleted if s.shift_type == ShiftType.DUTY
    }
    duty_ids_in_scope = {
        shift_id for (_, _, shift_id) in variables if shift_id in all_duty_ids
    }
    if duty_ids_in_scope:
        duty_dates_in_scope = {
            d
            for (_, d, shift_id) in variables
            if shift_id in duty_ids_in_scope
        }
        recup_ids = {
            s.id
            for s in shifts_not_deleted
            if s.shift_type == ShiftType.REST
            and s.rest_type == ShiftRestType.RECUPERATION
            and s.recuperation_duty_id in duty_ids_in_scope
        }
        variables = variables | _expand_to_workers(
            {(s_id, d) for s_id in recup_ids for d in duty_dates_in_scope}, W
        )

    # Ensure variables are constrained to the provided `var_model` (if any).
    # `var_model` is a list of (worker_id, date_iso, shift_id) tuples that
    # represent the model's variables; only keep intersections.
    var_model_set = set(var_model)
    variables = variables & var_model_set

    return _build_scope_context(variables=variables, demands=demands)
