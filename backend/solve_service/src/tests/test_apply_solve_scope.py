"""Unit tests for apply_solve_scope."""

from datetime import date, datetime, timezone
from typing import List

import pytest
from shared.schemas.core.assignment import Assignment, AssignmentSource
from shared.schemas.core.shift import ShiftLeaveType, ShiftRestType, ShiftType
from shared.schemas.core.solve_task_status import (
    ShiftDateCell,
    SolveScope,
    SolveScopeType,
    WorkerDateCell,
)

from db_operations.apply_solve_scope import apply_solve_scope
from tests.conftest import *  # noqa: F401,F403  — import fixtures


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_assignment(
    worker_id: str, date_val: date, shift_id: str, fixed: bool = False
) -> Assignment:
    return Assignment(
        id=f"{worker_id}-{date_val}-{shift_id}",
        team_id="team1",
        schedule_id="sched1",
        worker_id=worker_id,
        date=date_val,
        shift_id=shift_id,
        fixed=fixed,
        source=AssignmentSource.SOLVER,
    )


def _make_shift(
    shift_id: str,
    shift_type: ShiftType,
    rest_type: ShiftRestType = ShiftRestType.NONE,
):
    from shared.schemas.core.shift import Shift, Staffing

    _t = datetime(2024, 1, 1, 8, 0, 0, tzinfo=timezone.utc)
    _e = datetime(2024, 1, 1, 16, 0, 0, tzinfo=timezone.utc)
    return Shift(
        id=shift_id,
        team_id="team1",
        name=shift_id,
        acronym=shift_id[:3],
        acronym_custom=False,
        start_time=_t,
        end_time=_e,
        staffing=[],
        color="#000",
        shift_type=shift_type,
        rest_type=rest_type,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )


D1 = date(2024, 3, 1)
D2 = date(2024, 3, 2)

SHIFT_NORMAL = _make_shift("shift_normal", ShiftType.NORMAL)
SHIFT_DUTY = _make_shift("shift_duty", ShiftType.DUTY)
SHIFT_REST_OFF = _make_shift(
    "shift_rest_off", ShiftType.REST, ShiftRestType.OFF
)
SHIFT_REST_RECUP = _make_shift(
    "shift_rest_recup", ShiftType.REST, ShiftRestType.RECUPERATION
)
SHIFT_LEAVE = _make_shift("shift_leave", ShiftType.LEAVE)

ALL_SHIFTS = [
    SHIFT_NORMAL,
    SHIFT_DUTY,
    SHIFT_REST_OFF,
    SHIFT_REST_RECUP,
    SHIFT_LEAVE,
]


def _engine_inputs_with(
    shifts=None,
    as_wip_fixed=None,
    schedule=None,
    extra_kwargs=None,
):
    """Build a minimal EngineInputs using the conftest schedule fixture data."""
    from shared.schemas.core import EngineInputs, Schedule, ScheduleStatus

    if schedule is None:
        schedule = Schedule(
            id="sched1",
            team_id="team1",
            start_date=D1,
            end_date=D2,
            status=ScheduleStatus.CAMPAIGN,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
            created_by="test",
        )
    kw = dict(
        schedule=schedule,
        workers=[],
        shifts=shifts if shifts is not None else list(ALL_SHIFTS),
        link_shifts=[],
        dimensions=[],
        dim_entries=[],
        attributes=[],
        as_hist=[],
        as_wip_fixed=as_wip_fixed if as_wip_fixed is not None else [],
        cbs_augmented=[],
        shift_demands=[],
        requests_work=[],
        requests_leave=[],
        model_output=None,
    )
    if extra_kwargs:
        kw.update(extra_kwargs)
    return EngineInputs(**kw)


# ---------------------------------------------------------------------------
# FULL scope — no-op
# ---------------------------------------------------------------------------


def test_full_scope_returns_unchanged():
    ei = _engine_inputs_with()
    scope = SolveScope(scope_type=SolveScopeType.FULL)
    wip = [_make_assignment("w1", D1, "shift_normal")]
    result = apply_solve_scope(ei, scope, wip)
    assert result.as_wip_fixed == []
    assert len(result.shifts) == len(ALL_SHIFTS)


# ---------------------------------------------------------------------------
# DUTIES scope
# ---------------------------------------------------------------------------


def test_duties_scope_locks_normal_assignments():
    a_normal = _make_assignment("w1", D1, "shift_normal")
    a_duty = _make_assignment("w1", D1, "shift_duty")
    a_recup = _make_assignment("w1", D2, "shift_rest_recup")
    wip = [a_normal, a_duty, a_recup]

    ei = _engine_inputs_with()
    scope = SolveScope(scope_type=SolveScopeType.DUTIES)
    result = apply_solve_scope(ei, scope, wip)

    locked_keys = {
        (a.worker_id, a.date, a.shift_id) for a in result.as_wip_fixed
    }
    # normal assignment should be locked
    assert ("w1", D1, "shift_normal") in locked_keys
    # duty and recup should NOT be locked
    assert ("w1", D1, "shift_duty") not in locked_keys
    assert ("w1", D2, "shift_rest_recup") not in locked_keys


def test_duties_scope_removes_normal_shifts():
    ei = _engine_inputs_with()
    scope = SolveScope(scope_type=SolveScopeType.DUTIES)
    result = apply_solve_scope(ei, scope, [])
    shift_types = {s.shift_type for s in result.shifts}
    assert ShiftType.NORMAL not in shift_types
    # duty, REST, LEAVE should remain
    assert ShiftType.DUTY in shift_types
    assert ShiftType.REST in shift_types
    assert ShiftType.LEAVE in shift_types


def test_duties_scope_no_duplicates_in_fixed():
    existing_fixed = _make_assignment("w1", D1, "shift_normal", fixed=True)
    a_normal = _make_assignment("w1", D1, "shift_normal")  # same key
    wip = [a_normal]

    ei = _engine_inputs_with(as_wip_fixed=[existing_fixed])
    scope = SolveScope(scope_type=SolveScopeType.DUTIES)
    result = apply_solve_scope(ei, scope, wip)

    # Should not duplicate
    matching = [
        a
        for a in result.as_wip_fixed
        if a.worker_id == "w1"
        and a.date == D1
        and a.shift_id == "shift_normal"
    ]
    assert len(matching) == 1


# ---------------------------------------------------------------------------
# NON_DUTIES scope
# ---------------------------------------------------------------------------


def test_non_duties_scope_locks_duty_and_recup():
    a_normal = _make_assignment("w1", D1, "shift_normal")
    a_duty = _make_assignment("w1", D1, "shift_duty")
    a_recup = _make_assignment("w1", D2, "shift_rest_recup")
    wip = [a_normal, a_duty, a_recup]

    ei = _engine_inputs_with()
    scope = SolveScope(scope_type=SolveScopeType.NON_DUTIES)
    result = apply_solve_scope(ei, scope, wip)

    locked_keys = {
        (a.worker_id, a.date, a.shift_id) for a in result.as_wip_fixed
    }
    assert ("w1", D1, "shift_duty") in locked_keys
    assert ("w1", D2, "shift_rest_recup") in locked_keys
    assert ("w1", D1, "shift_normal") not in locked_keys


def test_non_duties_scope_removes_duty_and_recup_shifts():
    ei = _engine_inputs_with()
    scope = SolveScope(scope_type=SolveScopeType.NON_DUTIES)
    result = apply_solve_scope(ei, scope, [])
    remaining_ids = {s.id for s in result.shifts}
    assert "shift_duty" not in remaining_ids
    assert "shift_rest_recup" not in remaining_ids
    # normal, off-rest, and leave remain
    assert "shift_normal" in remaining_ids
    assert "shift_rest_off" in remaining_ids
    assert "shift_leave" in remaining_ids


# ---------------------------------------------------------------------------
# CUSTOM — worker view
# ---------------------------------------------------------------------------


def test_custom_worker_view_worker_ids_locks_out_of_scope():
    a_in = _make_assignment("w1", D1, "shift_normal")
    a_out = _make_assignment("w2", D1, "shift_normal")
    wip = [a_in, a_out]

    ei = _engine_inputs_with()
    scope = SolveScope(
        scope_type=SolveScopeType.CUSTOM,
        solve_view="worker",
        worker_ids=["w1"],
    )
    result = apply_solve_scope(ei, scope, wip)

    locked_keys = {
        (a.worker_id, a.date, a.shift_id) for a in result.as_wip_fixed
    }
    assert ("w2", D1, "shift_normal") in locked_keys
    assert ("w1", D1, "shift_normal") not in locked_keys


def test_custom_worker_view_dates_locks_out_of_scope():
    a_in = _make_assignment("w1", D1, "shift_normal")
    a_out = _make_assignment("w1", D2, "shift_normal")
    wip = [a_in, a_out]

    ei = _engine_inputs_with()
    scope = SolveScope(
        scope_type=SolveScopeType.CUSTOM,
        solve_view="worker",
        dates=[D1.isoformat()],
    )
    result = apply_solve_scope(ei, scope, wip)

    locked_keys = {
        (a.worker_id, a.date, a.shift_id) for a in result.as_wip_fixed
    }
    assert ("w1", D2, "shift_normal") in locked_keys
    assert ("w1", D1, "shift_normal") not in locked_keys


def test_custom_worker_view_worker_cells_exact_intersection():
    a_in = _make_assignment("w1", D1, "shift_normal")
    a_out_worker = _make_assignment("w1", D2, "shift_normal")  # wrong date
    a_out_date = _make_assignment("w2", D1, "shift_normal")  # wrong worker
    wip = [a_in, a_out_worker, a_out_date]

    ei = _engine_inputs_with()
    scope = SolveScope(
        scope_type=SolveScopeType.CUSTOM,
        solve_view="worker",
        worker_cells=[WorkerDateCell(worker_id="w1", date=D1.isoformat())],
    )
    result = apply_solve_scope(ei, scope, wip)

    locked_keys = {
        (a.worker_id, a.date, a.shift_id) for a in result.as_wip_fixed
    }
    assert ("w1", D1, "shift_normal") not in locked_keys
    assert ("w1", D2, "shift_normal") in locked_keys
    assert ("w2", D1, "shift_normal") in locked_keys


def test_custom_worker_view_does_not_filter_shifts():
    ei = _engine_inputs_with()
    scope = SolveScope(
        scope_type=SolveScopeType.CUSTOM,
        solve_view="worker",
        worker_ids=["w1"],
    )
    result = apply_solve_scope(ei, scope, [])
    assert len(result.shifts) == len(ALL_SHIFTS)


# ---------------------------------------------------------------------------
# CUSTOM — shift view
# ---------------------------------------------------------------------------


def test_custom_shift_view_shift_ids_locks_out_of_scope():
    a_in = _make_assignment("w1", D1, "shift_normal")
    a_out = _make_assignment("w1", D1, "shift_duty")
    wip = [a_in, a_out]

    ei = _engine_inputs_with()
    scope = SolveScope(
        scope_type=SolveScopeType.CUSTOM,
        solve_view="shift",
        shift_ids=["shift_normal"],
    )
    result = apply_solve_scope(ei, scope, wip)

    locked_keys = {
        (a.worker_id, a.date, a.shift_id) for a in result.as_wip_fixed
    }
    assert ("w1", D1, "shift_duty") in locked_keys
    assert ("w1", D1, "shift_normal") not in locked_keys


def test_custom_shift_view_shift_cells_exact_intersection():
    a_in = _make_assignment("w1", D1, "shift_normal")
    a_out = _make_assignment("w1", D2, "shift_normal")  # different date
    wip = [a_in, a_out]

    ei = _engine_inputs_with()
    scope = SolveScope(
        scope_type=SolveScopeType.CUSTOM,
        solve_view="shift",
        shift_cells=[
            ShiftDateCell(shift_id="shift_normal", date=D1.isoformat())
        ],
    )
    result = apply_solve_scope(ei, scope, wip)

    locked_keys = {
        (a.worker_id, a.date, a.shift_id) for a in result.as_wip_fixed
    }
    assert ("w1", D1, "shift_normal") not in locked_keys
    assert ("w1", D2, "shift_normal") in locked_keys


# ---------------------------------------------------------------------------
# Deduplication across all scopes
# ---------------------------------------------------------------------------


def test_no_duplicates_after_repeated_apply():
    a = _make_assignment("w1", D1, "shift_normal")
    existing = _make_assignment("w1", D1, "shift_normal", fixed=True)

    ei = _engine_inputs_with(as_wip_fixed=[existing])
    scope = SolveScope(scope_type=SolveScopeType.DUTIES)
    result = apply_solve_scope(ei, scope, [a])

    matching = [
        x
        for x in result.as_wip_fixed
        if x.worker_id == "w1"
        and x.date == D1
        and x.shift_id == "shift_normal"
    ]
    assert len(matching) == 1
