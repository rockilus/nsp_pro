from datetime import datetime, timedelta
from typing import List

import pytest
from shared.schemas import (
    DailyShiftDemand,
    DSDSourceType,
    EngineInputsAugmented,
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

from core_to_engine_service.build_dates import build_worker_ids_to_worker_dates
from core_to_engine_service.build_engine_requests import build_engine_requests
from engine import Request as RequestEngine
from tests.sample_data import test_data_set_3


# pylint: disable=R0801
class TestBuildRequests:
    @pytest.mark.parametrize("sample_data", test_data_set_3)
    def test_build_request_one_day_positive_hard(
        self,
        sample_data: EngineInputsAugmented,
    ) -> None:
        shifts: List[Shift] = sample_data.shifts
        target_shift = shifts[0]

        workers: List[Worker] = sample_data.workers
        target_worker = workers[0]

        schedule: Schedule = sample_data.schedule

        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, [], dates_campaign
        )

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

        output = build_engine_requests(
            [w.id for w in workers],
            worker_ids_to_worker_dates,
            [s.id for s in shifts],
            requests,
            sample_data.penalties.user_constraint.request,
        )

        assert isinstance(output, list)
        assert all(isinstance(request, RequestEngine) for request in output)
        assert len(output) == 1
        assert output[0] == RequestEngine(
            id="",
            assignments=[
                (
                    target_worker.id,
                    schedule.start_date.isoformat(),
                    target_shift.id,
                )
            ],
            negative=False,
            hard=True,
            penalty=sample_data.penalties.user_constraint.request.hard,
        )

    @pytest.mark.parametrize("sample_data", test_data_set_3)
    def test_build_request_one_day_positive_soft(
        self,
        sample_data: EngineInputsAugmented,
    ) -> None:
        shifts: List[Shift] = sample_data.shifts
        target_shift = shifts[0]

        workers: List[Worker] = sample_data.workers
        target_worker = workers[0]

        schedule: Schedule = sample_data.schedule

        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, [], dates_campaign
        )

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

        output = build_engine_requests(
            [w.id for w in workers],
            worker_ids_to_worker_dates,
            [s.id for s in shifts],
            requests,
            sample_data.penalties.user_constraint.request,
        )

        assert isinstance(output, list)
        assert all(isinstance(request, RequestEngine) for request in output)
        assert len(output) == 1
        assert output[0] == RequestEngine(
            id="",
            assignments=[
                (
                    target_worker.id,
                    schedule.start_date.isoformat(),
                    target_shift.id,
                )
            ],
            negative=False,
            hard=False,
            penalty=sample_data.penalties.user_constraint.request.soft,
        )

    @pytest.mark.parametrize("sample_data", test_data_set_3)
    def test_build_request_one_day_negative_hard(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        shifts: List[Shift] = sample_data.shifts
        target_shift = shifts[0]

        workers: List[Worker] = sample_data.workers
        target_worker = workers[0]

        schedule: Schedule = sample_data.schedule

        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, [], dates_campaign
        )

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

        output = build_engine_requests(
            [w.id for w in workers],
            worker_ids_to_worker_dates,
            [s.id for s in shifts],
            requests,
            sample_data.penalties.user_constraint.request,
        )

        assert isinstance(output, list)
        assert all(isinstance(request, RequestEngine) for request in output)
        assert len(output) == 1
        assert output[0] == RequestEngine(
            id="",
            assignments=[
                (
                    target_worker.id,
                    schedule.start_date.isoformat(),
                    target_shift.id,
                )
            ],
            negative=True,
            hard=True,
            penalty=sample_data.penalties.user_constraint.request.hard,
        )

    @pytest.mark.parametrize("sample_data", test_data_set_3)
    def test_build_request_date_range_positive_hard(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        schedule: Schedule = sample_data.schedule

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
        sample_data.shifts.append(target_shift)
        sample_data.daily_shift_demands += dsds_target_shift

        workers: List[Worker] = sample_data.workers
        target_worker = workers[0]

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, [], dates_campaign
        )

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

        output = build_engine_requests(
            [w.id for w in workers],
            worker_ids_to_worker_dates,
            [s.id for s in sample_data.shifts],
            requests,
            sample_data.penalties.user_constraint.request,
        )

        assert isinstance(output, list)
        assert all(isinstance(request, RequestEngine) for request in output)
        assert len(output) == 1
        assert output[0] == RequestEngine(
            id="",
            assignments=[
                (
                    target_worker.id,
                    d.isoformat(),
                    target_shift.id,
                )
                for d in dates_campaign
            ],
            negative=False,
            hard=True,
            penalty=sample_data.penalties.user_constraint.request.hard,
        )
