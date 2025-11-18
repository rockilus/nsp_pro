from datetime import date, datetime, timezone
from typing import List
from collections import Counter

import pytest

from shared.constraint_parser import (
    build_dim_to_attr_value_to_owner,
    parse_constraints,
)
from shared.schemas.core import (
    EngineInputs,
    EngineInputsAugmented,
    ConstraintBuildAugmented,
    ConstraintType,
    ConstraintOperator,
    ConstraintSum,
    Schedule,
    Shift,
    Worker,
    Staffing,
    ShiftDemandNew,
    Dimension,
    DimEntry,
    Attribute,
    ScheduleStatus,
    Block,
    BlockNameOptions,
    BlockTypeOptions,
    ShiftWorkerOption,
    ShiftType,
    ShiftRestType,
    ShiftLeaveType,
    SWOIdTypes,
    Penalties,
    ModelConfig,
)


from core_to_engine_service.build_dates import (
    build_dates,
    build_worker_ids_to_worker_dates,
)
from core_to_engine_service.build_periods import (
    build_periods_weekly,
    build_periods_monthly,
    build_periods_yearly,
)


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
        ),
        Worker(
            id="w1",
            team_id="t0",
            name="Worker 1",
            acronym="W1",
            acronym_custom=False,
            employment_start_date=date(2024, 1, 1),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=5,
            annual_leave=25,
            specialty_ids=[],
            deleted=False,
        ),
    ]

    # no dimensions/entries/attributes for this simple case
    dimensions: List[Dimension] = []
    dim_entries: List[DimEntry] = []
    attributes: List[Attribute] = []

    # shift demands
    shift_demands: List[ShiftDemandNew] = []

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
        as_wip_fixed=[],
        cbs_augmented=[cba],
        shift_demands=[],
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


@pytest.mark.unit
def test_parse_constraints_sum_returns_non_empty(ei) -> None:
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
        ei.schedule, ei.as_hist + ei.as_wip_fixed
    )
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    periods_yearly = build_periods_yearly(dates_hist, dates_campaign)

    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        ei.schedule, ei.workers, ei.as_hist + ei.as_wip_fixed, dates_campaign
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
            [("w0", d.isoformat(), "sh0") for d in week]
            for week in periods_weekly
        ],
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
def test_parse_constraints_sum_ignores_workers_ended_before_schedule(ei):
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
        ei.schedule, ei.as_hist + ei.as_wip_fixed
    )
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    periods_yearly = build_periods_yearly(dates_hist, dates_campaign)

    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        ei.schedule, ei.workers, ei.as_hist + ei.as_wip_fixed, dates_campaign
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

    # Assert that no variable references w0 (worker ended before schedule)
    for inner in actual.constraint_variables:
        for var in inner:
            assert var[0] != "w0"


@pytest.mark.unit
def test_parse_constraints_sum_all_workers_ignores_ended_worker(ei) -> None:
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
        ei.schedule, ei.as_hist + ei.as_wip_fixed
    )
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    periods_yearly = build_periods_yearly(dates_hist, dates_campaign)

    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        ei.schedule, ei.workers, ei.as_hist + ei.as_wip_fixed, dates_campaign
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


@pytest.mark.unit
def test_parse_constraints_sum_all_duties_ignores_ended_worker(ei) -> None:
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
        ei.schedule, ei.as_hist + ei.as_wip_fixed
    )
    periods_weekly = build_periods_weekly(dates_hist, dates_campaign)
    periods_monthly = build_periods_monthly(dates_hist, dates_campaign)
    periods_yearly = build_periods_yearly(dates_hist, dates_campaign)

    worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
        ei.schedule, ei.workers, ei.as_hist + ei.as_wip_fixed, dates_campaign
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
