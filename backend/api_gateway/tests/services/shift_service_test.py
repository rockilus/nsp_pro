from copy import deepcopy
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, call, patch

import pytest
from shared.schemas.core import Shift, ShiftLeaveType, ShiftRestType, ShiftType

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


# pylint: disable=redefined-outer-name, protected-access
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
    # shift_type change from normal to duty: create recuperation shift, and
    # create recuperation assignments
    shift_old_mock = Shift(
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
    shift_new = Shift(
        id="1",
        team_id="team1",
        name="Duty Shift",
        acronym="NS",
        acronym_custom=False,
        start_time=shift_old_mock.start_time,
        end_time=shift_old_mock.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.DUTY,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=8,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_new_input = deepcopy(shift_new)
    shift_saved_mock = deepcopy(shift_new)
    shift_saved_mock.acronym = "DS"
    shift_recup_mock = Shift(
        id="recup1",
        team_id="team1",
        name="Duty recuperation",
        acronym="DR",
        acronym_custom=False,
        start_time=shift_old_mock.start_time,
        end_time=shift_old_mock.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.REST,
        rest_type=ShiftRestType.RECUPERATION,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id="1",
        deleted=False,
    )
    mock_collection.shift_db.get_shift_by_id.return_value = shift_old_mock
    mock_collection.shift_db.update_shift.side_effect = [
        shift_saved_mock,
        shift_recup_mock,
    ]
    mock_assignment_service.create_recuperation_assignments = MagicMock()

    with patch.object(
        shift_service,
        "create_or_update_duty_recuperation_shift",
        return_value=shift_recup_mock,
    ) as mock_create_or_update:
        result, _ = shift_service.update_shift(shift_new)

        mock_create_or_update.assert_called_once_with(shift_saved_mock)

        shift_new_input.acronym = "DS"
        assert result == shift_new_input
        assert mock_collection.shift_db.update_shift.call_count == 1
        mock_collection.shift_db.update_shift.assert_any_call(shift_new_input)
        mock_assignment_service.create_recuperation_assignments.assert_called_once_with(
            shift_duty_id=shift_new_input.id,
            shift_recup_id=shift_recup_mock.id,
            team_id=shift_new_input.team_id,
        )


def test_update_shift_duty_to_normal(
    shift_service: ShiftService, mock_collection: MagicMock
) -> None:
    # shift_type change from duty to normal: logical delete recuperation shift
    # and delete recuperation assignments
    shift_old_mock = Shift(
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
    shift_new = Shift(
        id="1",
        team_id="team1",
        name="Normal Shift",
        acronym="DS",
        acronym_custom=False,
        start_time=shift_old_mock.start_time,
        end_time=shift_old_mock.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_new_input = deepcopy(shift_new)
    shift_saved_mock = deepcopy(shift_new)
    shift_saved_mock.acronym = "NS"
    shift_recup_mock = Shift(
        id="2",
        team_id="team1",
        name="Duty recuperation",
        acronym="DR",
        acronym_custom=False,
        start_time=shift_old_mock.end_time,
        end_time=shift_old_mock.end_time
        + timedelta(hours=shift_old_mock.recuperation_time),
        staffing=[],
        color="#EDBB99",
        shift_type=ShiftType.REST,
        rest_type=ShiftRestType.RECUPERATION,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id="1",
        deleted=False,
    )
    mock_collection.shift_db.get_shift_by_id.return_value = shift_old_mock
    mock_collection.shift_db.update_shift.return_value = shift_saved_mock
    mock_collection.shift_db.get_recuperation_shift.return_value = shift_recup_mock

    result, _ = shift_service.update_shift(shift_new)

    shift_new_input.acronym = "NS"
    assert result == shift_new_input
    mock_collection.shift_db.update_shift.assert_called_once_with(shift_new_input)
    mock_collection.shift_db.logical_delete_shift.assert_called_once_with(
        shift_recup_mock.id
    )
    # fmt: off
    mock_collection.assignment_db\
        .delete_assignments_by_team_and_shift_today_onward.assert_called_once_with(
            team_id=shift_old_mock.team_id, shift_id=shift_recup_mock.id
        )
    # fmt: on


def test_update_shift_acronym_change(
    shift_service: ShiftService, mock_collection: MagicMock
) -> None:
    # shift acronym change: update acronym_custom to True
    shift_old_mock = Shift(
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
    shift_new = Shift(
        id="1",
        team_id="team1",
        name="Normal Shift",
        acronym="NS-Updated",
        acronym_custom=False,
        start_time=shift_old_mock.start_time,
        end_time=shift_old_mock.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_new_input = deepcopy(shift_new)
    shift_saved_mock = deepcopy(shift_new)
    shift_saved_mock.acronym_custom = True
    mock_collection.shift_db.get_shift_by_id.return_value = shift_old_mock
    mock_collection.shift_db.update_shift.return_value = shift_saved_mock

    result, _ = shift_service.update_shift(shift_new)

    assert result == shift_new
    assert shift_new.acronym_custom is True
    shift_new_input.acronym_custom = True
    mock_collection.shift_db.update_shift.assert_called_once_with(shift_new_input)


def test_update_shift_name_change_acronym_change_false(
    shift_service: ShiftService, mock_collection: MagicMock
) -> None:
    # shift name change: update acronym if acronym_custom is False
    shift_old_mock = Shift(
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
    shift_new = Shift(
        id="1",
        team_id="team1",
        name="Updated Shift",
        acronym="NS",
        acronym_custom=False,
        start_time=shift_old_mock.start_time,
        end_time=shift_old_mock.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_new_input = deepcopy(shift_new)
    shift_saved_mock = deepcopy(shift_new)
    shift_saved_mock.acronym = "US"
    mock_collection.shift_db.get_shift_by_id.return_value = shift_old_mock
    mock_collection.shift_db.get_shifts_not_deleted.return_value = [shift_old_mock]
    mock_collection.shift_db.update_shift.return_value = shift_saved_mock

    result, _ = shift_service.update_shift(shift_new)

    shift_new_input_dict = shift_new_input.to_dict()
    shift_new_input_dict.pop("acronym")
    result_dict = result.to_dict()
    result_dict.pop("acronym")

    assert result_dict == shift_new_input_dict
    assert shift_new.acronym == "US"
    assert shift_new.acronym_custom is False
    shift_new_input.acronym = "US"
    mock_collection.shift_db.update_shift.assert_called_once_with(shift_new_input)


def test_update_shift_name_change_acronym_change_true(
    shift_service: ShiftService, mock_collection: MagicMock
) -> None:
    # shift name change: do not update acronym if acronym_custom is True
    shift_old_mock = Shift(
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
    shift_new = Shift(
        id="1",
        team_id="team1",
        name="Updated Shift",
        acronym="NS",
        acronym_custom=True,
        start_time=shift_old_mock.start_time,
        end_time=shift_old_mock.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_new_input = deepcopy(shift_new)
    shift_saved_mock = deepcopy(shift_new)
    mock_collection.shift_db.get_shift_by_id.return_value = shift_old_mock
    mock_collection.shift_db.get_shifts_not_deleted.return_value = [shift_old_mock]
    mock_collection.shift_db.update_shift.return_value = shift_saved_mock

    result, _ = shift_service.update_shift(shift_new)

    assert result == shift_new_input
    assert result.acronym_custom is True
    mock_collection.shift_db.update_shift.assert_called_once_with(shift_new_input)


def test_update_shift_time_change_normal_shift(
    shift_service: ShiftService,
    mock_collection: MagicMock,
    mock_link_shift_service: MagicMock,
) -> None:
    # change of start_time or end_time for any shift_type: update link shifts
    shift_old_mock = Shift(
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
    shift_new = Shift(
        id="1",
        team_id="team1",
        name="Normal Shift",
        acronym="NS",
        acronym_custom=False,
        start_time=shift_old_mock.start_time + timedelta(hours=1),
        end_time=shift_old_mock.end_time + timedelta(hours=2),
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.NORMAL,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_new_input = deepcopy(shift_new)
    shift_saved_mock = deepcopy(shift_new)
    mock_collection.shift_db.get_shift_by_id.return_value = shift_old_mock
    mock_collection.shift_db.update_shift.return_value = shift_saved_mock
    mock_link_shift_service.update_link_shift_upon_shift_update = MagicMock(
        return_value={}
    )

    result, _ = shift_service.update_shift(shift_new)

    assert result == shift_new_input
    mock_collection.shift_db.update_shift.assert_called_once_with(shift_new_input)
    mock_link_shift_service.update_link_shift_upon_shift_update.assert_called_once_with(
        shift_new_input
    )


def test_update_shift_time_change_duty_shift(
    shift_service: ShiftService,
    mock_collection: MagicMock,
    mock_link_shift_service: MagicMock,
) -> None:
    # change of start_time, end_time or recuperation_time for shift_type duty:
    # update recuperation shift.
    shift_old_mock = Shift(
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
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_new = Shift(
        id="1",
        team_id="team1",
        name="Duty Shift",
        acronym="DS",
        acronym_custom=False,
        start_time=shift_old_mock.start_time + timedelta(hours=1),
        end_time=shift_old_mock.end_time + timedelta(hours=2),
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.DUTY,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_recup_mock = Shift(
        id="recup1",
        team_id="team1",
        name="Duty recuperation",
        acronym="DR",
        acronym_custom=False,
        start_time=shift_old_mock.start_time,
        end_time=shift_old_mock.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.REST,
        rest_type=ShiftRestType.RECUPERATION,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id="1",
        deleted=False,
    )
    shift_new_input = deepcopy(shift_new)
    shift_saved_mock = deepcopy(shift_new)
    mock_collection.shift_db.get_shift_by_id.return_value = shift_old_mock
    mock_collection.shift_db.update_shift.return_value = shift_saved_mock
    mock_link_shift_service.update_link_shift_upon_shift_update = MagicMock(
        return_value={}
    )

    with patch.object(
        shift_service,
        "create_or_update_duty_recuperation_shift",
        return_value=shift_recup_mock,
    ) as mock_create_or_update:
        result, _ = shift_service.update_shift(shift_new)

        # Assert: Verify `create_or_update_duty_recuperation_shift` was called
        mock_create_or_update.assert_called_once_with(shift_new)

        assert result == shift_new_input
        mock_collection.shift_db.update_shift.assert_called_once_with(shift_new_input)
        # fmt: off
        mock_link_shift_service.update_link_shift_upon_shift_update\
            .assert_called_once_with(shift_new_input)
        # fmt: on


def test_update_shift_recuperation_time_duty_shift(
    shift_service: ShiftService,
    mock_collection: MagicMock,
    mock_link_shift_service: MagicMock,
) -> None:
    # change of start_time, end_time or recuperation_time for shift_type duty:
    # update recuperation shift.
    shift_old_mock = Shift(
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
        recuperation_time=4,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_new = Shift(
        id="1",
        team_id="team1",
        name="Duty Shift",
        acronym="DS",
        acronym_custom=False,
        start_time=shift_old_mock.start_time,
        end_time=shift_old_mock.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.DUTY,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=6,
        recuperation_duty_id=None,
        deleted=False,
    )
    shift_recup_mock = Shift(
        id="recup1",
        team_id="team1",
        name="Duty recuperation",
        acronym="DR",
        acronym_custom=False,
        start_time=shift_old_mock.start_time,
        end_time=shift_old_mock.end_time,
        staffing=[],
        color="#FFFFFF",
        shift_type=ShiftType.REST,
        rest_type=ShiftRestType.RECUPERATION,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id="1",
        deleted=False,
    )
    shift_new_input = deepcopy(shift_new)
    shift_saved_mock = deepcopy(shift_new)
    mock_collection.shift_db.get_shift_by_id.return_value = shift_old_mock
    mock_collection.shift_db.update_shift.return_value = shift_saved_mock
    mock_link_shift_service.update_link_shift_upon_shift_update = MagicMock(
        return_value={}
    )

    with patch.object(
        shift_service,
        "create_or_update_duty_recuperation_shift",
        return_value=shift_recup_mock,
    ) as mock_create_or_update:
        result, _ = shift_service.update_shift(shift_new)

        # Assert: Verify `create_or_update_duty_recuperation_shift` was called
        mock_create_or_update.assert_called_once_with(shift_new)

        assert result == shift_new_input
        mock_collection.shift_db.update_shift.assert_called_once_with(shift_new_input)
        mock_link_shift_service.update_link_shift_upon_shift_update.assert_not_called()


def test_validate_shift_update_not_found(
    shift_service: ShiftService, mock_collection: MagicMock
) -> None:
    mock_collection.shift_db.get_shift_by_id.return_value = None

    with pytest.raises(ValueError, match="Shift does not exist"):
        shift_service._validate_shift_update("nonexistent_shift_id")


def test_validate_shift_update_default_rest(
    shift_service: ShiftService, mock_collection: MagicMock
) -> None:
    shift = Shift(
        id="1",
        team_id="team1",
        name="Off",
        acronym="O",
        acronym_custom=False,
        start_time=datetime(2023, 10, 1, 0, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 10, 2, 0, 0, tzinfo=timezone.utc),
        staffing=[],
        color="grey",
        shift_type=ShiftType.REST,
        rest_type=ShiftRestType.OFF,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    mock_collection.shift_db.get_shift_by_id.return_value = shift

    with pytest.raises(
        ValueError, match="Cannot update or delete the default rest shift"
    ):
        shift_service._validate_shift_update(shift.id)


def test_validate_shift_update_leave_shift(
    shift_service: ShiftService, mock_collection: MagicMock
) -> None:
    shift = Shift(
        id="1",
        team_id="team1",
        name="Vacation",
        acronym="V",
        acronym_custom=False,
        start_time=datetime(2023, 10, 1, 0, 0, tzinfo=timezone.utc),
        end_time=datetime(2023, 10, 2, 0, 0, tzinfo=timezone.utc),
        staffing=[],
        color="grey",
        shift_type=ShiftType.LEAVE,
        rest_type=ShiftRestType.NONE,
        leave_type=ShiftLeaveType.VACATION,
        recuperation_time=0,
        recuperation_duty_id=None,
        deleted=False,
    )
    mock_collection.shift_db.get_shift_by_id.return_value = shift

    with pytest.raises(ValueError, match="Cannot update or delete a leave shift"):
        shift_service._validate_shift_update(shift.id)


def test_delete_shift_normal_shift(
    shift_service: ShiftService,
    mock_collection: MagicMock,
    mock_link_shift_service: MagicMock,
) -> None:
    shift = Shift(
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
    mock_collection.shift_db.get_shift_by_id.return_value = shift
    mock_link_shift_service.update_link_shift_upon_shift_delete.return_value = {
        "deleted": [],
        "updated": [],
    }

    result = shift_service.delete_shift(shift.id)

    assert result == {"deleted": [], "updated": []}
    mock_link_shift_service.update_link_shift_upon_shift_delete.assert_called_once_with(
        shift
    )
    # fmt: off
    mock_collection.shift_demand_db.delete_shift_demands_by_shift_id\
        .assert_called_once_with(shift.id)
    mock_collection.daily_shift_demand_db.delete_daily_shift_demands_by_shift_id\
        .assert_called_once_with(shift.id)
    # fmt: on
    mock_collection.shift_db.logical_delete_shift.assert_called_once_with(shift.id)


def test_delete_shift_duty_shift(
    shift_service: ShiftService,
    mock_collection: MagicMock,
    mock_link_shift_service: MagicMock,
) -> None:
    shift = Shift(
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
    shift_recup = Shift(
        id="2",
        team_id="team1",
        name="Duty recuperation",
        acronym="DR",
        acronym_custom=False,
        start_time=shift.end_time,
        end_time=shift.end_time + timedelta(hours=shift.recuperation_time),
        staffing=[],
        color="#EDBB99",
        shift_type=ShiftType.REST,
        rest_type=ShiftRestType.RECUPERATION,
        leave_type=ShiftLeaveType.NONE,
        recuperation_time=0,
        recuperation_duty_id="1",
        deleted=False,
    )
    mock_collection.shift_db.get_shift_by_id.return_value = shift
    mock_collection.shift_db.get_recuperation_shift.return_value = shift_recup
    mock_link_shift_service.update_link_shift_upon_shift_delete.return_value = {
        "deleted": [],
        "updated": [],
    }

    result = shift_service.delete_shift(shift.id)

    assert result == {
        "deleted": [],
        "updated": [],
    }
    mock_link_shift_service.update_link_shift_upon_shift_delete.assert_called_once_with(
        shift
    )
    # fmt: off
    mock_collection.shift_demand_db.delete_shift_demands_by_shift_id\
        .assert_called_once_with(shift.id)
    mock_collection.daily_shift_demand_db\
        .delete_daily_shift_demands_by_shift_id.assert_called_once_with(shift.id)
    # fmt: on
    mock_collection.shift_db.logical_delete_shift.assert_has_calls(
        [call(shift_recup.id), call(shift.id)]
    )
    # fmt: off
    mock_collection.assignment_db\
        .delete_assignments_by_team_and_shift_today_onward.assert_called_once_with(
            team_id=shift_recup.team_id, shift_id=shift_recup.id
        )
    # fmt: on
