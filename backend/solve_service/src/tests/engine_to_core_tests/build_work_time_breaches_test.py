from copy import deepcopy
from datetime import date, datetime, timedelta
from typing import Callable, List, Tuple

import pytest
from shared.schemas.core import (
    Breach,
    Constraints,
    DailyShiftDemand,
    DSDSourceType,
    EngineInputsAugmented,
    ModelConfig,
    ObjectiveCategory,
    Penalties,
    Schedule,
    ScheduleSolveStatus,
    ScheduleStatus,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Staffing,
    Variable,
    Worker,
)

from core_to_engine_service.build_periods import build_periods_weekly
from core_to_engine_service.calculate_worker_work_times import (
    calculate_worker_work_times,
)
from engine import Inputs as InputsEngine
from engine import Outputs
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from engine_to_core_service.build_breaches.build_breaches_not_model import (
    build_work_time_breaches,
    calc_work_times_actual,
)
from engine_to_core_service.build_campaign_assignments import (
    build_campaign_assignments,
)


class TestTargetWorkTimeConstraints:
    # pylint: disable=R0801
    @pytest.fixture
    def ei_work_times(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> EngineInputsAugmented:
        schedule = Schedule(
            id="sch0",
            team_id="t0",
            start_date=date(2025, 2, 10),
            end_date=date(2025, 3, 9),
            last_modified_dates=datetime.now(),
            solve_details=None,
            solve_status=ScheduleSolveStatus.NOT_SOLVED,
            status=ScheduleStatus.CAMPAIGN,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
            last_updated_dsds=None,
        )

        # 4 workers
        # Same desired time for all workers, so 25% of the total allocated to each
        # 4 shifts of 5h each, or 140h per week
        # 35h per worker per week, or 7 shifts per worker per week
        workers = [
            Worker(
                id=f"w{i}",
                team_id="t0",
                name=f"Worker {i}",
                acronym=f"W{i}",
                acronym_custom=False,
                employment_start_date=date(2025, 1, 1),
                employment_end_date=None,
                weekly_hours=50,
                weekly_hours_desired=50,
                duties_per_month=10,
                annual_leave=20,
                specialty_ids=[],
                deleted=False,
            )
            for i in range(4)
        ]

        shifts = [
            Shift(
                id="s0",
                team_id="t0",
                name="Night Morning Shift",
                acronym="NMS",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 1, 0),
                end_time=datetime(2025, 1, 1, 6, 0),  # 5 hours
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="purple",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="s1",
                team_id="t0",
                name="Morning Shift",
                acronym="MS",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 1, 13, 0),  # 5 hours
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="blue",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="s2",
                team_id="t0",
                name="Afternoon Shift",
                acronym="AS",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 13, 0),
                end_time=datetime(2025, 1, 1, 18, 0),  # 5 hours
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="green",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="s3",
                team_id="t0",
                name="Night Shift",
                acronym="NS",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 18, 0),
                end_time=datetime(2025, 1, 1, 23, 0),  # 5 hours
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="purple",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
        ]

        daily_shift_demands = []
        # Create daily shift demands for every day for all shifts
        for shift in shifts:
            current_date = schedule.start_date
            while current_date <= schedule.end_date:
                daily_shift_demands.append(
                    DailyShiftDemand(
                        id=f"dsd_{shift.id}_{current_date}",
                        team_id="t0",
                        schedule_id=schedule.id,
                        shift_demand_id=None,
                        coverage_selector_id=None,
                        source_type=DSDSourceType.SHIFT_DEMAND,
                        date=current_date,
                        shift_id=shift.id,
                        count=1,
                    )
                )
                current_date += timedelta(days=1)

        mc_copy = deepcopy(model_config_fix)
        mc_copy.system_constraints.weekly_target_work_time = True

        return EngineInputsAugmented(
            schedule=schedule,
            workers=workers,
            shifts=shifts,
            link_shifts=[],
            dimensions=[],
            dim_entries=[],
            attributes=[],
            as_hist=[],
            as_wip_fixed=[],
            cbs_augmented=[],
            daily_shift_demands=daily_shift_demands,
            requests_work=[],
            requests_leave=[],
            model_output=None,
            penalties=penalties_fix,
            model_config=mc_copy,
        )

    # pylint: disable=too-many-locals
    def test_build_work_time_breaches_desired_breach(
        self,
        ei_work_times: EngineInputsAugmented,
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, Constraints]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        # 4 workers
        # 2 workers desire 80, 2 workers desires 0, so 50% allocated to each of
        # 2 workers and 0% to the others
        # 4 shifts of 5h each, or 140h per week
        # 70h for 2 workers, 0 for 2 workers
        workers = ei_work_times.workers
        for i in range(2):
            workers[i].weekly_hours = 80
            workers[i].weekly_hours_desired = 40
        for i in range(2, 4):
            workers[i].weekly_hours = 0
            workers[i].weekly_hours_desired = 0
        ei_work_times.workers = workers

        inputs, _ = run_core_to_engine_inputs(ei_work_times)

        engine_out = run_engine_solve(inputs)

        schedule = ei_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []
        assignments = build_campaign_assignments(schedule, engine_out.assignments)

        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            ei_work_times.schedule,
            ei_work_times.workers,
            ei_work_times.shifts,
            ei_work_times.requests_leave,
            ei_work_times.daily_shift_demands,
            periods_weekly,
        )
        breaches = _parse_breaches_engine(ei_work_times.schedule, engine_out.breaches)

        assert engine_out.objective_value == 0
        assert len(breaches) == 0

        s_id_to_duration = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in ei_work_times.shifts
        }

        out = build_work_time_breaches(
            ei_work_times.schedule,
            ei_work_times.workers,
            ei_work_times.shifts,
            periods_weekly,
            w_to_work_times,
            s_id_to_duration,
            assignments,
        )

        assert all(isinstance(b, Breach) for b in out), "Not all elements are breaches"

        s_work_ids = [
            s.id
            for s in ei_work_times.shifts
            if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]

        w_to_wt_actual = calc_work_times_actual(
            ei_work_times.workers,
            s_work_ids,
            periods_weekly,
            s_id_to_duration,
            assignments,
        )

        i_to_period = dict(enumerate(periods_weekly))

        for w_id, work_times in w_to_work_times.items():
            work_times_desired = work_times["desired"]
            work_times_actual = w_to_wt_actual.get(w_id, None)
            assert work_times_actual is not None
            for i, (wt_actual, wt_desired) in enumerate(
                zip(work_times_actual, work_times_desired)
            ):
                if wt_actual > wt_desired:
                    period = i_to_period[i]
                    var_expected = [
                        Variable(
                            worker_id=w_id,
                            date=d,
                            shift_id=s_id,
                        )
                        for d in period
                        for s_id in s_work_ids
                    ]
                    breach = None
                    for i, b in enumerate(out):
                        if b.variables == var_expected:
                            breach = b
                            break
                    assert breach is not None
                    assert (
                        breach.objective_category == ObjectiveCategory.WORK_TIME_DESIRED
                    )
                    del out[i]
        assert len(out) == 0

    # pylint: disable=too-many-locals
    def test_build_work_time_breaches_contract_breach(
        self,
        ei_work_times: EngineInputsAugmented,
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, Constraints]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        # 4 workers
        # 2 workers desire 80, 2 workers desires 0, so 50% allocated to each of
        # 2 workers and 0% to the others
        # 4 shifts of 5h each, or 140h per week
        # 70h for 2 workers, 0 for 2 workers
        workers = ei_work_times.workers
        for i in range(2):
            workers[i].weekly_hours = 40
            workers[i].weekly_hours_desired = 80
        for i in range(2, 4):
            workers[i].weekly_hours = 0
            workers[i].weekly_hours_desired = 0
        ei_work_times.workers = workers

        inputs, _ = run_core_to_engine_inputs(ei_work_times)

        engine_out = run_engine_solve(inputs)

        schedule = ei_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []
        assignments = build_campaign_assignments(schedule, engine_out.assignments)

        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            ei_work_times.schedule,
            ei_work_times.workers,
            ei_work_times.shifts,
            ei_work_times.requests_leave,
            ei_work_times.daily_shift_demands,
            periods_weekly,
        )
        breaches = _parse_breaches_engine(ei_work_times.schedule, engine_out.breaches)

        assert engine_out.objective_value == 0
        assert len(breaches) == 0

        s_id_to_duration = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in ei_work_times.shifts
        }

        out = build_work_time_breaches(
            ei_work_times.schedule,
            ei_work_times.workers,
            ei_work_times.shifts,
            periods_weekly,
            w_to_work_times,
            s_id_to_duration,
            assignments,
        )

        assert all(isinstance(b, Breach) for b in out), "Not all elements are breaches"

        s_work_ids = [
            s.id
            for s in ei_work_times.shifts
            if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]

        w_to_wt_actual = calc_work_times_actual(
            ei_work_times.workers,
            s_work_ids,
            periods_weekly,
            s_id_to_duration,
            assignments,
        )

        i_to_period = dict(enumerate(periods_weekly))

        for w_id, work_times in w_to_work_times.items():
            work_times_desired = work_times["contract"]
            work_times_actual = w_to_wt_actual.get(w_id, None)
            assert work_times_actual is not None
            for i, (wt_actual, wt_desired) in enumerate(
                zip(work_times_actual, work_times_desired)
            ):
                if wt_actual > wt_desired:
                    period = i_to_period[i]
                    var_expected = [
                        Variable(
                            worker_id=w_id,
                            date=d,
                            shift_id=s_id,
                        )
                        for d in period
                        for s_id in s_work_ids
                    ]
                    breach = None
                    for i, b in enumerate(out):
                        if b.variables == var_expected:
                            breach = b
                            break
                    assert breach is not None
                    assert (
                        breach.objective_category
                        == ObjectiveCategory.WORK_TIME_CONTRACT
                    )
                    del out[i]
        assert len(out) == 0
