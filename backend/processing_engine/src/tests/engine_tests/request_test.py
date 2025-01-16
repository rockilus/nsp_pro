import random
from datetime import datetime, timedelta
from typing import Dict, List

import pytest
from shared.schemas import (
    DailyShiftDemand,
    DSDSourceType,
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
from tests.engine_tests.engine_solve import engine_solve
from tests.test_data import test_data_set_2


# pylint: disable=too-few-public-methods, R0801
class TestRequest:
    @pytest.mark.parametrize("sample_data", test_data_set_2)
    def test_build_request_one_day_positive_hard(
        self, sample_data: Dict
    ) -> None:
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
    def test_build_request_one_day_positive_soft(
        self, sample_data: Dict
    ) -> None:
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
    def test_build_request_one_day_negative_hard(
        self, sample_data: Dict
    ) -> None:
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
    def test_build_request_date_range_positive_hard(
        self, sample_data: Dict
    ) -> None:
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
