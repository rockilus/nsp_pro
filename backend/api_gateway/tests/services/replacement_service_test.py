"""
Tests for ReplacementService.get_replacement_candidates.

This module contains comprehensive tests for the replacement candidate
recommendation system, using reusable base test data fixtures.
"""

from datetime import date, datetime, time, timedelta, timezone
from typing import List, Tuple
from unittest.mock import MagicMock

import pytest

from shared.schemas.core import (
    Assignment,
    AssignmentSource,
    Attribute,
    ConstraintBuild,
    DimEntry,
    Dimension,
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


# ============================================================================
# Helper Functions for Test Data Generation
# ============================================================================


def create_shift_datetime(
    hour: int, minute: int = 0, days_offset: int = 0
) -> datetime:
    """Create a datetime with proper timezone for shift times.

    Args:
        hour: Hour of the day (0-23)
        minute: Minute of the hour (0-59)
        days_offset: Number of days to add (for shifts spanning multiple days)

    Returns:
        A timezone-aware datetime object
    """
    base_date = datetime(2023, 1, 1, hour, minute, tzinfo=timezone.utc)
    return base_date + timedelta(days=days_offset)


def generate_weekdays(start_date: date, end_date: date) -> List[date]:
    """Generate list of weekday dates (Monday-Friday) in range.

    Args:
        start_date: Start date (inclusive)
        end_date: End date (inclusive)

    Returns:
        List of dates that are weekdays
    """
    weekdays = []
    current = start_date
    while current <= end_date:
        if current.weekday() < 5:  # 0-4 are Monday-Friday
            weekdays.append(current)
        current += timedelta(days=1)
    return weekdays


def generate_all_days(start_date: date, end_date: date) -> List[date]:
    """Generate list of all dates in range.

    Args:
        start_date: Start date (inclusive)
        end_date: End date (inclusive)

    Returns:
        List of all dates in range
    """
    all_days = []
    current = start_date
    while current <= end_date:
        all_days.append(current)
        current += timedelta(days=1)
    return all_days


def distribute_assignments_round_robin(
    workers: List[Worker],
    shifts: List[Shift],
    dates: List[date],
    shift_ids: List[str],
    team_id: str,
) -> List[Assignment]:
    """Distribute assignments using round-robin across workers.

    Args:
        workers: List of workers
        shifts: List of all shifts (for validation)
        dates: List of dates to create assignments for
        shift_ids: List of shift IDs to rotate through
        team_id: Team ID

    Returns:
        List of assignments with no overlaps per worker
    """
    assignments = []
    worker_index = 0
    assignment_counter = 0

    for date_obj in dates:
        for shift_id in shift_ids:
            worker = workers[worker_index % len(workers)]
            assignment = Assignment(
                id=f"assignment_{assignment_counter}",
                team_id=team_id,
                schedule_id="schedule_1",
                worker_id=worker.id,
                date=date_obj,
                shift_id=shift_id,
                fixed=False,
                source=AssignmentSource.MANUAL,
            )
            assignments.append(assignment)
            assignment_counter += 1
            worker_index += 1

    return assignments


def generate_duty_assignments(
    workers: List[Worker],
    all_dates: List[date],
    duty_shift_id: str,
    recuperation_shift_id: str,
    team_id: str,
    start_assignment_id: int,
) -> List[Assignment]:
    """Generate daily duty assignments followed by recuperation shifts.

    Each duty is assigned to a different worker, followed by a recuperation
    shift the next day for the same worker.

    Args:
        workers: List of workers
        all_dates: List of all dates (including weekends)
        duty_shift_id: ID of the duty shift
        recuperation_shift_id: ID of the recuperation shift
        team_id: Team ID
        start_assignment_id: Starting ID counter for assignments

    Returns:
        List of duty and recuperation assignments
    """
    assignments = []
    worker_index = 0
    assignment_counter = start_assignment_id

    for date_obj in all_dates:
        worker = workers[worker_index % len(workers)]

        # Duty assignment
        duty_assignment = Assignment(
            id=f"assignment_{assignment_counter}",
            team_id=team_id,
            schedule_id="schedule_1",
            worker_id=worker.id,
            date=date_obj,
            shift_id=duty_shift_id,
            fixed=False,
            source=AssignmentSource.MANUAL,
        )
        assignments.append(duty_assignment)
        assignment_counter += 1

        # Recuperation assignment (next day)
        next_day = date_obj + timedelta(days=1)
        # Only add recuperation if next day is within range
        if next_day <= all_dates[-1]:
            recuperation_assignment = Assignment(
                id=f"assignment_{assignment_counter}",
                team_id=team_id,
                schedule_id="schedule_1",
                worker_id=worker.id,
                date=next_day,
                shift_id=recuperation_shift_id,
                fixed=False,
                source=AssignmentSource.MANUAL,
            )
            assignments.append(recuperation_assignment)
            assignment_counter += 1

        worker_index += 1

    return assignments


# ============================================================================
# Base Test Data Fixtures
# ============================================================================


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
            id=f"worker_{i+1}",
            team_id=base_team_id,
            name=f"Worker {i+1}",
            acronym=f"W{i+1}",
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
def base_assignments(
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> List[Assignment]:
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
    shift_ids_map = {shift.id: shift for shift in base_shifts}
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
        shifts=base_shifts,
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
    base_team_id: str,
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
    mock_collection.worker_db.get_workers_not_deleted.return_value = (
        base_workers
    )

    # Mock shift repository
    mock_collection.shift_db.get_shifts_not_deleted.return_value = base_shifts

    # Mock dimension repository
    mock_collection.dimension_db.get_dimensions.return_value = dimensions

    # Mock dim_entry repository
    mock_collection.dim_entry_db.get_dim_entries_by_dim_ids.return_value = (
        dim_entries
    )

    # Mock attribute repository
    mock_collection.attribute_db.get_attributes_by_owner_ids.return_value = (
        attributes
    )

    # Mock specialty repository
    mock_collection.specialty_db.get_specialties_by_team_id.return_value = (
        specialties
    )

    # Mock constraint repository
    mock_collection.constraint_build_db.get_constraint_builds.return_value = (
        constraints
    )

    # Mock request repository
    mock_collection.request_db.get_requests_by_dates.return_value = requests

    # Create service with mocked collection
    service = ReplacementService(collection=mock_collection)

    return service, mock_collection, base_assignments


# ============================================================================
# Tests
# ============================================================================


# pylint: disable=redefined-outer-name
def test_get_replacement_candidates_returns_candidates(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_team_id: str,
) -> None:
    """Test that get_replacement_candidates returns non-empty results.

    This is a smoke test to verify the basic functionality works with
    the base test data.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Select a target assignment (first weekday morning shift)
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )
    assignment_id = target_assignment.id

    # Mock get_assignments_by_ids to return the target assignment
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Act
    candidates = service.get_replacement_candidates(
        assignment_id=assignment_id,
        team_id=base_team_id,
    )

    # Assert
    assert candidates is not None
    assert len(candidates) > 0
    assert len(candidates) == len(base_workers)

    # Verify all candidates are for different workers
    candidate_worker_ids = [c.worker_id for c in candidates]
    assert len(candidate_worker_ids) == len(set(candidate_worker_ids))

    # Verify repository methods were called
    mock_collection.assignment_db.get_assignments_by_ids.assert_called_once()
    mock_collection.worker_db.get_workers_not_deleted.assert_called_once_with(
        team_id=base_team_id
    )
    mock_collection.shift_db.get_shifts_not_deleted.assert_called_once_with(
        team_id=base_team_id
    )


def test_get_replacement_candidates_can_do_worker(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test replacement candidate with CAN_DO category.

    This test verifies that a worker with no conflicts is correctly
    categorized as CAN_DO with rank >= 1, and that all constraint
    checks pass as expected.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Find a target assignment for morning shift
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )
    target_worker_id = target_assignment.worker_id

    # Find the morning shift
    morning_shift = next(s for s in base_shifts if s.id == "shift_morning")

    # Find a worker with no conflicting assignment on that date
    # We need a worker that doesn't have any assignment on the target date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_assignment.date
    }

    # Find first worker without assignment on that date
    test_worker = next(
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    )

    # Mock get_assignments_by_ids to return the target assignment
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Act
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find target worker and test worker candidates
    target_candidate = next(
        c for c in candidates if c.worker_id == target_worker_id
    )
    test_candidate = next(
        c for c in candidates if c.worker_id == test_worker.id
    )

    # Check target worker has rank 0
    assert (
        target_candidate.rank == 0
    ), f"Target worker should have rank 0, got {target_candidate.rank}"

    # Check test worker category
    assert test_candidate.replacement_category.value == "can_do", (
        f"Test worker should have CAN_DO category, "
        f"got {test_candidate.replacement_category.value}"
    )

    # Check all constraints pass for test worker
    implications = test_candidate.replacement_implications

    assert implications.is_employed is True, "Test worker should be employed"
    assert (
        implications.has_specialty is True
    ), "Test worker should have specialty (or none required)"
    assert (
        implications.isnt_on_leave is True
    ), "Test worker should not be on leave"
    assert (
        implications.filter_hits.isnt_filtered_out is True
    ), "Test worker should not be filtered out"
    assert (
        implications.overlap_hits.hasnt_overlap is True
    ), "Test worker should not have overlapping assignments"
    assert (
        implications.hard_constraint_hits.meets_constraints is True
    ), "Test worker should meet all hard constraints"
    assert (
        implications.request_hits.has_no_request_conflict is True
    ), "Test worker should have no request conflicts"
    assert (
        implications.soft_constraint_hits.meets_constraints is True
    ), "Test worker should meet all soft constraints"

    # Check monthly duties implications
    # The morning shift is NORMAL, not DUTY type, so adding it doesn't
    # change the duty count. However, the delta might be negative if the
    # test worker has existing duties in their current assignments
    # We verify the structure is correct and values are computed
    assert isinstance(
        implications.new_monthly_duties.new_number_monthly_duties, int
    ), "new_number_monthly_duties should be an integer"
    assert isinstance(
        implications.new_monthly_duties.new_monthly_duties_delta, int
    ), "new_monthly_duties_delta should be an integer"
    assert isinstance(
        implications.new_monthly_duties.meets_target, bool
    ), "meets_target should be a boolean"

    # Check weekly time implications
    # The test worker might have existing assignments in the week,
    # so we verify the structure and that values are computed
    assert isinstance(
        implications.new_weekly_time.new_weekly_worked_minutes, int
    ), "new_weekly_worked_minutes should be an integer"
    assert (
        implications.new_weekly_time.new_weekly_worked_minutes >= 0
    ), "new_weekly_worked_minutes should be non-negative"
    assert isinstance(
        implications.new_weekly_time.new_weekly_time_delta_minutes, int
    ), "new_weekly_time_delta_minutes should be an integer"
    assert isinstance(
        implications.new_weekly_time.meets_target, bool
    ), "meets_target should be a boolean"

    # Check LTM indicators
    # Verify that the count and last_date are properly computed
    assert isinstance(
        implications.nb_times_did_shift_ltm.count, int
    ), "nb_times_did_shift_ltm count should be an integer"
    assert (
        implications.nb_times_did_shift_ltm.count >= 0
    ), "nb_times_did_shift_ltm count should be non-negative"

    assert isinstance(
        implications.nb_times_worked_weekday_ltm.count, int
    ), "nb_times_worked_weekday_ltm count should be an integer"
    assert (
        implications.nb_times_worked_weekday_ltm.count >= 0
    ), "nb_times_worked_weekday_ltm count should be non-negative"

    # Check test worker rank
    assert (
        test_candidate.rank >= 1
    ), f"Test worker rank should be >= 1, got {test_candidate.rank}"

    # Check that CAN_DO workers rank better than COULD_DO or CANT_DO
    # (excluding the current worker who has rank 0 regardless of category)
    could_do_candidates = [
        c
        for c in candidates
        if c.replacement_category.value == "could_do" and c.rank > 0
    ]
    cant_do_candidates = [
        c
        for c in candidates
        if c.replacement_category.value == "cant_do" and c.rank > 0
    ]

    for could_do in could_do_candidates:
        assert test_candidate.rank < could_do.rank, (
            f"CAN_DO worker (rank {test_candidate.rank}) should have "
            f"better rank than COULD_DO worker (rank {could_do.rank})"
        )

    for cant_do in cant_do_candidates:
        assert test_candidate.rank < cant_do.rank, (
            f"CAN_DO worker (rank {test_candidate.rank}) should have "
            f"better rank than CANT_DO worker (rank {cant_do.rank})"
        )


def test_get_replacement_candidates_could_do_worker_exceeds_weekly_time(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test replacement candidate with COULD_DO category due to weekly time.

    This test verifies that a worker who would exceed their weekly hours
    target is correctly categorized as COULD_DO with appropriate ranking.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Find a target assignment for morning shift
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )
    target_worker_id = target_assignment.worker_id

    # Find the morning shift
    morning_shift = next(s for s in base_shifts if s.id == "shift_morning")
    morning_duration_minutes = 4 * 60  # 8am-12pm = 4 hours = 240 minutes

    # Find a worker with no conflicting assignment on that date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_assignment.date
    }
    test_worker = next(
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    )

    # Calculate the current work time for test worker in the target week
    # Find the start of the week (Monday) containing the target assignment
    target_date = target_assignment.date
    days_since_monday = target_date.weekday()  # Monday is 0
    week_start = target_date - timedelta(days=days_since_monday)
    week_end = week_start + timedelta(days=6)  # Sunday

    # Calculate current weekly work time for test worker
    shift_by_id = {s.id: s for s in base_shifts}
    current_weekly_minutes = 0
    for assignment in assignments:
        if (
            assignment.worker_id == test_worker.id
            and week_start <= assignment.date <= week_end
        ):
            shift = shift_by_id.get(assignment.shift_id)
            if shift:
                # Calculate shift duration
                shift_duration = shift.end_time - shift.start_time
                shift_minutes = int(shift_duration.total_seconds() / 60)
                current_weekly_minutes += shift_minutes

    # Set worker's weekly_hours to max(0, current_weekly_time - 1 hour)
    # so that adding the morning shift would exceed the target
    target_weekly_minutes = max(0, current_weekly_minutes - 60)
    target_weekly_hours = target_weekly_minutes // 60

    # Modify the test worker's weekly_hours
    modified_test_worker = Worker(
        id=test_worker.id,
        team_id=test_worker.team_id,
        name=test_worker.name,
        acronym=test_worker.acronym,
        acronym_custom=test_worker.acronym_custom,
        employment_start_date=test_worker.employment_start_date,
        employment_end_date=test_worker.employment_end_date,
        weekly_hours=target_weekly_hours,
        weekly_hours_desired=target_weekly_hours,
        duties_per_month=test_worker.duties_per_month,
        annual_leave=test_worker.annual_leave,
        specialty_ids=test_worker.specialty_ids,
        deleted=test_worker.deleted,
        user_id=test_worker.user_id,
    )

    # Replace the test worker in the workers list
    modified_workers = [
        modified_test_worker if w.id == test_worker.id else w
        for w in base_workers
    ]

    # Update the mock to return modified workers
    mock_collection.worker_db.get_workers_not_deleted.return_value = (
        modified_workers
    )

    # Mock get_assignments_by_ids to return the target assignment
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Act
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find target worker and test worker candidates
    target_candidate = next(
        c for c in candidates if c.worker_id == target_worker_id
    )
    test_candidate = next(
        c for c in candidates if c.worker_id == test_worker.id
    )

    # Check target worker has rank 0
    assert (
        target_candidate.rank == 0
    ), f"Target worker should have rank 0, got {target_candidate.rank}"

    # Check test worker category
    assert test_candidate.replacement_category.value == "could_do", (
        f"Test worker should have COULD_DO category, "
        f"got {test_candidate.replacement_category.value}"
    )

    # Check all constraints pass for test worker
    implications = test_candidate.replacement_implications

    assert implications.is_employed is True, "Test worker should be employed"
    assert (
        implications.has_specialty is True
    ), "Test worker should have specialty (or none required)"
    assert (
        implications.isnt_on_leave is True
    ), "Test worker should not be on leave"
    assert (
        implications.filter_hits.isnt_filtered_out is True
    ), "Test worker should not be filtered out"
    assert (
        implications.overlap_hits.hasnt_overlap is True
    ), "Test worker should not have overlapping assignments"
    assert (
        implications.hard_constraint_hits.meets_constraints is True
    ), "Test worker should meet all hard constraints"
    assert (
        implications.request_hits.has_no_request_conflict is True
    ), "Test worker should have no request conflicts"
    assert (
        implications.soft_constraint_hits.meets_constraints is True
    ), "Test worker should meet all soft constraints"

    # Check weekly time implications
    # The worker should exceed their weekly hours target
    expected_new_weekly_minutes = (
        current_weekly_minutes + morning_duration_minutes
    )
    assert (
        implications.new_weekly_time.new_weekly_worked_minutes
        == expected_new_weekly_minutes
    ), (
        f"new_weekly_worked_minutes should be {expected_new_weekly_minutes}, "
        f"got {implications.new_weekly_time.new_weekly_worked_minutes}"
    )

    expected_delta = expected_new_weekly_minutes - target_weekly_minutes
    assert (
        implications.new_weekly_time.new_weekly_time_delta_minutes
        == expected_delta
    ), (
        f"new_weekly_time_delta_minutes should be {expected_delta}, "
        f"got {implications.new_weekly_time.new_weekly_time_delta_minutes}"
    )

    assert (
        implications.new_weekly_time.meets_target is False
    ), "meets_target should be False since worker exceeds weekly hours"

    # Check monthly duties implications (should be properly computed)
    assert isinstance(
        implications.new_monthly_duties.new_number_monthly_duties, int
    ), "new_number_monthly_duties should be an integer"
    assert isinstance(
        implications.new_monthly_duties.new_monthly_duties_delta, int
    ), "new_monthly_duties_delta should be an integer"
    assert isinstance(
        implications.new_monthly_duties.meets_target, bool
    ), "meets_target should be a boolean"

    # Check LTM indicators
    assert isinstance(
        implications.nb_times_did_shift_ltm.count, int
    ), "nb_times_did_shift_ltm count should be an integer"
    assert (
        implications.nb_times_did_shift_ltm.count >= 0
    ), "nb_times_did_shift_ltm count should be non-negative"

    assert isinstance(
        implications.nb_times_worked_weekday_ltm.count, int
    ), "nb_times_worked_weekday_ltm count should be an integer"
    assert (
        implications.nb_times_worked_weekday_ltm.count >= 0
    ), "nb_times_worked_weekday_ltm count should be non-negative"

    # Check test worker rank
    assert (
        test_candidate.rank >= 1
    ), f"Test worker rank should be >= 1, got {test_candidate.rank}"

    # Check that COULD_DO workers rank between CAN_DO and CANT_DO
    # (excluding the current worker who has rank 0 regardless of category)
    can_do_candidates = [
        c
        for c in candidates
        if c.replacement_category.value == "can_do" and c.rank > 0
    ]
    cant_do_candidates = [
        c
        for c in candidates
        if c.replacement_category.value == "cant_do" and c.rank > 0
    ]

    # COULD_DO should rank worse than CAN_DO
    for can_do in can_do_candidates:
        assert test_candidate.rank > can_do.rank, (
            f"COULD_DO worker (rank {test_candidate.rank}) should have "
            f"worse rank than CAN_DO worker (rank {can_do.rank})"
        )

    # COULD_DO should rank better than CANT_DO
    for cant_do in cant_do_candidates:
        assert test_candidate.rank < cant_do.rank, (
            f"COULD_DO worker (rank {test_candidate.rank}) should have "
            f"better rank than CANT_DO worker (rank {cant_do.rank})"
        )
