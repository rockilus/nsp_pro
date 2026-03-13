from typing import List, Set, Tuple

from shared.schemas.core import EngineInputs
from shared.schemas.core.shift import ShiftRestType, ShiftType
from shared.schemas.core.solve_task_status import SolveScope, SolveScopeType
from shared.schemas.core.assignment import Assignment


def _existing_fixed_keys(engine_inputs: EngineInputs) -> Set[Tuple]:
    return {
        (a.worker_id, a.date, a.shift_id) for a in engine_inputs.as_wip_fixed
    }


def _append_locked(
    engine_inputs: EngineInputs, to_lock: List[Assignment]
) -> EngineInputs:
    """Return engine_inputs with to_lock deduplicated and appended to as_wip_fixed."""
    existing_keys = _existing_fixed_keys(engine_inputs)
    new_locked = [
        a
        for a in to_lock
        if (a.worker_id, a.date, a.shift_id) not in existing_keys
    ]
    engine_inputs.as_wip_fixed = engine_inputs.as_wip_fixed + new_locked
    return engine_inputs


def _apply_duties_scope(
    engine_inputs: EngineInputs, wip_assignments: List[Assignment]
) -> EngineInputs:
    duty_shift_ids = {
        s.id
        for s in engine_inputs.shifts
        if s.shift_type == ShiftType.DUTY
        or (
            s.shift_type == ShiftType.REST
            and s.rest_type == ShiftRestType.RECUPERATION
        )
    }
    to_lock = [a for a in wip_assignments if a.shift_id not in duty_shift_ids]
    engine_inputs = _append_locked(engine_inputs, to_lock)
    engine_inputs.shifts = [
        s for s in engine_inputs.shifts if s.shift_type != ShiftType.NORMAL
    ]
    return engine_inputs


def _apply_non_duties_scope(
    engine_inputs: EngineInputs, wip_assignments: List[Assignment]
) -> EngineInputs:
    duty_and_recup_shift_ids = {
        s.id
        for s in engine_inputs.shifts
        if s.shift_type == ShiftType.DUTY
        or (
            s.shift_type == ShiftType.REST
            and s.rest_type == ShiftRestType.RECUPERATION
        )
    }
    to_lock = [
        a for a in wip_assignments if a.shift_id in duty_and_recup_shift_ids
    ]
    engine_inputs = _append_locked(engine_inputs, to_lock)
    engine_inputs.shifts = [
        s
        for s in engine_inputs.shifts
        if s.shift_type != ShiftType.DUTY
        and not (
            s.shift_type == ShiftType.REST
            and s.rest_type == ShiftRestType.RECUPERATION
        )
    ]
    return engine_inputs


def _is_in_scope_worker_view(
    assignment: Assignment,
    scope: SolveScope,
    dates_set: Set[str],
    worker_cells_set: Set[Tuple[str, str]],
) -> bool:
    date_str = assignment.date.isoformat()
    if (
        scope.worker_ids is not None
        and assignment.worker_id not in scope.worker_ids
    ):
        return False
    if scope.dates is not None and date_str not in dates_set:
        return False
    if (
        scope.worker_cells is not None
        and (assignment.worker_id, date_str) not in worker_cells_set
    ):
        return False
    return True


def _is_in_scope_shift_view(
    assignment: Assignment,
    scope: SolveScope,
    dates_set: Set[str],
    shift_cells_set: Set[Tuple[str, str]],
) -> bool:
    date_str = assignment.date.isoformat()
    if (
        scope.shift_ids is not None
        and assignment.shift_id not in scope.shift_ids
    ):
        return False
    if scope.dates is not None and date_str not in dates_set:
        return False
    if (
        scope.shift_cells is not None
        and (assignment.shift_id, date_str) not in shift_cells_set
    ):
        return False
    return True


def _apply_custom_scope(
    engine_inputs: EngineInputs,
    solve_scope: SolveScope,
    wip_assignments: List[Assignment],
) -> EngineInputs:
    dates_set: Set[str] = (
        set(solve_scope.dates) if solve_scope.dates is not None else set()
    )

    if solve_scope.solve_view == "worker":
        worker_cells_set: Set[Tuple[str, str]] = (
            {(c.worker_id, c.date) for c in solve_scope.worker_cells}
            if solve_scope.worker_cells is not None
            else set()
        )
        to_lock = [
            a
            for a in wip_assignments
            if not _is_in_scope_worker_view(
                a, solve_scope, dates_set, worker_cells_set
            )
        ]
    else:
        shift_cells_set: Set[Tuple[str, str]] = (
            {(c.shift_id, c.date) for c in solve_scope.shift_cells}
            if solve_scope.shift_cells is not None
            else set()
        )
        to_lock = [
            a
            for a in wip_assignments
            if not _is_in_scope_shift_view(
                a, solve_scope, dates_set, shift_cells_set
            )
        ]

    return _append_locked(engine_inputs, to_lock)


def apply_solve_scope(
    engine_inputs: EngineInputs,
    solve_scope: SolveScope,
    wip_assignments: List[Assignment],
) -> EngineInputs:
    """Apply solve scope to engine_inputs by locking out-of-scope assignments.

    Returns a modified EngineInputs (fields reassigned, not a deep copy).
    FULL scope is a no-op and should be short-circuited by the caller.
    """
    if solve_scope.scope_type == SolveScopeType.FULL:
        return engine_inputs
    if solve_scope.scope_type == SolveScopeType.DUTIES:
        return _apply_duties_scope(engine_inputs, wip_assignments)
    if solve_scope.scope_type == SolveScopeType.NON_DUTIES:
        return _apply_non_duties_scope(engine_inputs, wip_assignments)
    # CUSTOM
    return _apply_custom_scope(engine_inputs, solve_scope, wip_assignments)
