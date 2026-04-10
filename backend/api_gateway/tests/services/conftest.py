"""
Shared pytest fixtures for replacement service tests.

This module contains fixtures used by both replacement_service_test.py
and swap_validation_test.py to avoid duplication.
"""

from datetime import date
from typing import List, Tuple
from unittest.mock import MagicMock

import pytest
from shared.schemas.core import (
    Assignment,
    Attribute,
    ConstraintBuild,
    Dimension,
    DimEntry,
    Request,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Specialty,
    Staffing,
    Worker,
)

from src.services.replacement_service import ReplacementService
from tests.services.test_helpers import (
    create_shift_datetime,
    distribute_assignments_round_robin,
    generate_all_days,
    generate_duty_assignments,
    generate_weekdays,
)

# ============================================================================
# Base Test Data Fixtures
# ============================================================================


# pylint: disable=redefined-outer-name, R0801
@pytest.fixture
def base_team_id() -> str:
    """Return the base team ID for all tests."""
    return "team_1"


@pytest.fixture
def base_workers(base_team_id: str) -> List[Worker]:
    """Generate 30 workers with standard properties.

    All workers have:
    - Employment start: Jan 1, 2025
    - No employment end date
    - Weekly hours: 40
    - Weekly hours desired: 40
    - Duties per month: 4
    - Annual leave: 0 (for simplicity)
    - No specialties
    - Not deleted

    Returns:
        List of 30 Worker objects
    """
    workers = []
    for i in range(30):
        worker = Worker(
            id=f"worker_{i + 1}",
            team_id=base_team_id,
            name=f"Worker {i + 1}",
            acronym=f"W{i + 1}",
            acronym_custom=False,
            employment_start_date=date(2025, 1, 1),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=4,
            annual_leave=0,
            specialty_ids=[],
            deleted=False,
            user_id=None,
        )
        workers.append(worker)
    return workers


@pytest.fixture
def base_shifts(base_team_id: str) -> List[Shift]:
    """Generate 6 shifts: morning, afternoon, night, duty, recuperation, leave.

    Shifts:
    - Morning: 8am-12pm
    - Afternoon: 2pm-6pm
    - Night: 8pm-12am
    - Duty: 8am-8am next day (24 hours)
    - Recuperation: 8am-8am next day (24 hours, rest type)
    - Leave: 12am-12am next day (24 hours, leave type)

    Returns:
        List of 6 Shift objects
    """
    shifts = [
        Shift(
            id="shift_morning",
            team_id=base_team_id,
            name="Morning",
            acronym="M",
            acronym_custom=False,
            start_time=create_shift_datetime(8, 0),
            end_time=create_shift_datetime(12, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="#FFD700",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="shift_afternoon",
            team_id=base_team_id,
            name="Afternoon",
            acronym="A",
            acronym_custom=False,
            start_time=create_shift_datetime(14, 0),
            end_time=create_shift_datetime(18, 0),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="#87CEEB",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="shift_night",
            team_id=base_team_id,
            name="Night",
            acronym="N",
            acronym_custom=False,
            start_time=create_shift_datetime(20, 0),
            end_time=create_shift_datetime(0, 0, days_offset=1),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="#4B0082",
            shift_type=ShiftType.NORMAL,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="shift_duty",
            team_id=base_team_id,
            name="Duty",
            acronym="D",
            acronym_custom=False,
            start_time=create_shift_datetime(8, 0),
            end_time=create_shift_datetime(8, 0, days_offset=1),
            staffing=[Staffing(specialty_id=None, staffing=1)],
            color="#FF4500",
            shift_type=ShiftType.DUTY,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=24,
            recuperation_duty_id="shift_recuperation",
            deleted=False,
        ),
        Shift(
            id="shift_recuperation",
            team_id=base_team_id,
            name="Recuperation",
            acronym="R",
            acronym_custom=False,
            start_time=create_shift_datetime(8, 0),
            end_time=create_shift_datetime(8, 0, days_offset=1),
            staffing=[Staffing(specialty_id=None, staffing=0)],
            color="#90EE90",
            shift_type=ShiftType.REST,
            rest_type=ShiftRestType.RECUPERATION,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
        Shift(
            id="shift_leave",
            team_id=base_team_id,
            name="Leave",
            acronym="L",
            acronym_custom=False,
            start_time=create_shift_datetime(0, 0),
            end_time=create_shift_datetime(0, 0, days_offset=1),
            staffing=[Staffing(specialty_id=None, staffing=0)],
            color="#D3D3D3",
            shift_type=ShiftType.LEAVE,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.VACATION,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        ),
    ]
    return shifts


@pytest.fixture
def base_assignments(base_workers: List[Worker], base_team_id: str) -> List[Assignment]:
    """Generate 2 months of assignments (Jan 1 - Feb 28, 2026).

    Generates:
    - Normal shifts (morning, afternoon, night) on weekdays only
    - Duty shifts every day (including weekends)
    - Recuperation shifts following each duty
    - No leave assignments
    - No overlaps per worker

    Returns:
        List of Assignment objects
    """
    start_date = date(2026, 1, 1)
    end_date = date(2026, 2, 28)

    # Get shift IDs
    morning_id = "shift_morning"
    afternoon_id = "shift_afternoon"
    night_id = "shift_night"
    duty_id = "shift_duty"
    recuperation_id = "shift_recuperation"

    # Generate weekday dates for normal shifts
    weekdays = generate_weekdays(start_date, end_date)

    # Generate all days for duty shifts
    all_days = generate_all_days(start_date, end_date)

    # Generate weekday normal shift assignments (morning, afternoon, night)
    normal_assignments = distribute_assignments_round_robin(
        workers=base_workers,
        dates=weekdays,
        shift_ids=[morning_id, afternoon_id, night_id],
        team_id=base_team_id,
    )

    # Generate duty and recuperation assignments
    duty_assignments = generate_duty_assignments(
        workers=base_workers,
        all_dates=all_days,
        duty_shift_id=duty_id,
        recuperation_shift_id=recuperation_id,
        team_id=base_team_id,
        start_assignment_id=len(normal_assignments),
    )

    return normal_assignments + duty_assignments


@pytest.fixture
def base_empty_data() -> Tuple[
    List[Dimension],
    List[DimEntry],
    List[Attribute],
    List[Specialty],
    List[ConstraintBuild],
    List[Request],
]:
    """Return empty lists for optional test data.

    Returns minimal viable data to avoid constraint evaluation errors.

    Returns:
        Tuple of empty lists: (dimensions, dim_entries, attributes,
        specialties, constraints, requests)
    """
    return ([], [], [], [], [], [])


# ============================================================================
# Mock Service Fixtures
# ============================================================================


@pytest.fixture
def mock_replacement_service(
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_assignments: List[Assignment],
    base_empty_data: Tuple[
        List[Dimension],
        List[DimEntry],
        List[Attribute],
        List[Specialty],
        List[ConstraintBuild],
        List[Request],
    ],
) -> Tuple[ReplacementService, MagicMock, List[Assignment]]:
    """Create ReplacementService with mocked database collections.

    This fixture mocks all database repository methods to return the base
    test data, allowing tests to focus on service logic without database
    dependencies.

    Returns:
        Tuple of (service, mock_collection, assignments) for test use
    """
    dimensions, dim_entries, attributes, specialties, constraints, requests = (
        base_empty_data
    )

    # Create mock collection
    mock_collection = MagicMock()

    # Mock assignment repository
    mock_collection.assignment_db.get_assignments_by_ids.return_value = []
    mock_collection.assignment_db.get_assignments_by_dates.return_value = (
        base_assignments
    )

    # Mock worker repository
    mock_collection.worker_db.get_workers_not_deleted.return_value = base_workers

    # Mock shift repository
    mock_collection.shift_db.get_shifts_not_deleted.return_value = base_shifts

    # Mock dimension repository
    mock_collection.dimension_db.get_dimensions.return_value = dimensions

    # Mock dim_entry repository
    mock_collection.dim_entry_db.get_dim_entries_by_dim_ids.return_value = dim_entries

    # Mock attribute repository
    mock_collection.attribute_db.get_attributes_by_owner_ids.return_value = attributes

    # Mock specialty repository
    mock_collection.specialty_db.get_specialties_by_team_id.return_value = specialties

    # Mock constraint repository
    mock_collection.constraint_build_db.get_constraint_builds.return_value = constraints

    # Mock request repository
    mock_collection.request_db.get_requests_by_dates.return_value = requests

    # Create service with mocked collection
    service = ReplacementService(collection=mock_collection)

    return service, mock_collection, base_assignments
