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

from core_to_engine_service.build_periods import build_periods_weekly
from core_to_engine_service.calculate_worker_work_times import (
    calculate_worker_work_times,
)
from core_to_engine_service.penalties import penalties
from engine import Inputs as InputsEngine
from engine import Outputs
from engine_to_core_service.build_breaches import _parse_breaches_engine


class TestTargetWorkTimeConstraints:
    @pytest.fixture
    def engine_inputs_work_times(self) -> EngineInputs:
        schedule = Schedule(
            id="sch0",
            team_id="t0",
            start_date=date(2025, 2, 10),
            end_date=date(2025, 2, 16),
            solve_details=None,
            solve_status=ScheduleSolveStatus.NOT_SOLVED,
            status=ScheduleStatus.CAMPAIGN,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
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
    def test_target_work_time_constraints_perfect_match(
        self,
        engine_inputs_work_times: EngineInputs,
        run_core_to_engine_inputs: Callable[
            [EngineInputs], Tuple[InputsEngine, Constraints]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        inputs, _ = run_core_to_engine_inputs(engine_inputs_work_times)
        inputs.model_config.system_constraints.weekly_target_work_time = True

        out = run_engine_solve(inputs)

        schedule = engine_inputs_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            engine_inputs_work_times.schedule,
            engine_inputs_work_times.workers,
            engine_inputs_work_times.shifts,
            engine_inputs_work_times.requests,
            engine_inputs_work_times.daily_shift_demands,
            periods_weekly,
        )
        breaches = _parse_breaches_engine(
            engine_inputs_work_times.schedule, out.breaches
        )

        assert out.objective_value == 0
        assert len(breaches) == 0

        s_id_to_duration = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in engine_inputs_work_times.shifts
        }

        for w in engine_inputs_work_times.workers:
            assignments_worker = [a for a in out.assignments if a.worker_id == w.id]

            work_time_worker = 0
            for a in assignments_worker:
                work_time_worker += s_id_to_duration[a.shift_id]

            assert work_time_worker == w_to_work_times[w.id]["target"][0]

    def test_target_work_time_constraints_no_perfect_match(
        self,
        engine_inputs_work_times: EngineInputs,
        run_core_to_engine_inputs: Callable[
            [EngineInputs], Tuple[InputsEngine, Constraints]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        # 3 workers
        # 4 shifts of 5h each, or 140h per week
        # 46.7h per worker per week, or 9.3 shifts per worker per week
        engine_inputs_work_times.workers = engine_inputs_work_times.workers[:3]

        inputs, _ = run_core_to_engine_inputs(engine_inputs_work_times)
        inputs.model_config.system_constraints.weekly_target_work_time = True

        out = run_engine_solve(inputs)

        schedule = engine_inputs_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            engine_inputs_work_times.schedule,
            engine_inputs_work_times.workers,
            engine_inputs_work_times.shifts,
            engine_inputs_work_times.requests,
            engine_inputs_work_times.daily_shift_demands,
            periods_weekly,
        )
        breaches = _parse_breaches_engine(
            engine_inputs_work_times.schedule, out.breaches
        )

        s_id_to_duration = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in engine_inputs_work_times.shifts
        }

        shift_duration_min = min(s_id_to_duration.values())

        delta_actual_total = 0
        deltas: List[int] = []
        for w in engine_inputs_work_times.workers:
            assignments_worker = [a for a in out.assignments if a.worker_id == w.id]

            work_time_worker = 0
            for a in assignments_worker:
                work_time_worker += s_id_to_duration[a.shift_id]

            w_target_time = w_to_work_times[w.id]["target"][0]
            delta_expected_1 = w_target_time % shift_duration_min
            delta_expected_2 = shift_duration_min - delta_expected_1

            delta_actual = abs(work_time_worker - w_target_time)
            deltas.append(delta_actual)

            assert delta_actual in [delta_expected_1, delta_expected_2]

            delta_actual_total += delta_actual

        assert len(out.breaches) == 1
        assert len(breaches) == 0

        max_excess = max(*deltas, 0)

        objective_value_expected = (
            penalties.system_constraint.weekly_target_work_time * max_excess
        )

        assert out.objective_value == objective_value_expected

    def test_target_work_time_constraints_perfect_match_different_desires(
        self,
        engine_inputs_work_times: EngineInputs,
        run_core_to_engine_inputs: Callable[
            [EngineInputs], Tuple[InputsEngine, Constraints]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        # 4 workers
        # 2 workers desire 80, 2 workers desires 0, so 50% allocated to each of
        # 2 workers and 0% to the others
        # 4 shifts of 5h each, or 140h per week
        # 70h for 2 workers, 0 for 2 workers
        workers = engine_inputs_work_times.workers
        for i in range(2):
            workers[i].weekly_hours = 80
            workers[i].weekly_hours_desired = 80
        for i in range(2, 4):
            workers[i].weekly_hours = 0
            workers[i].weekly_hours_desired = 0
        engine_inputs_work_times.workers = workers

        inputs, _ = run_core_to_engine_inputs(engine_inputs_work_times)
        inputs.model_config.system_constraints.weekly_target_work_time = True

        out = run_engine_solve(inputs)

        schedule = engine_inputs_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            engine_inputs_work_times.schedule,
            engine_inputs_work_times.workers,
            engine_inputs_work_times.shifts,
            engine_inputs_work_times.requests,
            engine_inputs_work_times.daily_shift_demands,
            periods_weekly,
        )
        breaches = _parse_breaches_engine(
            engine_inputs_work_times.schedule, out.breaches
        )

        assert out.objective_value == 0
        assert len(breaches) == 0

        s_id_to_duration = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in engine_inputs_work_times.shifts
        }

        for w in engine_inputs_work_times.workers:
            assignments_worker = [a for a in out.assignments if a.worker_id == w.id]

            work_time_worker = 0
            for a in assignments_worker:
                work_time_worker += s_id_to_duration[a.shift_id]

            assert work_time_worker == w_to_work_times[w.id]["target"][0]

    def test_target_work_time_constraints_contract_below_desired(
        self,
        engine_inputs_work_times: EngineInputs,
        run_core_to_engine_inputs: Callable[
            [EngineInputs], Tuple[InputsEngine, Constraints]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        engine_inputs_work_times.workers[0].weekly_hours = 0
        inputs, _ = run_core_to_engine_inputs(engine_inputs_work_times)
        inputs.model_config.system_constraints.weekly_target_work_time = True

        out = run_engine_solve(inputs)

        schedule = engine_inputs_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            engine_inputs_work_times.schedule,
            engine_inputs_work_times.workers,
            engine_inputs_work_times.shifts,
            engine_inputs_work_times.requests,
            engine_inputs_work_times.daily_shift_demands,
            periods_weekly,
        )
        breaches = _parse_breaches_engine(
            engine_inputs_work_times.schedule, out.breaches
        )

        assert len(breaches) == 1

        s_id_to_duration = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in engine_inputs_work_times.shifts
        }

        objective_value_expected = 0
        for w in engine_inputs_work_times.workers:
            assignments_worker = [a for a in out.assignments if a.worker_id == w.id]

            work_time_worker = 0
            for a in assignments_worker:
                work_time_worker += s_id_to_duration[a.shift_id]

            w_target_time = w_to_work_times[w.id]["target"][0]
            assert work_time_worker == w_target_time

            penalty_expected = (
                penalties.configuration_constraint.weekly_worktime_contract
                * max(work_time_worker - w.weekly_hours * 60, 0)
            )
            objective_value_expected += penalty_expected
        assert out.objective_value == objective_value_expected

    def test_target_work_time_constraints_w0_filtered_out(
        self,
        engine_inputs_work_times: EngineInputs,
        run_core_to_engine_inputs: Callable[
            [EngineInputs], Tuple[InputsEngine, Constraints]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        # 4 workers, one filtered out of all shifts
        # 4 shifts of 5h each, or 140h per week
        # 46.7h per worker per week, or 9.3 shifts per worker per week
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
        inputs.model_config.system_constraints.weekly_target_work_time = True

        out = run_engine_solve(inputs)

        schedule = engine_inputs_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            engine_inputs_work_times.schedule,
            engine_inputs_work_times.workers,
            engine_inputs_work_times.shifts,
            engine_inputs_work_times.requests,
            engine_inputs_work_times.daily_shift_demands,
            periods_weekly,
        )
        breaches = _parse_breaches_engine(
            engine_inputs_work_times.schedule, out.breaches
        )

        s_id_to_duration = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in engine_inputs_work_times.shifts
        }

        deltas = []
        for w in engine_inputs_work_times.workers:
            assignments_worker = [a for a in out.assignments if a.worker_id == w.id]

            work_time_worker = 0
            for a in assignments_worker:
                work_time_worker += s_id_to_duration[a.shift_id]

            if w.id == worker_excluded.id:
                assert work_time_worker == 0

            w_target_time = w_to_work_times[w.id]["target"][0]
            delta_actual = work_time_worker - w_target_time
            deltas.append(delta_actual)

        w_excluded_work_time = w_to_work_times[worker_excluded.id]["target"][0]
        num_shifts = w_excluded_work_time // s_id_to_duration[shifts[0].id]
        additional_shift_p_w = num_shifts // (len(workers) - 1)
        additional_shift = num_shifts % (len(workers) - 1)
        excess_expected = (additional_shift_p_w + additional_shift) * s_id_to_duration[
            shifts[0].id
        ]

        max_excess = max(*deltas, 0)

        assert max_excess == excess_expected

        assert len(out.breaches) == 1
        assert len(breaches) == 0

        objective_value_expected = (
            penalties.system_constraint.weekly_target_work_time * max_excess
        )

        assert out.objective_value == objective_value_expected
