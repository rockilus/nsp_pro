from copy import deepcopy
from datetime import datetime, timedelta

import pytest
from shared.schemas.core import (
    Assignment,
    AssignmentSource,
    ShiftDemandNew,
    ShiftDemandSource,
)

from tests.engine_tests.no_overlap_fixture import build_ei_no_overlap


@pytest.fixture
def engine_inputs_no_overlap(penalties_fix, model_config_fix):
    return build_ei_no_overlap(penalties_fix, model_config_fix)


def _fixed_assignment_for(ei, worker_id: str, date_obj, shift_id: str) -> Assignment:
    return Assignment(
        id=f"a_{worker_id}_{date_obj}_{shift_id}",
        team_id=ei.schedule.team_id,
        schedule_id=ei.schedule.id,
        worker_id=worker_id,
        date=date_obj,
        shift_id=shift_id,
        fixed=True,
        source=AssignmentSource.MANUAL,
    )


def _ensure_shift_demand(ei, shift_id: str, date_obj):
    # Add a demand if not already present for that shift/date
    sid = f"dsd_{shift_id}_{date_obj}"
    existing = [
        d for d in ei.shift_demands if d.shift_id == shift_id and d.date == date_obj
    ]
    if not existing:
        ei.shift_demands.append(
            ShiftDemandNew(
                id=sid,
                date=date_obj,
                shift_id=shift_id,
                team_id=ei.schedule.team_id,
                count=1,
                notes=None,
                source=ShiftDemandSource.MANUAL,
                source_id=None,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
        )


def _run_and_assert_breach(ei, run_engine_solve_from_engine_inputs):
    out = run_engine_solve_from_engine_inputs(ei)
    assert out is not None
    assert len(out.breaches) > 0


def _run_and_assert_no_breach(ei, run_engine_solve_from_engine_inputs):
    out = run_engine_solve_from_engine_inputs(ei)
    assert out is not None
    assert len(out.breaches) == 0


def test_duty_no_overlap_with_types(
    engine_inputs_no_overlap, run_engine_solve_from_engine_inputs
):
    conflicts = [
        "s_duty",
        "s_morning",
        "s_afternoon",
        "s_recup",
        "s_off",
        "s_leave",
    ]
    for shift_conflict in conflicts:
        ei = deepcopy(engine_inputs_no_overlap)
        date0 = ei.schedule.start_date
        # fixed duty assignment
        ei.as_campaign_fixed.append(_fixed_assignment_for(ei, "w0", date0, "s_duty"))
        # ensure demand for conflicting shift
        _ensure_shift_demand(ei, shift_conflict, date0)
        _run_and_assert_breach(ei, run_engine_solve_from_engine_inputs)


def test_normal_no_overlap_with_types(
    engine_inputs_no_overlap, run_engine_solve_from_engine_inputs
):
    conflicts = [
        "s_duty",
        "s_morning",
        "s_afternoon",
        "s_recup",
        "s_off",
        "s_leave",
    ]
    for shift_conflict in conflicts:
        ei = deepcopy(engine_inputs_no_overlap)
        date0 = ei.schedule.start_date
        ei.as_campaign_fixed.append(_fixed_assignment_for(ei, "w0", date0, "s_morning"))
        _ensure_shift_demand(ei, shift_conflict, date0)
        _run_and_assert_breach(ei, run_engine_solve_from_engine_inputs)


def test_leave_no_overlap_with_types(
    engine_inputs_no_overlap, run_engine_solve_from_engine_inputs
):
    conflicts = [
        "s_duty",
        "s_morning",
        "s_afternoon",
        "s_recup",
        "s_off",
        "s_leave",
    ]
    for shift_conflict in conflicts:
        ei = deepcopy(engine_inputs_no_overlap)
        date0 = ei.schedule.start_date
        ei.as_campaign_fixed.append(_fixed_assignment_for(ei, "w0", date0, "s_leave"))
        _ensure_shift_demand(ei, shift_conflict, date0)
        _run_and_assert_breach(ei, run_engine_solve_from_engine_inputs)


def test_recup_no_overlap_with_types(
    engine_inputs_no_overlap, run_engine_solve_from_engine_inputs
):
    # Recuperation should not overlap with duty, normal, leave, recuperation
    conflicts = ["s_duty", "s_morning", "s_afternoon", "s_recup", "s_leave"]
    for shift_conflict in conflicts:
        ei = deepcopy(engine_inputs_no_overlap)
        date0 = ei.schedule.start_date
        # place recuperation demand on a date where duty's recuperation would occur
        # create a fixed duty the day before
        ei.as_campaign_fixed.append(_fixed_assignment_for(ei, "w0", date0, "s_duty"))
        recup_date = date0 + timedelta(days=1)
        _ensure_shift_demand(ei, shift_conflict, recup_date)
        _run_and_assert_breach(ei, run_engine_solve_from_engine_inputs)


def test_off_no_overlap_with_types(
    engine_inputs_no_overlap, run_engine_solve_from_engine_inputs
):
    conflicts = ["s_duty", "s_morning", "s_afternoon", "s_leave", "s_off"]
    for shift_conflict in conflicts:
        ei = deepcopy(engine_inputs_no_overlap)
        date0 = ei.schedule.start_date
        ei.as_campaign_fixed.append(_fixed_assignment_for(ei, "w0", date0, "s_off"))
        _ensure_shift_demand(ei, shift_conflict, date0)
        _run_and_assert_breach(ei, run_engine_solve_from_engine_inputs)


def test_recup_and_off_allowed_overlap(
    engine_inputs_no_overlap, run_engine_solve_from_engine_inputs
):
    ei = deepcopy(engine_inputs_no_overlap)
    date0 = ei.schedule.start_date
    # fixed duty on date0 -> recuperation on date0+1
    ei.as_campaign_fixed.append(_fixed_assignment_for(ei, "w0", date0, "s_duty"))
    recup_date = date0 + timedelta(days=1)
    # ensure both recup and off demands exist on the recup_date
    _ensure_shift_demand(ei, "s_recup", recup_date)
    _ensure_shift_demand(ei, "s_off", recup_date)
    # run and expect no breach between recup and off
    out = run_engine_solve_from_engine_inputs(ei)
    assert out is not None
    # Ensure there is no breach specifically tied to the recup or off demand
    recup_id = f"dsd_s_recup_{recup_date}"
    off_id = f"dsd_s_off_{recup_date}"
    assert not any(recup_id in b.var_name for b in out.breaches)
    assert not any(off_id in b.var_name for b in out.breaches)
