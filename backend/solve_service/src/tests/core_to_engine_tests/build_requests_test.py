from datetime import datetime, timedelta, timezone
from typing import Callable, List

import pytest
from shared.augment.r_to_r_augmented import r_to_r_augmented
from shared.constraint_parser import (
    build_dim_to_attr_value_to_owner,
)
from shared.schemas.core import (
    EngineInputsAugmented,
    FulfillmentStatus,
    Request,
    RequestAugmented,
    RequestStatus,
    RequestType,
    Schedule,
    Shift,
    ShiftDemandNew,
    ShiftDemandSource,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    ShiftWorkerOption,
    Staffing,
    SWOIdTypes,
    Worker,
)

from core_to_engine_service.build_dates import build_worker_ids_to_worker_dates
from core_to_engine_service.build_engine_requests import build_engine_requests
from engine import Request as RequestEngine
from tests.sample_data import test_data_set_3


# pylint: disable=R0801
class TestBuildRequests:
    @pytest.fixture
    def build_engine_requests_fixture(
        self,
    ) -> Callable[[List[Request], EngineInputsAugmented], List[RequestEngine]]:
        """
        Fixture to build engine requests from a list of requests and sample data.
        Inputs:
            - requests: List[Request]
            - sample_data: EngineInputsAugmented
        Returns:
            - output of build_engine_requests
        """

        def _build_engine_requests(
            requests: List[Request], sample_data: EngineInputsAugmented
        ) -> List[RequestEngine]:
            shifts: List[Shift] = sample_data.shifts
            workers: List[Worker] = sample_data.workers
            schedule: Schedule = sample_data.schedule

            rs_augmented: List[RequestAugmented] = []
            for r in requests:
                worker = next((w for w in workers if w.id == r.worker_id), None)
                assert worker is not None, "Worker not found in sample data"
                r_augmented = r_to_r_augmented(
                    request=r,
                    worker=worker,
                    shifts=shifts,
                    dimensions=sample_data.dimensions,
                    dim_entries=sample_data.dim_entries,
                    attributes=sample_data.attributes,
                )
                rs_augmented.append(r_augmented)

            dates_campaign = [
                schedule.start_date + timedelta(days=i)
                for i in range((schedule.end_date - schedule.start_date).days + 1)
            ]
            worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
                schedule, workers, [], dates_campaign
            )
            dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
                owners=shifts,
                dimensions=sample_data.dimensions,
                dim_entries=sample_data.dim_entries,
                attributes=sample_data.attributes,
            )
            output = build_engine_requests(
                worker_not_deleted_ids=[w.id for w in workers],
                worker_ids_to_worker_dates=worker_ids_to_worker_dates,
                shift_not_deleted_ids=[s.id for s in shifts],
                shifts=shifts,
                dim_to_attr_value_to_shift=dim_to_attr_value_to_shift,
                requests=rs_augmented,
                r_penalty=sample_data.penalties.user_constraint.request,
            )
            return output

        return _build_engine_requests

    @pytest.mark.parametrize("sample_data", test_data_set_3)
    def test_build_request_one_day_positive_hard(
        self,
        sample_data: EngineInputsAugmented,
        build_engine_requests_fixture: Callable[
            [List[Request], EngineInputsAugmented], List[RequestEngine]
        ],
    ) -> None:
        shifts: List[Shift] = sample_data.shifts
        target_shift = shifts[0]

        workers: List[Worker] = sample_data.workers
        target_worker = workers[0]

        schedule: Schedule = sample_data.schedule

        requests = [
            Request(
                id="",
                team_id="",
                worker_id=target_worker.id,
                start_date=schedule.start_date,
                end_date=schedule.start_date,
                shift_id=None,
                shift_options=[
                    ShiftWorkerOption(
                        name=target_shift.name,
                        id=target_shift.id,
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name=target_shift.acronym,
                    )
                ],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING,
                request_type=RequestType.WORK_DEMAND,
                fulfillment=FulfillmentStatus.NOT_PROCESSED,
                comment="",
                created_at=datetime.now(tz=timezone.utc),
            )
        ]

        output = build_engine_requests_fixture(requests, sample_data)

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
        build_engine_requests_fixture: Callable[
            [List[Request], EngineInputsAugmented], List[RequestEngine]
        ],
    ) -> None:
        shifts: List[Shift] = sample_data.shifts
        target_shift = shifts[0]

        workers: List[Worker] = sample_data.workers
        target_worker = workers[0]

        schedule: Schedule = sample_data.schedule

        requests = [
            Request(
                id="",
                team_id="",
                worker_id=target_worker.id,
                start_date=schedule.start_date,
                end_date=schedule.start_date,
                shift_id=None,
                shift_options=[
                    ShiftWorkerOption(
                        name=target_shift.name,
                        id=target_shift.id,
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name=target_shift.acronym,
                    )
                ],
                negative=False,
                hard=False,
                status=RequestStatus.PENDING,
                request_type=RequestType.WORK_DEMAND,
                fulfillment=FulfillmentStatus.NOT_PROCESSED,
                comment="",
                created_at=datetime.now(tz=timezone.utc),
            )
        ]

        output = build_engine_requests_fixture(requests, sample_data)

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
        self,
        sample_data: EngineInputsAugmented,
        build_engine_requests_fixture: Callable[
            [List[Request], EngineInputsAugmented], List[RequestEngine]
        ],
    ) -> None:
        shifts: List[Shift] = sample_data.shifts
        target_shift = shifts[0]

        workers: List[Worker] = sample_data.workers
        target_worker = workers[0]

        schedule: Schedule = sample_data.schedule

        requests = [
            Request(
                id="",
                team_id="",
                worker_id=target_worker.id,
                start_date=schedule.start_date,
                end_date=schedule.start_date,
                shift_id=None,
                shift_options=[
                    ShiftWorkerOption(
                        name=target_shift.name,
                        id=target_shift.id,
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name=target_shift.acronym,
                    )
                ],
                negative=True,
                hard=True,
                status=RequestStatus.PENDING,
                request_type=RequestType.WORK_DEMAND,
                fulfillment=FulfillmentStatus.NOT_PROCESSED,
                comment="",
                created_at=datetime.now(tz=timezone.utc),
            )
        ]

        output = build_engine_requests_fixture(requests, sample_data)

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
        self,
        sample_data: EngineInputsAugmented,
        build_engine_requests_fixture: Callable[
            [List[Request], EngineInputsAugmented], List[RequestEngine]
        ],
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
            ShiftDemandNew(
                date=d,
                shift_id=target_shift.id,
                team_id="t0",
                count=1,
                notes=None,
                source=ShiftDemandSource.MANUAL,
                source_id=None,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                id=f"dsd_{target_shift.id}_{d.isoformat()}",
            )
            for d in dates_campaign
        ]
        sample_data.shifts.append(target_shift)
        sample_data.shift_demands += dsds_target_shift

        workers: List[Worker] = sample_data.workers
        target_worker = workers[0]

        requests = [
            Request(
                id="",
                team_id="",
                worker_id=target_worker.id,
                start_date=schedule.start_date,
                end_date=schedule.end_date,
                shift_id=None,
                shift_options=[
                    ShiftWorkerOption(
                        name=target_shift.name,
                        id=target_shift.id,
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name=target_shift.acronym,
                    )
                ],
                negative=False,
                hard=True,
                status=RequestStatus.PENDING,
                request_type=RequestType.WORK_DEMAND,
                fulfillment=FulfillmentStatus.NOT_PROCESSED,
                comment="",
                created_at=datetime.now(tz=timezone.utc),
            )
        ]

        output = build_engine_requests_fixture(requests, sample_data)

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
