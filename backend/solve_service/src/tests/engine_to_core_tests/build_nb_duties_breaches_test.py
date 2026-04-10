from collections.abc import Callable
from copy import deepcopy
from datetime import date, datetime, timedelta

import pytest
from shared.schemas.core import (
    Breach,
    EngineInputsAugmented,
    ModelConfig,
    ObjectiveCategory,
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
    Variable,
    Worker,
)

from core_to_engine_service.build_periods import build_periods_monthly
from core_to_engine_service.calculate_worker_nb_duties import (
    calculate_worker_nb_duties,
)
from engine import Inputs as InputsEngine
from engine import Outputs, ProcessingCache
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from engine_to_core_service.build_breaches.build_breaches_not_model import (
    build_nb_duty_breaches,
    calc_nb_duty_actual,
)
from engine_to_core_service.build_campaign_assignments import (
    build_campaign_assignments,
)


class TestTargetWorkTimeConstraints:
    # pylint: disable=R0801
    @pytest.fixture
    def ei_nb_duties(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> EngineInputsAugmented:
        schedule = Schedule(
            id="sch0",
            team_id="t0",
            start_date=date(2025, 2, 1),
            end_date=date(2025, 2, 28),
            status=ScheduleStatus.CAMPAIGN,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
            created_by="user1",
            created_at=datetime.now(),
            updated_at=datetime.now(),
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
        mc_copy.system_constraints.monthly_target_nb_duties = True

        return EngineInputsAugmented(
            schedule=schedule,
            workers=workers,
            shifts=shifts,
            link_shifts=[],
            dimensions=[],
            dim_entries=[],
            attributes=[],
            as_hist=[],
            as_campaign_fixed=[],
            as_campaign_not_fixed=[],
            cbs_augmented=[],
            shift_demands=daily_shift_demands,
            requests_work=[],
            requests_leave=[],
            model_output=None,
            penalties=penalties_fix,
            model_config=mc_copy,
        )

    # pylint: disable=too-many-locals
    def test_target_nb_duties_constraints_different_desires(
        self,
        ei_nb_duties: EngineInputsAugmented,
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        # 16 workers
        # 12 workers desire 80, 4 workers desires 0
        # 4 duty shifts, or 112 duty shifts per month
        # 9.3 per worker per month for the 12 workers, 0 for the 4 workers

        workers = ei_nb_duties.workers
        for i in range(12):
            workers[i].duties_per_month = 5
        for i in range(12, 16):
            workers[i].duties_per_month = 0
        ei_nb_duties.workers = workers

        inputs, _ = run_core_to_engine_inputs(ei_nb_duties)

        engine_out = run_engine_solve(inputs)

        schedule = ei_nb_duties.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: list[date] = []
        assignments = build_campaign_assignments(schedule, engine_out.assignments)

        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
        w_to_nb_duties = calculate_worker_nb_duties(
            ei_nb_duties.schedule,
            ei_nb_duties.workers,
            ei_nb_duties.shifts,
            ei_nb_duties.requests_leave,
            ei_nb_duties.shift_demands,
            periods_monthly,
        )
        breaches = _parse_breaches_engine(ei_nb_duties.schedule, engine_out.breaches)

        assert engine_out.objective_value == 0
        assert len(breaches) == 0

        shift_duty_ids = [
            s.id for s in ei_nb_duties.shifts if s.shift_type == ShiftType.DUTY
        ]

        out = build_nb_duty_breaches(
            ei_nb_duties.schedule,
            ei_nb_duties.workers,
            ei_nb_duties.shifts,
            periods_monthly,
            w_to_nb_duties,
            assignments,
        )

        assert all(isinstance(b, Breach) for b in out), "Not all elements are breaches"

        w_to_nd_actual = calc_nb_duty_actual(
            ei_nb_duties.workers,
            shift_duty_ids,
            periods_monthly,
            assignments,
        )

        i_to_period = dict(enumerate(periods_monthly))

        for w_id, nb_duties in w_to_nb_duties.items():
            nb_duties_desired = nb_duties["desired"]
            nb_duties_actual = w_to_nd_actual.get(w_id, None)
            assert nb_duties_actual is not None
            for i, (nd_actual, nd_desired) in enumerate(
                zip(nb_duties_actual, nb_duties_desired)
            ):
                if nd_actual > nd_desired:
                    period = i_to_period[i]
                    var_expected = [
                        Variable(
                            worker_id=w_id,
                            date=d,
                            shift_id=s_id,
                        )
                        for d in period
                        for s_id in shift_duty_ids
                    ]
                    breach = None
                    for i, b in enumerate(out):
                        if b.variables == var_expected:
                            breach = b
                            break
                    assert breach is not None
                    assert (
                        breach.objective_category == ObjectiveCategory.DUTIES_PER_MONTH
                    )
                    del out[i]
        assert len(out) == 0
