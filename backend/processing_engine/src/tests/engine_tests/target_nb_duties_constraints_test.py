from datetime import date, datetime, timedelta
from typing import Callable, List, Tuple

import pytest
from shared.schemas import (
    Attribute,
    AttributeOwnerType,
    Constraints,
    DailyShiftDemand,
    Dimension,
    DimensionEntryType,
    DimensionType,
    DimEntry,
    DSDSourceType,
    EngineInputs,
    Schedule,
    ScheduleSolveStatus,
    ScheduleStatus,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Staffing,
    Worker,
)

from core_to_engine_service.build_periods import build_periods_monthly
from core_to_engine_service.calculate_worker_nb_duties import calculate_worker_nb_duties
from core_to_engine_service.penalties import penalties
from engine import Inputs as InputsEngine
from engine import Outputs
from engine_to_core_service.build_breaches import _parse_breaches_engine


class TestTargetWorkTimeConstraints:
    # pylint: disable=R0801
    @pytest.fixture
    def engine_inputs_work_times(self) -> EngineInputs:
        schedule = Schedule(
            id="sch0",
            team_id="t0",
            start_date=date(2025, 2, 1),
            end_date=date(2025, 2, 28),
            solve_details=None,
            solve_status=ScheduleSolveStatus.NOT_SOLVED,
            status=ScheduleStatus.CAMPAIGN,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
        )

        # 16 workers
        # Same desired nb of duties, so 6.25% of the total allocated to each
        # 2 duty shifts, or 124 duty shifts per month
        # 7 duties per worker per month
        workers = [
            Worker(
                id=f"w{i}",
                team_id="t0",
                name=f"Worker {i}",
                acronym=f"W{i}",
                acronym_custom=False,
                employment_start_date=date(2025, 1, 1),
                employment_end_date=None,
                weekly_hours=1000,
                weekly_hours_desired=1000,
                duties_per_month=80,
                annual_leave=20,
                specialty_ids=[],
                deleted=False,
            )
            for i in range(16)
        ]

        # 4 shifts normal, 4 shifts duty (with associated recuperation)
        shifts_normal = [
            Shift(
                id="s0",
                team_id="t0",
                name="Night Morning Shift",
                acronym="NMS",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 1, 0),
                end_time=datetime(2025, 1, 1, 3, 0),  # 2 hours
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
                end_time=datetime(2025, 1, 1, 10, 0),  # 2 hours
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
                end_time=datetime(2025, 1, 1, 15, 0),  # 2 hours
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
                end_time=datetime(2025, 1, 1, 20, 0),  # 2 hours
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
        shifts_duty = [
            Shift(
                id="s4",
                team_id="t0",
                name="Duty 1",
                acronym="D1",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 2, 8, 0),  # 24 hours
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="purple",
                shift_type=ShiftType.DUTY,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=24,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="s5",
                team_id="t0",
                name="RC Duty 1",
                acronym="RC1",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 2, 8, 0),  # 24 hours
                staffing=[],
                color="purple",
                shift_type=ShiftType.REST,
                rest_type=ShiftRestType.RECUPERATION,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id="s4",
                deleted=False,
            ),
            Shift(
                id="s6",
                team_id="t0",
                name="Duty 2",
                acronym="D2",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 2, 8, 0),  # 24 hours
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="purple",
                shift_type=ShiftType.DUTY,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=24,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="s7",
                team_id="t0",
                name="RC Duty 2",
                acronym="RC2",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 2, 8, 0),  # 24 hours
                staffing=[],
                color="purple",
                shift_type=ShiftType.REST,
                rest_type=ShiftRestType.RECUPERATION,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id="s6",
                deleted=False,
            ),
            Shift(
                id="s8",
                team_id="t0",
                name="Duty 3",
                acronym="D3",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 2, 8, 0),  # 24 hours
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="purple",
                shift_type=ShiftType.DUTY,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=24,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="s9",
                team_id="t0",
                name="RC Duty 3",
                acronym="RC3",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 2, 8, 0),  # 24 hours
                staffing=[],
                color="purple",
                shift_type=ShiftType.REST,
                rest_type=ShiftRestType.RECUPERATION,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id="s8",
                deleted=False,
            ),
            Shift(
                id="s10",
                team_id="t0",
                name="Duty 4",
                acronym="D4",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 2, 8, 0),  # 24 hours
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="purple",
                shift_type=ShiftType.DUTY,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=24,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id="s11",
                team_id="t0",
                name="RC Duty 4",
                acronym="RC4",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 2, 8, 0),  # 24 hours
                staffing=[],
                color="purple",
                shift_type=ShiftType.REST,
                rest_type=ShiftRestType.RECUPERATION,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id="s10",
                deleted=False,
            ),
        ]
        shifts = shifts_normal + shifts_duty
        # shifts = shifts_normal
        # shifts = shifts_duty

        daily_shift_demands = []
        # Create daily shift demands for every day for all shifts
        for shift in [
            s for s in shifts if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]:
            current_date = schedule.start_date
            while current_date <= schedule.end_date:
                daily_shift_demands.append(
                    DailyShiftDemand(
                        id=f"dsd_{shift.id}_{current_date}",
                        team_id="t0",
                        schedule_id=schedule.id,
                        shift_demand_id=None,
                        source_type=DSDSourceType.SHIFT_DEMAND,
                        date=current_date,
                        shift_id=shift.id,
                        count=1,
                    )
                )
                current_date += timedelta(days=1)

        return EngineInputs(
            schedule=schedule,
            workers=workers,
            shifts=shifts,
            shifts_recup_new=[],
            link_shifts=[],
            dimensions=[],
            dim_entries=[],
            attributes=[],
            as_hist=[],
            as_wip_fixed=[],
            cbs_augmented=[],
            daily_shift_demands=daily_shift_demands,
            requests=[],
            wip_assignments=[],
        )

    # pylint: disable=too-many-locals, R0801
    def test_target_nb_duties_constraints_perfect_match(
        self,
        engine_inputs_work_times: EngineInputs,
        run_core_to_engine_inputs: Callable[
            [EngineInputs], Tuple[InputsEngine, Constraints]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        # 16 workers
        # 4 duty shifts, or 112 duty shifts per month
        # 7 per worker per month
        inputs, _ = run_core_to_engine_inputs(engine_inputs_work_times)
        inputs.model_config.system_constraints.monthly_target_nb_duties = True

        out = run_engine_solve(inputs)

        schedule = engine_inputs_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        w_to_nb_duties = calculate_worker_nb_duties(
            engine_inputs_work_times.schedule,
            engine_inputs_work_times.workers,
            engine_inputs_work_times.shifts,
            engine_inputs_work_times.requests,
            engine_inputs_work_times.daily_shift_demands,
            periods_monthly,
        )
        breaches = _parse_breaches_engine(
            engine_inputs_work_times.schedule, out.breaches
        )

        assert out.objective_value == 0
        assert len(breaches) == 0

        shifts_duty_ids = [
            s.id
            for s in engine_inputs_work_times.shifts
            if s.shift_type == ShiftType.DUTY
        ]

        for w in engine_inputs_work_times.workers:
            assignments_duty_worker = [
                a
                for a in out.assignments
                if a.worker_id == w.id and a.shift_id in shifts_duty_ids
            ]

            assert len(assignments_duty_worker) == w_to_nb_duties[w.id]["target"][0]

    def test_target_nb_duties_constraints_no_perfect_match(
        self,
        engine_inputs_work_times: EngineInputs,
        run_core_to_engine_inputs: Callable[
            [EngineInputs], Tuple[InputsEngine, Constraints]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        # 12 workers
        # 4 duty shifts, or 112 duty shifts per month
        # 9.3 per worker per month
        engine_inputs_work_times.workers = engine_inputs_work_times.workers[:12]

        inputs, _ = run_core_to_engine_inputs(engine_inputs_work_times)
        inputs.model_config.system_constraints.monthly_target_nb_duties = True

        out = run_engine_solve(inputs)

        schedule = engine_inputs_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        w_to_nb_duties = calculate_worker_nb_duties(
            engine_inputs_work_times.schedule,
            engine_inputs_work_times.workers,
            engine_inputs_work_times.shifts,
            engine_inputs_work_times.requests,
            engine_inputs_work_times.daily_shift_demands,
            periods_monthly,
        )
        breaches = _parse_breaches_engine(
            engine_inputs_work_times.schedule, out.breaches
        )

        assert out.objective_value == 0
        assert len(breaches) == 0

        shifts_duty_ids = [
            s.id
            for s in engine_inputs_work_times.shifts
            if s.shift_type == ShiftType.DUTY
        ]

        for w in engine_inputs_work_times.workers:
            assignments_duty_worker = [
                a
                for a in out.assignments
                if a.worker_id == w.id and a.shift_id in shifts_duty_ids
            ]

            w_target_nb_duties = w_to_nb_duties[w.id]["target"][0]
            assert len(assignments_duty_worker) == w_target_nb_duties

    def test_target_nb_duties_constraints_different_desires(
        self,
        engine_inputs_work_times: EngineInputs,
        run_core_to_engine_inputs: Callable[
            [EngineInputs], Tuple[InputsEngine, Constraints]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        # 16 workers
        # 12 workers desire 80, 4 workers desires 0
        # 4 duty shifts, or 112 duty shifts per month
        # 9.3 per worker per month for the 12 workers, 0 for the 4 workers

        workers = engine_inputs_work_times.workers
        for i in range(12):
            workers[i].duties_per_month = 80
        for i in range(12, 16):
            workers[i].duties_per_month = 0
        engine_inputs_work_times.workers = workers

        inputs, _ = run_core_to_engine_inputs(engine_inputs_work_times)
        inputs.model_config.system_constraints.monthly_target_nb_duties = True

        out = run_engine_solve(inputs)

        schedule = engine_inputs_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_nb_duties(
            engine_inputs_work_times.schedule,
            engine_inputs_work_times.workers,
            engine_inputs_work_times.shifts,
            engine_inputs_work_times.requests,
            engine_inputs_work_times.daily_shift_demands,
            periods_monthly,
        )
        breaches = _parse_breaches_engine(
            engine_inputs_work_times.schedule, out.breaches
        )

        assert out.objective_value == 0
        assert len(breaches) == 0

        shift_duty_ids = [
            s.id
            for s in engine_inputs_work_times.shifts
            if s.shift_type == ShiftType.DUTY
        ]

        for w in engine_inputs_work_times.workers:
            assignments_duty_worker = [
                a
                for a in out.assignments
                if a.worker_id == w.id and a.shift_id in shift_duty_ids
            ]

            assert len(assignments_duty_worker) == w_to_work_times[w.id]["target"][0]

    def test_target_nb_duties_constraints_w0_filtered_out(
        self,
        engine_inputs_work_times: EngineInputs,
        run_core_to_engine_inputs: Callable[
            [EngineInputs], Tuple[InputsEngine, Constraints]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        # 16 workers, one filtered out of all shifts
        # 4 duty shifts, or 112 duty shifts per month
        # 7.5 per worker per month
        workers = engine_inputs_work_times.workers
        shifts = engine_inputs_work_times.shifts

        worker_excluded = workers[0]

        dimensions = [
            Dimension(
                id="dim0",
                team_id="t0",
                dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
                name="location",
                entry_type=DimensionEntryType.DIM_ENTRIES,
                deleted=False,
            ),
        ]
        dim_entries = [
            DimEntry(id="de_loc", dimension_id="dim0", name="loc", deleted=False)
        ]
        attributes = [
            Attribute(
                id=f"aw_loc_{i}",
                value="",
                owner_type=AttributeOwnerType.WORKER,
                owner_id=w.id,
                dimension_id="dim0",
                dim_entry_ids=["de_loc"],
            )
            for i, w in enumerate(workers[1:])
        ] + [
            Attribute(
                id=f"as_loc_{i}",
                value="",
                owner_type=AttributeOwnerType.SHIFT,
                owner_id=s.id,
                dimension_id="dim0",
                dim_entry_ids=["de_loc"],
            )
            for i, s in enumerate(shifts)
        ]

        engine_inputs_work_times.dimensions = dimensions
        engine_inputs_work_times.dim_entries = dim_entries
        engine_inputs_work_times.attributes = attributes

        inputs, _ = run_core_to_engine_inputs(engine_inputs_work_times)
        inputs.model_config.system_constraints.monthly_target_nb_duties = True

        out = run_engine_solve(inputs)

        schedule = engine_inputs_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        w_to_nb_duties = calculate_worker_nb_duties(
            engine_inputs_work_times.schedule,
            engine_inputs_work_times.workers,
            engine_inputs_work_times.shifts,
            engine_inputs_work_times.requests,
            engine_inputs_work_times.daily_shift_demands,
            periods_monthly,
        )
        breaches = _parse_breaches_engine(
            engine_inputs_work_times.schedule, out.breaches
        )

        shift_duty_ids = [
            s.id
            for s in engine_inputs_work_times.shifts
            if s.shift_type == ShiftType.DUTY
        ]

        deltas = []
        for w in engine_inputs_work_times.workers:
            assignments_duty_worker = [
                a
                for a in out.assignments
                if a.worker_id == w.id and a.shift_id in shift_duty_ids
            ]

            w_target_nb_duties = w_to_nb_duties[w.id]["target"][0]
            delta = len(assignments_duty_worker) - w_target_nb_duties

            if w.id == worker_excluded.id:
                assert len(assignments_duty_worker) == 0
                assert abs(delta) == w_target_nb_duties

            deltas.append(delta)

        max_excess = max(*deltas, 0)

        assert max_excess == 1

        assert len(out.breaches) == 1
        assert len(breaches) == 0

        objective_value_expected = (
            penalties.system_constraint.monthly_target_nb_duties * max_excess
        )

        assert out.objective_value == objective_value_expected
