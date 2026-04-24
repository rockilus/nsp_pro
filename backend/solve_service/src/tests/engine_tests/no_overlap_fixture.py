import calendar
from datetime import date, datetime, timedelta
from typing import List

from shared.schemas.core import (
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


def _test_month_start() -> date:
    today = date.today()
    month = today.month + 2
    year = today.year + (month - 1) // 12
    month = (month - 1) % 12 + 1
    return date(year, month, 1)


def build_ei_no_overlap(
    penalties: Penalties, model_config: ModelConfig
) -> EngineInputsAugmented:
    start = _test_month_start()
    last_day = calendar.monthrange(start.year, start.month)[1]
    end = date(start.year, start.month, last_day)

    schedule = Schedule(
        id="sch_noov",
        team_id="t0",
        start_date=start,
        end_date=end,
        status=ScheduleStatus.CAMPAIGN,
        missing_coverage_dates=[],
        constraint_build_ids=[],
        quick_staffings=[],
        created_by="test",
        created_at=datetime(start.year, start.month, 1),
        updated_at=datetime(start.year, start.month, 1),
    )

    workers: List[Worker] = [
        Worker(
            id="w0",
            team_id="t0",
            name="Worker 0",
            acronym="W0",
            acronym_custom=False,
            employment_start_date=start,
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=5,
            annual_leave=0,
            specialty_ids=[],
            deleted=False,
        )
    ]

    day1 = datetime(start.year, start.month, 1)
    day2 = day1 + timedelta(days=1)
    day3 = day1 + timedelta(days=2)

    shifts: List[Shift] = [
        Shift(
            id="s_morning",
            team_id="t0",
            name="Morning",
            acronym="MOR",
            acronym_custom=False,
            start_time=datetime(day1.year, day1.month, day1.day, 8, 0),
            end_time=datetime(day1.year, day1.month, day1.day, 14, 0),
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
            id="s_afternoon",
            team_id="t0",
            name="Afternoon",
            acronym="AFT",
            acronym_custom=False,
            start_time=datetime(day1.year, day1.month, day1.day, 14, 0),
            end_time=datetime(day1.year, day1.month, day1.day, 20, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="orange",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="s_duty",
            team_id="t0",
            name="Duty",
            acronym="DUT",
            acronym_custom=False,
            start_time=datetime(day1.year, day1.month, day1.day, 8, 0),
            end_time=datetime(day2.year, day2.month, day2.day, 8, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="red",
            shift_type=ShiftType.DUTY,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=24,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="s_recup",
            team_id="t0",
            name="Recuperation",
            acronym="REC",
            acronym_custom=False,
            start_time=datetime(day2.year, day2.month, day2.day, 8, 0),
            end_time=datetime(day3.year, day3.month, day3.day, 8, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="green",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.RECUPERATION,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id="s_duty",
            deleted=False,
        ),
        Shift(
            id="s_off",
            team_id="t0",
            name="Off",
            acronym="O",
            acronym_custom=False,
            start_time=datetime(day1.year, day1.month, day1.day, 0, 0),
            end_time=(
                datetime(day1.year, day1.month, day1.day, 0, 0) + timedelta(days=1)
            ),
            staffing=[],
            color="grey",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.OFF,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="s_leave",
            team_id="t0",
            name="Leave",
            acronym="L",
            acronym_custom=False,
            start_time=datetime(day1.year, day1.month, day1.day, 9, 0),
            end_time=datetime(day1.year, day1.month, day1.day, 17, 0),
            staffing=[],
            color="pink",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.VACATION,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
    ]

    # Build shift demands: duty every day, morning/aftern on weekdays
    shift_demands: List[ShiftDemandNew] = []
    current = start
    while current <= end:
        if current.weekday() < 5:
            for shift_id in ("s_morning", "s_afternoon"):
                shift_demands.append(
                    ShiftDemandNew(
                        id=f"dsd_{shift_id}_{current}",
                        date=current,
                        shift_id=shift_id,
                        team_id="t0",
                        count=1,
                        notes=None,
                        source=ShiftDemandSource.MANUAL,
                        source_id=None,
                        created_at=datetime.now(),
                        updated_at=datetime.now(),
                    )
                )
        shift_demands.append(
            ShiftDemandNew(
                id=f"dsd_s_duty_{current}",
                date=current,
                shift_id="s_duty",
                team_id="t0",
                count=1,
                notes=None,
                source=ShiftDemandSource.MANUAL,
                source_id=None,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
        )
        current += timedelta(days=1)

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
        shift_demands=shift_demands,
        requests_work=[],
        requests_leave=[],
        model_output=None,
        penalties=penalties,
        model_config=model_config,
    )
