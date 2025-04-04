import json
import os
from datetime import date, datetime, timedelta
from typing import Dict, List

import pytest
from shared.schemas import (
    Attribute,
    ConstraintBuildAugmented,
    DailyShiftDemand,
    Dimension,
    DimEntry,
    DSDSourceType,
    EngineInputs,
    EngineInputsAugmented,
    Request,
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

from solve_service.model_config import model_config
from solve_service.penalties import penalties

# Test data sample definition:
# Schedule:
#     - start_date: 2025-01-01
#     - end_date: 2025-01-31
# Workers: 10
# Shifts: 7 (3 normal, 2 duty and 2 recuperation)
# Dimensions: 0
# DimEntries: 0
# Attributes: 0
# FixedAssignments: 0
# CbsAugmented: 0
# DailyShiftDemands:
#     - Every weekday for shifts s0 to s2
#     - Every days for shifts s3 and s4
# Requests: 0
# WipAssignments: 0


# pylint: disable=R0801
@pytest.fixture
def sample_data_fixture() -> EngineInputsAugmented:
    schedule = Schedule(
        id="sch0",
        team_id="t0",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        last_modified_dates=datetime(2025, 1, 1, 0, 0),
        last_updated_dsds=None,
        solve_details=None,
        solve_status=ScheduleSolveStatus.NOT_SOLVED,
        status=ScheduleStatus.CAMPAIGN,
        missing_coverage_dates=[],
        constraint_build_ids=[],
        quick_staffings=[],
    )

    workers = [
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

    shifts = [
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

    daily_shift_demands = []
    # Create daily shift demands for every weekday for shifts s0 to s2
    for shift_id in ["s0", "s1", "s2"]:
        current_date = schedule.start_date
        while current_date <= schedule.end_date:
            if current_date.weekday() < 5:  # Weekdays only
                daily_shift_demands.append(
                    DailyShiftDemand(
                        id=f"dsd_{shift_id}_{current_date}",
                        team_id="t0",
                        schedule_id="sch1",
                        shift_demand_id=None,
                        coverage_selector_id=None,  # Added argument
                        source_type=DSDSourceType.SHIFT_DEMAND,
                        date=current_date,
                        shift_id=shift_id,
                        count=1,
                    )
                )
            current_date += timedelta(days=1)

    # Create daily shift demands for every day for shifts s3 and s4
    for shift_id in ["s3", "s4"]:
        current_date = schedule.start_date
        while current_date <= schedule.end_date:
            daily_shift_demands.append(
                DailyShiftDemand(
                    id=f"dsd_{shift_id}_{current_date}",
                    team_id="t0",
                    schedule_id="sch1",
                    shift_demand_id=None,
                    coverage_selector_id=None,  # Added argument
                    source_type=DSDSourceType.SHIFT_DEMAND,
                    date=current_date,
                    shift_id=shift_id,
                    count=1,
                )
            )
            current_date += timedelta(days=1)

    dimensions: List[Dimension] = []
    dim_entries: List[DimEntry] = []
    attributes: List[Attribute] = []
    cbs_augmented: List[ConstraintBuildAugmented] = []
    requests: List[Request] = []

    return EngineInputsAugmented(
        schedule=schedule,
        workers=workers,
        shifts=shifts,
        link_shifts=[],
        dimensions=dimensions,
        dim_entries=dim_entries,
        attributes=attributes,
        as_hist=[],
        as_wip_fixed=[],
        cbs_augmented=cbs_augmented,
        daily_shift_demands=daily_shift_demands,
        requests=requests,
        model_output=None,
        penalties=penalties,
        model_config=model_config,
    )


def sample_data() -> EngineInputsAugmented:
    schedule = Schedule(
        id="sch0",
        team_id="t0",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        last_modified_dates=datetime(2025, 1, 1, 0, 0),
        last_updated_dsds=None,
        solve_details=None,
        solve_status=ScheduleSolveStatus.NOT_SOLVED,
        status=ScheduleStatus.CAMPAIGN,
        missing_coverage_dates=[],
        constraint_build_ids=[],
        quick_staffings=[],
    )

    workers = [
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

    shifts = [
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

    daily_shift_demands = []
    # Create daily shift demands for every weekday for shifts s0 to s2
    for shift_id in ["s0", "s1", "s2"]:
        current_date = schedule.start_date
        while current_date <= schedule.end_date:
            if current_date.weekday() < 5:  # Weekdays only
                daily_shift_demands.append(
                    DailyShiftDemand(
                        id=f"dsd_{shift_id}_{current_date}",
                        team_id="t0",
                        schedule_id="sch1",
                        shift_demand_id=None,
                        coverage_selector_id=None,  # Added argument
                        source_type=DSDSourceType.SHIFT_DEMAND,
                        date=current_date,
                        shift_id=shift_id,
                        count=1,
                    )
                )
            current_date += timedelta(days=1)

    # Create daily shift demands for every day for shifts s3 and s4
    for shift_id in ["s3", "s4"]:
        current_date = schedule.start_date
        while current_date <= schedule.end_date:
            daily_shift_demands.append(
                DailyShiftDemand(
                    id=f"dsd_{shift_id}_{current_date}",
                    team_id="t0",
                    schedule_id="sch1",
                    shift_demand_id=None,
                    coverage_selector_id=None,  # Added argument
                    source_type=DSDSourceType.SHIFT_DEMAND,
                    date=current_date,
                    shift_id=shift_id,
                    count=1,
                )
            )
            current_date += timedelta(days=1)

    dimensions: List[Dimension] = []
    dim_entries: List[DimEntry] = []
    attributes: List[Attribute] = []
    cbs_augmented: List[ConstraintBuildAugmented] = []
    requests: List[Request] = []

    return EngineInputsAugmented(
        schedule=schedule,
        workers=workers,
        shifts=shifts,
        link_shifts=[],
        dimensions=dimensions,
        dim_entries=dim_entries,
        attributes=attributes,
        as_hist=[],
        as_wip_fixed=[],
        cbs_augmented=cbs_augmented,
        daily_shift_demands=daily_shift_demands,
        requests=requests,
        model_output=None,
        penalties=penalties,
        model_config=model_config,
    )


# @pytest.fixture
def sample_data_astrid_case() -> EngineInputsAugmented:
    schedule = Schedule(
        id="sch0",
        team_id="t0",
        start_date=date(2025, 1, 13),
        end_date=date(2025, 2, 16),
        last_modified_dates=datetime(2025, 1, 13, 0, 0),
        last_updated_dsds=None,
        solve_details=None,
        solve_status=ScheduleSolveStatus.NOT_SOLVED,
        status=ScheduleStatus.CAMPAIGN,
        missing_coverage_dates=[],
        constraint_build_ids=[],
        quick_staffings=[],
    )

    workers = [
        Worker(
            id=f"w{i}",
            team_id="t0",
            name=f"Worker {i}",
            acronym=f"W{i}",
            acronym_custom=False,
            employment_start_date=date(2025, 1, 9),
            employment_end_date=None,
            weekly_hours=39,
            weekly_hours_desired=39,
            duties_per_month=10,
            annual_leave=25,
            specialty_ids=[],
            deleted=False,
        )
        for i in range(12)
    ]

    shifts = [
        # Duty shifts
        Shift(
            id="s_d_0",
            team_id="t0",
            name="NG1",
            acronym="D24",
            acronym_custom=False,
            start_time=datetime(2025, 1, 9, 18, 30),
            end_time=datetime(2025, 1, 10, 8, 30),
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
            id="s_d_1",
            team_id="t0",
            name="NG2",
            acronym="D24",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 18, 30),
            end_time=datetime(2025, 1, 2, 0, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="red",
            shift_type=ShiftType.DUTY,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=12,
            recuperation_duty_id=None,
            deleted=False,
        ),
        # Rest shifts
        Shift(
            id="s_rd_0",
            team_id="t0",
            name="Recup NG1",
            acronym="R24",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 8, 30),
            end_time=datetime(2025, 1, 2, 8, 30),
            staffing=[],
            color="yellow",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.RECUPERATION,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id="s_d_0",
            deleted=False,
        ),
        Shift(
            id="s_rd_1",
            team_id="t0",
            name="Recup NG1",
            acronym="R24",
            acronym_custom=False,
            start_time=datetime(2025, 1, 1, 0, 0),
            end_time=datetime(2025, 1, 2, 12, 0),
            staffing=[],
            color="yellow",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.RECUPERATION,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id="s_d_1",
            deleted=False,
        ),
    ]

    daily_shift_demands = []
    # Create daily shift demands for every day for shifts s0
    for shift_id in ["s_d_0", "s_d_1"]:
        current_date = schedule.start_date
        while current_date <= schedule.end_date:
            daily_shift_demands.append(
                DailyShiftDemand(
                    id=f"dsd_{shift_id}_{current_date}",
                    team_id="t0",
                    schedule_id="sch1",
                    shift_demand_id=None,
                    coverage_selector_id=None,  # Added argument
                    source_type=DSDSourceType.SHIFT_DEMAND,
                    date=current_date,
                    shift_id=shift_id,
                    count=1,
                )
            )
            current_date += timedelta(days=1)

    dimensions: List[Dimension] = []
    dim_entries: List[DimEntry] = []
    attributes: List[Attribute] = []
    cbs_augmented: List[ConstraintBuildAugmented] = []
    requests: List[Request] = []

    return EngineInputsAugmented(
        schedule=schedule,
        workers=workers,
        shifts=shifts,
        link_shifts=[],
        dimensions=dimensions,
        dim_entries=dim_entries,
        attributes=attributes,
        as_hist=[],
        as_wip_fixed=[],
        cbs_augmented=cbs_augmented,
        daily_shift_demands=daily_shift_demands,
        requests=requests,
        model_output=None,
        penalties=penalties,
        model_config=model_config,
    )


def load_json_from_file(filename: str) -> Dict:
    current_folder = os.path.dirname(__file__)
    file_path = os.path.join(current_folder, filename)
    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)
    return data


def load_engine_inputs_from_file(filename: str) -> EngineInputsAugmented:
    data_dict = load_json_from_file(filename)
    ei = EngineInputs.from_dict(data_dict)
    return EngineInputsAugmented(
        schedule=ei.schedule,
        workers=ei.workers,
        shifts=ei.shifts,
        link_shifts=ei.link_shifts,
        dimensions=ei.dimensions,
        dim_entries=ei.dim_entries,
        attributes=ei.attributes,
        as_hist=ei.as_hist,
        as_wip_fixed=ei.as_wip_fixed,
        cbs_augmented=ei.cbs_augmented,
        daily_shift_demands=ei.daily_shift_demands,
        requests=ei.requests,
        model_output=ei.model_output,
        penalties=penalties,
        model_config=model_config,
    )


@pytest.fixture
def sample_data_benoit_case_fixture() -> EngineInputsAugmented:
    engine_inputs = load_engine_inputs_from_file("test_data/250324_benoit_case.json")
    # engine_inputs.requests = [
    #     r for r in engine_inputs.requests if r.id != "67893e204c7443695ec41f2b"
    # ]
    return engine_inputs


# pylint: disable=redefined-outer-name
# @pytest.fixture
# def test_data_set(sample_data, sample_data_astrid_case):
#     return [sample_data, sample_data_astrid_case]

test_data_set_0 = [sample_data(), sample_data_astrid_case()]
test_data_set_1 = [sample_data(), sample_data_astrid_case()]
test_data_set_2 = [sample_data(), sample_data_astrid_case()]
test_data_set_3 = [sample_data(), sample_data_astrid_case()]
