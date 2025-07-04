# pylint: disable=too-many-lines
from copy import deepcopy
from datetime import date, datetime, timedelta
from typing import Callable, List, Tuple

import pytest
from shared.schemas.core import (
    Attribute,
    AttributeOwnerType,
    Block,
    BlockNameOptions,
    BlockTypeOptions,
    ConstraintBuildAugmented,
    ConstraintFai,
    ConstraintFil,
    ConstraintOperator,
    ConstraintOrd,
    ConstraintSeq,
    ConstraintSum,
    ConstraintType,
    Dimension,
    DimensionEntryType,
    DimensionType,
    DimEntry,
    EngineInputs,
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
    ShiftWorkerOption,
    Staffing,
    SWOIdTypes,
    Worker,
)

from core_to_engine_service import core_to_engine_inputs
from core_to_engine_service.build_periods import build_periods_weekly
from engine import Inputs as InputsEngine
from engine import ProcessingCache
from engine.engine import Engine, Outputs
from solve_service.model_config import model_config
from solve_service.penalties import penalties
from tests.utils import (
    engine_inputs_to_engine_inputs_augmented,
    load_json_from_file,
)


# pylint: disable=R0801
# Schedule
@pytest.fixture
def schedule() -> Schedule:
    return Schedule(
        id="sch0",
        team_id="t0",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        status=ScheduleStatus.CAMPAIGN,
        missing_coverage_dates=[],
        constraint_build_ids=[],
        quick_staffings=[],
        created_by="test_user",
        created_at=datetime(2025, 1, 1, 0, 0),
        updated_at=datetime(2025, 1, 1, 0, 0),
    )


# Workers
@pytest.fixture
def workers_10() -> List[Worker]:
    return [
        Worker(
            id=f"w{i}",
            team_id="t0",
            name=f"Worker {i}",
            acronym=f"W{i}",
            acronym_custom=False,
            employment_start_date=date(2025, 1, 1),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=10,
            annual_leave=20,
            specialty_ids=[],
            deleted=False,
        )
        for i in range(10)
    ]


# Shifts
@pytest.fixture
def shifts_3n_2d() -> List[Shift]:
    return [
        # Normal shifts
        Shift(
            id="s0",
            team_id="t0",
            name="Morning Shift",
            acronym="MS",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 8, 0),
            end_time=datetime(2025, 1, 1, 12, 0),
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
            id="s1",
            team_id="t0",
            name="Afternoon Shift",
            acronym="AS",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 12, 0),
            end_time=datetime(2025, 1, 1, 16, 0),
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
            id="s2",
            team_id="t0",
            name="Night Shift",
            acronym="NS",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 20, 0),
            end_time=datetime(2025, 1, 2, 0, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="purple",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        # Duty shifts
        Shift(
            id="s3",
            team_id="t0",
            name="Duty 24h",
            acronym="D24",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 8, 0),
            end_time=datetime(2025, 1, 2, 8, 0),
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
            id="s4",
            team_id="t0",
            name="Duty 12h",
            acronym="D12",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 12, 0),
            end_time=datetime(2025, 1, 2, 0, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="orange",
            shift_type=ShiftType.DUTY,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=12,
            recuperation_duty_id=None,
            deleted=False,
        ),
        # Rest shifts
        Shift(
            id="s5",
            team_id="t0",
            name="Recuperation 24h",
            acronym="R24",
            acronym_custom=False,
            start_time=datetime(2025, 1, 2, 8, 0),
            end_time=datetime(2025, 1, 3, 8, 0),
            staffing=[],
            color="yellow",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.RECUPERATION,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id="s3",
            deleted=False,
        ),
        Shift(
            id="s6",
            team_id="t0",
            name="Recuperation 12h",
            acronym="R12",
            acronym_custom=False,
            start_time=datetime(2025, 1, 2, 0, 0),
            end_time=datetime(2025, 1, 2, 12, 0),
            staffing=[],
            color="pink",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.RECUPERATION,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id="s4",
            deleted=False,
        ),
    ]


# Dimensions
@pytest.fixture
def dimensions() -> List[Dimension]:
    return [
        Dimension(
            id="dim0",
            team_id="t0",
            dim_types=[DimensionType.WORKER],
            name="location",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        ),
        Dimension(
            id="dim1",
            team_id="t0",
            dim_types=[DimensionType.SHIFT],
            name="block",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        ),
        Dimension(
            id="dim2",
            team_id="t0",
            dim_types=[DimensionType.WORKER],
            name="60+",
            entry_type=DimensionEntryType.BOOL,
            deleted=False,
        ),
        Dimension(
            id="dim3",
            team_id="t0",
            dim_types=[DimensionType.SHIFT],
            name="intense",
            entry_type=DimensionEntryType.BOOL,
            deleted=False,
        ),
    ]


# DimEntries
# pylint: disable=redefined-outer-name
@pytest.fixture
def dim_entries(dimensions: List[Dimension]) -> List[DimEntry]:  # noqa: F811
    locations = ["loc0", "loc1"]
    de_loc = [
        DimEntry(id=f"de_loc_{i}", dimension_id=dim.id, name=loc, deleted=False)
        for i, loc in enumerate(locations)
        for dim in [d for d in dimensions if d.id == "dim0"]
    ]

    blocks = ["block0", "block1"]
    de_block = [
        DimEntry(
            id=f"de_block_{i}",
            dimension_id=dim.id,
            name=block,
            deleted=False,
        )
        for i, block in enumerate(blocks)
        for dim in [d for d in dimensions if d.id == "dim1"]
    ]

    return de_loc + de_block


# Attributes
@pytest.fixture
def attributes(
    workers_10: List[Worker],  # noqa: F811
    shifts_3n_2d: List[Shift],  # noqa: F811
    dim_entries: List[DimEntry],  # noqa: F811
) -> List[Attribute]:
    des_loc = [de for de in dim_entries if de.dimension_id == "dim0"]
    a_loc = [
        Attribute(
            id=f"a_loc_{i}",
            value="",
            owner_type=AttributeOwnerType.WORKER,
            owner_id=w.id,
            dimension_id=des_loc[0].dimension_id,
            dim_entry_ids=[des_loc[0].id],
        )
        for i, w in enumerate(workers_10[:5])
    ] + [
        Attribute(
            id=f"a_loc_{i+5}",
            value="",
            owner_type=AttributeOwnerType.WORKER,
            owner_id=w.id,
            dimension_id=des_loc[1].dimension_id,
            dim_entry_ids=[des_loc[1].id],
        )
        for i, w in enumerate(workers_10[5:])
    ]

    des_block = [de for de in dim_entries if de.dimension_id == "dim1"]
    a_block = [
        Attribute(
            id=f"a_block_{i}",
            value="",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=s.id,
            dimension_id=des_block[0].dimension_id,
            dim_entry_ids=[des_block[0].id],
        )
        for i, s in enumerate(shifts_3n_2d[:2])
    ] + [
        Attribute(
            id=f"a_block_{i+3}",
            value="",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=s.id,
            dimension_id=des_block[1].dimension_id,
            dim_entry_ids=[des_block[1].id],
        )
        for i, s in enumerate(shifts_3n_2d[2:3])
    ]

    a_60plus = [
        Attribute(
            id=f"a_60+_{i}",
            value=True,
            owner_type=AttributeOwnerType.WORKER,
            owner_id=w.id,
            dimension_id="dim2",
            dim_entry_ids=[],
        )
        for i, w in enumerate(workers_10[:3])
    ] + [
        Attribute(
            id=f"a_60+_{i+3}",
            value=False,
            owner_type=AttributeOwnerType.WORKER,
            owner_id=w.id,
            dimension_id="dim2",
            dim_entry_ids=[],
        )
        for i, w in enumerate(workers_10[3:])
    ]

    a_intense = [
        Attribute(
            id=f"a_intense_{i}",
            value=True,
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=s.id,
            dimension_id="dim3",
            dim_entry_ids=[],
        )
        for i, s in enumerate(shifts_3n_2d[:2])
    ] + [
        Attribute(
            id=f"a_intense_{i+2}",
            value=False,
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=s.id,
            dimension_id="dim3",
            dim_entry_ids=[],
        )
        for i, s in enumerate(shifts_3n_2d[2:5])
    ]

    return a_loc + a_block + a_60plus + a_intense


# ShiftDemands
# pylint: disable=redefined-outer-name
@pytest.fixture
def daily_shift_demands_shifts_3n_2d(
    shifts_3n_2d: List[Shift],  # noqa: F811
    schedule: Schedule,  # noqa: F811
) -> List[ShiftDemandNew]:
    daily_shift_demands = []
    # Create daily shift demands for every weekday for shifts s0 to s2
    for shift in [s for s in shifts_3n_2d if s.shift_type == ShiftType.NORMAL]:
        current_date = schedule.start_date
        while current_date <= schedule.end_date:
            if current_date.weekday() < 5:  # Weekdays only
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

    # Create daily shift demands for every day for shifts s3 and s4
    for shift in [s for s in shifts_3n_2d if s.shift_type == ShiftType.DUTY]:
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

    return daily_shift_demands


@pytest.fixture
def penalties_fix() -> Penalties:
    return penalties


@pytest.fixture
def model_config_fix() -> ModelConfig:
    return model_config


# EngineInputs
# pylint: disable=too-many-arguments
@pytest.fixture
def engine_inputs(
    schedule,  # noqa: F811
    workers_10: List[Worker],  # noqa: F811
    shifts_3n_2d: List[Shift],  # noqa: F811
    dimensions: List[Dimension],  # noqa: F811
    dim_entries: List[DimEntry],  # noqa: F811
    attributes: List[Attribute],  # noqa: F811
    daily_shift_demands_shifts_3n_2d: List[ShiftDemandNew],  # noqa: F811
    penalties_fix: Penalties,  # noqa: F811
    model_config_fix: ModelConfig,  # noqa: F811
) -> EngineInputsAugmented:
    return EngineInputsAugmented(
        schedule=schedule,
        workers=workers_10,
        shifts=shifts_3n_2d,
        link_shifts=[],
        dimensions=dimensions,
        dim_entries=dim_entries,
        attributes=attributes,
        as_hist=[],
        as_wip_fixed=[],
        cbs_augmented=[],
        shift_demands=daily_shift_demands_shifts_3n_2d,
        requests_work=[],
        requests_leave=[],
        model_output=None,
        penalties=penalties_fix,
        model_config=model_config_fix,
    )


worker_ids = [f"w{i}" for i in range(10)]
shift_ids = [f"s{i}" for i in range(7)]
shift_work_ids = [f"s{i}" for i in range(5)]
start_date = date(2025, 1, 1)
end_date = date(2025, 1, 31)
dates_campaign = [
    start_date + timedelta(days=i) for i in range((end_date - start_date).days + 1)
]
periods_weekly = build_periods_weekly([], dates_campaign)


def integer_division_list(numerator: int, denominator: int) -> List[int]:
    quotient = numerator // denominator
    remainder = numerator % denominator
    result = [quotient + 1] * remainder + [quotient] * (denominator - remainder)
    return result


target_average = 1
period_lengths = integer_division_list(len(dates_campaign), int(target_average))
d_constraint_eve: List[List[date]] = []
for index, period_length in enumerate(period_lengths):
    cum_days = sum(period_lengths[:index])
    start_date = dates_campaign[0] + timedelta(days=cum_days)
    end_date = start_date + timedelta(days=period_length - 1)
    d_constraint_eve.append([d for d in dates_campaign if start_date <= d <= end_date])

test_data = [
    # Sequence
    # One worker, one shift
    # "text": "John should work at most 2 consecutive Morning Shift.",
    (
        ConstraintBuildAugmented(
            id="c_seq_0",
            team_id="t0",
            constraint_type=ConstraintType.SEQ,
            template_id="0",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="w0",
                            id_type=SWOIdTypes.WORKER,
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="should work",
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
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    value="consecutive",
                ),
                Block(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        ConstraintSeq(
            id="c_seq_0",
            constraint_type=ConstraintType.SEQ,
            operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
            target_value=2,
            target_unit="",
            constraint_variables=[
                [("w0", d.isoformat(), "s0") for d in dates_campaign]
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.seq.hard,
            schedule_id="sch0",
            constraint_build_id="c_seq_0",
        ),
    ),
    # "text": "John should work exactly 2 consecutive Morning Shift.",
    (
        ConstraintBuildAugmented(
            id="c_seq_1",
            team_id="t0",
            constraint_type=ConstraintType.SEQ,
            template_id="0",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="w0",
                            id_type=SWOIdTypes.WORKER,
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="should work",
                ),
                Block(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    value="exactly",
                ),
                Block(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    value=2,
                ),
                Block(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    value="consecutive",
                ),
                Block(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        ConstraintSeq(
            id="c_seq_1",
            constraint_type=ConstraintType.SEQ,
            operator=ConstraintOperator.EQUAL,
            target_value=2,
            target_unit="",
            constraint_variables=[
                [("w0", d.isoformat(), "s0") for d in dates_campaign]
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.seq.hard,
            schedule_id="sch0",
            constraint_build_id="c_seq_1",
        ),
    ),
    # "text": "John should work at least 2 consecutive Morning Shift.",
    (
        ConstraintBuildAugmented(
            id="c_seq_2",
            team_id="t0",
            constraint_type=ConstraintType.SEQ,
            template_id="0",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="w0",
                            id_type=SWOIdTypes.WORKER,
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="should work",
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
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    value="consecutive",
                ),
                Block(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        ConstraintSeq(
            id="c_seq_2",
            constraint_type=ConstraintType.SEQ,
            operator=ConstraintOperator.GREATER_THAN_OR_EQUAL,
            target_value=2,
            target_unit="",
            constraint_variables=[
                [("w0", d.isoformat(), "s0") for d in dates_campaign]
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.seq.hard,
            schedule_id="sch0",
            constraint_build_id="c_seq_2",
        ),
    ),
    # All workers, all shifts
    # "text": "All workers should work at most 2 consecutive all shifts.",
    (
        ConstraintBuildAugmented(
            id="c_seq_3",
            team_id="t0",
            constraint_type=ConstraintType.SEQ,
            template_id="0",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="all workers",
                            id="",
                            id_type=SWOIdTypes.NONE,
                            is_bool_dim=False,
                            category_name="All",
                        ),
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="should work",
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
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    value="consecutive",
                ),
                Block(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="all shifts",
                            id="",
                            id_type=SWOIdTypes.NONE,
                            is_bool_dim=False,
                            category_name="All",
                        ),
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        ConstraintSeq(
            id="c_seq_3",
            constraint_type=ConstraintType.SEQ,
            operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
            target_value=2,
            target_unit="",
            constraint_variables=[
                [(w_id, d.isoformat(), s_id) for d in dates_campaign]
                for w_id in worker_ids
                for s_id in shift_ids
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.seq.hard,
            schedule_id="sch0",
            constraint_build_id="c_seq_3",
        ),
    ),
    # # Boolean property workers, boolean property shifts
    # # "text": "60+ should work at most 2 consecutive not duty.",
    # (
    #     ConstraintBuildAugmented(
    #         id="",
    #         team_id="t0",
    #         constraint_type=ConstraintType.SEQ,
    #         template_id="0",
    #         language="en",
    #         blocks=[
    #             Block(
    #                 name=BlockNameOptions.WORKER,
    #                 type=BlockTypeOptions.SHIFT_WORKER_OPTION,
    #                 value=[
    #                     ShiftWorkerOption(
    #                         name=True,
    #                         id="dim2",
    #                         id_type=SWOIdTypes.DIMENSION,
    #                         is_bool_dim=True,
    #                         category_name="60+",
    #                     ),
    #                 ],
    #             ),
    #             Block(
    #                 name=BlockNameOptions.TEXT,
    #                 type=BlockTypeOptions.STRING,
    #                 value="should work",
    #             ),
    #             Block(
    #                 name=BlockNameOptions.OPERATOR,
    #                 type=BlockTypeOptions.STRING,
    #                 value="at most",
    #             ),
    #             Block(
    #                 name=BlockNameOptions.NUMBER,
    #                 type=BlockTypeOptions.NUMBER,
    #                 value=2,
    #             ),
    #             Block(
    #                 name=BlockNameOptions.TIMING,
    #                 type=BlockTypeOptions.STRING,
    #                 value="consecutive",
    #             ),
    #             Block(
    #                 name=BlockNameOptions.SHIFT,
    #                 type=BlockTypeOptions.SHIFT_WORKER_OPTION,
    #                 value=[
    #                     ShiftWorkerOption(
    #                         name=False,
    #                         id="duty_id",
    #                         id_type=SWOIdTypes.DIMENSION,
    #                         is_bool_dim=True,
    #                         category_name="Duty",
    #                     ),
    #                 ],
    #             ),
    #         ],
    #         text="",
    #         hard=True,
    #         priority="medium",
    #         active=True,
    #         missing_attributes=[],
    #     ),
    #     ConstraintSeq(
    #         id="",
    #         constraint_type=ConstraintType.SEQ,
    #         operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
    #         target_value=2,
    #         target_unit="",
    #         constraint_variables=[],
    #         active=True,
    #         hard=True,
    #         priority="medium",
    #         schedule_id="sch0",
    #         constraint_build_id="",
    #     ),
    # ),
    # Boolean property workers, boolean property shifts
    # "text": "60+ should work at most 2 consecutive not intense.",
    (
        ConstraintBuildAugmented(
            id="c_seq_4",
            team_id="t0",
            constraint_type=ConstraintType.SEQ,
            template_id="0",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name=True,
                            id="dim2",
                            id_type=SWOIdTypes.DIMENSION,
                            is_bool_dim=True,
                            category_name="60+",
                        ),
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="should work",
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
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    value="consecutive",
                ),
                Block(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name=False,
                            id="dim3",
                            id_type=SWOIdTypes.DIMENSION,
                            is_bool_dim=True,
                            category_name="intense",
                        ),
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        ConstraintSeq(
            id="c_seq_4",
            constraint_type=ConstraintType.SEQ,
            operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
            target_value=2,
            target_unit="",
            constraint_variables=[
                [(w_id, d.isoformat(), s_id) for d in dates_campaign]
                for w_id in worker_ids[:3]
                for s_id in shift_work_ids[2:5]
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.seq.hard,
            schedule_id="sch0",
            constraint_build_id="c_seq_4",
        ),
    ),
    # Non boolean property worker, non boolean property shift
    # "text": "Surgeon should work at most 2 consecutive unit 1.",
    # (
    #     ConstraintBuildAugmented(
    #         id="",
    #         team_id="0",
    #         constraint_type=ConstraintType.SEQ,
    #         template_id="0",
    #         language="en",
    #         blocks=[
    #             Block(
    #                 name=BlockNameOptions.WORKER,
    #                 type=BlockTypeOptions.SHIFT_WORKER_OPTION,
    #                 value=[
    #                     ShiftWorkerOption(
    #                         name="surgeon",
    #                         id="specialty_id",
    #                         id_type=SWOIdTypes.DIMENSION,
    #                         is_bool_dim=False,
    #                         category_name="Specialty",
    #                     ),
    #                 ],
    #             ),
    #             Block(
    #                 name=BlockNameOptions.TEXT,
    #                 type=BlockTypeOptions.STRING,
    #                 value="should work",
    #             ),
    #             Block(
    #                 name=BlockNameOptions.OPERATOR,
    #                 type=BlockTypeOptions.STRING,
    #                 value="at most",
    #             ),
    #             Block(
    #                 name=BlockNameOptions.NUMBER,
    #                 type=BlockTypeOptions.NUMBER,
    #                 value=2,
    #             ),
    #             Block(
    #                 name=BlockNameOptions.TIMING,
    #                 type=BlockTypeOptions.STRING,
    #                 value="consecutive",
    #             ),
    #             Block(
    #                 name=BlockNameOptions.SHIFT,
    #                 type=BlockTypeOptions.SHIFT_WORKER_OPTION,
    #                 value=[
    #                     ShiftWorkerOption(
    #                         name="unit 1",
    #                         id="unit_id",
    #                         id_type=SWOIdTypes.DIMENSION,
    #                         is_bool_dim=False,
    #                         category_name="Units",
    #                     )
    #                 ],
    #             ),
    #         ],
    #         text="",
    #         hard=True,
    #         priority="medium",
    #         active=True,
    #         missing_attributes=[],
    #     ),
    #     ConstraintSeq(
    #         id="",
    #         constraint_type=ConstraintType.SEQ,
    #         operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
    #         target_value=2,
    #         target_unit="",
    #         constraint_variables=[],
    #         active=True,
    #         hard=True,
    #         priority="medium",
    #         schedule_id="test_schedule",
    #         constraint_build_id="",
    #     ),
    # ),
    # Sum
    # "text": "John should work at least 3 Morning Shift per week.",
    (
        ConstraintBuildAugmented(
            id="c_sum_0",
            team_id="t0",
            constraint_type=ConstraintType.SUM,
            template_id="1",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="w0",
                            id_type=SWOIdTypes.WORKER,
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="should work",
                ),
                Block(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    value="at least",
                ),
                Block(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    value=3,
                ),
                Block(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
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
        ),
        ConstraintSum(
            id="c_sum_0",
            constraint_type=ConstraintType.SUM,
            operator=ConstraintOperator.GREATER_THAN_OR_EQUAL,
            target_value=3,
            target_unit="",
            constraint_variables=[
                [("w0", d.isoformat(), "s0") for d in week] for week in periods_weekly
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.sum.hard,
            schedule_id="sch0",
            constraint_build_id="c_sum_0",
        ),
    ),
    # "text": "John should work at most 1 Morning Shift per week.",
    (
        ConstraintBuildAugmented(
            id="c_sum_1",
            team_id="t0",
            constraint_type=ConstraintType.SUM,
            template_id="1",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="w0",
                            id_type=SWOIdTypes.WORKER,
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="should work",
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
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
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
        ),
        ConstraintSum(
            id="c_sum_1",
            constraint_type=ConstraintType.SUM,
            operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
            target_value=1,
            target_unit="",
            constraint_variables=[
                [("w0", d.isoformat(), "s0") for d in week] for week in periods_weekly
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.sum.hard,
            schedule_id="sch0",
            constraint_build_id="c_sum_1",
        ),
    ),
    # "text": "John should work exactly 2 Morning Shift per week.",
    (
        ConstraintBuildAugmented(
            id="c_sum_2",
            team_id="t0",
            constraint_type=ConstraintType.SUM,
            template_id="1",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="w0",
                            id_type=SWOIdTypes.WORKER,
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="should work",
                ),
                Block(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    value="exactly",
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
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
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
        ),
        ConstraintSum(
            id="c_sum_2",
            constraint_type=ConstraintType.SUM,
            operator=ConstraintOperator.EQUAL,
            target_value=2,
            target_unit="",
            constraint_variables=[
                [("w0", d.isoformat(), "s0") for d in week] for week in periods_weekly
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.sum.hard,
            schedule_id="sch0",
            constraint_build_id="c_sum_2",
        ),
    ),
    # Order
    # "text": "No Morning Shift 1 day after Night Shift for john.",
    (
        ConstraintBuildAugmented(
            id="c_ord_0",
            team_id="t0",
            constraint_type=ConstraintType.ORD,
            template_id="2",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    value="no",
                ),
                Block(
                    name=BlockNameOptions.SHIFT_REFERENCE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
                Block(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    value=1,
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="day",
                ),
                Block(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    value="after",
                ),
                Block(
                    name=BlockNameOptions.SHIFT_RELATIVE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Night Shift",
                            id="s2",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="for",
                ),
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="w0",
                            id_type=SWOIdTypes.WORKER,
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        ConstraintOrd(
            id="c_ord_0",
            constraint_type=ConstraintType.ORD,
            operator=ConstraintOperator.NO,
            target_value=0,
            target_unit="",
            shift_reference_ids=["s0"],
            shift_relative_ids=["s2"],
            interval=1,
            constraint_variables=[
                (
                    ("w0", d.isoformat(), "s0"),
                    ("w0", (d + timedelta(days=1)).isoformat(), "s2"),
                )
                for d in dates_campaign[:-1]
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.ord.hard,
            schedule_id="sch0",
            constraint_build_id="c_ord_0",
        ),
    ),
    # "text": "If Morning Shift then Night Shift 1 day after for john.",
    (
        ConstraintBuildAugmented(
            id="c_ord_1",
            team_id="t0",
            constraint_type=ConstraintType.ORD,
            template_id="3",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="if",
                ),
                Block(
                    name=BlockNameOptions.SHIFT_REFERENCE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="then",
                ),
                Block(
                    name=BlockNameOptions.SHIFT_RELATIVE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Night Shift",
                            id="s2",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
                    ],
                ),
                Block(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    value=1,
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="day",
                ),
                Block(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    value="after",
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="for",
                ),
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="w0",
                            id_type=SWOIdTypes.WORKER,
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        ConstraintOrd(
            id="c_ord_1",
            constraint_type=ConstraintType.ORD,
            operator=ConstraintOperator.YES,
            target_value=0,
            target_unit="",
            shift_reference_ids=["s0"],
            shift_relative_ids=["s2"],
            interval=1,
            constraint_variables=[
                (
                    ("w0", d.isoformat(), "s0"),
                    ("w0", (d + timedelta(days=1)).isoformat(), "s2"),
                )
                for d in dates_campaign[:-1]
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.ord.hard,
            schedule_id="sch0",
            constraint_build_id="c_ord_1",
        ),
    ),
    # "text": "If Morning Shift on tuesday then Afternoon Shift 2 day after for john.",
    (
        ConstraintBuildAugmented(
            id="c_ord_2",
            team_id="t0",
            constraint_type=ConstraintType.ORD,
            template_id="4",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="if",
                ),
                Block(
                    name=BlockNameOptions.SHIFT_REFERENCE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="on",
                ),
                Block(
                    name=BlockNameOptions.WEEKDAY,
                    type=BlockTypeOptions.STRING,
                    value="tuesday",
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="then",
                ),
                Block(
                    name=BlockNameOptions.SHIFT_RELATIVE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Afternoon Shift",
                            id="s1",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
                    ],
                ),
                Block(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    value=2,
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="day",
                ),
                Block(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    value="after",
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="for",
                ),
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="w0",
                            id_type=SWOIdTypes.WORKER,
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        ConstraintOrd(
            id="c_ord_2",
            constraint_type=ConstraintType.ORD,
            operator=ConstraintOperator.YES,
            target_value=0,
            target_unit="",
            shift_reference_ids=["s0"],
            shift_relative_ids=["s1"],
            interval=2,
            constraint_variables=[
                (
                    ("w0", d.isoformat(), "s0"),
                    ("w0", (d + timedelta(days=2)).isoformat(), "s1"),
                )
                for d in dates_campaign[:-2]
                if d.weekday() == 1
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.ord.hard,
            schedule_id="sch0",
            constraint_build_id="c_ord_2",
        ),
    ),
    # "text": "If Shift Morning on monday then Afternoon Shift 3 day before
    # for john.",
    (
        ConstraintBuildAugmented(
            id="c_ord_3",
            team_id="t0",
            constraint_type=ConstraintType.ORD,
            template_id="4",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="if",
                ),
                Block(
                    name=BlockNameOptions.SHIFT_REFERENCE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="on",
                ),
                Block(
                    name=BlockNameOptions.WEEKDAY,
                    type=BlockTypeOptions.STRING,
                    value="monday",
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="then",
                ),
                Block(
                    name=BlockNameOptions.SHIFT_RELATIVE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Afternoon Shift",
                            id="s1",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        )
                    ],
                ),
                Block(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    value=3,
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="day",
                ),
                Block(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    value="before",
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="for",
                ),
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="w0",
                            id_type=SWOIdTypes.WORKER,
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        ConstraintOrd(
            id="c_ord_3",
            constraint_type=ConstraintType.ORD,
            operator=ConstraintOperator.YES,
            target_value=0,
            target_unit="",
            shift_reference_ids=["s0"],
            shift_relative_ids=["s1"],
            interval=-3,
            constraint_variables=[
                (
                    ("w0", d.isoformat(), "s0"),
                    ("w0", (d - timedelta(days=3)).isoformat(), "s1"),
                )
                for d in dates_campaign[3:]
                if d.weekday() == 0
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.ord.hard,
            schedule_id="sch0",
            constraint_build_id="c_ord_3",
        ),
    ),
    # Filter
    # "text": "John should only work Morning Shift.",
    (
        ConstraintBuildAugmented(
            id="c_fil_0",
            team_id="t0",
            constraint_type=ConstraintType.FIL,
            template_id="5",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="John",
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
                    value="should only",
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="work",
                ),
                Block(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        ConstraintFil(
            id="c_fil_0",
            constraint_type=ConstraintType.FIL,
            operator=ConstraintOperator.YES,
            target_value=0,
            target_unit="",
            constraint_variables=[
                ("w0", d.isoformat(), s_id)
                for d in dates_campaign
                for s_id in shift_work_ids
                if s_id != "s0"
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.fil.hard,
            schedule_id="sch0",
            constraint_build_id="c_fil_0",
        ),
    ),
    # "text": "John should not work Morning Shift.",
    (
        ConstraintBuildAugmented(
            id="c_fil_1",
            team_id="0",
            constraint_type=ConstraintType.FIL,
            template_id="5",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="John",
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
                    value="should not",
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="work",
                ),
                Block(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        ConstraintFil(
            id="c_fil_1",
            constraint_type=ConstraintType.FIL,
            operator=ConstraintOperator.NO,
            target_value=0,
            target_unit="",
            constraint_variables=[("w0", d.isoformat(), "s0") for d in dates_campaign],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.fil.hard,
            schedule_id="sch0",
            constraint_build_id="c_fil_1",
        ),
    ),
    # Evenness
    # "text": "Morning Shift on sunday should be evenly spread in time for John.",
    (
        ConstraintBuildAugmented(
            id="c_eve_0",
            team_id="t0",
            constraint_type=ConstraintType.EVE,
            template_id="6",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="on",
                ),
                Block(
                    name=BlockNameOptions.WEEKDAY,
                    type=BlockTypeOptions.STRING,
                    value="sunday",
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="should be evenly spread in time for",
                ),
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="John",
                            id="w0",
                            id_type=SWOIdTypes.WORKER,
                            is_bool_dim=False,
                            category_name="Workers",
                        )
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        ConstraintSum(
            id="c_eve_0",
            constraint_type=ConstraintType.SUM,
            operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
            target_value=1,
            target_unit="day",
            constraint_variables=[
                [("w0", d.isoformat(), "s0") for d in dates_campaign]
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.eve.hard,
            schedule_id="sch0",
            constraint_build_id="c_eve_0",
        ),
    ),
    # Fairness
    # "text": "Morning Shift on sunday should be fairly spread across all workers.",
    (
        ConstraintBuildAugmented(
            id="c_fai_0",
            team_id="0",
            constraint_type=ConstraintType.FAI,
            template_id="7",
            language="en",
            blocks=[
                Block(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Morning Shift",
                            id="s0",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="on",
                ),
                Block(
                    name=BlockNameOptions.WEEKDAY,
                    type=BlockTypeOptions.STRING,
                    value="sunday",
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="should be fairly spread across",
                ),
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="all workers",
                            id="",
                            id_type=SWOIdTypes.NONE,
                            is_bool_dim=False,
                            category_name="All",
                        ),
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        ),
        ConstraintFai(
            id="c_fai_0",
            constraint_type=ConstraintType.FAI,
            operator=None,
            target_value=0,
            target_unit="",
            constraint_variables=[
                [
                    (w_id, d.isoformat(), "s0")
                    for d in dates_campaign
                    if d.weekday() == 6
                ]
                for w_id in worker_ids
            ],
            active=True,
            hard=True,
            priority="medium",
            penalty=penalties.user_constraint.fai.hard,
            schedule_id="sch0",
            constraint_build_id="c_fai_0",
        ),
    ),
]


def generate_test_name(
    val: Tuple[
        ConstraintBuildAugmented,
        ConstraintFai | ConstraintFil | ConstraintOrd | ConstraintSeq | ConstraintSum,
    ],
):
    constraint, _ = val
    return constraint.id


@pytest.fixture(params=test_data)
def constraint_with_expected_output(request):
    return request.param


@pytest.fixture(
    params=[td for td in test_data if td[0].constraint_type == ConstraintType.SUM]
)
def constraint_sum_with_expected_output(request):
    return request.param


@pytest.fixture(
    params=[td for td in test_data if td[0].constraint_type == ConstraintType.SEQ]
)
def constraint_seq_with_expected_output(request):
    return request.param


@pytest.fixture(
    params=[td for td in test_data if td[0].constraint_type == ConstraintType.ORD]
)
def constraint_ord_with_expected_output(request):
    return request.param


@pytest.fixture(
    params=[td for td in test_data if td[0].constraint_type == ConstraintType.FIL]
)
def constraint_fil_with_expected_output(request):
    return request.param


@pytest.fixture
def run_engine_solve_from_engine_inputs() -> Callable[[EngineInputsAugmented], Outputs]:
    def _run_engine_solve_from_engine_inputs(
        engine_inputs: EngineInputsAugmented,
    ) -> Outputs:
        inputs_engine, _ = core_to_engine_inputs(engine_inputs)
        engine = Engine()
        return engine.solve(inputs_engine)

    return _run_engine_solve_from_engine_inputs


@pytest.fixture
def run_core_to_engine_inputs() -> (
    Callable[[EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]]
):
    def _run_core_to_engine_inputs(
        engine_inputs: EngineInputsAugmented,
    ) -> Tuple[InputsEngine, ProcessingCache]:
        return core_to_engine_inputs(engine_inputs)

    return _run_core_to_engine_inputs


@pytest.fixture
def run_engine_solve() -> Callable[[InputsEngine], Outputs]:
    def _run_engine_solve(inputs_engine: InputsEngine) -> Outputs:
        engine = Engine()
        return engine.solve(inputs_engine)

    return _run_engine_solve


@pytest.fixture
def sample_data_benoit_case_fixture(
    penalties_fix: Penalties, model_config_fix: ModelConfig
) -> EngineInputsAugmented:
    ei_dict = load_json_from_file("test_data/250521_benoit_case.json")
    engine_inputs = EngineInputs.from_dict(ei_dict)

    model_config_copy = deepcopy(model_config_fix)

    model_config_copy.system_constraints.weekly_target_work_time = True
    model_config_copy.system_constraints.weekly_target_worktime_tolerance = 0.2
    model_config_copy.system_constraints.monthly_target_nb_duties = True
    model_config_copy.system_constraints.mthly_target_nb_duty_tolerance = 0.2
    model_config_copy.system_constraints.special_days_target_nb_duties = True

    return engine_inputs_to_engine_inputs_augmented(
        engine_inputs, penalties_fix, model_config_copy
    )
