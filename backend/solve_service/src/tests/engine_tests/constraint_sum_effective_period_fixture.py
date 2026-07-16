from datetime import date, datetime, timedelta
from typing import List

from shared.schemas.core import (
    Block,
    BlockNameOptions,
    BlockTypeOptions,
    ConstraintBuildAugmented,
    ConstraintType,
    EngineInputsAugmented,
    ModelConfig,
    Penalties,
    Period,
    Schedule,
    ScheduleStatus,
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


def build_ei_sum_effective_period(
    penalties: Penalties, model_config: ModelConfig
) -> EngineInputsAugmented:
    start = date(2026, 1, 1)
    end = date(2026, 1, 7)
    cba_id = "c_sum_period"

    schedule = Schedule(
        id="sch_sum_period",
        team_id="t0",
        start_date=start,
        end_date=end,
        status=ScheduleStatus.CAMPAIGN,
        missing_coverage_dates=[],
        constraint_build_ids=[cba_id],
        constraint_effective_periods={
            cba_id: Period(start_date=date(2026, 1, 1), end_date=date(2026, 1, 3)),
        },
        quick_staffings=[],
        created_by="test",
        created_at=datetime(2026, 1, 1),
        updated_at=datetime(2026, 1, 1),
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

    day1 = datetime(2026, 1, 1)

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
            id="s_off",
            team_id="t0",
            name="Off",
            acronym="O",
            acronym_custom=False,
            start_time=datetime(day1.year, day1.month, day1.day, 0, 0),
            end_time=datetime(day1.year, day1.month, day1.day, 0, 0)
            + timedelta(days=1),
            staffing=[],
            color="grey",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.OFF,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
    ]

    shift_demands: List[ShiftDemandNew] = []
    current = start
    while current <= end:
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
        current += timedelta(days=1)

    cba = ConstraintBuildAugmented(
        id=cba_id,
        team_id="t0",
        constraint_type=ConstraintType.SUM,
        template_id="4",
        language="en",
        blocks=[
            Block(
                name=BlockNameOptions.WORKER,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name="Worker 0",
                        id="w0",
                        id_type=SWOIdTypes.WORKER,
                        is_bool_dim=False,
                        category_name="Workers",
                    )
                ],
            ),
            Block(
                name=BlockNameOptions.OPERATOR,
                type=BlockTypeOptions.STRING,
                value="at most",
            ),
            Block(
                name=BlockNameOptions.NUMBER,
                type=BlockTypeOptions.NUMBER,
                value=1,
            ),
            Block(
                name=BlockNameOptions.SHIFT,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name="Morning",
                        id="s_morning",
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name="Shifts",
                    ),
                ],
            ),
            Block(
                name=BlockNameOptions.TIMING,
                type=BlockTypeOptions.STRING,
                value="per week",
            ),
        ],
        text="",
        hard=True,
        priority="medium",
        active=True,
        missing_attributes=[],
    )

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
        cbs_augmented=[cba],
        shift_demands=shift_demands,
        requests_work=[],
        requests_leave=[],
        model_output=None,
        penalties=penalties,
        model_config=model_config,
    )
