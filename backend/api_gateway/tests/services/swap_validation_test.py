"""
Tests for ReplacementService.validate_assignment_swap.

This module contains comprehensive tests for the swap validation system,
using reusable base test data fixtures from conftest.py.
"""

from datetime import date
from typing import List, Tuple
from unittest.mock import MagicMock

import pytest
from shared.schemas.core import Assignment, AssignmentSource

from src.services.replacement_service import (
    ReplacementService,
    SwapAssignmentInfo,
    SwapValidationResult,
)

# ============================================================================
# Helper Functions for Swap Validation Assertions
# ============================================================================


def assert_swap_valid(
    result: SwapValidationResult,
    expected_message: str = "Swap is valid for both workers",
) -> None:
    """Assert that a swap validation result is valid.

    Args:
        result: The swap validation result to check
        expected_message: Expected validation message
    """
    assert (
        result.is_valid is True
    ), f"Expected swap to be valid, but got: {result.validation_message}"
    assert result.validation_message == expected_message
    assert result.worker_a_info is not None
    assert result.worker_b_info is not None


def assert_swap_invalid(
    result: SwapValidationResult,
    expected_invalid_for: str | None = None,
) -> None:
    """Assert that a swap validation result is invalid.

    Args:
        result: The swap validation result to check
        expected_invalid_for: Expected string in validation message
            (e.g., "both", "Worker 1", or None for any invalid)
    """
    assert (
        result.is_valid is False
    ), "Expected swap to be invalid, but it was valid"
    if expected_invalid_for:
        assert expected_invalid_for in result.validation_message, (
            f"Expected '{expected_invalid_for}' in message, "
            f"got: {result.validation_message}"
        )


def assert_worker_can_do_swap(info: SwapAssignmentInfo) -> None:
    """Assert all swapped implications pass hard constraints.

    Args:
        info: SwapAssignmentInfo for the worker
    """
    for i, impl in enumerate(info.swapped_implications):
        assert (
            impl.is_employed
        ), f"Worker {info.worker_name} swapped assignment {i}: not employed"
        assert (
            impl.has_specialty
        ), f"Worker {info.worker_name} swapped assignment {i}: lacks specialty"
        assert (
            impl.isnt_on_leave
        ), f"Worker {info.worker_name} swapped assignment {i}: on leave"
        assert (
            impl.filter_hits.isnt_filtered_out
        ), f"Worker {info.worker_name} swapped assignment {i}: filtered out"
        assert (
            impl.overlap_hits.hasnt_overlap
        ), f"Worker {info.worker_name} swapped assignment {i}: has overlap"
        assert impl.hard_constraint_hits.meets_constraints, (
            f"Worker {info.worker_name} swapped assignment {i}: "
            f"hard constraint violation"
        )
        assert (
            impl.request_hits.has_no_request_conflict
        ), f"Worker {info.worker_name} swapped assignment {i}: request conflict"


def assert_worker_cannot_do_swap(
    info: SwapAssignmentInfo,
    expected_failure: str | None = None,
) -> None:
    """Assert at least one swapped implication fails hard constraints.

    Args:
        info: SwapAssignmentInfo for the worker
        expected_failure: Type of expected failure (e.g., "overlap", "specialty")
    """
    has_failure = False
    failure_types = []

    for impl in info.swapped_implications:
        if not impl.is_employed:
            has_failure = True
            failure_types.append("employment")
        if not impl.has_specialty:
            has_failure = True
            failure_types.append("specialty")
        if not impl.isnt_on_leave:
            has_failure = True
            failure_types.append("leave")
        if not impl.filter_hits.isnt_filtered_out:
            has_failure = True
            failure_types.append("filter")
        if not impl.overlap_hits.hasnt_overlap:
            has_failure = True
            failure_types.append("overlap")
        if not impl.hard_constraint_hits.meets_constraints:
            has_failure = True
            failure_types.append("hard_constraint")
        if not impl.request_hits.has_no_request_conflict:
            has_failure = True
            failure_types.append("request")

    assert (
        has_failure
    ), f"Expected worker {info.worker_name} to fail swap, but all constraints passed"

    if expected_failure:
        assert expected_failure in failure_types, (
            f"Expected failure type '{expected_failure}', "
            f"but got: {failure_types}"
        )


def assert_swap_implications_structure(info: SwapAssignmentInfo) -> None:
    """Assert the structure of SwapAssignmentInfo is correct.

    Args:
        info: SwapAssignmentInfo to validate
    """
    assert isinstance(info.worker_id, str)
    assert isinstance(info.worker_name, str)
    assert isinstance(info.assignment_ids, list)
    assert isinstance(info.current_implications, list)
    assert isinstance(info.swapped_implications, list)
    assert len(info.current_implications) == len(
        info.assignment_ids
    ), "Current implications count should match assignment count"
    assert (
        len(info.swapped_implications) > 0
    ), "Should have swapped implications"


# ============================================================================
# Tests: Basic Valid Swaps
# ============================================================================


def test_validate_swap_simple_valid_swap(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_team_id: str,
) -> None:
    """Test valid swap between two workers with single assignments.

    This is a smoke test to verify basic swap validation works with
    simple, non-conflicting assignments.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Find two workers with morning shifts on different days
    # We'll pick the first and second morning shift assignments
    morning_assignments = [
        a for a in assignments if a.shift_id == "shift_morning"
    ]

    # Make sure they're on different dates
    worker_a_assignment = morning_assignments[0]
    worker_b_assignment = next(
        a
        for a in morning_assignments[1:]
        if a.date != worker_a_assignment.date
        and a.worker_id != worker_a_assignment.worker_id
    )

    # Mock get_assignments_by_ids to return both assignments
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        worker_a_assignment,
        worker_b_assignment,
    ]

    # Act
    result = service.validate_assignment_swap(
        worker_a_assignment_ids=[worker_a_assignment.id],
        worker_b_assignment_ids=[worker_b_assignment.id],
        team_id=base_team_id,
    )

    # Assert
    assert_swap_valid(result)
    assert_swap_implications_structure(result.worker_a_info)
    assert_swap_implications_structure(result.worker_b_info)
    assert_worker_can_do_swap(result.worker_a_info)
    assert_worker_can_do_swap(result.worker_b_info)

    # Verify correct workers
    assert result.worker_a_info.worker_id == worker_a_assignment.worker_id
    assert result.worker_b_info.worker_id == worker_b_assignment.worker_id

    # Verify assignment IDs
    assert result.worker_a_info.assignment_ids == [worker_a_assignment.id]
    assert result.worker_b_info.assignment_ids == [worker_b_assignment.id]


def test_validate_swap_multi_assignment_valid(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_team_id: str,
) -> None:
    """Test valid swap with multiple assignments per worker.

    This test verifies that swapping multiple assignments works when
    there are no conflicts.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Find a worker with both morning and afternoon shifts on the same day
    worker_a_assignments: List[Assignment] = []
    target_date = date(2026, 1, 5)  # A weekday

    for a in assignments:
        if a.date == target_date and a.shift_id in [
            "shift_morning",
            "shift_afternoon",
        ]:
            if not worker_a_assignments:
                worker_a_assignments.append(a)
            elif a.worker_id == worker_a_assignments[0].worker_id:
                worker_a_assignments.append(a)
                break

    # If worker_a doesn't have both shifts, create the missing one
    if len(worker_a_assignments) == 1:
        existing_shift = worker_a_assignments[0].shift_id
        missing_shift_id = (
            "shift_afternoon"
            if existing_shift == "shift_morning"
            else "shift_morning"
        )
        missing_assignment = Assignment(
            id=f"test_assignment_{worker_a_assignments[0].worker_id}_{missing_shift_id}",
            team_id=base_team_id,
            schedule_id=None,
            worker_id=worker_a_assignments[0].worker_id,
            date=target_date,
            shift_id=missing_shift_id,
            fixed=False,
            source=AssignmentSource.MANUAL,
        )
        worker_a_assignments.append(missing_assignment)
        assignments.append(missing_assignment)
    elif len(worker_a_assignments) == 0:
        # No assignments found, create both
        worker_id = "worker_1"
        for shift_id in ["shift_morning", "shift_afternoon"]:
            new_assignment = Assignment(
                id=f"test_assignment_{worker_id}_{shift_id}",
                team_id=base_team_id,
                schedule_id=None,
                worker_id=worker_id,
                date=target_date,
                shift_id=shift_id,
                fixed=False,
                source=AssignmentSource.MANUAL,
            )
            worker_a_assignments.append(new_assignment)
            assignments.append(new_assignment)

    # Find another worker with morning and afternoon on a different day
    worker_b_assignments: List[Assignment] = []
    target_date_b = date(2026, 1, 12)  # Different weekday

    for a in assignments:
        if (
            a.date == target_date_b
            and a.shift_id in ["shift_morning", "shift_afternoon"]
            and a.worker_id != worker_a_assignments[0].worker_id
        ):
            if not worker_b_assignments:
                worker_b_assignments.append(a)
            elif a.worker_id == worker_b_assignments[0].worker_id:
                worker_b_assignments.append(a)
                break

    # If worker_b doesn't have both shifts, create the missing one
    if len(worker_b_assignments) == 1:
        existing_shift = worker_b_assignments[0].shift_id
        missing_shift_id = (
            "shift_afternoon"
            if existing_shift == "shift_morning"
            else "shift_morning"
        )
        missing_assignment = Assignment(
            id=f"test_assignment_{worker_b_assignments[0].worker_id}_{missing_shift_id}",
            team_id=base_team_id,
            schedule_id=None,
            worker_id=worker_b_assignments[0].worker_id,
            date=target_date_b,
            shift_id=missing_shift_id,
            fixed=False,
            source=AssignmentSource.MANUAL,
        )
        worker_b_assignments.append(missing_assignment)
        assignments.append(missing_assignment)
    elif len(worker_b_assignments) == 0:
        # No assignments found, create both for a different worker
        worker_id = (
            "worker_2"
            if worker_a_assignments[0].worker_id != "worker_2"
            else "worker_3"
        )
        for shift_id in ["shift_morning", "shift_afternoon"]:
            new_assignment = Assignment(
                id=f"test_assignment_{worker_id}_{shift_id}",
                team_id=base_team_id,
                schedule_id=None,
                worker_id=worker_id,
                date=target_date_b,
                shift_id=shift_id,
                fixed=False,
                source=AssignmentSource.MANUAL,
            )
            worker_b_assignments.append(new_assignment)
            assignments.append(new_assignment)

    assert len(worker_a_assignments) == 2, "Worker A should have 2 assignments"
    assert len(worker_b_assignments) == 2, "Worker B should have 2 assignments"

    all_swap_assignments = worker_a_assignments + worker_b_assignments

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = (
        all_swap_assignments
    )

    # Act
    result = service.validate_assignment_swap(
        worker_a_assignment_ids=[a.id for a in worker_a_assignments],
        worker_b_assignment_ids=[a.id for a in worker_b_assignments],
        team_id=base_team_id,
    )

    # Assert
    assert_swap_valid(result)
    assert_swap_implications_structure(result.worker_a_info)
    assert_swap_implications_structure(result.worker_b_info)
    assert_worker_can_do_swap(result.worker_a_info)
    assert_worker_can_do_swap(result.worker_b_info)

    # Verify assignment counts
    assert len(result.worker_a_info.current_implications) == 2
    assert len(result.worker_a_info.swapped_implications) == 2
    assert len(result.worker_b_info.current_implications) == 2
    assert len(result.worker_b_info.swapped_implications) == 2


def test_validate_swap_same_day_different_shifts(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_team_id: str,
) -> None:
    """Test valid swap where workers exchange shifts on the same day.

    Worker A has morning shift on Day X, Worker B has afternoon shift on Day X.
    They swap, so A gets afternoon and B gets morning.
    """
    service, mock_collection, assignments = mock_replacement_service

    # Find morning and afternoon assignments on the same day
    target_date = date(2026, 1, 5)

    worker_a_assignment = next(
        a
        for a in assignments
        if a.date == target_date and a.shift_id == "shift_morning"
    )

    worker_b_assignment = next(
        a
        for a in assignments
        if a.date == target_date
        and a.shift_id == "shift_afternoon"
        and a.worker_id != worker_a_assignment.worker_id
    )

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        worker_a_assignment,
        worker_b_assignment,
    ]

    # Act
    result = service.validate_assignment_swap(
        worker_a_assignment_ids=[worker_a_assignment.id],
        worker_b_assignment_ids=[worker_b_assignment.id],
        team_id=base_team_id,
    )

    # Assert
    assert_swap_valid(result)
    assert_worker_can_do_swap(result.worker_a_info)
    assert_worker_can_do_swap(result.worker_b_info)


# ============================================================================
# Tests: Invalid Swaps - Overlap
# ============================================================================


def test_validate_swap_invalid_overlap(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_team_id: str,
) -> None:
    """Test invalid swap due to overlapping shifts.

    Worker A has morning shift on Day X and afternoon shift on Day Y.
    Worker B has morning + afternoon shifts on Day Y.
    Worker A swaps morning on Day X for Worker B's morning + afternoon on Day Y.
    After swap, Worker A has conflicting afternoon shifts on Day Y (overlap).
    """
    service, mock_collection, assignments = mock_replacement_service

    # Day X and Day Y
    target_date_x = date(2026, 1, 5)
    target_date_y = date(2026, 1, 12)

    # Find Worker A with morning shift on Day X
    worker_a_morning_x = next(
        (
            a
            for a in assignments
            if a.date == target_date_x and a.shift_id == "shift_morning"
        ),
        None,
    )

    # Find or create Worker A's afternoon shift on Day Y
    worker_a_afternoon_y = next(
        (
            a
            for a in assignments
            if a.date == target_date_y
            and a.shift_id == "shift_afternoon"
            and a.worker_id
            == (
                worker_a_morning_x.worker_id
                if worker_a_morning_x
                else "worker_1"
            )
        ),
        None,
    )

    # Create assignments if not found
    if not worker_a_morning_x:
        worker_a_morning_x = Assignment(
            id="test_worker_a_morning_x",
            team_id=base_team_id,
            schedule_id=None,
            worker_id="worker_1",
            date=target_date_x,
            shift_id="shift_morning",
            fixed=False,
            source=AssignmentSource.MANUAL,
        )
        assignments.append(worker_a_morning_x)

    if not worker_a_afternoon_y:
        worker_a_afternoon_y = Assignment(
            id="test_worker_a_afternoon_y",
            team_id=base_team_id,
            schedule_id=None,
            worker_id=worker_a_morning_x.worker_id,
            date=target_date_y,
            shift_id="shift_afternoon",
            fixed=False,
            source=AssignmentSource.MANUAL,
        )
        assignments.append(worker_a_afternoon_y)

    # Find Worker B with morning AND afternoon on Day Y (different worker)
    worker_b_assignments = [
        a
        for a in assignments
        if a.date == target_date_y
        and a.shift_id in ["shift_morning", "shift_afternoon"]
        and a.worker_id != worker_a_morning_x.worker_id
    ]

    # Filter to get a worker with both shifts on Day Y
    worker_b_id = None
    worker_b_morning_y = None
    worker_b_afternoon_y = None

    for a in worker_b_assignments:
        other_shift = next(
            (
                b
                for b in worker_b_assignments
                if b.worker_id == a.worker_id and b.id != a.id
            ),
            None,
        )
        if other_shift:
            worker_b_id = a.worker_id
            if a.shift_id == "shift_morning":
                worker_b_morning_y = a
                worker_b_afternoon_y = other_shift
            else:
                worker_b_afternoon_y = a
                worker_b_morning_y = other_shift
            break

    # Create Worker B assignments if not found
    if not worker_b_id:
        worker_b_id = (
            "worker_2"
            if worker_a_morning_x.worker_id != "worker_2"
            else "worker_3"
        )
        worker_b_morning_y = Assignment(
            id="test_worker_b_morning_y",
            team_id=base_team_id,
            schedule_id=None,
            worker_id=worker_b_id,
            date=target_date_y,
            shift_id="shift_morning",
            fixed=False,
            source=AssignmentSource.MANUAL,
        )
        worker_b_afternoon_y = Assignment(
            id="test_worker_b_afternoon_y",
            team_id=base_team_id,
            schedule_id=None,
            worker_id=worker_b_id,
            date=target_date_y,
            shift_id="shift_afternoon",
            fixed=False,
            source=AssignmentSource.MANUAL,
        )
        assignments.extend([worker_b_morning_y, worker_b_afternoon_y])

    # The swap: Worker A swaps morning on Day X for Worker B's morning + afternoon on Day Y
    # Worker A keeps their afternoon on Day Y (not part of swap)
    # After swap, Worker A would have:
    # - Worker B's morning on Day Y (from swap)
    # - Worker B's afternoon on Day Y (from swap) <- CONFLICT with Worker A's existing afternoon
    # - Worker A's own afternoon on Day Y (not swapped)

    all_swap_assignments = [
        worker_a_morning_x,
        worker_b_morning_y,
        worker_b_afternoon_y,
    ]

    # Mock get_assignments_by_ids to return the swap assignments
    mock_collection.assignment_db.get_assignments_by_ids.return_value = (
        all_swap_assignments
    )

    # Act
    result = service.validate_assignment_swap(
        worker_a_assignment_ids=[worker_a_morning_x.id],
        worker_b_assignment_ids=[
            worker_b_morning_y.id,
            worker_b_afternoon_y.id,
        ],
        team_id=base_team_id,
    )

    # Assert - swap should be invalid due to overlap
    assert_swap_invalid(result)
    # Worker A would receive Worker B's afternoon on Day Y,
    # but Worker A already has an afternoon shift on Day Y, creating an overlap


# ============================================================================
# Tests: Input Validation
# ============================================================================


def test_validate_swap_raises_on_missing_assignment(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_team_id: str,
) -> None:
    """Test that swap validation raises error when assignment not found."""
    service, mock_collection, assignments = mock_replacement_service

    worker_a_assignment = next(
        a for a in assignments if a.shift_id == "shift_morning"
    )

    # Mock to return only one assignment (missing the second)
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        worker_a_assignment
    ]

    # Act & Assert
    with pytest.raises(ValueError, match="Worker B assignments not found"):
        service.validate_assignment_swap(
            worker_a_assignment_ids=[worker_a_assignment.id],
            worker_b_assignment_ids=["nonexistent_id"],
            team_id=base_team_id,
        )


def test_validate_swap_raises_on_same_worker(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_team_id: str,
) -> None:
    """Test that swap validation raises error when trying to swap same worker's
    assignments."""
    service, mock_collection, assignments = mock_replacement_service

    # Find two assignments from the same worker
    worker_assignments = [a for a in assignments if a.worker_id == "worker_1"][
        :2
    ]

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = (
        worker_assignments
    )

    # Act & Assert
    with pytest.raises(
        ValueError, match="Cannot swap assignments of the same worker"
    ):
        service.validate_assignment_swap(
            worker_a_assignment_ids=[worker_assignments[0].id],
            worker_b_assignment_ids=[worker_assignments[1].id],
            team_id=base_team_id,
        )


def test_validate_swap_raises_on_mixed_workers(
    mock_replacement_service: Tuple[
        ReplacementService, MagicMock, List[Assignment]
    ],
    base_team_id: str,
) -> None:
    """Test that swap validation raises error when worker A assignments belong
    to multiple workers."""
    service, mock_collection, assignments = mock_replacement_service

    # Get assignments from three different workers
    worker_1_assignment = next(
        a for a in assignments if a.worker_id == "worker_1"
    )
    worker_2_assignment = next(
        a for a in assignments if a.worker_id == "worker_2"
    )
    worker_3_assignment = next(
        a for a in assignments if a.worker_id == "worker_3"
    )

    # Mock get_assignments_by_ids
    mock_collection.assignment_db.get_assignments_by_ids.return_value = [
        worker_1_assignment,
        worker_2_assignment,
        worker_3_assignment,
    ]

    # Act & Assert
    with pytest.raises(
        ValueError,
        match="All worker A assignments must belong to the same worker",
    ):
        service.validate_assignment_swap(
            worker_a_assignment_ids=[
                worker_1_assignment.id,
                worker_2_assignment.id,
            ],
            worker_b_assignment_ids=[worker_3_assignment.id],
            team_id=base_team_id,
        )
