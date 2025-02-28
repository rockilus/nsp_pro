# pylint: disable=too-many-lines
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
from typing import Callable, List, Tuple

import pytest
from shared.schemas import (
    Attribute,
    AttributeOwnerType,
    DailyShiftDemand,
    Dimension,
    DimensionEntryType,
    DimensionType,
    DimEntry,
    DSDSourceType,
    EngineInputsAugmented,
    ModelConfig,
    Penalties,
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

from core_to_engine_service.build_dates import (
    build_dates,
    build_worker_ids_to_worker_dates,
)
from core_to_engine_service.calculate_worker_special_days import (
    build_duty_special_days_constraints,
    calculate_worker_speacial_days,
)
from engine import Inputs as InputsEngine
from engine import Outputs, ProcessingCache
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)


class TestSpecialDayConstraints:
    # pylint: disable=R0801
    @pytest.fixture
    def engine_inputs_special_days(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> EngineInputsAugmented:
        schedule = Schedule(
            id="sch0",
            team_id="t0",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 3, 31),
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
                start_time=datetime(2025, 1, 1, 1, 0, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 1, 3, 0, tzinfo=timezone.utc),  # 2 hours
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
                start_time=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 1, 10, 0, tzinfo=timezone.utc),  # 2 hours
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
                start_time=datetime(2025, 1, 1, 13, 0, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 1, 15, 0, tzinfo=timezone.utc),  # 2 hours
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
                start_time=datetime(2025, 1, 1, 18, 0, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 1, 20, 0, tzinfo=timezone.utc),  # 2 hours
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
                start_time=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 2, 8, 0, tzinfo=timezone.utc),  # 24 hours
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
                start_time=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 2, 8, 0, tzinfo=timezone.utc),  # 24 hours
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
                start_time=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 2, 8, 0, tzinfo=timezone.utc),  # 24 hours
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
                start_time=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 2, 8, 0, tzinfo=timezone.utc),  # 24 hours
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
                start_time=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 2, 8, 0, tzinfo=timezone.utc),  # 24 hours
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
                start_time=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 2, 8, 0, tzinfo=timezone.utc),  # 24 hours
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
                start_time=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 2, 8, 0, tzinfo=timezone.utc),  # 24 hours
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
                start_time=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 2, 8, 0, tzinfo=timezone.utc),  # 24 hours
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
        shifts_leave = [
            Shift(
                id="s_leave",
                team_id="t0",
                name="Vacation",
                acronym="V",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 0, 0, tzinfo=timezone.utc),
                end_time=datetime(2025, 1, 2, 0, 0, tzinfo=timezone.utc),  # 24 hours
                staffing=[],
                color="purple",
                shift_type=ShiftType.LEAVE,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.VACATION,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
        ]
        shifts = shifts_normal + shifts_duty + shifts_leave
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

        mc_copy = deepcopy(model_config_fix)
        mc_copy.system_constraints.special_days_target_nb_duties = True

        return EngineInputsAugmented(
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
            penalties=penalties_fix,
            model_config=mc_copy,
        )

    def test_target_special_day_constraints(
        self,
        engine_inputs_special_days: EngineInputsAugmented,
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        inputs, _ = run_core_to_engine_inputs(engine_inputs_special_days)
        inputs.model_config.solver_params.max_time_in_seconds = 10

        out = run_engine_solve(inputs)
        assert out.objective_value == 0

        dates_hist, dates_campaign = build_dates(
            engine_inputs_special_days.schedule,
            engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )

        # Call the method under test
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            engine_inputs_special_days.schedule,
            engine_inputs_special_days.workers,
            engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
            dates_campaign,
        )

        w_to_sd = calculate_worker_speacial_days(
            workers=engine_inputs_special_days.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests,
            daily_shift_demands=engine_inputs_special_days.daily_shift_demands,
            fixed_assignments=engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )

        shift_duty_ids = [
            s.id
            for s in engine_inputs_special_days.shifts
            if s.shift_type == ShiftType.DUTY
        ]

        for w_id, sd in w_to_sd.items():
            for _, sd_data in sd.items():
                assignments = [
                    a
                    for a in out.assignments
                    if a.worker_id == w_id
                    and a.date in sd_data["dates"]  # type: ignore
                    and a.shift_id in shift_duty_ids
                ]
                assert len(assignments) == sd_data["target"]

    # pylint: disable=too-many-locals
    def test_target_special_day_constraints_w0_filtered_out(
        self,
        engine_inputs_special_days: EngineInputsAugmented,
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        # 16 workers, one filtered out of all shifts
        # 4 duty shifts, or 112 duty shifts per month
        # 7.5 per worker per month
        workers = engine_inputs_special_days.workers
        shifts = engine_inputs_special_days.shifts

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

        engine_inputs_special_days.dimensions = dimensions
        engine_inputs_special_days.dim_entries = dim_entries
        engine_inputs_special_days.attributes = attributes

        inputs, _ = run_core_to_engine_inputs(engine_inputs_special_days)
        inputs.model_config.solver_params.max_time_in_seconds = 15

        out = run_engine_solve(inputs)

        dates_hist, dates_campaign = build_dates(
            engine_inputs_special_days.schedule,
            engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )

        # Call the method under test
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            engine_inputs_special_days.schedule,
            engine_inputs_special_days.workers,
            engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
            dates_campaign,
        )

        gatc = build_duty_special_days_constraints(
            workers=engine_inputs_special_days.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests,
            daily_shift_demands=engine_inputs_special_days.daily_shift_demands,
            fixed_assignments=engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
            # fmt: off
            penalty=engine_inputs_special_days.penalties.system_constraint
            .special_days_target_nb_duties,
            # fmt: on
        )

        deltas: List[List[int]] = []
        for constraint in gatc:
            deltas_constraint: List[int] = []
            for a_constraint, target in zip(constraint.assignments, constraint.targets):
                w_constraint = list({a[0] for a in a_constraint})
                d_constraint = list({date.fromisoformat(a[1]) for a in a_constraint})
                s_constraint = list({a[2] for a in a_constraint})
                assignments = [
                    a
                    for a in out.assignments
                    if a.worker_id in w_constraint
                    and a.date in d_constraint
                    and a.shift_id in s_constraint
                ]
                if w_constraint[0] == worker_excluded.id:
                    assert len(assignments) == 0
                delta = len(assignments) - target
                deltas_constraint.append(delta)
            deltas.append(deltas_constraint)

        for deltas_constraint in deltas:
            assert max(deltas_constraint) == 1

        breach_count_expected = len(deltas)

        breaches = _parse_breaches_engine(
            engine_inputs_special_days.schedule, out.breaches
        )

        assert len(out.breaches) == breach_count_expected
        assert len(breaches) == 0

        objective_value_expected = (
            # fmt: off
            engine_inputs_special_days.penalties.system_constraint
            .special_days_target_nb_duties
            # fmt: on
            * breach_count_expected
        )

        assert out.objective_value == objective_value_expected
