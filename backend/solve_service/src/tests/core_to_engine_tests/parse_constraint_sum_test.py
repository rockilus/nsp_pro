from collections import Counter
from datetime import date, datetime, timezone
from typing import List

import pytest
from shared.constraint_parser import (
    build_dim_to_attr_value_to_owner,
    parse_constraints,
)
from shared.schemas.core import (
    Attribute,
    Block,
    BlockNameOptions,
    BlockTypeOptions,
    ConstraintBuildAugmented,
    ConstraintOperator,
    ConstraintSum,
    ConstraintType,
    Dimension,
    DimEntry,
    EngineInputs,
    EngineInputsAugmented,
    ModelConfig,
    Penalties,
    Schedule,
    ScheduleStatus,
    Shift,
    ShiftDemandNew,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    ShiftWorkerOption,
    Staffing,
    SWOIdTypes,
    Worker,
)

from core_to_engine_service.build_dates import (
    build_dates,
    build_worker_ids_to_worker_dates,
)
from core_to_engine_service.build_periods import (
    build_periods_monthly,
    build_periods_weekly,
    build_periods_yearly,
)


# pylint: disable=R0801, too-many-lines
def make_simple_engine_inputs(
    penalties_fix: Penalties, model_config_fix: ModelConfig
) -> EngineInputsAugmented:
    """Build a minimal EngineInputsAugmented suitable for
    parsing a SUM constraint.
    """
    # schedule spanning two consecutive days
    sched = Schedule(
        id="s0",
        team_id="t0",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 2),
        status=ScheduleStatus.CAMPAIGN,
        missing_coverage_dates=[],
        constraint_build_ids=[],
        quick_staffings=[],
        created_by="u0",
    )

    # two shifts and two workers
    shifts: List[Shift] = [
        Shift(
            id="sh0",
            team_id="t0",
            name="Shift 0",
            acronym="S0",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, tzinfo=timezone.utc),
            end_time=datetime(2025, 1, 1, 8, tzinfo=timezone.utc),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="#000000",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="sh1",
            team_id="t0",
            name="Shift 1",
            acronym="S1",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 8, tzinfo=timezone.utc),
            end_time=datetime(2025, 1, 1, 16, tzinfo=timezone.utc),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="#ffffff",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="sh2",
            team_id="t0",
            name="Shift 2",
            acronym="S2",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 8, tzinfo=timezone.utc),
            end_time=datetime(2025, 1, 2, 8, tzinfo=timezone.utc),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="#ffffff",
            shift_type=ShiftType.DUTY,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=24,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="sh3",
            team_id="t0",
            name="Recup Shift 2",
            acronym="RS2",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 8, tzinfo=timezone.utc),
            end_time=datetime(2025, 1, 2, 8, tzinfo=timezone.utc),
            staffing=[],
            color="#ffffff",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.RECUPERATION,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id="sh2",
            deleted=False,
        ),
    ]

    workers: List[Worker] = []
    for i in range(4):
        workers.append(
            Worker(
                id=f"w{i}",
                team_id="t0",
                name=f"Worker {i}",
                acronym=f"W{i}",
                acronym_custom=False,
                employment_start_date=date(2024, 1, 1),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=25,
                specialty_ids=[],
                deleted=False,
            )
        )

    # no dimensions/entries/attributes for this simple case
    dimensions: List[Dimension] = []
    dim_entries: List[DimEntry] = []
    attributes: List[Attribute] = []

    # shift demands: create a demand of 1 for sh0, sh1 and sh2 for every
    # day in the schedule (2025-01-01 and 2025-01-02)
    shift_demands: List[ShiftDemandNew] = []
    schedule_dates = [date(2025, 1, 1), date(2025, 1, 2)]
    for d in schedule_dates:
        for sh_id in ("sh0", "sh1", "sh2"):
            shift_demands.append(
                ShiftDemandNew(date=d, shift_id=sh_id, team_id="t0", count=1)
            )

    # Create a minimal ConstraintBuildAugmented representing a SUM constraint
    cba = ConstraintBuildAugmented(
        id="c0",
        team_id="t0",
        constraint_type=ConstraintType.SUM,
        template_id="tmpl",
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
                        category_name="workers",
                    )
                ],
            ),
            # Block(
            #     name=BlockNameOptions.WORKER,
            #     type=BlockTypeOptions.SHIFT_WORKER_OPTION,
            #     value=[
            #         ShiftWorkerOption(
            #             name="all workers",
            #             id="",
            #             id_type=SWOIdTypes.WORKER,
            #             is_bool_dim=False,
            #             category_name="All",
            #         )
            #     ],
            # ),
            Block(
                name=BlockNameOptions.TEXT,
                type=BlockTypeOptions.STRING,
                value="doit faire",
            ),
            Block(
                name=BlockNameOptions.OPERATOR,
                type=BlockTypeOptions.STRING,
                value="at most",
            ),
            Block(
                name=BlockNameOptions.NUMBER,
                type=BlockTypeOptions.NUMBER,
                value=2,
            ),
            Block(
                name=BlockNameOptions.SHIFT,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name="Shift 0",
                        id="sh0",
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name="shifts",
                    )
                ],
            ),
            # Block(
            #     name=BlockNameOptions.SHIFT,
            #     type=BlockTypeOptions.SHIFT_WORKER_OPTION,
            #     value=[
            #         ShiftWorkerOption(
            #             name=True,
            #             id="",
            #             id_type=SWOIdTypes.DUTY,
            #             is_bool_dim=True,
            #             category_name="Duties",
            #         )
            #     ],
            # ),
            Block(
                name=BlockNameOptions.TIMING,
                type=BlockTypeOptions.STRING,
                value="per week",
            ),
        ],
        hard=True,
        priority="",
        active=True,
        missing_attributes=[],
        text="",
    )

    engine_inputs = EngineInputs(
        schedule=sched,
        workers=workers,
        shifts=shifts,
        link_shifts=[],
        dimensions=dimensions,
        dim_entries=dim_entries,
        attributes=attributes,
        as_hist=[],
        as_campaign_fixed=[],
        as_campaign_not_fixed=[],
        cbs_augmented=[cba],
        shift_demands=shift_demands,
        requests_work=[],
        requests_leave=[],
        model_output=None,
    )

    return EngineInputsAugmented.from_engine_inputs(
        engine_inputs, penalties=penalties_fix, model_config=model_config_fix
    )


@pytest.fixture
def ei(penalties_fix: Penalties, model_config_fix: ModelConfig):
    """Provide a ready-to-use EngineInputsAugmented using project fixtures."""
    return make_simple_engine_inputs(penalties_fix, model_config_fix)


# pylint: disable=redefined-outer-name, too-many-locals
@pytest.mark.unit
def test_parse_constraints_sum_returns_non_empty(
    ei: EngineInputsAugmented,
) -> None:
    """Simple test: parse_constraints returns a Constraints object
    for a SUM constraint.
    """
    # use fixture-provided engine inputs

    # Build dim->attr maps (empty in this simple case)
    dim_to_attr_value_to_worker = build_dim_to_attr_value_to_owner(
        ei.workers, ei.dimensions, ei.dim_entries, ei.attributes
    )
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        ei.shifts, ei.dimensions, ei.dim_entries, ei.attributes
    )

    dates_hist, dates_campaign = build_dates(
        ei.schedule, ei.as_hist + ei.as_campaign_fixed
    )
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    periods_yearly = build_periods_yearly(dates_hist, dates_campaign)

    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        ei.schedule,
        ei.workers,
        ei.as_hist + ei.as_campaign_fixed,
        dates_campaign,
    )

    out = parse_constraints(
        cbas=ei.cbs_augmented,
        schedule_id=ei.schedule.id,
        workers=ei.workers,
        worker_dim_dict=dim_to_attr_value_to_worker,
        dates_hist=dates_hist,
        dates_campaign=dates_campaign,
        periods_weekly=periods_weekly,
        periods_monthly=periods_monthly,
        periods_yearly=periods_yearly,
        worker_ids_to_worker_dates=worker_ids_to_worker_dates,
        shifts=ei.shifts,
        shift_dim_dict=dim_to_attr_value_to_shift,
        penalties=ei.penalties,
    )

    expected = ConstraintSum(
        id="c0",
        constraint_type=ConstraintType.SUM,
        operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
        target_value=2,
        target_unit="",
        constraint_variables=[
            [("w0", d.isoformat(), "sh0") for d in week] for week in periods_weekly
        ],
        target_values=[2] * len(periods_weekly),
        active=True,
        hard=True,
        priority="",
        penalty=ei.penalties.user_constraint.sum.hard,
        schedule_id="s0",
        constraint_build_id="c0",
    )

    # basic assertions: output exists and SUM list is non-empty
    assert out is not None
    assert hasattr(out, "sum")
    assert len(out.sum) == 1
    assert isinstance(out.sum[0], ConstraintSum)

    # detailed assertions: compare the produced SUM constraint to the
    # previously defined expected_out tuple (use expected_out[0])
    actual = out.sum[0]

    assert actual.id == expected.id
    assert actual.constraint_type == expected.constraint_type
    assert actual.operator == expected.operator
    assert actual.target_value == expected.target_value
    assert actual.target_unit == expected.target_unit
    # compare constraint_variables ignoring order of outer list and inner lists

    def _normalize(vars_list):
        # represent each inner list as a sorted tuple of tuples so order
        # inside the inner list doesn't matter, then count occurrences
        return Counter(tuple(sorted(inner)) for inner in vars_list)

    assert _normalize(actual.constraint_variables) == _normalize(
        expected.constraint_variables
    )
    assert actual.hard == expected.hard
    assert actual.priority == expected.priority
    assert actual.penalty == expected.penalty
    assert actual.schedule_id == expected.schedule_id
    assert actual.constraint_build_id == expected.constraint_build_id


@pytest.mark.unit
def test_parse_constraints_sum_ignores_workers_ended_before_schedule(
    ei: EngineInputsAugmented,
) -> None:
    """If a worker's employment_end_date is before the schedule start,
    they should not be included in SUM constraint variables.
    """
    # Set w0 employment_end_date to before the schedule start
    for w in ei.workers:
        if w.id == "w0":
            w.employment_end_date = date(2024, 12, 31)

    dim_to_attr_value_to_worker = build_dim_to_attr_value_to_owner(
        ei.workers, ei.dimensions, ei.dim_entries, ei.attributes
    )
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        ei.shifts, ei.dimensions, ei.dim_entries, ei.attributes
    )

    dates_hist, dates_campaign = build_dates(
        ei.schedule, ei.as_hist + ei.as_campaign_fixed
    )
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    periods_yearly = build_periods_yearly(dates_hist, dates_campaign)

    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        ei.schedule,
        ei.workers,
        ei.as_hist + ei.as_campaign_fixed,
        dates_campaign,
    )

    out = parse_constraints(
        cbas=ei.cbs_augmented,
        schedule_id=ei.schedule.id,
        workers=ei.workers,
        worker_dim_dict=dim_to_attr_value_to_worker,
        dates_hist=dates_hist,
        dates_campaign=dates_campaign,
        periods_weekly=periods_weekly,
        periods_monthly=periods_monthly,
        periods_yearly=periods_yearly,
        worker_ids_to_worker_dates=worker_ids_to_worker_dates,
        shifts=ei.shifts,
        shift_dim_dict=dim_to_attr_value_to_shift,
        penalties=ei.penalties,
    )

    # Ensure a SUM constraint was produced
    assert out is not None
    assert hasattr(out, "sum")
    assert len(out.sum) == 0


@pytest.mark.unit
def test_parse_constraints_sum_all_workers_ignores_ended_worker(
    ei: EngineInputsAugmented,
) -> None:
    """When the worker block refers to all workers and one worker's
    employment_end_date is before the schedule start, that worker
    should not be included in SUM constraint variables.
    """
    # Set w0 employment_end_date to before the schedule start
    for w in ei.workers:
        if w.id == "w0":
            w.employment_end_date = date(2024, 12, 31)

    # Replace the worker block in the constraint to refer to 'all workers'
    for i, b in enumerate(ei.cbs_augmented[0].blocks):
        if b.name == BlockNameOptions.WORKER:
            ei.cbs_augmented[0].blocks[i] = Block(
                name=BlockNameOptions.WORKER,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name="all workers",
                        id="",
                        id_type=SWOIdTypes.WORKER,
                        is_bool_dim=False,
                        category_name="All",
                    )
                ],
            )
            break

    dim_to_attr_value_to_worker = build_dim_to_attr_value_to_owner(
        ei.workers, ei.dimensions, ei.dim_entries, ei.attributes
    )
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        ei.shifts, ei.dimensions, ei.dim_entries, ei.attributes
    )

    dates_hist, dates_campaign = build_dates(
        ei.schedule, ei.as_hist + ei.as_campaign_fixed
    )
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    periods_yearly = build_periods_yearly(dates_hist, dates_campaign)

    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        ei.schedule,
        ei.workers,
        ei.as_hist + ei.as_campaign_fixed,
        dates_campaign,
    )

    out = parse_constraints(
        cbas=ei.cbs_augmented,
        schedule_id=ei.schedule.id,
        workers=ei.workers,
        worker_dim_dict=dim_to_attr_value_to_worker,
        dates_hist=dates_hist,
        dates_campaign=dates_campaign,
        periods_weekly=periods_weekly,
        periods_monthly=periods_monthly,
        periods_yearly=periods_yearly,
        worker_ids_to_worker_dates=worker_ids_to_worker_dates,
        shifts=ei.shifts,
        shift_dim_dict=dim_to_attr_value_to_shift,
        penalties=ei.penalties,
    )

    # Ensure a SUM constraint was produced
    assert out is not None
    assert hasattr(out, "sum")
    assert len(out.sum) == 1

    actual = out.sum[0]

    # No variable should reference w0 (ended before schedule)
    seen_workers = set()
    for inner in actual.constraint_variables:
        for var in inner:
            seen_workers.add(var[0])
            assert var[0] != "w0"

    # And at least one active worker (w1) should be present
    assert "w1" in seen_workers

    assert all(len(cstr_vars) > 0 for cstr_vars in actual.constraint_variables), (
        "Expected non-empty constraint variables for all periods"
    )


@pytest.mark.unit
def test_parse_constraints_sum_all_duties_ignores_ended_worker(
    ei: EngineInputsAugmented,
) -> None:
    """When the worker block refers to all workers and the shift block
    selects all duties, a worker whose employment_end_date is before
    the schedule start should be excluded from SUM constraint variables.
    """
    # Set w0 employment_end_date to before the schedule start
    for w in ei.workers:
        if w.id == "w0":
            w.employment_end_date = date(2024, 12, 31)

    # Replace the worker block in the constraint to refer to 'all workers'
    for i, b in enumerate(ei.cbs_augmented[0].blocks):
        if b.name == BlockNameOptions.WORKER:
            ei.cbs_augmented[0].blocks[i] = Block(
                name=BlockNameOptions.WORKER,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name="all workers",
                        id="",
                        id_type=SWOIdTypes.WORKER,
                        is_bool_dim=False,
                        category_name="All",
                    )
                ],
            )
            break

    # Replace the shift block to select all duties
    for i, b in enumerate(ei.cbs_augmented[0].blocks):
        if b.name == BlockNameOptions.SHIFT:
            ei.cbs_augmented[0].blocks[i] = Block(
                name=BlockNameOptions.SHIFT,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name=True,
                        id="",
                        id_type=SWOIdTypes.DUTY,
                        is_bool_dim=True,
                        category_name="Duties",
                    )
                ],
            )
            break

    dim_to_attr_value_to_worker = build_dim_to_attr_value_to_owner(
        ei.workers, ei.dimensions, ei.dim_entries, ei.attributes
    )
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        ei.shifts, ei.dimensions, ei.dim_entries, ei.attributes
    )

    dates_hist, dates_campaign = build_dates(
        ei.schedule, ei.as_hist + ei.as_campaign_fixed
    )
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    periods_yearly = build_periods_yearly(dates_hist, dates_campaign)

    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        ei.schedule,
        ei.workers,
        ei.as_hist + ei.as_campaign_fixed,
        dates_campaign,
    )

    out = parse_constraints(
        cbas=ei.cbs_augmented,
        schedule_id=ei.schedule.id,
        workers=ei.workers,
        worker_dim_dict=dim_to_attr_value_to_worker,
        dates_hist=dates_hist,
        dates_campaign=dates_campaign,
        periods_weekly=periods_weekly,
        periods_monthly=periods_monthly,
        periods_yearly=periods_yearly,
        worker_ids_to_worker_dates=worker_ids_to_worker_dates,
        shifts=ei.shifts,
        shift_dim_dict=dim_to_attr_value_to_shift,
        penalties=ei.penalties,
    )

    # Ensure a SUM constraint was produced
    assert out is not None
    assert hasattr(out, "sum")
    assert len(out.sum) == 1

    actual = out.sum[0]

    # No variable should reference w0 (ended before schedule)
    seen_workers = set()
    for inner in actual.constraint_variables:
        for var in inner:
            seen_workers.add(var[0])
            assert var[0] != "w0"

    # And at least one active worker (w1) should be present
    assert "w1" in seen_workers

    # Ensure only duty shifts are referenced in the constraint variables
    duty_shift_ids = {s.id for s in ei.shifts if s.shift_type == ShiftType.DUTY}
    for inner in actual.constraint_variables:
        for var in inner:
            assert var[2] in duty_shift_ids


@pytest.mark.unit
def test_parse_constraints_sum_prorates_single_day_period(
    penalties_fix: Penalties, model_config_fix: ModelConfig
) -> None:
    """When a schedule spans only 1 day of a month, the monthly target
    should be pro-rated down (e.g., 2 duties/month becomes 0 for 1 day).
    """
    # Schedule spanning Jan 1 to Jan 2 (only 1 day: Jan 1)
    sched = Schedule(
        id="s0",
        team_id="t0",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 2),
        status=ScheduleStatus.CAMPAIGN,
        missing_coverage_dates=[],
        constraint_build_ids=[],
        quick_staffings=[],
        created_by="u0",
    )

    shifts: List[Shift] = [
        Shift(
            id="sh0",
            team_id="t0",
            name="Duty Shift",
            acronym="D",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, tzinfo=timezone.utc),
            end_time=datetime(2025, 1, 2, tzinfo=timezone.utc),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="#000000",
            shift_type=ShiftType.DUTY,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
    ]

    workers: List[Worker] = [
        Worker(
            id="w0",
            team_id="t0",
            name="Worker 0",
            acronym="W0",
            acronym_custom=False,
            employment_start_date=date(2024, 1, 1),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=5,
            annual_leave=25,
            specialty_ids=[],
            deleted=False,
        )
    ]

    # Constraint: "at least 2 duties per month"
    cba = ConstraintBuildAugmented(
        id="c0",
        team_id="t0",
        constraint_type=ConstraintType.SUM,
        template_id="tmpl",
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
                        category_name="workers",
                    )
                ],
            ),
            Block(
                name=BlockNameOptions.TEXT,
                type=BlockTypeOptions.STRING,
                value="must work",
            ),
            Block(
                name=BlockNameOptions.OPERATOR,
                type=BlockTypeOptions.STRING,
                value="at least",
            ),
            Block(
                name=BlockNameOptions.NUMBER,
                type=BlockTypeOptions.NUMBER,
                value=2,
            ),
            Block(
                name=BlockNameOptions.SHIFT,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name="Duty Shift",
                        id="sh0",
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name="shifts",
                    )
                ],
            ),
            Block(
                name=BlockNameOptions.TIMING,
                type=BlockTypeOptions.STRING,
                value="per month",
            ),
        ],
        hard=True,
        priority="",
        active=True,
        missing_attributes=[],
        text="",
    )

    engine_inputs = EngineInputs(
        schedule=sched,
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
        shift_demands=[
            ShiftDemandNew(date=date(2025, 1, 1), shift_id="sh0", team_id="t0", count=1)
        ],
        requests_work=[],
        requests_leave=[],
        model_output=None,
    )

    ei = EngineInputsAugmented.from_engine_inputs(
        engine_inputs, penalties=penalties_fix, model_config=model_config_fix
    )

    dim_to_attr_value_to_worker = build_dim_to_attr_value_to_owner(
        ei.workers, ei.dimensions, ei.dim_entries, ei.attributes
    )
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        ei.shifts, ei.dimensions, ei.dim_entries, ei.attributes
    )

    dates_hist, dates_campaign = build_dates(
        ei.schedule, ei.as_hist + ei.as_campaign_fixed
    )
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_yearly = build_periods_yearly(dates_hist, dates_campaign)

    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        ei.schedule,
        ei.workers,
        ei.as_hist + ei.as_campaign_fixed,
        dates_campaign,
    )

    out = parse_constraints(
        cbas=ei.cbs_augmented,
        schedule_id=ei.schedule.id,
        workers=ei.workers,
        worker_dim_dict=dim_to_attr_value_to_worker,
        dates_hist=dates_hist,
        dates_campaign=dates_campaign,
        periods_weekly=periods_weekly,
        periods_monthly=periods_monthly,
        periods_yearly=periods_yearly,
        worker_ids_to_worker_dates=worker_ids_to_worker_dates,
        shifts=ei.shifts,
        shift_dim_dict=dim_to_attr_value_to_shift,
        penalties=ei.penalties,
    )

    assert out is not None
    assert len(out.sum) == 1

    actual = out.sum[0]

    # Original target is 2
    assert actual.target_value == 2

    # Pro-rated: 1 day out of 31 days in January
    # For "at least" (>=), we floor the result: floor(2 * 1/31) = floor(0.065) = 0
    assert len(actual.target_values) == 1
    assert actual.target_values[0] == 0


@pytest.mark.unit
def test_parse_constraints_sum_prorates_half_month_period(
    ei: EngineInputsAugmented,
) -> None:
    """When a schedule spans half a month (e.g., 15 days), the monthly
    target should be pro-rated accordingly.
    """
    # Modify schedule to span Jan 1 to Jan 16 (16 days of January)
    ei.schedule.start_date = date(2025, 1, 1)
    ei.schedule.end_date = date(2025, 1, 16)

    # Replace first shift with a duty shift
    ei.shifts[0].shift_type = ShiftType.DUTY

    # Keep only one worker
    ei.workers = [ei.workers[0]]

    # Update constraint to "at most 10 duties per month"
    for i, b in enumerate(ei.cbs_augmented[0].blocks):
        if b.name == BlockNameOptions.OPERATOR:
            ei.cbs_augmented[0].blocks[i] = Block(
                name=BlockNameOptions.OPERATOR,
                type=BlockTypeOptions.STRING,
                value="at most",
            )
        elif b.name == BlockNameOptions.NUMBER:
            ei.cbs_augmented[0].blocks[i] = Block(
                name=BlockNameOptions.NUMBER,
                type=BlockTypeOptions.NUMBER,
                value=10,
            )
        elif b.name == BlockNameOptions.TIMING:
            ei.cbs_augmented[0].blocks[i] = Block(
                name=BlockNameOptions.TIMING,
                type=BlockTypeOptions.STRING,
                value="per month",
            )

    # Create shift demands for all 16 days
    shift_demands: List[ShiftDemandNew] = []
    for day in range(1, 16):
        shift_demands.append(
            ShiftDemandNew(
                date=date(2025, 1, day), shift_id="sh0", team_id="t0", count=1
            )
        )
    ei.shift_demands = shift_demands

    dim_to_attr_value_to_worker = build_dim_to_attr_value_to_owner(
        ei.workers, ei.dimensions, ei.dim_entries, ei.attributes
    )
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        ei.shifts, ei.dimensions, ei.dim_entries, ei.attributes
    )

    dates_hist, dates_campaign = build_dates(
        ei.schedule, ei.as_hist + ei.as_campaign_fixed
    )
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_yearly = build_periods_yearly(dates_hist, dates_campaign)

    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        ei.schedule,
        ei.workers,
        ei.as_hist + ei.as_campaign_fixed,
        dates_campaign,
    )

    out = parse_constraints(
        cbas=ei.cbs_augmented,
        schedule_id=ei.schedule.id,
        workers=ei.workers,
        worker_dim_dict=dim_to_attr_value_to_worker,
        dates_hist=dates_hist,
        dates_campaign=dates_campaign,
        periods_weekly=periods_weekly,
        periods_monthly=periods_monthly,
        periods_yearly=periods_yearly,
        worker_ids_to_worker_dates=worker_ids_to_worker_dates,
        shifts=ei.shifts,
        shift_dim_dict=dim_to_attr_value_to_shift,
        penalties=ei.penalties,
    )

    assert out is not None
    assert len(out.sum) == 1

    actual = out.sum[0]

    # Original target is 10
    assert actual.target_value == 10

    # Pro-rated: 16 days out of 31 days in January (Jan 1-16, end_date is
    # exclusive so includes 1-15 + day 16 = 16 days)
    # For "at most" (<=), we floor the result to prevent extrapolation
    # violations: floor(10 * 16/31) = floor(5.16) = 5
    assert len(actual.target_values) == 1
    assert actual.target_values[0] == 6


@pytest.mark.unit
def test_parse_constraints_sum_prorates_weekly_incomplete_week(
    ei: EngineInputsAugmented,
) -> None:
    """When a schedule has an incomplete week (e.g., 4 days instead of 7),
    the weekly target should be pro-rated.
    """
    # Modify schedule to span Jan 1 (Wed) to Jan 4 (Sat) - 4 days
    ei.schedule.start_date = date(2025, 1, 1)
    ei.schedule.end_date = date(2025, 1, 4)

    # Keep only one worker
    ei.workers = [ei.workers[0]]

    # Update constraint to "exactly 5 shifts per week"
    for i, b in enumerate(ei.cbs_augmented[0].blocks):
        if b.name == BlockNameOptions.OPERATOR:
            ei.cbs_augmented[0].blocks[i] = Block(
                name=BlockNameOptions.OPERATOR,
                type=BlockTypeOptions.STRING,
                value="exactly",
            )
        elif b.name == BlockNameOptions.NUMBER:
            ei.cbs_augmented[0].blocks[i] = Block(
                name=BlockNameOptions.NUMBER,
                type=BlockTypeOptions.NUMBER,
                value=5,
            )
        elif b.name == BlockNameOptions.TIMING:
            ei.cbs_augmented[0].blocks[i] = Block(
                name=BlockNameOptions.TIMING,
                type=BlockTypeOptions.STRING,
                value="per week",
            )

    # Create shift demands for all 4 days
    shift_demands: List[ShiftDemandNew] = []
    for day in range(1, 4):
        shift_demands.append(
            ShiftDemandNew(
                date=date(2025, 1, day), shift_id="sh0", team_id="t0", count=1
            )
        )
    ei.shift_demands = shift_demands

    dim_to_attr_value_to_worker = build_dim_to_attr_value_to_owner(
        ei.workers, ei.dimensions, ei.dim_entries, ei.attributes
    )
    dim_to_attr_value_to_shift = build_dim_to_attr_value_to_owner(
        ei.shifts, ei.dimensions, ei.dim_entries, ei.attributes
    )

    dates_hist, dates_campaign = build_dates(
        ei.schedule, ei.as_hist + ei.as_campaign_fixed
    )
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_yearly = build_periods_yearly(dates_hist, dates_campaign)

    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        ei.schedule,
        ei.workers,
        ei.as_hist + ei.as_campaign_fixed,
        dates_campaign,
    )

    out = parse_constraints(
        cbas=ei.cbs_augmented,
        schedule_id=ei.schedule.id,
        workers=ei.workers,
        worker_dim_dict=dim_to_attr_value_to_worker,
        dates_hist=dates_hist,
        dates_campaign=dates_campaign,
        periods_weekly=periods_weekly,
        periods_monthly=periods_monthly,
        periods_yearly=periods_yearly,
        worker_ids_to_worker_dates=worker_ids_to_worker_dates,
        shifts=ei.shifts,
        shift_dim_dict=dim_to_attr_value_to_shift,
        penalties=ei.penalties,
    )

    assert out is not None
    assert len(out.sum) == 1

    actual = out.sum[0]

    # Original target is 5
    assert actual.target_value == 5

    # Pro-rated: 4 days out of 7 days in a week
    # For "exactly" (=), we round the result: round(5 * 4/7) = round(2.86) = 3
    assert len(actual.target_values) == 1
    assert actual.target_values[0] == 3
