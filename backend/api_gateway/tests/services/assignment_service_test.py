from datetime import date
from typing import List, Tuple
from unittest.mock import MagicMock

import pytest
from shared.schemas.core import Assignment, ShiftType

from src.services.assignment_service import AssignmentService


@pytest.fixture
def mock_service() -> Tuple[AssignmentService, MagicMock]:
    mock_collection = MagicMock()
    service = AssignmentService(collection=mock_collection)
    return service, mock_collection


# pylint: disable=redefined-outer-name, R0801
def test_no_assignments(
    mock_service: Tuple[AssignmentService, MagicMock],
) -> None:
    service, mock_collection = mock_service

    # Mock the database response
    # fmt: off
    mock_collection.assignment_db\
        .get_assignments_by_team_and_shifts_today_onward.return_value = (
            []
        )
    # fmt: on

    # Call the method
    service.create_recuperation_assignments(
        "shift_duty_id", "shift_recup_id", "team_id"
    )

    # Assert no assignments were created
    mock_collection.assignment_db.create_assignments.assert_not_called()


def test_existing_recuperation_assignments(
    mock_service: Tuple[AssignmentService, MagicMock],
) -> None:
    service, mock_collection = mock_service

    # Mock the database response
    existing_assignments = [
        Assignment(
            id="1",
            team_id="team_id",
            schedule_id="schedule_id",
            worker_id="worker_1",
            date=date.today(),
            shift_id="shift_duty_id",
            fixed=False,
        ),
        Assignment(
            id="1",
            team_id="team_id",
            schedule_id="schedule_id",
            worker_id="worker_1",
            date=date.today(),
            shift_id="shift_recup_id",
            fixed=False,
        ),
    ]
    # fmt: off
    mock_collection.assignment_db\
        .get_assignments_by_team_and_shifts_today_onward.return_value = (
            existing_assignments
        )
    # fmt: on

    # Call the method
    service.create_recuperation_assignments(
        "shift_duty_id", "shift_recup_id", "team_id"
    )

    # Assert no new assignments were created
    mock_collection.assignment_db.create_assignments.assert_not_called()


def test_create_new_recuperation_assignments(
    mock_service: Tuple[AssignmentService, MagicMock],
) -> None:
    service, mock_collection = mock_service

    # Mock the database response
    duty_assignment = Assignment(
        id="1",
        team_id="team_id",
        schedule_id="schedule_id",
        worker_id="worker_1",
        date=date.today(),
        shift_id="shift_duty_id",
        fixed=False,
    )
    # fmt: off
    mock_collection.assignment_db\
        .get_assignments_by_team_and_shifts_today_onward.return_value = [
            duty_assignment
        ]
    # fmt: on

    # Call the method
    service.create_recuperation_assignments(
        "shift_duty_id", "shift_recup_id", "team_id"
    )

    # Assert new assignments were created
    mock_collection.assignment_db.create_assignments.assert_called_once()
    created_assignments = mock_collection.assignment_db.create_assignments.call_args[0][
        0
    ]
    assert len(created_assignments) == 1
    assert created_assignments[0].shift_id == "shift_recup_id"
    assert created_assignments[0].worker_id == duty_assignment.worker_id
    assert created_assignments[0].date == duty_assignment.date


def test_create_assignment_with_valid_shift(
    mock_service: Tuple[AssignmentService, MagicMock],
) -> None:
    service, mock_collection = mock_service

    # Mock the shift and assignment
    shift = MagicMock()
    shift.shift_type = ShiftType.NORMAL
    mock_collection.shift_db.get_shift_by_id.return_value = shift

    assignment_new = Assignment(
        id="",
        team_id="team_id",
        schedule_id="schedule_id",
        worker_id="worker_id",
        date=date.today(),
        shift_id="shift_id",
        fixed=False,
    )

    # Call the method
    service.create_assignment(assignment_new)

    # Assert the assignment was created
    mock_collection.assignment_db.create_assignment.assert_called_once_with(
        assignment_new
    )


def test_create_assignment_with_duty_shift(
    mock_service: Tuple[AssignmentService, MagicMock],
) -> None:
    service, mock_collection = mock_service

    # Mock the shift and recuperation shift
    shift = MagicMock()
    shift.shift_type = ShiftType.DUTY
    shift_recup = MagicMock()
    shift_recup.id = "recup_shift_id"

    mock_collection.shift_db.get_shift_by_id.return_value = shift
    mock_collection.shift_db.get_recuperation_shift.return_value = shift_recup

    assignment_new = Assignment(
        id="",
        team_id="team_id",
        schedule_id="schedule_id",
        worker_id="worker_id",
        date=date.today(),
        shift_id="shift_id",
        fixed=False,
    )

    # Mock the database response for saving assignments
    mock_collection.assignment_db.create_assignment.side_effect = [
        assignment_new,  # First call returns the main assignment
        Assignment(
            id="recup_assignment_id",
            team_id=assignment_new.team_id,
            schedule_id=assignment_new.schedule_id,
            worker_id=assignment_new.worker_id,
            date=assignment_new.date,
            shift_id=shift_recup.id,
            fixed=assignment_new.fixed,
            reference_assignment_id=assignment_new.id,
        ),  # Second call returns the recuperation assignment
    ]

    # Call the method
    result = service.create_assignment(assignment_new)
    created_assignments: List[Assignment] = result["assignments"]  # type: ignore

    # Assert both assignments were created
    assert len(created_assignments) == 2
    assert created_assignments[0] == assignment_new
    assert created_assignments[1].shift_id == "recup_shift_id"
    assert created_assignments[1].worker_id == assignment_new.worker_id
    assert created_assignments[1].date == assignment_new.date
    assert created_assignments[1].reference_assignment_id == assignment_new.id


def test_create_assignment_with_invalid_shift(
    mock_service: Tuple[AssignmentService, MagicMock],
) -> None:
    service, mock_collection = mock_service

    # Mock the shift as None
    mock_collection.shift_db.get_shift_by_id.return_value = None

    assignment_new = Assignment(
        id="",
        team_id="team_id",
        schedule_id="schedule_id",
        worker_id="worker_id",
        date=date.today(),
        shift_id="invalid_shift_id",
        fixed=False,
    )

    # Call the method and assert it raises a ValueError
    with pytest.raises(
        ValueError, match="Shift with ID invalid_shift_id does not exist."
    ):
        service.create_assignment(assignment_new)


def test_update_assignment_with_same_shift(
    mock_service: Tuple[AssignmentService, MagicMock],
) -> None:
    service, mock_collection = mock_service

    # Mock the old and new assignments
    assignment_old = MagicMock()
    assignment_new = MagicMock()
    assignment_new.shift_id = "shift_id"

    mock_collection.assignment_db.get_assignment_by_id.return_value = assignment_old

    # Call the method
    result = service.update_assignment(assignment_new)

    # Assert the assignment was updated
    mock_collection.assignment_db.update_assignment.assert_called_once_with(
        assignment_new
    )
    assert (
        result["updated_assignment"]
        == mock_collection.assignment_db.update_assignment.return_value
    )
    assert result["recuperation_assignments"] == []
    assert result["deleted_ids"] == []


def test_update_assignment_with_duty_shift(
    mock_service: Tuple[AssignmentService, MagicMock],
) -> None:
    service, mock_collection = mock_service

    # Mock the old and new assignments
    assignment_old = MagicMock()
    assignment_old.shift_id = "old_shift_id"
    assignment_old.team_id = "team_id"
    assignment_old.worker_id = "worker_id"
    assignment_old.date = date.today()

    assignment_new = MagicMock()
    assignment_new.shift_id = "new_shift_id"
    assignment_new.team_id = "team_id"
    assignment_new.worker_id = "worker_id"
    assignment_new.date = date.today()

    mock_collection.assignment_db.get_assignment_by_id.return_value = assignment_old

    # Mock the old and new shifts
    shift_old = MagicMock()
    shift_old.shift_type = ShiftType.DUTY
    shift_new = MagicMock()
    shift_new.shift_type = ShiftType.DUTY

    mock_collection.shift_db.get_shift_by_id.side_effect = [
        shift_old,
        shift_new,
    ]

    # Mock the recuperation shifts
    shift_recup_old = MagicMock()
    shift_recup_old.id = "recup_old_id"
    shift_recup_new = MagicMock()
    shift_recup_new.id = "recup_new_id"

    mock_collection.shift_db.get_recuperation_shift.side_effect = [
        shift_recup_new,
    ]

    # Mock the deletion of old recuperation assignments
    mock_collection.assignment_db.delete_assignments_by_reference_id.return_value = [
        "deleted_recup_id"
    ]

    # Call the method
    result = service.update_assignment(assignment_new)

    # Assert the old recuperation assignment was deleted
    # fmt: off
    mock_collection.assignment_db.delete_assignments_by_reference_id\
        .assert_called_once_with(
            reference_id=assignment_old.id
        )
    # fmt: on

    # Assert the new recuperation assignment was created
    mock_collection.assignment_db.create_assignment.assert_called_once()
    created_assignment = mock_collection.assignment_db.create_assignment.call_args[0][0]
    assert created_assignment.shift_id == shift_recup_new.id
    assert created_assignment.worker_id == assignment_new.worker_id
    assert created_assignment.date == assignment_new.date

    # Assert the main assignment was updated
    mock_collection.assignment_db.update_assignment.assert_called_once_with(
        assignment_new
    )

    assert (
        result["updated_assignment"]
        == mock_collection.assignment_db.update_assignment.return_value
    )
    assert result["recuperation_assignments"] == [
        mock_collection.assignment_db.create_assignment.return_value
    ]
    assert result["deleted_ids"] == ["deleted_recup_id"]


def test_update_assignment_with_invalid_shift(
    mock_service: Tuple[AssignmentService, MagicMock],
) -> None:
    service, mock_collection = mock_service

    # Mock the old assignment
    assignment_old = MagicMock()
    assignment_old.shift_id = "old_shift_id"

    assignment_new = MagicMock()
    assignment_new.shift_id = "invalid_shift_id"

    mock_collection.assignment_db.get_assignment_by_id.return_value = assignment_old

    # Mock the old and new shifts as None
    mock_collection.shift_db.get_shift_by_id.side_effect = [None, None]

    # Call the method and assert it raises a ValueError
    with pytest.raises(ValueError, match="Invalid shift ID provided."):
        service.update_assignment(assignment_new)


def test_delete_assignment_with_no_recuperation_assignments(
    mock_service: Tuple[AssignmentService, MagicMock],
) -> None:
    service, mock_collection = mock_service

    # Mock the assignment ID
    assignment_id = "assignment_id"

    # Mock the database response for deleting assignments
    mock_collection.assignment_db.delete_assignments_by_reference_id.return_value = []

    # Call the method
    deleted_ids = service.delete_assignment(assignment_id)

    # Assert the main assignment was deleted
    mock_collection.assignment_db.delete_assignment.assert_called_once_with(
        assignment_id
    )

    # Assert the deleted IDs list contains only the main assignment ID
    assert deleted_ids == [assignment_id]


def test_delete_assignment_with_recuperation_assignments(
    mock_service: Tuple[AssignmentService, MagicMock],
) -> None:
    service, mock_collection = mock_service

    # Mock the assignment ID
    assignment_id = "assignment_id"

    # Mock the database response for deleting recuperation assignments
    recuperation_ids = ["recup_id_1", "recup_id_2"]
    mock_collection.assignment_db.delete_assignments_by_reference_id.return_value = (
        recuperation_ids
    )

    # Call the method
    deleted_ids = service.delete_assignment(assignment_id)

    # Assert the main assignment was deleted
    mock_collection.assignment_db.delete_assignment.assert_called_once_with(
        assignment_id
    )

    # Assert the deleted IDs list contains both recuperation and main assignment IDs
    assert sorted(deleted_ids) == sorted(recuperation_ids)
