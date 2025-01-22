from datetime import date, datetime, timedelta
from typing import List

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


# pylint: disable=R0801
# Schedule
@pytest.fixture
def schedule() -> Schedule:
    return Schedule(
        id="sch0",
        team_id="t0",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        solve_details=None,
        solve_status=ScheduleSolveStatus.NOT_SOLVED,
        status=ScheduleStatus.CAMPAIGN,
        missing_coverage_dates=[],
        constraint_build_ids=[],
        quick_staffings=[],
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
def dimensions_location() -> List[Dimension]:
    return [
        Dimension(
            id="dim0",
            team_id="t0",
            dim_types=[DimensionType.WORKER],
            name="location",
            entry_type=DimensionEntryType.DIM_ENTRIES,
            deleted=False,
        )
    ]


# DimEntries
# pylint: disable=redefined-outer-name
@pytest.fixture
def dim_entries_dim_location_2loc(
    dimensions_location: List[Dimension],  # noqa: F811
) -> List[DimEntry]:
    locations = ["loc0", "loc1"]
    return [
        DimEntry(id="de0", dimension_id=dim.id, name=loc, deleted=False)
        for loc in locations
        for dim in dimensions_location
    ]


# Attributes
@pytest.fixture
def attributes_w10_dim_location(
    workers_10: List[Worker],  # noqa: F811
    dimensions_location: List[Dimension],  # noqa: F811
    dim_entries_dim_location_2loc: List[DimEntry],  # noqa: F811
) -> List[Attribute]:
    return [
        Attribute(
            id=f"a{i}",
            value="",
            owner_type=AttributeOwnerType.WORKER,
            owner_id=w.id,
            dimension_id=dimensions_location[0].id,
            dim_entry_ids=[dim_entries_dim_location_2loc[0].id],
        )
        for i, w in enumerate(workers_10[:5])
    ] + [
        Attribute(
            id=f"a{i+5}",
            value="",
            owner_type=AttributeOwnerType.WORKER,
            owner_id=w.id,
            dimension_id=dimensions_location[0].id,
            dim_entry_ids=[dim_entries_dim_location_2loc[1].id],
        )
        for i, w in enumerate(workers_10[5:])
    ]


# DailyShiftDemands
# pylint: disable=redefined-outer-name
@pytest.fixture
def daily_shift_demands_shifts_3n_2d(
    shifts_3n_2d: List[Shift],  # noqa: F811
    schedule: Schedule,  # noqa: F811
) -> List[DailyShiftDemand]:
    daily_shift_demands = []
    # Create daily shift demands for every weekday for shifts s0 to s2
    for shift in [s for s in shifts_3n_2d if s.shift_type == ShiftType.NORMAL]:
        current_date = schedule.start_date
        while current_date <= schedule.end_date:
            if current_date.weekday() < 5:  # Weekdays only
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

    # Create daily shift demands for every day for shifts s3 and s4
    for shift in [s for s in shifts_3n_2d if s.shift_type == ShiftType.DUTY]:
        current_date = schedule.start_date
        while current_date <= schedule.end_date:
            daily_shift_demands.append(
                DailyShiftDemand(
                    id=f"dsd_{shift.id}_{current_date}",
                    team_id="t0",
                    schedule_id="sch1",
                    shift_demand_id=None,
                    source_type=DSDSourceType.SHIFT_DEMAND,
                    date=current_date,
                    shift_id=shift.id,
                    count=1,
                )
            )
            current_date += timedelta(days=1)

    return daily_shift_demands


# EngineInputs
# pylint: disable=too-many-arguments
@pytest.fixture
def engine_inputs_w10_s5_dim_w_loc(
    schedule,  # noqa: F811
    workers_10: List[Worker],  # noqa: F811
    shifts_3n_2d: List[Shift],  # noqa: F811
    dimensions_location: List[Dimension],  # noqa: F811
    dim_entries_dim_location_2loc: List[DimEntry],  # noqa: F811
    attributes_w10_dim_location: List[Attribute],  # noqa: F811
    daily_shift_demands_shifts_3n_2d: List[DailyShiftDemand],  # noqa: F811
) -> EngineInputs:
    return EngineInputs(
        schedule=schedule,
        workers=workers_10,
        shifts=shifts_3n_2d,
        shifts_recup_new=[],
        link_shifts=[],
        dimensions=dimensions_location,
        dim_entries=dim_entries_dim_location_2loc,
        attributes=attributes_w10_dim_location,
        as_hist=[],
        as_wip_fixed=[],
        cbs_augmented=[],
        daily_shift_demands=daily_shift_demands_shifts_3n_2d,
        requests=[],
        wip_assignments=[],
    )
