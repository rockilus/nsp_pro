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
    AttributeOwnerType,
    Block,
    BlockNameOptions,
    BlockTypeOptions,
    ConstraintBuild,
    ConstraintType,
    DimEntry,
    Dimension,
    DimensionEntryType,
    DimensionType,
    Request,
    RequestStatus,
    RequestType,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    ShiftWorkerOption,
    Specialty,
    Staffing,
    SWOIdTypes,
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
# Assertion Helpers
# ============================================================================


def assert_candidate(
    candidate,
    *,
    expected_category: str = "can_do",
    expected_rank_min: int | None = None,
    expected_rank_max: int | None = None,
    # CAN'T_DO checks (default: all pass)
    is_employed: bool = True,
    has_specialty: bool = True,
    isnt_on_leave: bool = True,
    isnt_filtered_out: bool = True,
    hasnt_overlap: bool = True,
    hard_constraints_met: bool = True,
    no_request_conflict: bool = True,
    # COULD_DO checks (default: all pass)
    soft_constraints_met: bool = True,
    weekly_time_meets_target: bool = True,
    monthly_duties_meets_target: bool = True,
    # Optional specific value assertions
    expected_new_weekly_minutes: int | None = None,
    expected_weekly_time_delta: int | None = None,
    expected_new_monthly_duties: int | None = None,
    expected_monthly_duties_delta: int | None = None,
    expected_ltm_shift_count: int | None = None,
    expected_ltm_weekday_count: int | None = None,
    # Optional ranking validation
    all_candidates: List = None,
) -> None:
    """Assert properties of a replacement candidate with sensible defaults.

    By default, assumes a CAN_DO worker with all constraints passing.
    Only specify parameters where you expect violations or need specific values.

    Args:
        candidate: The ReplacementCandidate to check
        expected_category: Expected category ("can_do", "could_do", "cant_do")
        expected_rank_min: Minimum expected rank (inclusive)
        expected_rank_max: Maximum expected rank (inclusive)
        is_employed: Whether worker should be employed
        has_specialty: Whether worker should have required specialty
        isnt_on_leave: Whether worker should not be on leave
        isnt_filtered_out: Whether worker should not be filtered out
        hasnt_overlap: Whether worker should not have overlapping assignments
        hard_constraints_met: Whether hard constraints should be met
        no_request_conflict: Whether there should be no request conflicts
        soft_constraints_met: Whether soft constraints should be met
        weekly_time_meets_target: Whether weekly time should meet target
        monthly_duties_meets_target: Whether monthly duties should meet target
        expected_new_weekly_minutes: Expected new weekly worked minutes
        expected_weekly_time_delta: Expected weekly time delta in minutes
        expected_new_monthly_duties: Expected new number of monthly duties
        expected_monthly_duties_delta: Expected monthly duties delta
        expected_ltm_shift_count: Expected LTM shift count
        expected_ltm_weekday_count: Expected LTM weekday count
        all_candidates: Optional list of all candidates for ranking validation
    """
    implications = candidate.replacement_implications

    # Check category
    assert candidate.replacement_category.value == expected_category, (
        f"Expected category {expected_category}, "
        f"got {candidate.replacement_category.value}"
    )

    # Check rank range
    if expected_rank_min is not None:
        assert (
            candidate.rank >= expected_rank_min
        ), f"Expected rank >= {expected_rank_min}, got {candidate.rank}"
    if expected_rank_max is not None:
        assert (
            candidate.rank <= expected_rank_max
        ), f"Expected rank <= {expected_rank_max}, got {candidate.rank}"

    # CAN'T_DO checks
    assert (
        implications.is_employed is is_employed
    ), f"Expected is_employed={is_employed}, got {implications.is_employed}"
    assert (
        implications.has_specialty is has_specialty
    ), f"Expected has_specialty={has_specialty}, got {implications.has_specialty}"
    assert (
        implications.isnt_on_leave is isnt_on_leave
    ), f"Expected isnt_on_leave={isnt_on_leave}, got {implications.isnt_on_leave}"
    assert implications.filter_hits.isnt_filtered_out is isnt_filtered_out, (
        f"Expected isnt_filtered_out={isnt_filtered_out}, "
        f"got {implications.filter_hits.isnt_filtered_out}"
    )
    assert implications.overlap_hits.hasnt_overlap is hasnt_overlap, (
        f"Expected hasnt_overlap={hasnt_overlap}, "
        f"got {implications.overlap_hits.hasnt_overlap}"
    )
    assert (
        implications.hard_constraint_hits.meets_constraints
        is hard_constraints_met
    ), (
        f"Expected hard_constraints_met={hard_constraints_met}, "
        f"got {implications.hard_constraint_hits.meets_constraints}"
    )
    assert (
        implications.request_hits.has_no_request_conflict
        is no_request_conflict
    ), (
        f"Expected no_request_conflict={no_request_conflict}, "
        f"got {implications.request_hits.has_no_request_conflict}"
    )

    # COULD_DO checks
    assert (
        implications.soft_constraint_hits.meets_constraints
        is soft_constraints_met
    ), (
        f"Expected soft_constraints_met={soft_constraints_met}, "
        f"got {implications.soft_constraint_hits.meets_constraints}"
    )
    assert (
        implications.new_weekly_time.meets_target is weekly_time_meets_target
    ), (
        f"Expected weekly_time_meets_target={weekly_time_meets_target}, "
        f"got {implications.new_weekly_time.meets_target}"
    )
    assert (
        implications.new_monthly_duties.meets_target
        is monthly_duties_meets_target
    ), (
        f"Expected monthly_duties_meets_target={monthly_duties_meets_target}, "
        f"got {implications.new_monthly_duties.meets_target}"
    )

    # Specific value checks
    if expected_new_weekly_minutes is not None:
        assert (
            implications.new_weekly_time.new_weekly_worked_minutes
            == expected_new_weekly_minutes
        ), (
            f"Expected new_weekly_worked_minutes={expected_new_weekly_minutes}, "
            f"got {implications.new_weekly_time.new_weekly_worked_minutes}"
        )
    if expected_weekly_time_delta is not None:
        assert (
            implications.new_weekly_time.new_weekly_time_delta_minutes
            == expected_weekly_time_delta
        ), (
            f"Expected new_weekly_time_delta_minutes={expected_weekly_time_delta}, "
            f"got {implications.new_weekly_time.new_weekly_time_delta_minutes}"
        )
    if expected_new_monthly_duties is not None:
        assert (
            implications.new_monthly_duties.new_number_monthly_duties
            == expected_new_monthly_duties
        ), (
            f"Expected new_number_monthly_duties={expected_new_monthly_duties}, "
            f"got {implications.new_monthly_duties.new_number_monthly_duties}"
        )
    if expected_monthly_duties_delta is not None:
        assert (
            implications.new_monthly_duties.new_monthly_duties_delta
            == expected_monthly_duties_delta
        ), (
            f"Expected new_monthly_duties_delta={expected_monthly_duties_delta}, "
            f"got {implications.new_monthly_duties.new_monthly_duties_delta}"
        )
    if expected_ltm_shift_count is not None:
        assert (
            implications.nb_times_did_shift_ltm.count
            == expected_ltm_shift_count
        ), (
            f"Expected nb_times_did_shift_ltm.count={expected_ltm_shift_count}, "
            f"got {implications.nb_times_did_shift_ltm.count}"
        )
    if expected_ltm_weekday_count is not None:
        assert (
            implications.nb_times_worked_weekday_ltm.count
            == expected_ltm_weekday_count
        ), (
            f"Expected nb_times_worked_weekday_ltm.count={expected_ltm_weekday_count}, "
            f"got {implications.nb_times_worked_weekday_ltm.count}"
        )

    # Structure validation (types and ranges)
    assert isinstance(
        implications.new_monthly_duties.new_number_monthly_duties, int
    )
    assert isinstance(
        implications.new_monthly_duties.new_monthly_duties_delta, int
    )
    assert isinstance(
        implications.new_weekly_time.new_weekly_worked_minutes, int
    )
    assert implications.new_weekly_time.new_weekly_worked_minutes >= 0
    assert isinstance(
        implications.new_weekly_time.new_weekly_time_delta_minutes, int
    )
    assert isinstance(implications.nb_times_did_shift_ltm.count, int)
    assert implications.nb_times_did_shift_ltm.count >= 0
    assert isinstance(implications.nb_times_worked_weekday_ltm.count, int)
    assert implications.nb_times_worked_weekday_ltm.count >= 0

    # Ranking order validation if all_candidates provided
    if all_candidates:
        can_do = [
            c
            for c in all_candidates
            if c.replacement_category.value == "can_do" and c.rank > 0
        ]
        could_do = [
            c
            for c in all_candidates
            if c.replacement_category.value == "could_do" and c.rank > 0
        ]
        cant_do = [
            c
            for c in all_candidates
            if c.replacement_category.value == "cant_do" and c.rank > 0
        ]

        if expected_category == "can_do" and candidate.rank > 0:
            for could_do_c in could_do:
                assert candidate.rank < could_do_c.rank, (
                    f"CAN_DO candidate rank {candidate.rank} should be < "
                    f"COULD_DO candidate rank {could_do_c.rank}"
                )
            for cant_do_c in cant_do:
                assert candidate.rank < cant_do_c.rank, (
                    f"CAN_DO candidate rank {candidate.rank} should be < "
                    f"CANT_DO candidate rank {cant_do_c.rank}"
                )
        elif expected_category == "could_do" and candidate.rank > 0:
            for can_do_c in can_do:
                assert candidate.rank > can_do_c.rank, (
                    f"COULD_DO candidate rank {candidate.rank} should be > "
                    f"CAN_DO candidate rank {can_do_c.rank}"
                )
            for cant_do_c in cant_do:
                assert candidate.rank < cant_do_c.rank, (
                    f"COULD_DO candidate rank {candidate.rank} should be < "
                    f"CANT_DO candidate rank {cant_do_c.rank}"
                )


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

    # Check target worker has rank 0 (category may be cant_do due to overlap with self)
    assert_candidate(
        target_candidate,
        expected_category="cant_do",
        expected_rank_min=0,
        expected_rank_max=0,
        hasnt_overlap=False,  # Target worker has overlap with their own assignment
    )

    # Check test worker is CAN_DO with rank >= 1, all constraints pass
    assert_candidate(
        test_candidate,
        expected_category="can_do",
        expected_rank_min=1,
        all_candidates=candidates,
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

    # Check target worker has rank 0 (category may be cant_do due to overlap with self)
    assert_candidate(
        target_candidate,
        expected_category="cant_do",
        expected_rank_min=0,
        expected_rank_max=0,
        hasnt_overlap=False,  # Target worker has overlap with their own assignment
    )

    # Check test worker is COULD_DO due to exceeding weekly time
    expected_new_weekly_minutes = (
        current_weekly_minutes + morning_duration_minutes
    )
    expected_delta = expected_new_weekly_minutes - target_weekly_minutes

    assert_candidate(
        test_candidate,
        expected_category="could_do",
        expected_rank_min=1,
        weekly_time_meets_target=False,
        expected_new_weekly_minutes=expected_new_weekly_minutes,
        expected_weekly_time_delta=expected_delta,
        all_candidates=candidates,
    )


def test_get_replacement_candidates_could_do_worker_exceeds_monthly_duties(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test replacement candidate with COULD_DO category due to monthly duties.

    This test verifies that a worker who would exceed their monthly duty
    target is correctly categorized as COULD_DO with appropriate ranking.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Find a target assignment for duty shift
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_duty"
    )
    target_worker_id = target_assignment.worker_id

    # Find the duty shift
    duty_shift = next(s for s in base_shifts if s.id == "shift_duty")

    # Pick a different worker (not the target worker) as the test worker
    # Choose worker_2 if target is worker_1, otherwise choose worker_1
    test_worker_id = (
        "worker_2" if target_worker_id == "worker_1" else "worker_1"
    )
    test_worker = next(w for w in base_workers if w.id == test_worker_id)

    # Remove any assignments for test worker on the target date and next day to avoid overlap
    target_date = target_assignment.date
    next_day = target_date + timedelta(days=1)
    assignments = [
        a
        for a in assignments
        if not (
            a.worker_id == test_worker.id
            and (a.date == target_date or a.date == next_day)
        )
    ]

    # Calculate the current number of duties for test worker in the target month
    month_start = date(target_date.year, target_date.month, 1)
    if target_date.month == 12:
        month_end = date(target_date.year + 1, 1, 1) - timedelta(days=1)
    else:
        month_end = date(
            target_date.year, target_date.month + 1, 1
        ) - timedelta(days=1)

    # Count current duties for test worker in the target month
    current_monthly_duties = 0
    for assignment in assignments:
        if (
            assignment.worker_id == test_worker.id
            and assignment.shift_id == "shift_duty"
            and month_start <= assignment.date <= month_end
        ):
            current_monthly_duties += 1

    # Set worker's duties_per_month to 1
    target_duties_per_month = 1

    # If the test worker has 0 duties in the target month, we need to add one
    # so that the replacement would cause them to exceed their target
    if current_monthly_duties == 0:
        # Find another day in the same month where test worker has no conflict
        # and assign them a duty shift on that day
        all_dates_in_month = []
        current = month_start
        while current <= month_end:
            all_dates_in_month.append(current)
            current += timedelta(days=1)

        # Find a date where test worker has no assignment and it's not the target date
        for potential_date in all_dates_in_month:
            if potential_date == target_assignment.date:
                continue

            # Check if test worker has any assignment on this date or the next day
            next_day_check = potential_date + timedelta(days=1)
            has_conflict = any(
                a.worker_id == test_worker.id
                and (a.date == potential_date or a.date == next_day_check)
                for a in assignments
            )

            if not has_conflict:
                # Add a duty assignment for test worker on this date
                new_assignment = Assignment(
                    id=f"assignment_duty_added_{test_worker.id}_{potential_date.isoformat()}",
                    team_id=base_team_id,
                    schedule_id=target_assignment.schedule_id,
                    worker_id=test_worker.id,
                    date=potential_date,
                    shift_id="shift_duty",
                    fixed=False,
                    source=AssignmentSource.MANUAL,
                    source_id=None,
                    reference_assignment_id=None,
                )
                assignments.append(new_assignment)
                current_monthly_duties = 1
                break

    # Modify the test worker's duties_per_month
    modified_test_worker = Worker(
        id=test_worker.id,
        team_id=test_worker.team_id,
        name=test_worker.name,
        acronym=test_worker.acronym,
        acronym_custom=test_worker.acronym_custom,
        employment_start_date=test_worker.employment_start_date,
        employment_end_date=test_worker.employment_end_date,
        weekly_hours=test_worker.weekly_hours,
        weekly_hours_desired=test_worker.weekly_hours_desired,
        duties_per_month=target_duties_per_month,
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

    # Update the mock to return modified workers and assignments
    mock_collection.worker_db.get_workers_not_deleted.return_value = (
        modified_workers
    )

    # Update the mock to return the potentially modified assignments
    mock_collection.assignment_db.get_assignments_by_dates.return_value = (
        assignments
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

    # Check target worker has rank 0 (category may be cant_do due to overlap with self)
    assert_candidate(
        target_candidate,
        expected_category="cant_do",
        expected_rank_min=0,
        expected_rank_max=0,
        hasnt_overlap=False,  # Target worker has overlap with their own assignment
        weekly_time_meets_target=False,  # Target worker also exceeds weekly time
    )

    # Check test worker is COULD_DO due to exceeding monthly duties
    expected_new_monthly_duties = (
        current_monthly_duties + 1
        if test_worker.id != target_worker_id
        else current_monthly_duties
    )
    expected_delta = expected_new_monthly_duties - target_duties_per_month

    assert_candidate(
        test_candidate,
        expected_category="could_do",
        expected_rank_min=1 if test_worker.id != target_worker_id else 0,
        expected_rank_max=None if test_worker.id != target_worker_id else 0,
        monthly_duties_meets_target=False,
        weekly_time_meets_target=False,  # Test worker also exceeds weekly time
        expected_new_monthly_duties=expected_new_monthly_duties,
        expected_monthly_duties_delta=expected_delta,
        all_candidates=(
            candidates if test_worker.id != target_worker_id else None
        ),
    )


def test_get_replacement_candidates_could_do_worker_soft_constraint_breach(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test replacement candidate with COULD_DO category due to soft constraint breach.

    This test verifies that a worker who would breach a soft sum constraint
    is correctly categorized as COULD_DO with appropriate ranking.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Find a target assignment for morning shift
    target_assignment = next(
        a
        for a in assignments
        if a.shift_id == "shift_morning" and a.date == date(2026, 1, 7)
    )
    target_worker_id = target_assignment.worker_id
    target_date = target_assignment.date

    # Find the morning shift
    morning_shift = next(s for s in base_shifts if s.id == "shift_morning")

    # Find a worker with no conflicting assignment on that date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    test_worker = next(
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    )

    # Calculate the start of the week (Monday) containing the target assignment
    days_since_monday = target_date.weekday()  # Monday is 0
    week_start = target_date - timedelta(days=days_since_monday)
    week_end = week_start + timedelta(days=6)  # Sunday

    # Count current morning shifts for test worker in the target week
    current_morning_shifts_count = 0
    for assignment in assignments:
        if (
            assignment.worker_id == test_worker.id
            and assignment.shift_id == "shift_morning"
            and week_start <= assignment.date <= week_end
        ):
            current_morning_shifts_count += 1

    # If test worker doesn't have at least 1 morning shift in target week,
    # add one on a different day
    if current_morning_shifts_count == 0:
        # Find a day in the week where test worker has no assignment
        for potential_date in [
            week_start + timedelta(days=i) for i in range(7)
        ]:
            if potential_date == target_date:
                continue

            # Check if test worker has any assignment on this date
            has_conflict = any(
                a.worker_id == test_worker.id and a.date == potential_date
                for a in assignments
            )

            if not has_conflict:
                # Add a morning shift assignment for test worker
                new_assignment = Assignment(
                    id=f"assignment_morning_added_{test_worker.id}_{potential_date.isoformat()}",
                    team_id=base_team_id,
                    schedule_id="schedule_1",
                    worker_id=test_worker.id,
                    date=potential_date,
                    shift_id="shift_morning",
                    fixed=False,
                    source=AssignmentSource.MANUAL,
                )
                assignments.append(new_assignment)
                current_morning_shifts_count = 1
                break

    # Create a soft sum constraint: "test worker should work at most
    # current_morning_shifts_count morning shifts per week"
    # This should NOT be breached when we run the first check
    constraint_id = "constraint_soft_sum_test"
    constraint_build = ConstraintBuild(
        id=constraint_id,
        team_id=base_team_id,
        constraint_type=ConstraintType.SUM,
        template_id="template_sum_weekly",
        language="en",
        blocks=[
            Block(
                name=BlockNameOptions.WORKER,
                type=BlockTypeOptions.LIST,
                value=[
                    ShiftWorkerOption(
                        name=test_worker.name,
                        id=test_worker.id,
                        id_type=SWOIdTypes.WORKER,
                        is_bool_dim=False,
                        category_name="workers",
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
                value=current_morning_shifts_count + 1,
            ),
            Block(
                name=BlockNameOptions.SHIFT,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name=morning_shift.name,
                        id=morning_shift.id,
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name="shifts",
                    )
                ],
            ),
            Block(
                name=BlockNameOptions.TIMING,
                type=BlockTypeOptions.STRING,
                value="per week",
            ),
        ],
        hard=False,  # Soft constraint
        priority="1",
    )

    # Update mocks to include the constraint
    mock_collection.assignment_db.get_assignments_by_dates.return_value = (
        assignments
    )
    mock_collection.constraint_build_db.get_constraint_builds.return_value = [
        constraint_build
    ]
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Act - First run with constraint that should NOT be breached
    candidates_no_breach = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find test worker candidate (first run - no breach expected)
    test_candidate_no_breach = next(
        c for c in candidates_no_breach if c.worker_id == test_worker.id
    )

    # Test worker should have no soft constraint hits
    assert (
        test_candidate_no_breach.replacement_implications.soft_constraint_hits.meets_constraints
        is True
    ), "Test worker should meet soft constraints when at target"
    assert (
        len(
            test_candidate_no_breach.replacement_implications.soft_constraint_hits.breaches
        )
        == 0
    ), "Test worker should have no soft constraint breaches when at target"

    # Now modify the constraint to target n-1 instead of n
    # This means adding one more morning shift (via replacement) will breach it
    constraint_build_breach = ConstraintBuild(
        id=constraint_id,
        team_id=base_team_id,
        constraint_type=ConstraintType.SUM,
        template_id="template_sum_weekly",
        language="en",
        blocks=[
            Block(
                name=BlockNameOptions.WORKER,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name=test_worker.name,
                        id=test_worker.id,
                        id_type=SWOIdTypes.WORKER,
                        is_bool_dim=False,
                        category_name="workers",
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
                value=current_morning_shifts_count,  # Reduced by 1
            ),
            Block(
                name=BlockNameOptions.SHIFT,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name=morning_shift.name,
                        id=morning_shift.id,
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name="shifts",
                    )
                ],
            ),
            Block(
                name=BlockNameOptions.TIMING,
                type=BlockTypeOptions.STRING,
                value="per week",
            ),
        ],
        hard=False,  # Soft constraint
        priority="1",
    )

    # Update mock with modified constraint
    mock_collection.constraint_build_db.get_constraint_builds.return_value = [
        constraint_build_breach
    ]

    # Act - Second run with constraint that SHOULD be breached
    candidates_with_breach = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find target worker and test worker candidates
    target_candidate = next(
        c for c in candidates_with_breach if c.worker_id == target_worker_id
    )
    test_candidate = next(
        c for c in candidates_with_breach if c.worker_id == test_worker.id
    )

    # Check target worker has rank 0
    assert_candidate(
        target_candidate,
        expected_category="can_do",
        expected_rank_min=0,
        expected_rank_max=0,
        hasnt_overlap=True,  # Target worker has overlap with their own assignment
    )

    # Check test worker is COULD_DO due to soft constraint breach
    assert_candidate(
        test_candidate,
        expected_category="could_do",
        expected_rank_min=1,
        soft_constraints_met=False,  # Should breach soft constraint
        all_candidates=candidates_with_breach,
    )

    # Verify the soft constraint breach details
    assert (
        len(
            test_candidate.replacement_implications.soft_constraint_hits.breaches
        )
        > 0
    ), "Test worker should have at least one soft constraint breach"

    # Check that the breach is for our constraint
    breach_constraint_ids = [
        breach.objective_id
        for breach in test_candidate.replacement_implications.soft_constraint_hits.breaches
    ]
    assert (
        constraint_id in breach_constraint_ids
    ), f"Expected constraint {constraint_id} in breaches, got {breach_constraint_ids}"


def test_get_replacement_candidates_could_do_worker_soft_constraint_seq_breach(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test replacement candidate with COULD_DO category due to soft SEQ constraint breach.

    This test verifies that a worker who would breach a soft seq constraint
    (consecutive shifts) is correctly categorized as COULD_DO with appropriate ranking.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Find a target assignment for morning shift on Jan 7, 2026
    target_date = date(2026, 1, 7)
    target_assignment = next(
        (
            a
            for a in assignments
            if a.shift_id == "shift_morning" and a.date == target_date
        ),
        None,
    )

    # If no assignment on Jan 7, find the first morning shift assignment
    if not target_assignment:
        target_assignment = next(
            a for a in assignments if a.shift_id == "shift_morning"
        )
        target_date = target_assignment.date

    target_worker_id = target_assignment.worker_id

    # Find the morning shift
    morning_shift = next(s for s in base_shifts if s.id == "shift_morning")

    # Find a worker with no conflicting assignment on target date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    test_worker = next(
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    )

    # Ensure test worker has morning shifts on Jan 5 and Jan 6
    # (so replacement on Jan 7 creates 3 consecutive)
    jan_5 = date(2026, 1, 5)
    jan_6 = date(2026, 1, 6)

    # Check if test worker already has morning shift on Jan 5
    has_jan_5 = any(
        a.worker_id == test_worker.id
        and a.shift_id == "shift_morning"
        and a.date == jan_5
        for a in assignments
    )

    if not has_jan_5:
        # Add morning shift on Jan 5
        new_assignment_jan_5 = Assignment(
            id=f"assignment_morning_seq_{test_worker.id}_jan5",
            team_id=base_team_id,
            schedule_id="schedule_1",
            worker_id=test_worker.id,
            date=jan_5,
            shift_id="shift_morning",
            fixed=False,
            source=AssignmentSource.MANUAL,
        )
        assignments.append(new_assignment_jan_5)

    # Check if test worker already has morning shift on Jan 6
    has_jan_6 = any(
        a.worker_id == test_worker.id
        and a.shift_id == "shift_morning"
        and a.date == jan_6
        for a in assignments
    )

    if not has_jan_6:
        # Add morning shift on Jan 6
        new_assignment_jan_6 = Assignment(
            id=f"assignment_morning_seq_{test_worker.id}_jan6",
            team_id=base_team_id,
            schedule_id="schedule_1",
            worker_id=test_worker.id,
            date=jan_6,
            shift_id="shift_morning",
            fixed=False,
            source=AssignmentSource.MANUAL,
        )
        assignments.append(new_assignment_jan_6)

    # Create a soft seq constraint: "test worker should work at most
    # 3 consecutive morning shifts"
    # This should NOT be breached when we run the first check
    constraint_id = "constraint_soft_seq_test"
    constraint_build = ConstraintBuild(
        id=constraint_id,
        team_id=base_team_id,
        constraint_type=ConstraintType.SEQ,
        template_id="template_seq_consecutive",
        language="en",
        blocks=[
            Block(
                name=BlockNameOptions.WORKER,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name=test_worker.name,
                        id=test_worker.id,
                        id_type=SWOIdTypes.WORKER,
                        is_bool_dim=False,
                        category_name="workers",
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
                value="at_most",
            ),
            Block(
                name=BlockNameOptions.NUMBER,
                type=BlockTypeOptions.NUMBER,
                value=3,
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
                        name=morning_shift.name,
                        id=morning_shift.id,
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name="shifts",
                    )
                ],
            ),
        ],
        hard=False,  # Soft constraint
        priority="1",
    )

    # Update mocks to include the constraint
    mock_collection.assignment_db.get_assignments_by_dates.return_value = (
        assignments
    )
    mock_collection.constraint_build_db.get_constraint_builds.return_value = [
        constraint_build
    ]
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Act - First run with constraint that should NOT be breached
    candidates_no_breach = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find target worker and test worker candidates
    target_candidate_no_breach = next(
        c for c in candidates_no_breach if c.worker_id == target_worker_id
    )
    test_candidate_no_breach = next(
        c for c in candidates_no_breach if c.worker_id == test_worker.id
    )

    # Check target worker has rank 0
    assert_candidate(
        target_candidate_no_breach,
        expected_category="can_do",
        expected_rank_min=0,
        expected_rank_max=0,
    )

    # Test worker should have no soft constraint hits
    assert (
        test_candidate_no_breach.replacement_implications.soft_constraint_hits.meets_constraints
        is True
    ), "Test worker should meet soft constraints with target=3"
    assert (
        len(
            test_candidate_no_breach.replacement_implications.soft_constraint_hits.breaches
        )
        == 0
    ), "Test worker should have no soft constraint breaches with target=3"

    # Now modify the constraint to target=2 instead of 3
    # This means adding one more morning shift (via replacement) will breach it
    constraint_build_breach = ConstraintBuild(
        id=constraint_id,
        team_id=base_team_id,
        constraint_type=ConstraintType.SEQ,
        template_id="template_seq_consecutive",
        language="en",
        blocks=[
            Block(
                name=BlockNameOptions.WORKER,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name=test_worker.name,
                        id=test_worker.id,
                        id_type=SWOIdTypes.WORKER,
                        is_bool_dim=False,
                        category_name="workers",
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
                value="at_most",
            ),
            Block(
                name=BlockNameOptions.NUMBER,
                type=BlockTypeOptions.NUMBER,
                value=2,  # Reduced to 2 - should trigger breach
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
                        name=morning_shift.name,
                        id=morning_shift.id,
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name="shifts",
                    )
                ],
            ),
        ],
        hard=False,  # Soft constraint
        priority="1",
    )

    # Update mock with modified constraint
    mock_collection.constraint_build_db.get_constraint_builds.return_value = [
        constraint_build_breach
    ]

    # Act - Second run with constraint that SHOULD be breached
    candidates_with_breach = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find target worker and test worker candidates
    target_candidate = next(
        c for c in candidates_with_breach if c.worker_id == target_worker_id
    )
    test_candidate = next(
        c for c in candidates_with_breach if c.worker_id == test_worker.id
    )

    # Check target worker has rank 0
    assert_candidate(
        target_candidate,
        expected_category="can_do",
        expected_rank_min=0,
        expected_rank_max=0,
    )

    # Check test worker is COULD_DO with soft constraint breach
    assert_candidate(
        test_candidate,
        expected_category="could_do",
        expected_rank_min=1,
        soft_constraints_met=False,  # Should breach soft constraint
        all_candidates=candidates_with_breach,
    )

    # Verify the soft constraint breach details
    assert (
        len(
            test_candidate.replacement_implications.soft_constraint_hits.breaches
        )
        > 0
    ), "Test worker should have at least one soft constraint breach"

    # Check that the breach is for our constraint
    breach_constraint_ids = [
        breach.objective_id
        for breach in test_candidate.replacement_implications.soft_constraint_hits.breaches
    ]
    assert (
        constraint_id in breach_constraint_ids
    ), f"Expected constraint {constraint_id} in breaches, got {breach_constraint_ids}"


def test_get_replacement_candidates_could_do_worker_soft_constraint_ord_breach(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test replacement candidate with COULD_DO category due to soft ORD constraint breach.

    This test verifies that a worker who would breach a soft ord constraint
    (order/sequence relationship between shifts) is correctly categorized as COULD_DO.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Find a target assignment for morning shift on Jan 7, 2026
    target_date = date(2026, 1, 7)
    target_assignment = next(
        (
            a
            for a in assignments
            if a.shift_id == "shift_morning" and a.date == target_date
        ),
        None,
    )

    # If no assignment on Jan 7, find the first morning shift assignment
    if not target_assignment:
        target_assignment = next(
            a for a in assignments if a.shift_id == "shift_morning"
        )
        target_date = target_assignment.date

    target_worker_id = target_assignment.worker_id
    day_after_target = target_date + timedelta(days=1)

    # Find the morning and night shifts
    morning_shift = next(s for s in base_shifts if s.id == "shift_morning")
    night_shift = next(s for s in base_shifts if s.id == "shift_night")

    # Find a worker with no conflicting assignment on target date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    test_worker = next(
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    )

    # Remove any night assignment for test worker on day after target date
    # (to ensure no breach in first run)
    assignments_to_remove = [
        a
        for a in assignments
        if a.worker_id == test_worker.id
        and a.shift_id == "shift_night"
        and a.date == day_after_target
    ]
    for assignment in assignments_to_remove:
        assignments.remove(assignment)

    # Create a soft ord constraint: "No morning 1 day before night for test worker"
    constraint_id = "constraint_soft_ord_test"
    constraint_build = ConstraintBuild(
        id=constraint_id,
        team_id=base_team_id,
        constraint_type=ConstraintType.ORD,
        template_id="template_ord_consecutive",
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
                        name=morning_shift.name,
                        id=morning_shift.id,
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name="shifts",
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
                name=BlockNameOptions.SHIFT_RELATIVE,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name=night_shift.name,
                        id=night_shift.id,
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name="shifts",
                    )
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
                        name=test_worker.name,
                        id=test_worker.id,
                        id_type=SWOIdTypes.WORKER,
                        is_bool_dim=False,
                        category_name="workers",
                    )
                ],
            ),
        ],
        hard=False,  # Soft constraint
        priority="1",
    )

    # Update mocks to include the constraint
    mock_collection.assignment_db.get_assignments_by_dates.return_value = (
        assignments
    )
    mock_collection.constraint_build_db.get_constraint_builds.return_value = [
        constraint_build
    ]
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Act - First run with no night shift on day after (should NOT breach)
    candidates_no_breach = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find target worker and test worker candidates
    target_candidate_no_breach = next(
        c for c in candidates_no_breach if c.worker_id == target_worker_id
    )
    test_candidate_no_breach = next(
        c for c in candidates_no_breach if c.worker_id == test_worker.id
    )

    # Check target worker has rank 0
    assert_candidate(
        target_candidate_no_breach,
        expected_category="can_do",
        expected_rank_min=0,
        expected_rank_max=0,
    )

    # Test worker should have no soft constraint hits
    assert (
        test_candidate_no_breach.replacement_implications.soft_constraint_hits.meets_constraints
        is True
    ), "Test worker should meet soft constraints with no night shift on day after"
    assert (
        len(
            test_candidate_no_breach.replacement_implications.soft_constraint_hits.breaches
        )
        == 0
    ), "Test worker should have no soft constraint breaches with no night shift on day after"

    # Now add a night shift assignment on day after target for test worker
    # This will cause a breach: morning on target date -> night on day after
    night_assignment_next_day = Assignment(
        id=f"assignment_night_ord_{test_worker.id}_{day_after_target.isoformat()}",
        team_id=base_team_id,
        schedule_id="schedule_1",
        worker_id=test_worker.id,
        date=day_after_target,
        shift_id="shift_night",
        fixed=False,
        source=AssignmentSource.MANUAL,
    )
    assignments.append(night_assignment_next_day)

    # Update mock with assignments including the new night shift
    mock_collection.assignment_db.get_assignments_by_dates.return_value = (
        assignments
    )

    # Act - Second run with night shift on day after (SHOULD breach)
    candidates_with_breach = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find target worker and test worker candidates
    target_candidate = next(
        c for c in candidates_with_breach if c.worker_id == target_worker_id
    )
    test_candidate = next(
        c for c in candidates_with_breach if c.worker_id == test_worker.id
    )

    # Check target worker has rank 0
    assert_candidate(
        target_candidate,
        expected_category="can_do",
        expected_rank_min=0,
        expected_rank_max=0,
    )

    # Check test worker is COULD_DO with soft constraint breach
    assert_candidate(
        test_candidate,
        expected_category="could_do",
        expected_rank_min=1,
        soft_constraints_met=False,  # Should breach soft constraint
        all_candidates=candidates_with_breach,
    )

    # Verify the soft constraint breach details
    assert (
        len(
            test_candidate.replacement_implications.soft_constraint_hits.breaches
        )
        > 0
    ), "Test worker should have at least one soft constraint breach"

    # Check that the breach is for our constraint
    breach_constraint_ids = [
        breach.objective_id
        for breach in test_candidate.replacement_implications.soft_constraint_hits.breaches
    ]
    assert (
        constraint_id in breach_constraint_ids
    ), f"Expected constraint {constraint_id} in breaches, got {breach_constraint_ids}"


def test_get_replacement_candidates_could_do_worker_soft_constraint_fil_breach(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test soft FIL constraint breach detection.

    Creates a soft FIL constraint that filters a worker from a shift type,
    and verifies that the system correctly identifies the breach when
    recommending that worker as a replacement for that shift type.

    Scenario:
    1. Find morning shift assignment on Jan 7, 2026
    2. Find test worker with no conflicts
    3. Create soft FIL: "Test worker should not work night"
    4. First run: No breach (morning shift allowed)
    5. Change to: "Test worker should not work morning"
    6. Second run: Breach detected (morning shift filtered)
    """
    service, mock_collection, assignments = mock_replacement_service

    # Find target assignment: morning shift on Jan 7, 2026
    target_date = date(2026, 1, 7)
    target_assignment = None
    for a in assignments:
        if a.shift_id == "shift_morning" and a.date == target_date:
            target_assignment = a
            break

    # Fallback to first available morning shift if Jan 7 not found
    if not target_assignment:
        target_assignment = next(
            a for a in assignments if a.shift_id == "shift_morning"
        )
        target_date = target_assignment.date

    # Find test worker with no conflicting assignment on target date
    assigned_worker_ids_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    test_worker = next(
        w for w in base_workers if w.id not in assigned_worker_ids_on_date
    )

    # Find night shift for initial constraint
    morning_shift = next(s for s in base_shifts if s.id == "shift_morning")
    night_shift = next(s for s in base_shifts if s.id == "shift_night")

    # Create soft FIL constraint: "Test worker should not work morning"
    # Block structure for FIL: WORKER, TEXT, SHIFT_REFERENCE
    constraint_build_no_breach = ConstraintBuild(
        id="constraint_fil_test_night",
        team_id=base_team_id,
        constraint_type=ConstraintType.FIL,
        template_id="template_fil_worker_shift",
        language="en",
        blocks=[
            Block(
                name=BlockNameOptions.WORKER,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name=test_worker.name,
                        id=test_worker.id,
                        id_type=SWOIdTypes.WORKER,
                        is_bool_dim=False,
                        category_name="workers",
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
                        name=night_shift.name,
                        id=night_shift.id,
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name="shifts",
                    )
                ],
            ),
        ],
        hard=False,
        priority="high",
    )

    # Mock get_assignments_by_ids to return the target assignment
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Mock constraint builds with no breach constraint (filters night, not morning)
    mock_collection.constraint_build_db.get_constraint_builds.return_value = [
        constraint_build_no_breach
    ]

    # First run: No breach expected (constraint filters night, target is morning)
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Find test worker in candidates
    test_worker_candidate = next(
        c for c in candidates if c.worker_id == test_worker.id
    )

    # Should have no soft constraint breach (morning shift not filtered)
    assert_candidate(
        test_worker_candidate,
        expected_category="can_do",
        soft_constraints_met=True,
    )
    assert (
        len(
            test_worker_candidate.replacement_implications.soft_constraint_hits.breaches
        )
        == 0
    )

    # Now modify constraint to create breach: "Test worker should not work morning"
    constraint_build_with_breach = ConstraintBuild(
        id="constraint_fil_test_morning",
        team_id=base_team_id,
        constraint_type=ConstraintType.FIL,
        template_id="template_fil_worker_shift",
        language="en",
        blocks=[
            Block(
                name=BlockNameOptions.WORKER,
                type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                value=[
                    ShiftWorkerOption(
                        name=test_worker.name,
                        id=test_worker.id,
                        id_type=SWOIdTypes.WORKER,
                        is_bool_dim=False,
                        category_name="workers",
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
                        name=morning_shift.name,
                        id=morning_shift.id,
                        id_type=SWOIdTypes.SHIFT,
                        is_bool_dim=False,
                        category_name="shifts",
                    )
                ],
            ),
        ],
        hard=False,
        priority="high",
    )

    # Mock constraint builds with breach constraint (filters morning)
    mock_collection.constraint_build_db.get_constraint_builds.return_value = [
        constraint_build_with_breach
    ]

    # Second run: Breach expected (constraint now filters morning shift)
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Find target worker (currently assigned)
    target_worker_candidate = next(
        c for c in candidates if c.worker_id == target_assignment.worker_id
    )

    # Target worker should have rank 0
    assert target_worker_candidate.rank == 0

    # Find test worker in candidates
    test_worker_candidate = next(
        c for c in candidates if c.worker_id == test_worker.id
    )

    # Test worker should be COULD_DO with soft constraint breach
    assert_candidate(
        test_worker_candidate,
        expected_category="could_do",
        expected_rank_min=1,
        is_employed=True,
        has_specialty=True,
        isnt_on_leave=True,
        isnt_filtered_out=True,
        hasnt_overlap=True,
        hard_constraints_met=True,
        no_request_conflict=True,
        soft_constraints_met=False,
        weekly_time_meets_target=True,
        monthly_duties_meets_target=True,
    )

    # Verify soft constraint breach contains our constraint ID
    breaches = (
        test_worker_candidate.replacement_implications.soft_constraint_hits.breaches
    )
    assert len(breaches) > 0, "Expected at least one soft constraint breach"
    breach_constraint_ids = [b.objective_id for b in breaches]
    assert "constraint_fil_test_morning" in breach_constraint_ids

    # Verify ranking: test worker rank should be >= 1
    assert test_worker_candidate.rank >= 1

    # Verify test worker rank is higher than CAN_DO workers
    can_do_candidates = [
        c for c in candidates if c.replacement_category.value == "can_do"
    ]
    if can_do_candidates:
        max_can_do_rank = max(c.rank for c in can_do_candidates)
        assert test_worker_candidate.rank > max_can_do_rank, (
            f"COULD_DO worker rank ({test_worker_candidate.rank}) should be "
            f"greater than max CAN_DO rank ({max_can_do_rank})"
        )

    # Verify test worker rank is lower than CANT_DO workers
    cant_do_candidates = [
        c for c in candidates if c.replacement_category.value == "cant_do"
    ]
    if cant_do_candidates:
        min_cant_do_rank = min(c.rank for c in cant_do_candidates)
        assert test_worker_candidate.rank < min_cant_do_rank, (
            f"COULD_DO worker rank ({test_worker_candidate.rank}) should be "
            f"less than min CANT_DO rank ({min_cant_do_rank})"
        )


# ============================================================================
# Request Handling Tests
# ============================================================================


def test_get_replacement_candidates_only_approved_requests_considered(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test that only APPROVED requests are considered for conflicts.

    Workers with PENDING, DENIED, or DEFERRED requests should not have
    request conflicts triggered.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Select target assignment for morning shift
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )
    target_date = target_assignment.date

    # Find workers without assignments on target date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    available_workers = [
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    ]

    # Need at least 4 workers for this test
    assert len(available_workers) >= 4

    # Create requests with different statuses for different workers
    # Worker 0: APPROVED negative request (should conflict)
    # Worker 1: PENDING negative request (should NOT conflict)
    # Worker 2: DENIED negative request (should NOT conflict)
    # Worker 3: DEFERRED negative request (should NOT conflict)

    requests = [
        Request.create_work_demand(
            request_id="request_approved",
            team_id=base_team_id,
            worker_id=available_workers[0].id,
            start_date=target_date,
            end_date=target_date,
            shift_options=[
                ShiftWorkerOption(
                    name="Morning Shift",
                    id="shift_morning",
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name="shifts",
                )
            ],
            negative=True,  # Don't want to work morning
            status=RequestStatus.APPROVED,
        ),
        Request.create_work_demand(
            request_id="request_pending",
            team_id=base_team_id,
            worker_id=available_workers[1].id,
            start_date=target_date,
            end_date=target_date,
            shift_options=[
                ShiftWorkerOption(
                    name="Morning Shift",
                    id="shift_morning",
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name="shifts",
                )
            ],
            negative=True,
            status=RequestStatus.PENDING,
        ),
        Request.create_work_demand(
            request_id="request_denied",
            team_id=base_team_id,
            worker_id=available_workers[2].id,
            start_date=target_date,
            end_date=target_date,
            shift_options=[
                ShiftWorkerOption(
                    name="Morning Shift",
                    id="shift_morning",
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name="shifts",
                )
            ],
            negative=True,
            status=RequestStatus.DENIED,
        ),
        Request.create_work_demand(
            request_id="request_deferred",
            team_id=base_team_id,
            worker_id=available_workers[3].id,
            start_date=target_date,
            end_date=target_date,
            shift_options=[
                ShiftWorkerOption(
                    name="Morning Shift",
                    id="shift_morning",
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name="shifts",
                )
            ],
            negative=True,
            status=RequestStatus.DEFERRED,
        ),
    ]

    # Mock request_db to return these requests
    mock_collection.request_db.get_requests_by_dates.return_value = requests

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Act
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find candidates for each worker
    worker_0_candidate = next(
        c for c in candidates if c.worker_id == available_workers[0].id
    )
    worker_1_candidate = next(
        c for c in candidates if c.worker_id == available_workers[1].id
    )
    worker_2_candidate = next(
        c for c in candidates if c.worker_id == available_workers[2].id
    )
    worker_3_candidate = next(
        c for c in candidates if c.worker_id == available_workers[3].id
    )

    # Worker 0 (APPROVED) should have request conflict (CANT_DO)
    assert_candidate(
        worker_0_candidate,
        expected_category="cant_do",
        no_request_conflict=False,
    )

    # Workers 1-3 (non-APPROVED) should NOT have request conflicts (CAN_DO)
    assert_candidate(
        worker_1_candidate,
        expected_category="can_do",
        no_request_conflict=True,
    )
    assert_candidate(
        worker_2_candidate,
        expected_category="can_do",
        no_request_conflict=True,
    )
    assert_candidate(
        worker_3_candidate,
        expected_category="can_do",
        no_request_conflict=True,
    )


def test_get_replacement_candidates_leave_request_triggers_isnt_on_leave(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test that conflicting LEAVE request triggers isnt_on_leave, not request_hits.

    When a worker has an approved leave request for the replacement date,
    it should fail the isnt_on_leave check but NOT be counted as a
    request conflict.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Select target assignment for morning shift
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )
    target_date = target_assignment.date

    # Find a worker without assignment on target date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    test_worker = next(
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    )

    # Find a leave shift (shift_leave_full_day or create one if needed)
    # For this test, we'll use shift_leave_full_day from base_shifts
    leave_shift = next(
        (s for s in base_shifts if s.shift_type == ShiftType.LEAVE),
        None,
    )

    # If no leave shift exists in base_shifts, we'll assume one exists
    # with id "shift_leave_full_day"
    leave_shift_id = leave_shift.id if leave_shift else "shift_leave_full_day"

    # Create an APPROVED leave request for the test worker
    leave_request = Request.create_leave_request(
        request_id="request_leave",
        team_id=base_team_id,
        worker_id=test_worker.id,
        start_date=target_date,
        end_date=target_date,
        shift_id=leave_shift_id,
        status=RequestStatus.APPROVED,
    )

    # Mock request_db to return the leave request
    mock_collection.request_db.get_requests_by_dates.return_value = [
        leave_request
    ]

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Act
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find test worker candidate
    test_candidate = next(
        c for c in candidates if c.worker_id == test_worker.id
    )

    # Should be CANT_DO due to being on leave, but NOT due to request conflict
    assert_candidate(
        test_candidate,
        expected_category="cant_do",
        isnt_on_leave=False,  # Fails leave check
        no_request_conflict=True,  # But NOT a request conflict
    )


def test_get_replacement_candidates_non_conflicting_work_request(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test that non-conflicting work request does not trigger request hit.

    A worker requesting to work the night shift should not conflict with
    a morning shift replacement on the same day.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Select target assignment for morning shift
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )
    target_date = target_assignment.date

    # Find a worker without assignment on target date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    test_worker = next(
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    )

    # Create an APPROVED positive request for night shift (different from morning)
    night_request = Request.create_work_demand(
        request_id="request_night",
        team_id=base_team_id,
        worker_id=test_worker.id,
        start_date=target_date,
        end_date=target_date,
        shift_options=[
            ShiftWorkerOption(
                name="Night Shift",
                id="shift_night",
                id_type=SWOIdTypes.SHIFT,
                is_bool_dim=False,
                category_name="shifts",
            )
        ],
        negative=False,  # Positive request (wants to work night)
        status=RequestStatus.APPROVED,
    )

    # Mock request_db to return the night request
    mock_collection.request_db.get_requests_by_dates.return_value = [
        night_request
    ]

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Act
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find test worker candidate
    test_candidate = next(
        c for c in candidates if c.worker_id == test_worker.id
    )

    # Should be CAN_DO - no conflict between night request and morning replacement
    assert_candidate(
        test_candidate,
        expected_category="can_do",
        no_request_conflict=True,
    )


def test_get_replacement_candidates_negative_request_conflicts(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test that negative work request triggers request hit.

    A worker with an approved negative request (don't want morning shift)
    should have a request conflict when considered for morning shift replacement.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Select target assignment for morning shift
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )
    target_date = target_assignment.date

    # Find a worker without assignment on target date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    test_worker = next(
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    )

    # Create an APPROVED negative request for morning shift
    negative_request = Request.create_work_demand(
        request_id="request_no_morning",
        team_id=base_team_id,
        worker_id=test_worker.id,
        start_date=target_date,
        end_date=target_date,
        shift_options=[
            ShiftWorkerOption(
                name="Morning Shift",
                id="shift_morning",
                id_type=SWOIdTypes.SHIFT,
                is_bool_dim=False,
                category_name="shifts",
            )
        ],
        negative=True,  # Don't want morning shift
        status=RequestStatus.APPROVED,
    )

    # Mock request_db to return the negative request
    mock_collection.request_db.get_requests_by_dates.return_value = [
        negative_request
    ]

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Act
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find test worker candidate
    test_candidate = next(
        c for c in candidates if c.worker_id == test_worker.id
    )

    # Should be CANT_DO due to request conflict
    assert_candidate(
        test_candidate,
        expected_category="cant_do",
        no_request_conflict=False,
    )


def test_get_replacement_candidates_positive_request_for_different_shift_conflicts(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test that positive work request for different shift triggers request hit.

    A worker with an approved positive request for duty shift should have
    a request conflict when considered for morning shift replacement on the
    same day (assuming duty and morning overlap).
    """
    service, mock_collection, assignments = mock_replacement_service

    # Select target assignment for morning shift
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )
    target_date = target_assignment.date

    # Find a worker without assignment on target date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    test_worker = next(
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    )

    # Create an APPROVED positive request for duty shift (different from morning)
    # Assuming duty shift overlaps with morning shift
    positive_request = Request.create_work_demand(
        request_id="request_duty",
        team_id=base_team_id,
        worker_id=test_worker.id,
        start_date=target_date,
        end_date=target_date,
        shift_options=[
            ShiftWorkerOption(
                name="Morning Shift",
                id="shift_duty",
                id_type=SWOIdTypes.SHIFT,
                is_bool_dim=False,
                category_name="shifts",
            )
        ],
        negative=False,  # Wants duty shift
        status=RequestStatus.APPROVED,
    )

    # Mock request_db to return the positive request
    mock_collection.request_db.get_requests_by_dates.return_value = [
        positive_request
    ]

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Act
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find test worker candidate
    test_candidate = next(
        c for c in candidates if c.worker_id == test_worker.id
    )

    # Should be CANT_DO due to request conflict
    # (can't do morning if they want duty on same day)
    assert_candidate(
        test_candidate,
        expected_category="cant_do",
        no_request_conflict=False,
    )


def test_get_replacement_candidates_request_for_replacement_shift_no_conflict(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test that request for the replacement shift does not trigger conflict.

    A worker with an approved positive request for morning shift should NOT
    have a request conflict when considered for morning shift replacement.
    This is alignment, not conflict.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Select target assignment for morning shift
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )
    target_date = target_assignment.date

    # Find a worker without assignment on target date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    test_worker = next(
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    )

    # Create an APPROVED positive request for morning shift (same as replacement)
    matching_request = Request.create_work_demand(
        request_id="request_morning",
        team_id=base_team_id,
        worker_id=test_worker.id,
        start_date=target_date,
        end_date=target_date,
        shift_options=[
            ShiftWorkerOption(
                name="Morning Shift",
                id="shift_morning",
                id_type=SWOIdTypes.SHIFT,
                is_bool_dim=False,
                category_name="shifts",
            )
        ],
        negative=False,  # Wants morning shift
        status=RequestStatus.APPROVED,
    )

    # Mock request_db to return the matching request
    mock_collection.request_db.get_requests_by_dates.return_value = [
        matching_request
    ]

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Act
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find test worker candidate
    test_candidate = next(
        c for c in candidates if c.worker_id == test_worker.id
    )

    # Should be CAN_DO - requesting the same shift is alignment, not conflict
    assert_candidate(
        test_candidate,
        expected_category="can_do",
        no_request_conflict=True,
    )


# ============================================================================
# Overlap Handling Tests
# ============================================================================


def test_get_replacement_candidates_no_overlap_different_times_same_day(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test that non-overlapping assignments don't trigger overlap hits.

    A worker with a night shift assignment should NOT have an overlap hit
    when considered for a morning shift replacement on the same day,
    since the shifts don't overlap in time.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Select target assignment for morning shift
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )
    target_date = target_assignment.date

    # Find a worker without assignment on target date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    test_worker = next(
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    )

    # Create a night shift for the same day
    # Night shift is 22:00 to 06:00 next day, morning is 08:00 to 16:00
    # These don't overlap
    night_assignment = Assignment(
        id="assignment_night_nonoverlap",
        team_id=base_team_id,
        schedule_id=None,
        worker_id=test_worker.id,
        date=target_date,
        shift_id="shift_night",
        fixed=False,
        source=AssignmentSource.MANUAL,
    )

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Mock get_assignments_by_dates to include the night assignment
    all_assignments = assignments + [night_assignment]
    mock_collection.assignment_db.get_assignments_by_dates.return_value = (
        all_assignments
    )

    # Act
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find test worker candidate
    test_candidate = next(
        c for c in candidates if c.worker_id == test_worker.id
    )

    # Should be CAN_DO - night shift doesn't overlap with morning
    assert_candidate(
        test_candidate,
        expected_category="can_do",
        hasnt_overlap=True,
    )

    # Verify that no overlapping assignments were found
    assert (
        test_candidate.replacement_implications.overlap_hits.overlap_assignment_ids
        == []
    )


def test_get_replacement_candidates_overlap_same_day(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test that overlapping assignments on same day trigger overlap hits.

    A worker on duty shift (08:00 to 20:00) should have an overlap hit
    when considered for a morning shift replacement (08:00 to 16:00)
    on the same day.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Select target assignment for morning shift
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )
    target_date = target_assignment.date

    # Find a worker without assignment on target date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    test_worker = next(
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    )

    # Create a duty assignment for the same day
    # Duty is 08:00 to 20:00, morning is 08:00 to 16:00
    # These overlap
    duty_assignment = Assignment(
        id="assignment_duty_overlap",
        team_id=base_team_id,
        schedule_id=None,
        worker_id=test_worker.id,
        date=target_date,
        shift_id="shift_duty",
        fixed=False,
        source=AssignmentSource.MANUAL,
    )

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Mock get_assignments_by_dates to include the duty assignment
    all_assignments = assignments + [duty_assignment]
    mock_collection.assignment_db.get_assignments_by_dates.return_value = (
        all_assignments
    )

    # Act
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find test worker candidate
    test_candidate = next(
        c for c in candidates if c.worker_id == test_worker.id
    )

    # Should be CANT_DO - duty shift overlaps with morning
    assert_candidate(
        test_candidate,
        expected_category="cant_do",
        hasnt_overlap=False,
    )

    # Verify that the overlapping assignment ID is present
    assert (
        duty_assignment.id
        in test_candidate.replacement_implications.overlap_hits.overlap_assignment_ids
    )


def test_get_replacement_candidates_overlap_from_previous_day(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test that multi-day shifts from previous day trigger overlap hits.

    A worker on a 36-hour duty starting on the previous day should have
    an overlap hit when considered for a morning shift replacement on
    the next day.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Select target assignment for morning shift
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )
    target_date = target_assignment.date
    previous_date = target_date - timedelta(days=1)

    # Find a worker without assignment on target date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    test_worker = next(
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    )

    # Create a 36-hour duty shift (08:00 to 20:00 next day)
    duty_36h = Shift(
        id="shift_duty_36h",
        team_id=base_team_id,
        name="36h Duty",
        acronym="D36",
        acronym_custom=False,
        start_time=create_shift_datetime(8, 0, 0),  # 08:00 day 0
        end_time=create_shift_datetime(20, 0, 1),  # 20:00 day 1 (36 hours)
        staffing=[
            Staffing(specialty_id="specialty_general", staffing=1),
        ],
        color="#FF6B6B",
        shift_type=ShiftType.DUTY,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=12,
        recuperation_duty_id=None,
        deleted=False,
    )

    # Create assignment for 36h duty starting previous day
    duty_36h_assignment = Assignment(
        id="assignment_duty_36h_overlap",
        team_id=base_team_id,
        schedule_id=None,
        worker_id=test_worker.id,
        date=previous_date,  # Starts on previous day
        shift_id="shift_duty_36h",
        fixed=False,
        source=AssignmentSource.MANUAL,
    )

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Mock get_assignments_by_dates to include the 36h duty assignment
    all_assignments = assignments + [duty_36h_assignment]
    mock_collection.assignment_db.get_assignments_by_dates.return_value = (
        all_assignments
    )

    # Mock shift_db to include the 36h duty shift
    all_shifts = base_shifts + [duty_36h]
    mock_collection.shift_db.get_shifts_not_deleted.return_value = all_shifts

    # Act
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Find test worker candidate
    test_candidate = next(
        c for c in candidates if c.worker_id == test_worker.id
    )

    # Should be CANT_DO - 36h duty from previous day overlaps with morning
    assert_candidate(
        test_candidate,
        expected_category="cant_do",
        hasnt_overlap=False,
        weekly_time_meets_target=False,  # Likely exceeds weekly hours
    )

    # Verify that the overlapping assignment ID is present
    assert (
        duty_36h_assignment.id
        in test_candidate.replacement_implications.overlap_hits.overlap_assignment_ids
    )


def test_get_replacement_candidates_overlap_all_shift_types(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """Test that overlaps are detected for all shift types.

    Overlaps should be caught regardless of shift type:
    normal, duty, rest, and leave shifts.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Select target assignment for morning shift
    target_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )
    target_date = target_assignment.date

    # Find 4 workers without assignments on target date
    workers_with_assignments_on_date = {
        a.worker_id for a in assignments if a.date == target_date
    }
    test_workers = [
        w for w in base_workers if w.id not in workers_with_assignments_on_date
    ][:4]

    # Create overlapping shifts of different types
    # 1. Normal shift (08:00 to 16:00 - same as morning)
    normal_overlapping = Shift(
        id="shift_normal_overlap",
        team_id=base_team_id,
        name="Normal Overlap",
        acronym="NO",
        acronym_custom=False,
        start_time=create_shift_datetime(8, 0, 0),
        end_time=create_shift_datetime(16, 0, 0),
        staffing=[
            Staffing(specialty_id="specialty_general", staffing=1),
        ],
        color="#00FF00",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )

    # 2. Duty shift (08:00 to 20:00 - overlaps with morning)
    duty_overlapping = Shift(
        id="shift_duty_overlap_type",
        team_id=base_team_id,
        name="Duty Overlap",
        acronym="DO",
        acronym_custom=False,
        start_time=create_shift_datetime(8, 0, 0),
        end_time=create_shift_datetime(20, 0, 0),
        staffing=[
            Staffing(specialty_id="specialty_general", staffing=1),
        ],
        color="#FF0000",
        shift_type=ShiftType.DUTY,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=12,
        recuperation_duty_id=None,
        deleted=False,
    )

    # 3. Rest shift (recuperation 08:00 to 16:00)
    rest_overlapping = Shift(
        id="shift_rest_overlap",
        team_id=base_team_id,
        name="Rest Overlap",
        acronym="RO",
        acronym_custom=False,
        start_time=create_shift_datetime(8, 0, 0),
        end_time=create_shift_datetime(16, 0, 0),
        staffing=[
            Staffing(specialty_id="specialty_general", staffing=1),
        ],
        color="#0000FF",
        shift_type=ShiftType.REST,
        rest_type=ShiftRestType.RECUPERATION,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )

    # 4. Leave shift (vacation 08:00 to 16:00)
    leave_overlapping = Shift(
        id="shift_leave_overlap",
        team_id=base_team_id,
        name="Leave Overlap",
        acronym="LO",
        acronym_custom=False,
        start_time=create_shift_datetime(8, 0, 0),
        end_time=create_shift_datetime(16, 0, 0),
        staffing=[
            Staffing(specialty_id="specialty_general", staffing=1),
        ],
        color="#FFFF00",
        shift_type=ShiftType.LEAVE,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.VACATION,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )

    # Create assignments for each worker with different shift types
    normal_assignment = Assignment(
        id="assignment_normal_overlap",
        team_id=base_team_id,
        schedule_id=None,
        worker_id=test_workers[0].id,
        date=target_date,
        shift_id="shift_normal_overlap",
        fixed=False,
        source=AssignmentSource.MANUAL,
    )

    duty_assignment = Assignment(
        id="assignment_duty_overlap_type",
        team_id=base_team_id,
        schedule_id=None,
        worker_id=test_workers[1].id,
        date=target_date,
        shift_id="shift_duty_overlap_type",
        fixed=False,
        source=AssignmentSource.MANUAL,
    )

    rest_assignment = Assignment(
        id="assignment_rest_overlap",
        team_id=base_team_id,
        schedule_id=None,
        worker_id=test_workers[2].id,
        date=target_date,
        shift_id="shift_rest_overlap",
        fixed=False,
        source=AssignmentSource.MANUAL,
    )

    leave_assignment = Assignment(
        id="assignment_leave_overlap",
        team_id=base_team_id,
        schedule_id=None,
        worker_id=test_workers[3].id,
        date=target_date,
        shift_id="shift_leave_overlap",
        fixed=False,
        source=AssignmentSource.MANUAL,
    )

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        target_assignment
    ]

    # Mock get_assignments_by_dates to include all overlapping assignments
    all_assignments = assignments + [
        normal_assignment,
        duty_assignment,
        rest_assignment,
        leave_assignment,
    ]
    mock_collection.assignment_db.get_assignments_by_dates.return_value = (
        all_assignments
    )

    # Mock shift_db to include all shifts
    all_shifts = base_shifts + [
        normal_overlapping,
        duty_overlapping,
        rest_overlapping,
        leave_overlapping,
    ]
    mock_collection.shift_db.get_shifts_not_deleted.return_value = all_shifts

    # Act
    candidates = service.get_replacement_candidates(
        assignment_id=target_assignment.id,
        team_id=base_team_id,
    )

    # Assert - Check each worker has overlap hit
    normal_candidate = next(
        c for c in candidates if c.worker_id == test_workers[0].id
    )
    duty_candidate = next(
        c for c in candidates if c.worker_id == test_workers[1].id
    )
    rest_candidate = next(
        c for c in candidates if c.worker_id == test_workers[2].id
    )
    leave_candidate = next(
        c for c in candidates if c.worker_id == test_workers[3].id
    )

    # All should be CANT_DO due to overlap
    assert_candidate(
        normal_candidate,
        expected_category="cant_do",
        hasnt_overlap=False,
    )
    assert (
        normal_assignment.id
        in normal_candidate.replacement_implications.overlap_hits.overlap_assignment_ids
    )

    assert_candidate(
        duty_candidate,
        expected_category="cant_do",
        hasnt_overlap=False,
    )
    assert (
        duty_assignment.id
        in duty_candidate.replacement_implications.overlap_hits.overlap_assignment_ids
    )

    assert_candidate(
        rest_candidate,
        expected_category="cant_do",
        hasnt_overlap=False,
    )
    assert (
        rest_assignment.id
        in rest_candidate.replacement_implications.overlap_hits.overlap_assignment_ids
    )

    assert_candidate(
        leave_candidate,
        expected_category="cant_do",
        hasnt_overlap=False,
    )
    assert (
        leave_assignment.id
        in leave_candidate.replacement_implications.overlap_hits.overlap_assignment_ids
    )


# ============================================================================
# Filter Hits Tests
# ============================================================================


def test_get_replacement_candidates_worker_without_attribute_filtered_out(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """
    Test that a worker without any attribute is filtered out when replacing
    a shift that has an attribute.
    """
    service, mock_db, base_assignments = mock_replacement_service

    # Create a test dimension with WORKER and SHIFT types, DIM_ENTRIES entry type
    test_dimension = Dimension(
        id="test_dim_1",
        team_id=base_team_id,
        dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
        name="Skill Level",
        entry_type=DimensionEntryType.DIM_ENTRIES,
        deleted=False,
    )

    # Create two dim entries for this dimension
    dim_entry_1 = DimEntry(
        id="dim_entry_1",
        dimension_id=test_dimension.id,
        name="Level 1",
        deleted=False,
    )
    dim_entry_2 = DimEntry(
        id="dim_entry_2",
        dimension_id=test_dimension.id,
        name="Level 2",
        deleted=False,
    )

    # Get morning shift and two workers for testing
    morning_shift = next(s for s in base_shifts if s.id == "shift_morning")
    worker_with_no_attr = base_workers[0]  # This worker has no attribute
    worker_with_attr = base_workers[1]  # This worker has matching attribute

    # Create attribute for morning shift with first dim entry
    shift_attribute = Attribute(
        id="attr_shift_1",
        value=True,
        owner_type=AttributeOwnerType.SHIFT,
        owner_id=morning_shift.id,
        dimension_id=test_dimension.id,
        dim_entry_ids=[dim_entry_1.id],
    )

    # Create attribute for worker_with_attr with first dim entry (matching shift)
    worker_attribute = Attribute(
        id="attr_worker_1",
        value=True,
        owner_type=AttributeOwnerType.WORKER,
        owner_id=worker_with_attr.id,
        dimension_id=test_dimension.id,
        dim_entry_ids=[dim_entry_1.id],
    )

    # Create an assignment to be replaced
    replacement_date = date(2025, 1, 15)
    assignment_to_replace = Assignment(
        id="assignment_without_attr",
        team_id=base_team_id,
        schedule_id=None,
        worker_id=base_workers[2].id,
        date=replacement_date,
        shift_id=morning_shift.id,
        fixed=False,
        source=AssignmentSource.MANUAL,
    )

    # Update mock to return our test data
    mock_db.assignment_db.get_assignments_by_ids.return_value = [
        assignment_to_replace
    ]
    mock_db.assignment_db.get_assignments_by_dates.return_value = (
        base_assignments + [assignment_to_replace]
    )
    mock_db.shift_db.get_shifts_not_deleted.return_value = base_shifts
    mock_db.worker_db.get_workers_not_deleted.return_value = base_workers
    mock_db.dimension_db.get_dimensions.return_value = [test_dimension]
    mock_db.dim_entry_db.get_dim_entries_by_dim_ids.return_value = [
        dim_entry_1,
        dim_entry_2,
    ]
    mock_db.attribute_db.get_attributes_by_owner_ids.return_value = [
        shift_attribute,
        worker_attribute,
    ]

    candidates = service.get_replacement_candidates(
        assignment_id=assignment_to_replace.id,
        team_id=base_team_id,
    )

    # Find candidates for our test workers
    no_attr_candidate = next(
        (c for c in candidates if c.worker_id == worker_with_no_attr.id), None
    )
    with_attr_candidate = next(
        (c for c in candidates if c.worker_id == worker_with_attr.id), None
    )

    assert no_attr_candidate is not None
    assert with_attr_candidate is not None

    # Worker without attribute should be filtered out
    assert_candidate(
        no_attr_candidate,
        expected_category="cant_do",
        isnt_filtered_out=False,
    )
    filter_hits = no_attr_candidate.replacement_implications.filter_hits
    assert not filter_hits.isnt_filtered_out
    # assert len(filter_hits.filter_labels) > 0
    # assert any(
    #     test_dimension.name in label and dim_entry_1.name in label
    #     for label in filter_hits.filter_labels
    # )

    # Worker with matching attribute should NOT be filtered out
    assert_candidate(
        with_attr_candidate,
        expected_category="can_do",
        isnt_filtered_out=True,
    )
    filter_hits = with_attr_candidate.replacement_implications.filter_hits
    assert filter_hits.isnt_filtered_out
    assert len(filter_hits.filter_labels) == 0


def test_get_replacement_candidates_worker_with_different_attribute_filtered_out(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """
    Test that a worker with a different attribute from the shift is filtered out.
    """
    service, mock_db, base_assignments = mock_replacement_service

    # Create a test dimension
    test_dimension = Dimension(
        id="test_dim_1",
        team_id=base_team_id,
        dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
        name="Certification",
        entry_type=DimensionEntryType.DIM_ENTRIES,
        deleted=False,
    )

    # Create two dim entries
    dim_entry_1 = DimEntry(
        id="dim_entry_1",
        dimension_id=test_dimension.id,
        name="Basic",
        deleted=False,
    )
    dim_entry_2 = DimEntry(
        id="dim_entry_2",
        dimension_id=test_dimension.id,
        name="Advanced",
        deleted=False,
    )

    # Get morning shift and workers
    morning_shift = next(s for s in base_shifts if s.name == "Morning")
    worker_with_matching_attr = base_workers[0]
    worker_with_different_attr = base_workers[1]

    # Create attribute for morning shift with first dim entry
    shift_attribute = Attribute(
        id="attr_shift_1",
        value=True,
        owner_type=AttributeOwnerType.SHIFT,
        owner_id=morning_shift.id,
        dimension_id=test_dimension.id,
        dim_entry_ids=[dim_entry_1.id],
    )

    # Create attribute for first worker with first dim entry (matching)
    worker_attribute_matching = Attribute(
        id="attr_worker_1",
        value=True,
        owner_type=AttributeOwnerType.WORKER,
        owner_id=worker_with_matching_attr.id,
        dimension_id=test_dimension.id,
        dim_entry_ids=[dim_entry_1.id],
    )

    # Create attribute for second worker with second dim entry (different)
    worker_attribute_different = Attribute(
        id="attr_worker_2",
        value=True,
        owner_type=AttributeOwnerType.WORKER,
        owner_id=worker_with_different_attr.id,
        dimension_id=test_dimension.id,
        dim_entry_ids=[dim_entry_2.id],
    )

    # Create an assignment to be replaced
    replacement_date = date(2025, 1, 15)
    assignment_to_replace = Assignment(
        id="assignment_diff_attr",
        team_id=base_team_id,
        schedule_id=None,
        worker_id=base_workers[2].id,
        date=replacement_date,
        shift_id=morning_shift.id,
        fixed=False,
        source=AssignmentSource.MANUAL,
    )

    # Update mock
    mock_db.get_assignments_by_id.return_value = [assignment_to_replace]
    mock_db.get_assignments_by_team_id.return_value = base_assignments
    mock_db.get_shifts_by_team_id.return_value = base_shifts
    mock_db.get_workers_by_team_id.return_value = base_workers
    mock_db.get_specialties_by_team_id.return_value = []
    mock_db.get_requests_by_team_id.return_value = []
    mock_db.get_constraint_builds_by_team_id.return_value = []
    mock_db.get_dimensions_by_team_id.return_value = [test_dimension]
    mock_db.get_dim_entries_by_team_id.return_value = [
        dim_entry_1,
        dim_entry_2,
    ]
    mock_db.get_attributes_by_team_id.return_value = [
        shift_attribute,
        worker_attribute_matching,
        worker_attribute_different,
    ]

    candidates = service.get_replacement_candidates(
        assignment_id=assignment_to_replace.id,
        team_id=base_team_id,
    )

    # Find candidates
    matching_candidate = next(
        (c for c in candidates if c.worker.id == worker_with_matching_attr.id),
        None,
    )
    different_candidate = next(
        (
            c
            for c in candidates
            if c.worker.id == worker_with_different_attr.id
        ),
        None,
    )

    assert matching_candidate is not None
    assert different_candidate is not None

    # Worker with matching attribute should NOT be filtered out
    assert_candidate(
        matching_candidate,
        expected_category="can_do",
        isnt_filtered_out=True,
    )
    filter_hits = matching_candidate.replacement_implications.filter_hits
    assert filter_hits.isnt_filtered_out
    assert len(filter_hits.filter_labels) == 0

    # Worker with different attribute should be filtered out
    assert_candidate(
        different_candidate,
        expected_category="cant_do",
        isnt_filtered_out=False,
    )
    filter_hits = different_candidate.replacement_implications.filter_hits
    assert not filter_hits.isnt_filtered_out
    assert len(filter_hits.filter_labels) > 0
    assert any(
        test_dimension.name in label and dim_entry_1.name in label
        for label in filter_hits.filter_labels
    )


def test_get_replacement_candidates_worker_with_same_attribute_not_filtered(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """
    Test that a worker with the same attribute as the shift is NOT filtered out.
    """
    service, mock_db, base_assignments = mock_replacement_service

    # Create a test dimension
    test_dimension = Dimension(
        id="test_dim_1",
        team_id=base_team_id,
        dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
        name="Department",
        entry_type=DimensionEntryType.DIM_ENTRIES,
        deleted=False,
    )

    # Create dim entries
    dim_entry_1 = DimEntry(
        id="dim_entry_1",
        dimension_id=test_dimension.id,
        name="Emergency",
        deleted=False,
    )
    dim_entry_2 = DimEntry(
        id="dim_entry_2",
        dimension_id=test_dimension.id,
        name="ICU",
        deleted=False,
    )

    # Get morning shift and worker
    morning_shift = next(s for s in base_shifts if s.name == "Morning")
    worker_with_matching_attr = base_workers[0]

    # Create attribute for morning shift
    shift_attribute = Attribute(
        id="attr_shift_1",
        value=True,
        owner_type=AttributeOwnerType.SHIFT,
        owner_id=morning_shift.id,
        dimension_id=test_dimension.id,
        dim_entry_ids=[dim_entry_1.id],
    )

    # Create matching attribute for worker
    worker_attribute = Attribute(
        id="attr_worker_1",
        value=True,
        owner_type=AttributeOwnerType.WORKER,
        owner_id=worker_with_matching_attr.id,
        dimension_id=test_dimension.id,
        dim_entry_ids=[dim_entry_1.id],
    )

    # Create an assignment to be replaced
    replacement_date = date(2025, 1, 15)
    assignment_to_replace = Assignment(
        id="assignment_same_attr",
        team_id=base_team_id,
        schedule_id=None,
        worker_id=base_workers[2].id,
        date=replacement_date,
        shift_id=morning_shift.id,
        fixed=False,
        source=AssignmentSource.MANUAL,
    )

    # Update mock
    mock_db.get_assignments_by_id.return_value = [assignment_to_replace]
    mock_db.get_assignments_by_team_id.return_value = base_assignments
    mock_db.get_shifts_by_team_id.return_value = base_shifts
    mock_db.get_workers_by_team_id.return_value = base_workers
    mock_db.get_specialties_by_team_id.return_value = []
    mock_db.get_requests_by_team_id.return_value = []
    mock_db.get_constraint_builds_by_team_id.return_value = []
    mock_db.get_dimensions_by_team_id.return_value = [test_dimension]
    mock_db.get_dim_entries_by_team_id.return_value = [
        dim_entry_1,
        dim_entry_2,
    ]
    mock_db.get_attributes_by_team_id.return_value = [
        shift_attribute,
        worker_attribute,
    ]

    candidates = service.get_replacement_candidates(
        assignment_id=assignment_to_replace.id,
        team_id=base_team_id,
    )

    # Find the candidate
    matching_candidate = next(
        (c for c in candidates if c.worker.id == worker_with_matching_attr.id),
        None,
    )

    assert matching_candidate is not None

    # Worker with matching attribute should NOT be filtered out
    assert_candidate(
        matching_candidate,
        expected_category="can_do",
        isnt_filtered_out=True,
    )
    filter_hits = matching_candidate.replacement_implications.filter_hits
    assert filter_hits.isnt_filtered_out
    assert len(filter_hits.filter_labels) == 0


def test_get_replacement_candidates_worker_with_attribute_not_filtered_for_shift_without_attribute(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_workers: List[Worker],
    base_shifts: List[Shift],
    base_team_id: str,
) -> None:
    """
    Test that a worker with an attribute is NOT filtered out when replacing
    a shift that doesn't have any attribute.
    """
    service, mock_db, base_assignments = mock_replacement_service

    # Create a test dimension
    test_dimension = Dimension(
        id="test_dim_1",
        team_id=base_team_id,
        dim_types=[DimensionType.WORKER, DimensionType.SHIFT],
        name="Training",
        entry_type=DimensionEntryType.DIM_ENTRIES,
        deleted=False,
    )

    # Create dim entries
    dim_entry_1 = DimEntry(
        id="dim_entry_1",
        dimension_id=test_dimension.id,
        name="Trained",
        deleted=False,
    )
    dim_entry_2 = DimEntry(
        id="dim_entry_2",
        dimension_id=test_dimension.id,
        name="Expert",
        deleted=False,
    )

    # Get morning shift (which will NOT have an attribute)
    morning_shift = next(s for s in base_shifts if s.name == "Morning")
    worker_with_attr = base_workers[0]

    # Create attribute for worker only (shift has no attribute)
    worker_attribute = Attribute(
        id="attr_worker_1",
        value=True,
        owner_type=AttributeOwnerType.WORKER,
        owner_id=worker_with_attr.id,
        dimension_id=test_dimension.id,
        dim_entry_ids=[dim_entry_1.id],
    )

    # Create an assignment to be replaced
    replacement_date = date(2025, 1, 15)
    assignment_to_replace = Assignment(
        id="assignment_shift_no_attr",
        team_id=base_team_id,
        schedule_id=None,
        worker_id=base_workers[2].id,
        date=replacement_date,
        shift_id=morning_shift.id,
        fixed=False,
        source=AssignmentSource.MANUAL,
    )

    # Update mock
    mock_db.get_assignments_by_id.return_value = [assignment_to_replace]
    mock_db.get_assignments_by_team_id.return_value = base_assignments
    mock_db.get_shifts_by_team_id.return_value = base_shifts
    mock_db.get_workers_by_team_id.return_value = base_workers
    mock_db.get_specialties_by_team_id.return_value = []
    mock_db.get_requests_by_team_id.return_value = []
    mock_db.get_constraint_builds_by_team_id.return_value = []
    mock_db.get_dimensions_by_team_id.return_value = [test_dimension]
    mock_db.get_dim_entries_by_team_id.return_value = [
        dim_entry_1,
        dim_entry_2,
    ]
    mock_db.get_attributes_by_team_id.return_value = [worker_attribute]

    candidates = service.get_replacement_candidates(
        assignment_id=assignment_to_replace.id,
        team_id=base_team_id,
    )

    # Find the candidate
    worker_candidate = next(
        (c for c in candidates if c.worker.id == worker_with_attr.id), None
    )

    assert worker_candidate is not None

    # Worker with attribute should NOT be filtered out for shift without attribute
    assert_candidate(
        worker_candidate,
        expected_category="can_do",
        isnt_filtered_out=True,
    )
    filter_hits = worker_candidate.replacement_implications.filter_hits
    assert filter_hits.isnt_filtered_out
    assert len(filter_hits.filter_labels) == 0
