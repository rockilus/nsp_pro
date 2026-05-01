from copy import deepcopy
from datetime import datetime, timedelta, date

import pytest
from shared.schemas.core import (
    Assignment,
    AssignmentSource,
    ShiftDemandNew,
    Shift,
    ShiftDemandSource,
    EngineInputsAugmented,
    Penalties,
    ModelConfig,
)
from engine.types import Outputs

from tests.engine_tests.no_overlap_fixture import build_ei_no_overlap
from tests.engine_tests.engine_solve import engine_solve_engine_inputs
from typing import Callable


@pytest.fixture
def engine_inputs_no_overlap(
    penalties_fix: Penalties, model_config_fix: ModelConfig
) -> EngineInputsAugmented:
    return build_ei_no_overlap(penalties_fix, model_config_fix)


def _fixed_assignment_for(
    ei: EngineInputsAugmented, worker_id: str, date_obj, shift_id: str
) -> Assignment:
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


def _ensure_shift_demand(
    ei: EngineInputsAugmented, shift_id: str, date_obj: date
) -> None:
    # Add a demand if not already present for that shift/date
    sid = f"dsd_{shift_id}_{date_obj}"
    existing = [
        d
        for d in ei.shift_demands
        if d.shift_id == shift_id and d.date == date_obj
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


def _run_and_assert_breach(
    ei: EngineInputsAugmented,
    run_engine_solve_from_engine_inputs: Callable[
        [EngineInputsAugmented], Outputs
    ],
) -> None:
    out = run_engine_solve_from_engine_inputs(ei)
    assert out is not None
    assert len(out.breaches) > 0


def _run_and_assert_no_breach(
    ei: EngineInputsAugmented,
    run_engine_solve_from_engine_inputs: Callable[
        [EngineInputsAugmented], Outputs
    ],
) -> None:
    out = run_engine_solve_from_engine_inputs(ei)
    assert out is not None
    assert len(out.breaches) == 0


def test_duty_no_overlap_with_types(
    engine_inputs_no_overlap: EngineInputsAugmented,
    run_engine_solve_from_engine_inputs: Callable[
        [EngineInputsAugmented], Outputs
    ],
) -> None:
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
        ei.as_campaign_fixed.append(
            _fixed_assignment_for(ei, "w0", date0, "s_duty")
        )
        # ensure demand for conflicting shift
        _ensure_shift_demand(ei, shift_conflict, date0)
        _run_and_assert_breach(ei, run_engine_solve_from_engine_inputs)


def test_normal_no_overlap_with_types(
    engine_inputs_no_overlap: EngineInputsAugmented,
    run_engine_solve_from_engine_inputs: Callable[
        [EngineInputsAugmented], Outputs
    ],
) -> None:
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
        ei.as_campaign_fixed.append(
            _fixed_assignment_for(ei, "w0", date0, "s_morning")
        )
        _ensure_shift_demand(ei, shift_conflict, date0)
        _run_and_assert_breach(ei, run_engine_solve_from_engine_inputs)


def test_leave_no_overlap_with_types(
    engine_inputs_no_overlap: EngineInputsAugmented,
    run_engine_solve_from_engine_inputs: Callable[
        [EngineInputsAugmented], Outputs
    ],
) -> None:
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
        ei.as_campaign_fixed.append(
            _fixed_assignment_for(ei, "w0", date0, "s_leave")
        )
        _ensure_shift_demand(ei, shift_conflict, date0)
        _run_and_assert_breach(ei, run_engine_solve_from_engine_inputs)


def test_recup_no_overlap_with_types(
    engine_inputs_no_overlap: EngineInputsAugmented,
    run_engine_solve_from_engine_inputs: Callable[
        [EngineInputsAugmented], Outputs
    ],
) -> None:
    # Recuperation should not overlap with duty, normal, leave, recuperation
    conflicts = ["s_duty", "s_morning", "s_afternoon", "s_recup", "s_leave"]
    for shift_conflict in conflicts:
        ei = deepcopy(engine_inputs_no_overlap)
        date0 = ei.schedule.start_date
        # place recuperation demand on a date where duty's recuperation would occur
        # create a fixed duty the day before
        ei.as_campaign_fixed.append(
            _fixed_assignment_for(ei, "w0", date0, "s_duty")
        )
        recup_date = date0 + timedelta(days=1)
        _ensure_shift_demand(ei, shift_conflict, recup_date)
        _run_and_assert_breach(ei, run_engine_solve_from_engine_inputs)


def test_off_no_overlap_with_types(
    engine_inputs_no_overlap: EngineInputsAugmented,
    run_engine_solve_from_engine_inputs: Callable[
        [EngineInputsAugmented], Outputs
    ],
) -> None:
    conflicts = ["s_duty", "s_morning", "s_afternoon", "s_leave", "s_off"]
    for shift_conflict in conflicts:
        ei = deepcopy(engine_inputs_no_overlap)
        date0 = ei.schedule.start_date
        ei.as_campaign_fixed.append(
            _fixed_assignment_for(ei, "w0", date0, "s_off")
        )
        _ensure_shift_demand(ei, shift_conflict, date0)
        _run_and_assert_breach(ei, run_engine_solve_from_engine_inputs)


def test_recup_and_off_allowed_overlap(
    engine_inputs_no_overlap: EngineInputsAugmented,
    run_engine_solve_from_engine_inputs: Callable[
        [EngineInputsAugmented], Outputs
    ],
) -> None:
    ei = deepcopy(engine_inputs_no_overlap)
    date0 = ei.schedule.start_date
    # fixed duty on date0 -> recuperation on date0+1
    ei.as_campaign_fixed.append(
        _fixed_assignment_for(ei, "w0", date0, "s_duty")
    )
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


def test_no_overlap_duty_with_recup_prior_first_campaign_day(
    engine_inputs_no_overlap: EngineInputsAugmented,
) -> None:
    ei = deepcopy(engine_inputs_no_overlap)
    pre_campaign_assignments = [
        Assignment(
            id="a_w0_pre_campaign",
            team_id=ei.schedule.team_id,
            schedule_id=ei.schedule.id,
            worker_id="w0",
            date=ei.schedule.start_date - timedelta(days=1),
            shift_id="s_duty",
            fixed=True,
            source=AssignmentSource.MANUAL,
        ),
        Assignment(
            id="a_w0_pre_campaign_recup",
            team_id=ei.schedule.team_id,
            schedule_id=ei.schedule.id,
            worker_id="w0",
            date=ei.schedule.start_date - timedelta(days=1),
            shift_id="s_recup",
            fixed=True,
            source=AssignmentSource.MANUAL,
        ),
    ]
    ei.as_hist.extend(pre_campaign_assignments)

    output = engine_solve_engine_inputs(ei)
    assert output is not None

    # Expect no overlapping assignments with the duty and duty recuperation
    shift_duty = next((s for s in ei.shifts if s.id == "s_duty"), None)
    shift_recup = next((s for s in ei.shifts if s.id == "s_recup"), None)
    assert shift_duty is not None
    assert shift_recup is not None
    shift_duty_start = datetime.combine(
        ei.schedule.start_date - timedelta(days=1),
        shift_duty.start_time.time(),
    )
    # compute duty end (handle shifts that end the next day)
    shift_duty_end = datetime.combine(
        ei.schedule.start_date - timedelta(days=1),
        shift_duty.end_time.time(),
    ) + (shift_duty.end_time - shift_duty.start_time).days * timedelta(days=1)

    # recuperation should start when the duty ends
    recup_start = shift_duty_end

    # compute a canonical recup duration based on the recup shift definition
    recup_std_start = datetime.combine(
        ei.schedule.start_date
        - timedelta(days=1)
        + (shift_duty.end_time - shift_duty.start_time).days
        * timedelta(days=1),
        shift_recup.start_time.time(),
    )
    recup_std_end = datetime.combine(
        ei.schedule.start_date
        - timedelta(days=1)
        + (shift_duty.end_time - shift_duty.start_time).days
        * timedelta(days=1),
        shift_recup.end_time.time(),
    ) + (shift_recup.end_time - shift_recup.start_time).days * timedelta(
        days=1
    )
    recup_duration = recup_std_end - recup_std_start
    recup_end = recup_start + recup_duration

    def _interval_for_shift_on_date(
        shift: Shift, date_obj: date
    ) -> tuple[datetime, datetime]:
        s = datetime.combine(date_obj, shift.start_time.time())
        e = datetime.combine(date_obj, shift.end_time.time()) + (
            shift.end_time - shift.start_time
        ).days * timedelta(days=1)
        return s, e

    # check that none of the produced assignments overlap with the pre-campaign
    # duty or the (duty-derived) recuperation interval
    def _overlaps(
        a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime
    ) -> bool:
        return a_start < b_end and a_end > b_start

    for a in output.assignments:
        # ignore the historical fixed assignments we injected
        if (
            a.worker_id == "w0"
            and a.date == ei.schedule.start_date - timedelta(days=1)
        ):
            continue

        # find the shift for the assignment
        shift_a = next((s for s in ei.shifts if s.id == a.shift_id), None)
        assert shift_a is not None
        a_start, a_end = _interval_for_shift_on_date(shift_a, a.date)

        assert not _overlaps(
            a_start, a_end, shift_duty_start, shift_duty_end
        ), f"Assignment {a} overlaps pre-campaign duty interval"
        assert not _overlaps(
            a_start, a_end, recup_start, recup_end
        ), f"Assignment {a} overlaps pre-campaign recuperation interval"
