from datetime import date
from typing import Tuple
from unittest.mock import MagicMock

import pytest
from shared.schemas.schemas.schedule import Assignment

from src.services.assignment_service import AssignmentService


@pytest.fixture
def mock_service() -> Tuple[AssignmentService, MagicMock]:
    mock_collection = MagicMock()
    service = AssignmentService(collection=mock_collection)
    return service, mock_collection


# pylint: disable=redefined-outer-name
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
