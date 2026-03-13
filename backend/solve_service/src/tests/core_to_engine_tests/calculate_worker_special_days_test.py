# pylint: disable=too-many-lines
from datetime import date, datetime, timedelta, timezone

import pytest
from shared.schemas.core import (
    Assignment,
    AssignmentSource,
    EngineInputsAugmented,
    FulfillmentStatus,
    ModelConfig,
    Penalties,
    Request,
    RequestStatus,
    RequestType,
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

from core_to_engine_service.build_dates import (
    build_dates,
    build_worker_ids_to_worker_dates,
)
from core_to_engine_service.calculate_worker_special_days import (
    build_duty_special_days_constraints,
    calculate_adjustment_coefficients,
    calculate_worker_speacial_days,
)
from core_to_engine_service.calculate_worker_work_times import (
    round_proportional_times,
)
from engine import GroupsAssignmentsTargetConstraint


# pylint: disable=R0801
@pytest.fixture
def engine_inputs_special_days(
    penalties_fix: Penalties, model_config_fix: ModelConfig
) -> EngineInputsAugmented:
    schedule = Schedule(
        id="sch0",
        team_id="t0",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 3, 31),
        status=ScheduleStatus.CAMPAIGN,
        missing_coverage_dates=[],
        constraint_build_ids=[],
        quick_staffings=[],
        created_by="user1",
        created_at=datetime(2025, 1, 1, 0, 0),
        updated_at=datetime(2025, 1, 1, 0, 0),
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
    shifts_leave = [
        Shift(
            id="s_leave",
            team_id="t0",
            name="Vacation",
            acronym="V",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 0, 0),
            end_time=datetime(2025, 1, 2, 0, 0),  # 24 hours
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
        as_wip_campaign=[],
        cbs_augmented=[],
        shift_demands=daily_shift_demands,
        requests_work=[],
        requests_leave=[],
        model_output=None,
        penalties=penalties_fix,
        model_config=model_config_fix,
    )


# pylint: disable=R0801, too-few-public-methods, redefined-outer-name
class TestCalculateWorkerSpecialDays:

    def test_calculate_worker_special_days_output_format(
        self, engine_inputs_special_days: EngineInputsAugmented
    ) -> None:
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
        out = calculate_worker_speacial_days(
            workers=engine_inputs_special_days.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests_leave,
            daily_shift_demands=engine_inputs_special_days.shift_demands,
            fixed_assignments=engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )

        assert isinstance(out, dict)
        assert sorted(out.keys()) == sorted(
            [w.id for w in engine_inputs_special_days.workers]
        )
        assert all(isinstance(v, dict) for v in out.values())
        special_days_expected = ["3", "4", "5", "6"]
        assert all(
            sorted(v.keys()) == sorted(special_days_expected) for v in out.values()
        )
        assert all(isinstance(vv, dict) for v in out.values() for vv in v.values())
        expected_keys = [
            "target",
            "dates",
        ]
        assert all(
            sorted(vv.keys()) == sorted(expected_keys)
            for v in out.values()
            for vv in v.values()
        )
        assert all(
            isinstance(vv["target"], int) for v in out.values() for vv in v.values()
        )
        assert all(
            isinstance(vv["dates"], list) for v in out.values() for vv in v.values()
        )
        assert all(
            all(isinstance(d, date) for d in vv["dates"])  # type: ignore
            for v in out.values()
            for vv in v.values()
        )

    # pylint: disable=too-many-locals
    def test_calculate_worker_special_days_output(
        self, engine_inputs_special_days: EngineInputsAugmented
    ) -> None:
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

        out = calculate_worker_speacial_days(
            workers=engine_inputs_special_days.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests_leave,
            daily_shift_demands=engine_inputs_special_days.shift_demands,
            fixed_assignments=engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )

        special_day_indexes = [3, 4, 5, 6]
        shift_duty_ids = [
            s.id
            for s in engine_inputs_special_days.shifts
            if s.shift_type == ShiftType.DUTY
        ]

        special_day_nb_duties = {
            str(i): sum(
                dsd.count
                for dsd in engine_inputs_special_days.shift_demands
                if dsd.shift_id in shift_duty_ids and dsd.date.weekday() == i
            )
            for i in special_day_indexes
        }
        worker_coefficients = {
            w.id: {
                str(i): 1 / len(engine_inputs_special_days.workers)
                for i in special_day_indexes
            }
            for w in engine_inputs_special_days.workers
        }

        w_to_targets = {
            w_id: [
                special_day_nb_duties[str(i)] * worker_coefficients[w_id][str(i)]
                for i in special_day_indexes
            ]
            for w_id in worker_coefficients
        }
        w_to_targets_rounded = round_proportional_times(w_to_targets)

        for worker in engine_inputs_special_days.workers:
            for i, special_day in enumerate(special_day_indexes):
                dates_expected = [
                    d for d in dates_campaign if d.weekday() == special_day
                ]
                assert (
                    out[worker.id][str(special_day)]["target"]
                    == w_to_targets_rounded[worker.id][i]
                )
                assert out[worker.id][str(special_day)]["dates"] == dates_expected

    def test_calculate_worker_special_days_leave_request_campaign(
        self, engine_inputs_special_days: EngineInputsAugmented
    ) -> None:
        dates_hist, dates_campaign = build_dates(
            engine_inputs_special_days.schedule,
            engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )
        worker_target_id = engine_inputs_special_days.workers[0].id
        dates_target = [d for d in dates_campaign if d.weekday() == 3]
        assert len(dates_target) > 0
        request_leave = [
            Request(
                id="r0",
                team_id="t0",
                worker_id=worker_target_id,
                start_date=d,
                end_date=d,
                shift_id="s_leave",
                negative=False,
                hard=True,
                status=RequestStatus.APPROVED,
                request_type=RequestType.LEAVE,
                fulfillment=FulfillmentStatus.NOT_PROCESSED,
                comment="",
                created_at=datetime.now(tz=timezone.utc),
            )
            for d in dates_target
        ]
        engine_inputs_special_days.requests_leave += request_leave

        # Call the method under test
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            engine_inputs_special_days.schedule,
            engine_inputs_special_days.workers,
            engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
            dates_campaign,
        )
        out = calculate_worker_speacial_days(
            workers=engine_inputs_special_days.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests_leave,
            daily_shift_demands=engine_inputs_special_days.shift_demands,
            fixed_assignments=engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )

        assert out[worker_target_id]["3"]["target"] == 0
        assert out[worker_target_id]["3"]["dates"] == dates_target

    def test_calculate_worker_special_days_worker_start_date(
        self, engine_inputs_special_days: EngineInputsAugmented
    ) -> None:
        dates_hist, dates_campaign = build_dates(
            engine_inputs_special_days.schedule,
            engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )
        start_date_target = date(2025, 3, 1)
        engine_inputs_special_days.workers[0].employment_start_date = start_date_target
        worker_target_id = engine_inputs_special_days.workers[0].id
        dates_worker_target = [d for d in dates_campaign if d >= start_date_target]
        assert len(dates_worker_target) > 0

        # Call the method under test
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            engine_inputs_special_days.schedule,
            engine_inputs_special_days.workers,
            engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
            dates_campaign,
        )
        out = calculate_worker_speacial_days(
            workers=engine_inputs_special_days.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests_leave,
            daily_shift_demands=engine_inputs_special_days.shift_demands,
            fixed_assignments=engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )

        worker_other_ids = [
            w.id for w in engine_inputs_special_days.workers if w.id != worker_target_id
        ]

        for special_day in [3, 4, 5, 6]:
            assert all(
                out[worker_target_id][str(special_day)]["target"]  # type: ignore
                < out[w_id][str(special_day)]["target"]
                for w_id in worker_other_ids
            )
            assert out[worker_target_id][str(special_day)]["dates"] == [
                d for d in dates_worker_target if d.weekday() == special_day
            ]

    def test_calculate_worker_special_days_worker_end_date(
        self, engine_inputs_special_days: EngineInputsAugmented
    ) -> None:
        dates_hist, dates_campaign = build_dates(
            engine_inputs_special_days.schedule,
            engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )
        end_date_target = date(2025, 1, 31)
        engine_inputs_special_days.workers[0].employment_end_date = end_date_target
        worker_target_id = engine_inputs_special_days.workers[0].id
        dates_worker_target = [d for d in dates_campaign if d <= end_date_target]
        assert len(dates_worker_target) > 0

        # Call the method under test
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            engine_inputs_special_days.schedule,
            engine_inputs_special_days.workers,
            engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
            dates_campaign,
        )
        out = calculate_worker_speacial_days(
            workers=engine_inputs_special_days.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests_leave,
            daily_shift_demands=engine_inputs_special_days.shift_demands,
            fixed_assignments=engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )

        worker_other_ids = [
            w.id for w in engine_inputs_special_days.workers if w.id != worker_target_id
        ]

        for special_day in [3, 4, 5, 6]:
            assert all(
                out[worker_target_id][str(special_day)]["target"]  # type: ignore
                < out[w_id][str(special_day)]["target"]
                for w_id in worker_other_ids
            )
            assert out[worker_target_id][str(special_day)]["dates"] == [
                d for d in dates_worker_target if d.weekday() == special_day
            ]

    # pylint: disable=too-many-locals
    def test_calculate_worker_special_days_assignments_hist(
        self, engine_inputs_special_days: EngineInputsAugmented
    ) -> None:
        worker_target_id = engine_inputs_special_days.workers[0].id
        date_hist_start = date(2024, 12, 1)
        dates_hist = [
            date_hist_start + timedelta(days=i)
            for i in range(
                (engine_inputs_special_days.schedule.start_date - date_hist_start).days
            )
        ]
        # 4 thursdays in december 2024
        dates_target = [d for d in dates_hist if d.weekday() == 3]
        assert len(dates_target) > 0
        shift_target_id = next(
            (
                s.id
                for s in engine_inputs_special_days.shifts
                if s.shift_type == ShiftType.DUTY
            ),
            None,
        )
        assert shift_target_id is not None

        assignment_hist = [
            Assignment(
                id=f"a{i}",
                team_id="t0",
                schedule_id=engine_inputs_special_days.schedule.id,
                worker_id=worker_target_id,
                date=d,
                shift_id=shift_target_id,
                fixed=False,
                source=AssignmentSource.MANUAL,
            )
            for i, d in enumerate(dates_target)
        ]
        engine_inputs_special_days.as_hist += assignment_hist

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

        out = calculate_worker_speacial_days(
            workers=engine_inputs_special_days.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests_leave,
            daily_shift_demands=engine_inputs_special_days.shift_demands,
            fixed_assignments=engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )

        special_day_indexes = [3, 4, 5, 6]
        shift_duty_ids = [
            s.id
            for s in engine_inputs_special_days.shifts
            if s.shift_type == ShiftType.DUTY
        ]

        special_day_nb_duties = {
            str(i): sum(
                dsd.count
                for dsd in engine_inputs_special_days.shift_demands
                if dsd.shift_id in shift_duty_ids and dsd.date.weekday() == i
            )
            + sum(
                1
                for a in engine_inputs_special_days.as_hist
                if a.shift_id in shift_duty_ids
                and a.date.weekday() == i
                and a.date in dates_hist
            )
            for i in special_day_indexes
        }
        worker_coefficients = calculate_adjustment_coefficients(
            workers=engine_inputs_special_days.workers,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests_leave,
            special_day_dates={
                str(i): [d for d in dates_hist + dates_campaign if d.weekday() == i]
                for i in special_day_indexes
            },
            special_day_indexes=special_day_indexes,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            fixed_assignments=engine_inputs_special_days.as_hist,
        )

        w_to_targets = {
            w_id: [
                special_day_nb_duties[str(i)] * worker_coefficients[w_id][str(i)]
                for i in special_day_indexes
            ]
            for w_id in worker_coefficients
        }
        w_to_targets[worker_target_id][0] -= len(assignment_hist)
        w_to_targets_rounded = round_proportional_times(w_to_targets)

        for worker in engine_inputs_special_days.workers:
            for i, special_day in enumerate(special_day_indexes):
                dates_expected = [
                    d for d in dates_campaign if d.weekday() == special_day
                ]
                assert (
                    out[worker.id][str(special_day)]["target"]
                    == w_to_targets_rounded[worker.id][i]
                )
                assert out[worker.id][str(special_day)]["dates"] == dates_expected

    def test_calculate_worker_special_days_assignments_hist_with_leave(
        self, engine_inputs_special_days: EngineInputsAugmented
    ) -> None:
        worker_target_id = engine_inputs_special_days.workers[0].id
        date_hist_start = date(2024, 12, 1)
        dates_hist = [
            date_hist_start + timedelta(days=i)
            for i in range(
                (engine_inputs_special_days.schedule.start_date - date_hist_start).days
            )
        ]
        # 4 thursdays in december 2024
        dates_target = [d for d in dates_hist if d.weekday() == 3]
        assert len(dates_target) > 0
        shift_target_id = next(
            (
                s.id
                for s in engine_inputs_special_days.shifts
                if s.shift_type == ShiftType.DUTY
            ),
            None,
        )
        assert shift_target_id is not None
        shift_leave_id = next(
            (
                s.id
                for s in engine_inputs_special_days.shifts
                if s.shift_type == ShiftType.LEAVE
            ),
            None,
        )
        assert shift_leave_id is not None

        assignment_hist = [
            Assignment(
                id=f"a{i}",
                team_id="t0",
                schedule_id=engine_inputs_special_days.schedule.id,
                worker_id=worker_target_id,
                date=d,
                shift_id=shift_target_id,
                fixed=False,
                source=AssignmentSource.MANUAL,
            )
            for i, d in enumerate(dates_target[:2])
        ] + [
            Assignment(
                id=f"a{i+2}",
                team_id="t0",
                schedule_id=engine_inputs_special_days.schedule.id,
                worker_id=worker_target_id,
                date=d,
                shift_id=shift_leave_id,
                fixed=False,
                source=AssignmentSource.MANUAL,
            )
            for i, d in enumerate(dates_target[2:])
        ]
        engine_inputs_special_days.as_hist += assignment_hist

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

        out = calculate_worker_speacial_days(
            workers=engine_inputs_special_days.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests_leave,
            daily_shift_demands=engine_inputs_special_days.shift_demands,
            fixed_assignments=engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )

        special_day_indexes = [3, 4, 5, 6]
        shift_duty_ids = [
            s.id
            for s in engine_inputs_special_days.shifts
            if s.shift_type == ShiftType.DUTY
        ]

        special_day_nb_duties = {
            str(i): sum(
                dsd.count
                for dsd in engine_inputs_special_days.shift_demands
                if dsd.shift_id in shift_duty_ids and dsd.date.weekday() == i
            )
            + sum(
                1
                for a in engine_inputs_special_days.as_hist
                if a.shift_id in shift_duty_ids
                and a.date.weekday() == i
                and a.date in dates_hist
            )
            for i in special_day_indexes
        }
        worker_coefficients = calculate_adjustment_coefficients(
            workers=engine_inputs_special_days.workers,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests_leave,
            special_day_dates={
                str(i): [d for d in dates_hist + dates_campaign if d.weekday() == i]
                for i in special_day_indexes
            },
            special_day_indexes=special_day_indexes,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            fixed_assignments=engine_inputs_special_days.as_hist,
        )

        w_to_targets = {
            w_id: [
                special_day_nb_duties[str(i)] * worker_coefficients[w_id][str(i)]
                for i in special_day_indexes
            ]
            for w_id in worker_coefficients
        }
        w_to_targets[worker_target_id][0] -= len(
            [a for a in assignment_hist if a.shift_id == shift_target_id]
        )
        w_to_targets_rounded = round_proportional_times(w_to_targets)

        for worker in engine_inputs_special_days.workers:
            for i, special_day in enumerate(special_day_indexes):
                dates_expected = [
                    d for d in dates_campaign if d.weekday() == special_day
                ]
                assert (
                    out[worker.id][str(special_day)]["target"]
                    == w_to_targets_rounded[worker.id][i]
                )
                assert out[worker.id][str(special_day)]["dates"] == dates_expected

    # def test_calculate_worker_special_days_shift_duty_deleted
    # def test_calculate_worker_special_days_shift_duty_without_dsd


class TestBuildDutySpecialDaysConstraints:
    def test_build_duty_special_days_constraints_output_format(
        self, engine_inputs_special_days: EngineInputsAugmented
    ) -> None:
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
        out = build_duty_special_days_constraints(
            workers=engine_inputs_special_days.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests_leave,
            daily_shift_demands=engine_inputs_special_days.shift_demands,
            fixed_assignments=engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
            # fmt: off
            penalty=engine_inputs_special_days.penalties.system_constraint
            .special_days_target_nb_duties,
            # fmt: on
        )

        assert isinstance(out, list)
        assert all(isinstance(c, GroupsAssignmentsTargetConstraint) for c in out)

    def test_build_duty_special_days_constraints_output(
        self, engine_inputs_special_days: EngineInputsAugmented
    ) -> None:
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
        w_to_special_days = calculate_worker_speacial_days(
            workers=engine_inputs_special_days.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests_leave,
            daily_shift_demands=engine_inputs_special_days.shift_demands,
            fixed_assignments=engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
        )

        out = build_duty_special_days_constraints(
            workers=engine_inputs_special_days.workers,
            worker_ids_to_worker_dates=worker_ids_to_worker_dates,
            dates_hist=dates_hist,
            dates_campaign=dates_campaign,
            shifts=engine_inputs_special_days.shifts,
            requests=engine_inputs_special_days.requests_leave,
            daily_shift_demands=engine_inputs_special_days.shift_demands,
            fixed_assignments=engine_inputs_special_days.as_hist
            + engine_inputs_special_days.as_wip_fixed,
            # fmt: off
            penalty=engine_inputs_special_days.penalties.system_constraint
            .special_days_target_nb_duties,
            # fmt: on
        )

        shift_duty_not_del_ids = [
            s.id
            for s in engine_inputs_special_days.shifts
            if s.shift_type == ShiftType.DUTY and not s.deleted
        ]

        for gatc in out:
            assert (
                gatc.penalty
                # fmt: off
                == engine_inputs_special_days.penalties.system_constraint
                .special_days_target_nb_duties
                # fmt: on
            )
            day_index_expected = date.fromisoformat(gatc.assignments[0][0][1]).weekday()
            assert all(
                date.fromisoformat(a[1]).weekday() == day_index_expected
                for ag in gatc.assignments
                for a in ag
            )
            assert all(
                date.fromisoformat(a[1]) in dates_campaign
                for ag in gatc.assignments
                for a in ag
            )
            shift_ids_gatc = {a[2] for ag in gatc.assignments for a in ag}
            assert sorted(shift_ids_gatc) == sorted(set(shift_duty_not_del_ids))
            for assignments, target in zip(gatc.assignments, gatc.targets):
                w_id = assignments[0][0]
                assert w_id in w_to_special_days
                assert all(a[0] == w_id for a in assignments)
                dates_assignments = list(
                    {date.fromisoformat(a[1]) for a in assignments}
                )
                assert sorted(dates_assignments) == sorted(
                    w_to_special_days[w_id][str(day_index_expected)][
                        "dates"
                    ]  # type: ignore
                )
                assert (
                    target == w_to_special_days[w_id][str(day_index_expected)]["target"]
                )
