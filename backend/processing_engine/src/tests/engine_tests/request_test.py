import random
from datetime import datetime, timedelta
from typing import Dict, List

import pytest
from shared.schemas import (
    Breach,
    DailyShiftDemand,
    DSDSourceType,
    EngineInputs,
    Request,
    RequestStatus,
    Schedule,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Staffing,
    Worker,
)

from engine import Assignment, Outputs
from engine_to_core_service.build_breaches import _parse_breaches_engine
from tests.engine_tests.engine_solve import engine_solve, engine_solve_engine_inputs

# pylint: disable=unused-import
from tests.test_data import sample_data_benoit_case_fixture  # noqa: F401
from tests.test_data import test_data_set_2


# pylint: disable=too-few-public-methods, R0801
class TestRequest:
    @pytest.mark.parametrize("sample_data", test_data_set_2)
    def test_request_one_day_positive_hard(self, sample_data: Dict) -> None:
        shifts: List[Shift] = sample_data["shifts"]
        target_shift = shifts[0]

        workers: List[Worker] = sample_data["workers"]
        target_worker_index = random.randint(0, len(workers) - 1)
        target_worker = workers[target_worker_index]

        schedule: Schedule = sample_data["schedule"]

        requests = [
            Request(
                id="",
                team_id="",
                worker_id=target_worker.id,
                start_date=schedule.start_date,
                end_date=schedule.start_date,
                shift_id=target_shift.id,
                negative=False,
                hard=True,
                status=RequestStatus.PENDING,
            )
        ]

        sample_data["requests"] = requests

        outputs: Outputs = engine_solve(sample_data)

        assignments: List[Assignment] = outputs.assignments
        a_target = next(
            (
                a
                for a in assignments
                if a.worker_id == target_worker.id
                and a.date == schedule.start_date
                and a.shift_id == target_shift.id
            ),
            None,
        )
        assert a_target is not None

    @pytest.mark.parametrize("sample_data", test_data_set_2)
    def test_request_one_day_positive_soft(self, sample_data: Dict) -> None:
        shifts: List[Shift] = sample_data["shifts"]
        target_shift = shifts[0]

        workers: List[Worker] = sample_data["workers"]
        target_worker_index = random.randint(0, len(workers) - 1)
        target_worker = workers[target_worker_index]

        schedule: Schedule = sample_data["schedule"]

        requests = [
            Request(
                id="",
                team_id="",
                worker_id=target_worker.id,
                start_date=schedule.start_date,
                end_date=schedule.start_date,
                shift_id=target_shift.id,
                negative=False,
                hard=False,
                status=RequestStatus.PENDING,
            )
        ]

        sample_data["requests"] = requests

        outputs: Outputs = engine_solve(sample_data)

        assignments: List[Assignment] = outputs.assignments
        a_target = next(
            (
                a
                for a in assignments
                if a.worker_id == target_worker.id
                and a.date == schedule.start_date
                and a.shift_id == target_shift.id
            ),
            None,
        )
        assert a_target is not None

    @pytest.mark.parametrize("sample_data", test_data_set_2)
    def test_request_one_day_negative_hard(self, sample_data: Dict) -> None:
        shifts: List[Shift] = sample_data["shifts"]
        target_shift = shifts[0]

        workers: List[Worker] = sample_data["workers"]
        target_worker_index = random.randint(0, len(workers) - 1)
        target_worker = workers[target_worker_index]

        schedule: Schedule = sample_data["schedule"]

        requests = [
            Request(
                id="",
                team_id="",
                worker_id=target_worker.id,
                start_date=schedule.start_date,
                end_date=schedule.start_date,
                shift_id=target_shift.id,
                negative=True,
                hard=True,
                status=RequestStatus.PENDING,
            )
        ]

        sample_data["requests"] = requests

        outputs: Outputs = engine_solve(sample_data)

        assignments: List[Assignment] = outputs.assignments
        a_target = next(
            (
                a
                for a in assignments
                if a.worker_id == target_worker.id
                and a.date == schedule.start_date
                and a.shift_id == target_shift.id
            ),
            None,
        )
        assert a_target is None

    @pytest.mark.parametrize("sample_data", test_data_set_2)
    def test_request_date_range_positive_hard(self, sample_data: Dict) -> None:
        schedule: Schedule = sample_data["schedule"]

        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        target_shift = Shift(
            id="test_shift_1",
            team_id="t0",
            name="Test shift 1",
            acronym="TS1",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 8, 0),
            end_time=datetime(2025, 1, 1, 9, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="yellow",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )
        dsds_target_shift = [
            DailyShiftDemand(
                id=f"dsd_{target_shift.id}_{d.isoformat()}",
                team_id="t0",
                schedule_id="sch1",
                shift_demand_id=None,
                source_type=DSDSourceType.SHIFT_DEMAND,
                date=d,
                shift_id=target_shift.id,
                count=1,
            )
            for d in dates_campaign
        ]
        sample_data["shifts"].append(target_shift)
        sample_data["daily_shift_demands"] += dsds_target_shift

        workers: List[Worker] = sample_data["workers"]
        target_worker_index = random.randint(0, len(workers) - 1)
        target_worker = workers[target_worker_index]

        requests = [
            Request(
                id="",
                team_id="",
                worker_id=target_worker.id,
                start_date=schedule.start_date,
                end_date=schedule.end_date,
                shift_id=target_shift.id,
                negative=False,
                hard=True,
                status=RequestStatus.PENDING,
            )
        ]

        sample_data["requests"] = requests

        outputs: Outputs = engine_solve(sample_data)

        assignments: List[Assignment] = outputs.assignments
        for d in dates_campaign:
            a_target = next(
                (
                    a
                    for a in assignments
                    if a.worker_id == target_worker.id
                    and a.date == d
                    and a.shift_id == target_shift.id
                ),
                None,
            )
            assert a_target is not None

    # pylint: disable=redefined-outer-name
    def test_all_requests(
        self, sample_data_benoit_case_fixture: EngineInputs  # noqa: F811
    ) -> None:
        outputs = engine_solve_engine_inputs(sample_data_benoit_case_fixture)

        assert outputs is not None

        assignments = outputs.assignments
        breaches: List[Breach] = _parse_breaches_engine(
            sample_data_benoit_case_fixture.schedule, outputs.breaches
        )
        for r in sample_data_benoit_case_fixture.requests:
            as_request = [
                a
                for a in assignments
                if a.worker_id == r.worker_id
                and a.date >= r.start_date
                and a.date <= r.end_date
                and a.shift_id == r.shift_id
            ]
            breach = next(
                (b for b in breaches if b.objective_id == r.id),
                None,
            )
            if r.negative:
                if breach is None:
                    assert len(as_request) == 0
                else:
                    assert len(as_request) > 0
            else:
                nb_days = (r.end_date - r.start_date).days + 1
                if breach is None:
                    assert len(as_request) == nb_days
                else:
                    assert len(as_request) < nb_days
