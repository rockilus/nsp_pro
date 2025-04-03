from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from shared.schemas import Shift, ShiftLeaveType, ShiftRestType, ShiftType

from src.services.assignment_service import AssignmentService
from src.services.link_shift_service import LinkShiftService
from src.services.shift_service import ShiftService


@pytest.fixture
def mock_collection() -> MagicMock:
    return MagicMock()


@pytest.fixture
def mock_link_shift_service() -> MagicMock:
    return MagicMock(spec=LinkShiftService)


@pytest.fixture
def mock_assignment_service() -> MagicMock:
    return MagicMock(spec=AssignmentService)


# pylint: disable=redefined-outer-name
@pytest.fixture
def shift_service(
    mock_collection: MagicMock,
    mock_link_shift_service: MagicMock,
    mock_assignment_service: MagicMock,
) -> ShiftService:
    return ShiftService(
        collection=mock_collection,
        assignment_service=mock_assignment_service,
        link_shift_service=mock_link_shift_service,
    )


def test_create_or_update_duty_recuperation_shift_not_duty(
    shift_service: ShiftService,
) -> None:
    shift_duty = Shift(
        id="1",
        team_id="team1",
        name="Normal Shift",
        acronym="NS",
        acronym_custom=False,
        start_time=datetime.now(timezone.utc),
        end_time=datetime.now(timezone.utc) + timedelta(hours=8),
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    result = shift_service.create_or_update_duty_recuperation_shift(shift_duty)
    assert result is None


def test_create_or_update_duty_recuperation_shift_recup_exists_no_update(
    shift_service: ShiftService, mock_collection: MagicMock
) -> None:
    shift_duty = Shift(
        id="1",
        team_id="team1",
        name="Duty Shift",
        acronym="DS",
        acronym_custom=False,
        start_time=datetime(2023, 10, 1, 8, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc),
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.DUTY,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=8,
        recuperation_duty_id=None,
        deleted=False,
    )
    recup_existing = Shift(
        id="2",
        team_id="team1",
        name="Duty recuperation",
        acronym="DR",
        acronym_custom=False,
        start_time=shift_duty.end_time,
        end_time=shift_duty.end_time + timedelta(hours=shift_duty.recuperation_time),
        staffing=[],
        color="#EDBB99",
        shift_type=ShiftType.REST,
        rest_type=ShiftRestType.RECUPERATION,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id="1",
        deleted=False,
    )
    mock_collection.shift_db.get_recuperation_shift.return_value = recup_existing

    result = shift_service.create_or_update_duty_recuperation_shift(shift_duty)
    assert result == recup_existing
    mock_collection.shift_db.update_shift.assert_not_called()


def test_create_or_update_duty_recuperation_shift_recup_exists_needs_update(
    shift_service: ShiftService, mock_collection: MagicMock
) -> None:
    shift_duty = Shift(
        id="1",
        team_id="team1",
        name="Duty Shift",
        acronym="DS",
        acronym_custom=False,
        start_time=datetime(2023, 10, 1, 8, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc),
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.DUTY,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=8,
        recuperation_duty_id=None,
        deleted=False,
    )
    recup_existing = Shift(
        id="2",
        team_id="team1",
        name="Duty recuperation",
        acronym="DR",
        acronym_custom=False,
        start_time=shift_duty.end_time,
        end_time=shift_duty.end_time
        + timedelta(hours=shift_duty.recuperation_time + 1),
        staffing=[],
        color="#EDBB99",
        shift_type=ShiftType.REST,
        rest_type=ShiftRestType.RECUPERATION,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id="1",
        deleted=True,
    )
    mock_collection.shift_db.get_recuperation_shift.return_value = recup_existing
    mock_collection.shift_db.update_shift.return_value = recup_existing

    result = shift_service.create_or_update_duty_recuperation_shift(shift_duty)
    assert result == recup_existing
    mock_collection.shift_db.update_shift.assert_called_once()
    assert recup_existing.start_time == shift_duty.end_time
    assert recup_existing.end_time == shift_duty.end_time + timedelta(
        hours=shift_duty.recuperation_time
    )
    assert not recup_existing.deleted


def test_create_or_update_duty_recuperation_shift_recup_does_not_exist(
    shift_service: ShiftService, mock_collection: MagicMock
) -> None:
    shift_duty = Shift(
        id="1",
        team_id="team1",
        name="Duty Shift",
        acronym="DS",
        acronym_custom=False,
        start_time=datetime(2023, 10, 1, 8, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc),
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.DUTY,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=8,
        recuperation_duty_id=None,
        deleted=False,
    )
    mock_collection.shift_db.get_recuperation_shift.return_value = None
    recup_new = Shift(
        id="3",
        team_id="team1",
        name="Duty recuperation",
        acronym="DR",
        acronym_custom=False,
        start_time=shift_duty.end_time,
        end_time=shift_duty.end_time + timedelta(hours=shift_duty.recuperation_time),
        staffing=[],
        color="#EDBB99",
        shift_type=ShiftType.REST,
        rest_type=ShiftRestType.RECUPERATION,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id="1",
        deleted=False,
    )
    mock_collection.shift_db.create_shift.return_value = recup_new

    result = shift_service.create_or_update_duty_recuperation_shift(shift_duty)
    assert result == recup_new
    mock_collection.shift_db.create_shift.assert_called_once()


def test_update_shift_normal_to_duty(
    shift_service: ShiftService,
    mock_collection: MagicMock,
    mock_assignment_service: MagicMock,
) -> None:
    shift_existing = Shift(
        id="1",
        team_id="team1",
        name="Normal Shift",
        acronym="NS",
        acronym_custom=False,
        start_time=datetime(2023, 10, 1, 8, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc),
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_updated = Shift(
        id="1",
        team_id="team1",
        name="Duty Shift",
        acronym="DS",
        acronym_custom=False,
        start_time=shift_existing.start_time,
        end_time=shift_existing.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.DUTY,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=8,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_recup = Shift(
        id="recup1",
        team_id="team1",
        name="Duty Shift",
        acronym="DS",
        acronym_custom=False,
        start_time=shift_existing.start_time,
        end_time=shift_existing.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.REST,
        rest_type=ShiftRestType.RECUPERATION,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id="1",
        deleted=False,
    )
    mock_collection.shift_db.get_shift_by_id.return_value = shift_existing
    mock_collection.shift_db.update_shift.side_effect = [
        shift_updated,
        shift_recup,
    ]
    mock_assignment_service.create_recuperation_assignments = MagicMock()

    result, _ = shift_service.update_shift(shift_updated)

    assert result == shift_updated
    assert mock_collection.shift_db.update_shift.call_count == 2
    mock_collection.shift_db.update_shift.assert_any_call(shift_updated)
    mock_assignment_service.create_recuperation_assignments.assert_called_once_with(
        shift_duty_id=shift_updated.id,
        shift_recup_id=shift_recup.id,
        team_id=shift_updated.team_id,
    )


def test_update_shift_duty_to_normal(
    shift_service: ShiftService, mock_collection: MagicMock
) -> None:
    shift_existing = Shift(
        id="1",
        team_id="team1",
        name="Duty Shift",
        acronym="DS",
        acronym_custom=False,
        start_time=datetime(2023, 10, 1, 8, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc),
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.DUTY,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=8,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_updated = Shift(
        id="1",
        team_id="team1",
        name="Normal Shift",
        acronym="NS",
        acronym_custom=False,
        start_time=shift_existing.start_time,
        end_time=shift_existing.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    mock_collection.shift_db.get_shift_by_id.return_value = shift_existing
    mock_collection.shift_db.update_shift.return_value = shift_updated
    mock_collection.shift_db.get_recuperation_shift.return_value = MagicMock(id="2")

    result, _ = shift_service.update_shift(shift_updated)

    assert result == shift_updated
    mock_collection.shift_db.update_shift.assert_called_once_with(shift_updated)
    mock_collection.shift_db.logical_delete_shift_recup.assert_called_once_with(
        shift_existing.id
    )
    # fmt: off
    mock_collection.assignment_db\
        .delete_assignments_by_team_and_shift_today_onward.assert_called_once_with(
            team_id=shift_existing.team_id, shift_id="2"
        )
    # fmt: on


def test_update_shift_acronym_change(
    shift_service: ShiftService, mock_collection: MagicMock
) -> None:
    shift_existing = Shift(
        id="1",
        team_id="team1",
        name="Normal Shift",
        acronym="NS",
        acronym_custom=False,
        start_time=datetime(2023, 10, 1, 8, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc),
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_updated = Shift(
        id="1",
        team_id="team1",
        name="Normal Shift",
        acronym="NS-Updated",
        acronym_custom=False,
        start_time=shift_existing.start_time,
        end_time=shift_existing.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    mock_collection.shift_db.get_shift_by_id.return_value = shift_existing
    mock_collection.shift_db.update_shift.return_value = shift_updated

    result, _ = shift_service.update_shift(shift_updated)

    assert result == shift_updated
    assert shift_updated.acronym_custom is True
    mock_collection.shift_db.update_shift.assert_called_once_with(shift_updated)


def test_update_shift_name_change(
    shift_service: ShiftService, mock_collection: MagicMock
) -> None:
    shift_existing = Shift(
        id="1",
        team_id="team1",
        name="Normal Shift",
        acronym="NS",
        acronym_custom=False,
        start_time=datetime(2023, 10, 1, 8, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc),
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_updated = Shift(
        id="1",
        team_id="team1",
        name="Updated Shift",
        acronym="NS",
        acronym_custom=False,
        start_time=shift_existing.start_time,
        end_time=shift_existing.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    mock_collection.shift_db.get_shift_by_id.return_value = shift_existing
    mock_collection.shift_db.get_shifts_not_deleted.return_value = [shift_existing]
    mock_collection.shift_db.update_shift.return_value = shift_updated

    result, _ = shift_service.update_shift(shift_updated)

    assert result == shift_updated
    assert shift_updated.acronym != shift_existing.acronym
    mock_collection.shift_db.update_shift.assert_called_once_with(shift_updated)


def test_update_shift_time_change(
    shift_service: ShiftService,
    mock_collection: MagicMock,
    mock_link_shift_service: MagicMock,
) -> None:
    shift_existing = Shift(
        id="1",
        team_id="team1",
        name="Normal Shift",
        acronym="NS",
        acronym_custom=False,
        start_time=datetime(2023, 10, 1, 8, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc),
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_updated = Shift(
        id="1",
        team_id="team1",
        name="Normal Shift",
        acronym="NS",
        acronym_custom=False,
        start_time=datetime(2023, 10, 1, 9, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 10, 1, 17, 0, tzinfo=timezone.utc),
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    mock_collection.shift_db.get_shift_by_id.return_value = shift_existing
    mock_collection.shift_db.update_shift.return_value = shift_updated
    mock_link_shift_service.update_link_shift_upon_shift_update = MagicMock(
        return_value={}
    )

    result, _ = shift_service.update_shift(shift_updated)

    assert result == shift_updated
    mock_collection.shift_db.update_shift.assert_called_once_with(shift_updated)
    mock_link_shift_service.update_link_shift_upon_shift_update.assert_called_once_with(
        shift_updated
    )
