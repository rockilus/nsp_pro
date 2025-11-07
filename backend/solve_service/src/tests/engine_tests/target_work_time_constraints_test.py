import math
from copy import deepcopy
from datetime import date, datetime, timedelta
from typing import Callable, List, Tuple

import pytest
from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    Dimension,
    DimensionEntryType,
    DimensionType,
    DimEntry,
    EngineInputsAugmented,
    ModelConfig,
    Penalties,
    Schedule,
    ScheduleStatus,
    Shift,
    ShiftDemandNew,
    ShiftDemandSource,
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
from engine import Inputs as InputsEngine
from engine import Outputs, ProcessingCache
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from utils.constants import Constants


class TestTargetWorkTimeConstraints:
    @pytest.fixture
    def ei_work_times(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> EngineInputsAugmented:
        schedule = Schedule(
            id="sch0",
            team_id="t0",
            start_date=date(2025, 2, 10),
            end_date=date(2025, 2, 16),
            status=ScheduleStatus.CAMPAIGN,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
            created_by="user1",
            created_at=datetime(2025, 1, 1),
            updated_at=datetime(2025, 1, 1),
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
                    ShiftDemandNew(
                        date=current_date,
                        shift_id=shift.id,
                        team_id="t0",
                        count=1,
                        notes=None,
                        source=ShiftDemandSource.MANUAL,
                        source_id=None,
                        created_at=datetime.now(),
                        updated_at=datetime.now(),
                        id=f"dsd_{shift.id}_{current_date}",
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
            shift_demands=daily_shift_demands,
            requests_work=[],
            requests_leave=[],
            model_output=None,
            penalties=penalties_fix,
            model_config=mc_copy,
        )

    # pylint: disable=too-many-locals, R0801
    def test_target_work_time_constraints_perfect_match(
        self,
        ei_work_times: EngineInputsAugmented,
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        inputs, _ = run_core_to_engine_inputs(ei_work_times)

        out = run_engine_solve(inputs)

        schedule = ei_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            ei_work_times.schedule,
            ei_work_times.workers,
            ei_work_times.shifts,
            ei_work_times.requests_leave,
            ei_work_times.shift_demands,
            periods_weekly,
        )
        breaches = _parse_breaches_engine(ei_work_times.schedule, out.breaches)

        assert out.objective_value == 0
        assert len(breaches) == 0

        s_id_to_duration = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in ei_work_times.shifts
        }

        for w in ei_work_times.workers:
            assignments_worker = [a for a in out.assignments if a.worker_id == w.id]

            work_time_worker = 0
            for a in assignments_worker:
                work_time_worker += s_id_to_duration[a.shift_id]

            assert work_time_worker == w_to_work_times[w.id]["target"][0]

    def test_target_work_time_constraints_no_perfect_match(
        self,
        ei_work_times: EngineInputsAugmented,
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        # 3 workers
        # 4 shifts of 5h each, or 140h per week
        # 46.7h per worker per week, or 9.3 shifts per worker per week
        ei_work_times.workers = ei_work_times.workers[:3]

        inputs, _ = run_core_to_engine_inputs(ei_work_times)

        out = run_engine_solve(inputs)

        schedule = ei_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            ei_work_times.schedule,
            ei_work_times.workers,
            ei_work_times.shifts,
            ei_work_times.requests_leave,
            ei_work_times.shift_demands,
            periods_weekly,
        )
        breaches = _parse_breaches_engine(ei_work_times.schedule, out.breaches)

        s_id_to_duration = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in ei_work_times.shifts
        }

        shift_duration_min = min(s_id_to_duration.values())

        deltas: List[int] = []
        for w in ei_work_times.workers:
            assignments_worker = [a for a in out.assignments if a.worker_id == w.id]

            work_time_worker = 0
            for a in assignments_worker:
                work_time_worker += s_id_to_duration[a.shift_id]

            w_target_time = w_to_work_times[w.id]["target"][0]
            delta_abs_1 = w_target_time % shift_duration_min
            delta_abs_2 = shift_duration_min - delta_abs_1
            delta_expected_1_pos = (
                w_target_time + delta_abs_1
            ) * 100 // w_target_time - 100
            delta_expected_1_neg = (
                w_target_time - delta_abs_1
            ) * 100 // w_target_time - 100
            delta_expected_1_neg_x2 = math.floor(
                ((w_target_time - delta_abs_1) * 100 / w_target_time - 100) * 2
            )
            delta_expected_2_pos = (
                w_target_time + delta_abs_2
            ) * 100 // w_target_time - 100
            delta_expected_2_neg = (
                w_target_time - delta_abs_2
            ) * 100 // w_target_time - 100
            delta_expected_2_neg_x2 = math.floor(
                ((w_target_time - delta_abs_2) * 100 / w_target_time - 100) * 2
            )

            delta_actual = work_time_worker * 100 // w_target_time - 100
            deltas.append(delta_actual)

            assert delta_actual in [
                delta_expected_1_pos,
                delta_expected_1_neg,
                delta_expected_2_pos,
                delta_expected_2_neg,
                delta_expected_1_neg_x2,
                delta_expected_2_neg_x2,
            ]

        assert len(out.breaches) == 1
        assert len(breaches) == 1

        max_excess = max(*deltas, 0)

        objective_value_expected = (
            ei_work_times.penalties.system_constraint.weekly_target_work_time
            * max_excess
        )

        assert out.objective_value == objective_value_expected

    def test_target_work_time_constraints_perfect_match_different_desires(
        self,
        ei_work_times: EngineInputsAugmented,
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
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
            workers[i].weekly_hours_desired = 80
        for i in range(2, 4):
            workers[i].weekly_hours = 0
            workers[i].weekly_hours_desired = 0
        ei_work_times.workers = workers

        ei_work_times.model_config.configuration_constraints.work_loads = True
        inputs, _ = run_core_to_engine_inputs(ei_work_times)

        inputs.model_config.solver_params.max_time_in_seconds = 10

        out = run_engine_solve(inputs)

        schedule = ei_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            ei_work_times.schedule,
            ei_work_times.workers,
            ei_work_times.shifts,
            ei_work_times.requests_leave,
            ei_work_times.shift_demands,
            periods_weekly,
        )
        breaches = _parse_breaches_engine(ei_work_times.schedule, out.breaches)

        assert out.objective_value == 0
        assert len(breaches) == 0

        s_id_to_duration = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in ei_work_times.shifts
        }

        for w in ei_work_times.workers:
            assignments_worker = [a for a in out.assignments if a.worker_id == w.id]

            work_time_worker = 0
            for a in assignments_worker:
                work_time_worker += s_id_to_duration[a.shift_id]

            assert work_time_worker == w_to_work_times[w.id]["target"][0]

    def test_target_work_time_constraints_contract_below_desired(
        self,
        ei_work_times: EngineInputsAugmented,
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        ei_work_times.workers[0].weekly_hours = 30
        ei_work_times.model_config.system_constraints.weekly_target_work_time = True
        ei_work_times.model_config.configuration_constraints.work_loads = True
        inputs, _ = run_core_to_engine_inputs(ei_work_times)

        out = run_engine_solve(inputs)

        schedule = ei_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            ei_work_times.schedule,
            ei_work_times.workers,
            ei_work_times.shifts,
            ei_work_times.requests_leave,
            ei_work_times.shift_demands,
            periods_weekly,
        )
        breaches = _parse_breaches_engine(ei_work_times.schedule, out.breaches)

        assert len(breaches) == 1

        s_id_to_duration = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in ei_work_times.shifts
        }

        objective_value_expected = 0
        for w in ei_work_times.workers:
            assignments_worker = [a for a in out.assignments if a.worker_id == w.id]

            work_time_worker = 0
            for a in assignments_worker:
                work_time_worker += s_id_to_duration[a.shift_id]

            w_target_time = w_to_work_times[w.id]["target"][0]
            assert work_time_worker == w_target_time

            penalty_expected = (
                # fmt: off
                ei_work_times.penalties.configuration_constraint
                .weekly_worktime_contract
                # fmt: on
                * max(
                    work_time_worker
                    * 100
                    // (w.weekly_hours * Constants.NUM_MINUTES_HOUR)
                    - 100,
                    0,
                )
            )
            objective_value_expected += penalty_expected
        assert out.objective_value == objective_value_expected

    def test_target_work_time_constraints_w0_filtered_out(
        self,
        ei_work_times: EngineInputsAugmented,
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        # 4 workers, one filtered out of all shifts
        # 4 shifts of 5h each, or 140h per week
        # 46.7h per worker per week, or 9.3 shifts per worker per week
        workers = ei_work_times.workers
        shifts = ei_work_times.shifts

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

        ei_work_times.dimensions = dimensions
        ei_work_times.dim_entries = dim_entries
        ei_work_times.attributes = attributes

        inputs, _ = run_core_to_engine_inputs(ei_work_times)

        out = run_engine_solve(inputs)

        schedule = ei_work_times.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
        w_to_work_times = calculate_worker_work_times(
            ei_work_times.schedule,
            ei_work_times.workers,
            ei_work_times.shifts,
            ei_work_times.requests_leave,
            ei_work_times.shift_demands,
            periods_weekly,
        )
        breaches = _parse_breaches_engine(ei_work_times.schedule, out.breaches)

        s_id_to_duration = {
            s.id: int((s.end_time - s.start_time).total_seconds() // 60 - 1)
            for s in ei_work_times.shifts
        }

        deltas = []
        for w in ei_work_times.workers:
            assignments_worker = [a for a in out.assignments if a.worker_id == w.id]

            work_time_worker = 0
            for a in assignments_worker:
                work_time_worker += s_id_to_duration[a.shift_id]

            if w.id == worker_excluded.id:
                assert work_time_worker == 0

            w_target_time = w_to_work_times[w.id]["target"][0]
            delta_actual = work_time_worker * 100 // w_target_time - 100
            deltas.append(delta_actual)

        w_excluded_work_time = w_to_work_times[worker_excluded.id]["target"][0]
        num_shifts = w_excluded_work_time // s_id_to_duration[shifts[0].id]
        additional_shift_p_w = num_shifts // (len(workers) - 1)
        additional_shift = num_shifts % (len(workers) - 1)
        excess_time_expected = (
            additional_shift_p_w + additional_shift
        ) * s_id_to_duration[shifts[0].id]
        excess_expected = (
            w_excluded_work_time + excess_time_expected
        ) * 100 // w_excluded_work_time - 100

        max_excess = max(*deltas, 0)

        assert max_excess == excess_expected

        assert len(out.breaches) == 1
        assert len(breaches) == 1

        objective_value_expected = (
            ei_work_times.penalties.system_constraint.weekly_target_work_time
            * max_excess
        )

        assert out.objective_value == objective_value_expected
