from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from shared.schemas import Shift, ShiftLeaveType, ShiftRestType, ShiftType

from src.services.shift_service import ShiftService


@pytest.fixture
def mock_collection() -> MagicMock:
    return MagicMock()


# pylint: disable=redefined-outer-name
@pytest.fixture
def shift_service(mock_collection: MagicMock) -> ShiftService:
    link_shift_service = MagicMock()
    return ShiftService(mock_collection, link_shift_service)


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
        deleted=False,
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
