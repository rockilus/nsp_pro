import random
from datetime import date, datetime, timedelta, timezone
from typing import Callable, List, Tuple

import pytest
from shared.augment.r_to_r_augmented import requests_to_requests_augmented
from shared.schemas.core import (
    Breach,
    EngineInputsAugmented,
    FulfillmentStatus,
    Request,
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

from engine import Assignment
from engine import Inputs as InputsEngine
from engine import Outputs, ProcessingCache
from engine import Request as RequestEngine
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from tests.engine_tests.engine_solve import engine_solve_engine_inputs

# pylint: disable=unused-import
from tests.sample_data import sample_data_benoit_case_fixture  # noqa: F401
from tests.sample_data import sample_data_fixture  # noqa: F401
from tests.sample_data import test_data_set_2


# pylint: disable=too-few-public-methods, R0801
class TestRequestDeferred:
    # pylint: disable=redefined-outer-name
    def test_request_one_day_positive_hard(
        self, sample_data_fixture: EngineInputsAugmented  # noqa: F811
    ) -> None:
        shifts: List[Shift] = sample_data_fixture.shifts
        target_shift = shifts[0]

        workers: List[Worker] = sample_data_fixture.workers
        target_worker_index = random.randint(0, len(workers) - 1)
        target_worker = workers[target_worker_index]

        schedule: Schedule = sample_data_fixture.schedule

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
                status=RequestStatus.DEFERRED,
                request_type=RequestType.WORK_DEMAND,
                fulfillment=FulfillmentStatus.NOT_PROCESSED,
                comment="",
                created_at=datetime.now(tz=timezone.utc),
            )
        ]

        sample_data_fixture.requests_work = requests_to_requests_augmented(
            requests=requests,
            workers=sample_data_fixture.workers,
            shifts=sample_data_fixture.shifts,
            dimensions=sample_data_fixture.dimensions,
            dim_entries=sample_data_fixture.dim_entries,
            attributes=sample_data_fixture.attributes,
        )

        outputs: Outputs = engine_solve_engine_inputs(sample_data_fixture)

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

    # pylint: disable=redefined-outer-name
    def test_request_one_day_positive_soft(
        self, sample_data_fixture: EngineInputsAugmented  # noqa: F811
    ) -> None:
        shifts: List[Shift] = sample_data_fixture.shifts
        target_shift = shifts[0]

        workers: List[Worker] = sample_data_fixture.workers
        target_worker_index = random.randint(0, len(workers) - 1)
        target_worker = workers[target_worker_index]

        schedule: Schedule = sample_data_fixture.schedule

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
                status=RequestStatus.DEFERRED,
                request_type=RequestType.WORK_DEMAND,
                fulfillment=FulfillmentStatus.NOT_PROCESSED,
                comment="",
                created_at=datetime.now(tz=timezone.utc),
            )
        ]

        sample_data_fixture.requests_work = requests_to_requests_augmented(
            requests=requests,
            workers=sample_data_fixture.workers,
            shifts=sample_data_fixture.shifts,
            dimensions=sample_data_fixture.dimensions,
            dim_entries=sample_data_fixture.dim_entries,
            attributes=sample_data_fixture.attributes,
        )

        outputs: Outputs = engine_solve_engine_inputs(sample_data_fixture)

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
    def test_request_one_day_negative_hard(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        shifts: List[Shift] = sample_data.shifts
        target_shift = shifts[0]

        workers: List[Worker] = sample_data.workers
        target_worker_index = random.randint(0, len(workers) - 1)
        target_worker = workers[target_worker_index]

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
                status=RequestStatus.DEFERRED,
                request_type=RequestType.WORK_DEMAND,
                fulfillment=FulfillmentStatus.NOT_PROCESSED,
                comment="",
                created_at=datetime.now(tz=timezone.utc),
            )
        ]

        sample_data.requests_work = requests_to_requests_augmented(
            requests=requests,
            workers=sample_data.workers,
            shifts=sample_data.shifts,
            dimensions=sample_data.dimensions,
            dim_entries=sample_data.dim_entries,
            attributes=sample_data.attributes,
        )

        outputs: Outputs = engine_solve_engine_inputs(sample_data)

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
    def test_request_date_range_positive_hard(
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
        target_worker_index = random.randint(0, len(workers) - 1)
        target_worker = workers[target_worker_index]

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
                status=RequestStatus.DEFERRED,
                request_type=RequestType.WORK_DEMAND,
                fulfillment=FulfillmentStatus.NOT_PROCESSED,
                comment="",
                created_at=datetime.now(tz=timezone.utc),
            )
        ]

        sample_data.requests_work = requests_to_requests_augmented(
            requests=requests,
            workers=sample_data.workers,
            shifts=sample_data.shifts,
            dimensions=sample_data.dimensions,
            dim_entries=sample_data.dim_entries,
            attributes=sample_data.attributes,
        )

        outputs: Outputs = engine_solve_engine_inputs(sample_data)

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
        self,
        sample_data_benoit_case_fixture: EngineInputsAugmented,  # noqa: F811
    ) -> None:
        outputs = engine_solve_engine_inputs(sample_data_benoit_case_fixture)

        assert outputs is not None

        assignments = outputs.assignments
        breaches: List[Breach] = _parse_breaches_engine(
            sample_data_benoit_case_fixture.schedule, outputs.breaches
        )
        for r in sample_data_benoit_case_fixture.requests_work:
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

    # pylint: disable=too-many-locals
    def test_request_hard_soft_conflict(
        self,
        engine_inputs: EngineInputsAugmented,
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        target_shift = engine_inputs.shifts[0]
        request_hard = Request(
            id="req_hard",
            team_id="t0",
            shift_id=engine_inputs.shifts[0].id,
            shift_options=[
                ShiftWorkerOption(
                    name=target_shift.name,
                    id=target_shift.id,
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name=target_shift.acronym,
                )
            ],
            worker_id=engine_inputs.workers[0].id,
            start_date=engine_inputs.schedule.start_date,
            end_date=engine_inputs.schedule.start_date,
            negative=False,
            hard=True,
            status=RequestStatus.DEFERRED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
        )
        request_soft = Request(
            id="req_soft",
            team_id="t0",
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
            worker_id=engine_inputs.workers[0].id,
            start_date=engine_inputs.schedule.start_date,
            end_date=engine_inputs.schedule.start_date,
            negative=True,
            hard=False,
            status=RequestStatus.DEFERRED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
        )
        engine_inputs.requests_work = requests_to_requests_augmented(
            requests=[request_hard, request_soft],
            workers=engine_inputs.workers,
            shifts=engine_inputs.shifts,
            dimensions=engine_inputs.dimensions,
            dim_entries=engine_inputs.dim_entries,
            attributes=engine_inputs.attributes,
        )

        inputs, _ = run_core_to_engine_inputs(engine_inputs)

        assert len(inputs.configuration_constraints.requests) == 2
        assert all(
            isinstance(r, RequestEngine)
            for r in inputs.configuration_constraints.requests
        )
        request_hard_engine = next(
            (
                r
                for r in inputs.configuration_constraints.requests
                if r.id == request_hard.id
            ),
            None,
        )
        request_soft_engine = next(
            (
                r
                for r in inputs.configuration_constraints.requests
                if r.id == request_soft.id
            ),
            None,
        )
        assert request_hard_engine is not None
        assert request_soft_engine is not None

        out = run_engine_solve(inputs)

        # Check assignments hard request
        for cstr_var in request_hard_engine.assignments:
            coord = (cstr_var[0], date.fromisoformat(cstr_var[1]), cstr_var[2])
            if not request_hard_engine.negative:
                assert any(
                    a.worker_id == coord[0]
                    and a.date == coord[1]
                    and a.shift_id == coord[2]
                    for a in out.assignments
                )
            else:
                assert not any(
                    a.worker_id == coord[0]
                    and a.date == coord[1]
                    and a.shift_id == coord[2]
                    for a in out.assignments
                )

        # Check breach soft constraint
        breaches = _parse_breaches_engine(engine_inputs.schedule, out.breaches)
        assert len(breaches) == 1
        for breach in breaches:
            assert breach.objective_id == request_soft.id
            b_vars = [
                (var.worker_id, var.date.isoformat(), var.shift_id)
                for var in breach.variables
            ]
            assert all(v in request_soft_engine.assignments for v in b_vars)

        # # # Check objective value
        penalty = engine_inputs.penalties.user_constraint.request.soft
        assert out.objective_value == penalty * len(breaches)

    def test_request_hard_hard_conflict(
        self,
        engine_inputs: EngineInputsAugmented,
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        target_shift = engine_inputs.shifts[0]
        request_hard_1 = Request(
            id="req_hard_1",
            team_id="t0",
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
            worker_id=engine_inputs.workers[0].id,
            start_date=engine_inputs.schedule.start_date,
            end_date=engine_inputs.schedule.start_date,
            negative=False,
            hard=True,
            status=RequestStatus.DEFERRED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
        )
        request_hard_2 = Request(
            id="req_hard_2",
            team_id="t0",
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
            worker_id=engine_inputs.workers[0].id,
            start_date=engine_inputs.schedule.start_date,
            end_date=engine_inputs.schedule.start_date,
            negative=True,
            hard=True,
            status=RequestStatus.DEFERRED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
        )
        engine_inputs.requests_work = requests_to_requests_augmented(
            requests=[request_hard_1, request_hard_2],
            workers=engine_inputs.workers,
            shifts=engine_inputs.shifts,
            dimensions=engine_inputs.dimensions,
            dim_entries=engine_inputs.dim_entries,
            attributes=engine_inputs.attributes,
        )

        inputs, _ = run_core_to_engine_inputs(engine_inputs)

        assert len(inputs.configuration_constraints.requests) == 2
        assert all(
            isinstance(r, RequestEngine)
            for r in inputs.configuration_constraints.requests
        )
        request_hard_1_engine = next(
            (
                r
                for r in inputs.configuration_constraints.requests
                if r.id == request_hard_1.id
            ),
            None,
        )
        request_hard_2_engine = next(
            (
                r
                for r in inputs.configuration_constraints.requests
                if r.id == request_hard_2.id
            ),
            None,
        )
        assert request_hard_1_engine is not None
        assert request_hard_2_engine is not None

        out = run_engine_solve(inputs)

        # Check objective value
        breaches = _parse_breaches_engine(engine_inputs.schedule, out.breaches)
        penalty = engine_inputs.penalties.user_constraint.request.hard
        assert out.objective_value == penalty * len(breaches)


# pylint: disable=too-few-public-methods
class TestRequestApproved:
    """Test that APPROVED requests are respected by the solver."""

    # pylint: disable=redefined-outer-name
    def test_approved_positive_work_demand_with_conflicting_deferred(
        self,
        sample_data_fixture: EngineInputsAugmented,  # noqa: F811
    ) -> None:
        """
        Test that an APPROVED positive work demand request is satisfied
        even when there's a conflicting DEFERRED negative request.
        """
        shifts: List[Shift] = sample_data_fixture.shifts
        target_shift = shifts[0]

        workers: List[Worker] = sample_data_fixture.workers
        target_worker = workers[0]

        schedule: Schedule = sample_data_fixture.schedule

        # Create APPROVED positive request (worker wants this shift)
        approved_request = Request(
            id="approved_req",
            team_id="t0",
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
            status=RequestStatus.APPROVED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
        )

        # Create conflicting DEFERRED negative request
        deferred_request = Request(
            id="deferred_req",
            team_id="t0",
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
            status=RequestStatus.DEFERRED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
        )

        sample_data_fixture.requests_work = requests_to_requests_augmented(
            requests=[approved_request, deferred_request],
            workers=sample_data_fixture.workers,
            shifts=sample_data_fixture.shifts,
            dimensions=sample_data_fixture.dimensions,
            dim_entries=sample_data_fixture.dim_entries,
            attributes=sample_data_fixture.attributes,
        )

        outputs: Outputs = engine_solve_engine_inputs(sample_data_fixture)

        # Check that the approved request is satisfied
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
        assert a_target is not None, "Approved positive work demand must be satisfied"

        # Check that there's a breach for the deferred negative request
        breaches: List[Breach] = _parse_breaches_engine(
            sample_data_fixture.schedule, outputs.breaches
        )
        deferred_breach = next(
            (b for b in breaches if b.objective_id == deferred_request.id),
            None,
        )
        assert (
            deferred_breach is not None
        ), "Deferred negative request should be breached"

    # pylint: disable=redefined-outer-name
    def test_approved_negative_work_demand_with_conflicting_deferred(
        self,
        sample_data_fixture: EngineInputsAugmented,  # noqa: F811
    ) -> None:
        """
        Test that an APPROVED negative work demand request is respected
        even when there's a conflicting DEFERRED positive request.
        """
        shifts: List[Shift] = sample_data_fixture.shifts
        target_shift = shifts[0]

        workers: List[Worker] = sample_data_fixture.workers
        target_worker = workers[0]

        schedule: Schedule = sample_data_fixture.schedule

        # Create APPROVED negative request (worker doesn't want this shift)
        approved_request = Request(
            id="approved_neg_req",
            team_id="t0",
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
            status=RequestStatus.APPROVED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
        )

        # Create conflicting DEFERRED positive request
        deferred_request = Request(
            id="deferred_pos_req",
            team_id="t0",
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
            status=RequestStatus.DEFERRED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
        )

        sample_data_fixture.requests_work = requests_to_requests_augmented(
            requests=[approved_request, deferred_request],
            workers=sample_data_fixture.workers,
            shifts=sample_data_fixture.shifts,
            dimensions=sample_data_fixture.dimensions,
            dim_entries=sample_data_fixture.dim_entries,
            attributes=sample_data_fixture.attributes,
        )

        outputs: Outputs = engine_solve_engine_inputs(sample_data_fixture)

        # Check that the approved negative request is respected
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
        assert a_target is None, (
            "Approved negative work demand must be respected - "
            "no assignment should exist"
        )

        # Check that there's a breach for the deferred positive request
        breaches: List[Breach] = _parse_breaches_engine(
            sample_data_fixture.schedule, outputs.breaches
        )
        deferred_breach = next(
            (b for b in breaches if b.objective_id == deferred_request.id),
            None,
        )
        assert (
            deferred_breach is not None
        ), "Deferred positive request should be breached"

    # pylint: disable=redefined-outer-name, too-many-locals
    def test_approved_leave_request_with_conflicting_deferred_work_demand(
        self,
        sample_data_fixture: EngineInputsAugmented,  # noqa: F811
    ) -> None:
        """
        Test that an APPROVED leave request is satisfied
        even when there's a conflicting DEFERRED work demand request.
        """
        shifts: List[Shift] = sample_data_fixture.shifts

        # Find a normal work shift
        work_shift = next((s for s in shifts if s.shift_type == ShiftType.NORMAL), None)
        assert work_shift is not None, "Test requires a normal work shift"

        workers: List[Worker] = sample_data_fixture.workers
        target_worker = workers[0]

        schedule: Schedule = sample_data_fixture.schedule

        # Create a leave shift for testing
        leave_shift = Shift(
            id="leave_vacation",
            team_id="t0",
            name="Vacation",
            acronym="VAC",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 0, 0),
            end_time=datetime(2025, 1, 2, 0, 0),
            staffing=[],
            color="gray",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.VACATION,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )
        sample_data_fixture.shifts.append(leave_shift)

        # Create APPROVED leave request
        approved_leave = Request(
            id="approved_leave",
            team_id="t0",
            worker_id=target_worker.id,
            start_date=schedule.start_date,
            end_date=schedule.start_date,
            shift_id=leave_shift.id,
            shift_options=[],
            negative=False,
            hard=True,
            status=RequestStatus.APPROVED,
            request_type=RequestType.LEAVE,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
        )

        # Create conflicting DEFERRED work demand request
        deferred_work = Request(
            id="deferred_work",
            team_id="t0",
            worker_id=target_worker.id,
            start_date=schedule.start_date,
            end_date=schedule.start_date,
            shift_id=None,
            shift_options=[
                ShiftWorkerOption(
                    name=work_shift.name,
                    id=work_shift.id,
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name=work_shift.acronym,
                )
            ],
            negative=False,
            hard=True,
            status=RequestStatus.DEFERRED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
        )

        # Add leave request to requests_leave (which expects List[Request])
        # The requests_to_requests_augmented returns RequestAugmented, so we
        # convert back to Request for requests_leave
        sample_data_fixture.requests_leave = [approved_leave]

        sample_data_fixture.requests_work = requests_to_requests_augmented(
            requests=[deferred_work],
            workers=sample_data_fixture.workers,
            shifts=sample_data_fixture.shifts,
            dimensions=sample_data_fixture.dimensions,
            dim_entries=sample_data_fixture.dim_entries,
            attributes=sample_data_fixture.attributes,
        )

        outputs: Outputs = engine_solve_engine_inputs(sample_data_fixture)

        # Check that the approved leave request is satisfied
        assignments: List[Assignment] = outputs.assignments
        leave_assignment = next(
            (
                a
                for a in assignments
                if a.worker_id == target_worker.id
                and a.date == schedule.start_date
                and a.shift_id == leave_shift.id
            ),
            None,
        )
        assert leave_assignment is not None, "Approved leave request must be satisfied"

        # Check that the worker is NOT assigned to the work shift
        # (leave takes precedence)
        work_assignment = next(
            (
                a
                for a in assignments
                if a.worker_id == target_worker.id
                and a.date == schedule.start_date
                and a.shift_id == work_shift.id
            ),
            None,
        )
        assert (
            work_assignment is None
        ), "Worker on approved leave should not be assigned to work shift"

        # Check that there's a breach for the deferred work demand
        breaches: List[Breach] = _parse_breaches_engine(
            sample_data_fixture.schedule, outputs.breaches
        )
        deferred_breach = next(
            (b for b in breaches if b.objective_id == deferred_work.id),
            None,
        )
        assert (
            deferred_breach is not None
        ), "Deferred work demand should be breached when leave is approved"
