import random
from datetime import date, datetime, timedelta
from typing import Callable, List, Tuple

import pytest
from shared.schemas.core import (
    Breach,
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
class TestRequest:
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
                shift_id=target_shift.id,
                negative=False,
                hard=True,
                status=RequestStatus.PENDING,
            )
        ]

        sample_data_fixture.requests = requests

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
                shift_id=target_shift.id,
                negative=False,
                hard=False,
                status=RequestStatus.PENDING,
            )
        ]

        sample_data_fixture.requests = requests

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
                shift_id=target_shift.id,
                negative=True,
                hard=True,
                status=RequestStatus.PENDING,
            )
        ]

        sample_data.requests = requests

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
            DailyShiftDemand(
                id=f"dsd_{target_shift.id}_{d.isoformat()}",
                team_id="t0",
                schedule_id="sch1",
                shift_demand_id=None,
                source_type=DSDSourceType.SHIFT_DEMAND,
                date=d,
                shift_id=target_shift.id,
                count=1,
                coverage_selector_id=None,
            )
            for d in dates_campaign
        ]
        sample_data.shifts.append(target_shift)
        sample_data.daily_shift_demands += dsds_target_shift

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
                shift_id=target_shift.id,
                negative=False,
                hard=True,
                status=RequestStatus.PENDING,
            )
        ]

        sample_data.requests = requests

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

    # pylint: disable=too-many-locals
    def test_request_hard_soft_conflict(
        self,
        engine_inputs: EngineInputsAugmented,
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        request_hard = Request(
            id="req_hard",
            team_id="t0",
            shift_id=engine_inputs.shifts[0].id,
            worker_id=engine_inputs.workers[0].id,
            start_date=engine_inputs.schedule.start_date,
            end_date=engine_inputs.schedule.start_date,
            negative=False,
            hard=True,
            status=RequestStatus.PENDING,
        )
        request_soft = Request(
            id="req_soft",
            team_id="t0",
            shift_id=engine_inputs.shifts[0].id,
            worker_id=engine_inputs.workers[0].id,
            start_date=engine_inputs.schedule.start_date,
            end_date=engine_inputs.schedule.start_date,
            negative=True,
            hard=False,
            status=RequestStatus.PENDING,
        )
        engine_inputs.requests = [request_hard, request_soft]

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
        request_hard_1 = Request(
            id="req_hard_1",
            team_id="t0",
            shift_id=engine_inputs.shifts[0].id,
            worker_id=engine_inputs.workers[0].id,
            start_date=engine_inputs.schedule.start_date,
            end_date=engine_inputs.schedule.start_date,
            negative=False,
            hard=True,
            status=RequestStatus.PENDING,
        )
        request_hard_2 = Request(
            id="req_hard_2",
            team_id="t0",
            shift_id=engine_inputs.shifts[0].id,
            worker_id=engine_inputs.workers[0].id,
            start_date=engine_inputs.schedule.start_date,
            end_date=engine_inputs.schedule.start_date,
            negative=True,
            hard=True,
            status=RequestStatus.PENDING,
        )
        engine_inputs.requests = [request_hard_1, request_hard_2]

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
