# from datetime import datetime, timedelta, timezone
# from typing import Generator
# from unittest.mock import MagicMock, patch

# import pytest
# from shared.schemas import (
#     Shift,
#     ShiftLeaveType,
#     ShiftRestType,
#     ShiftType,
# )

# from src.services.shift_services.create_shift import (
#     create_or_update_duty_recuperation_shift,
# )


# @pytest.fixture
# def mock_shift_db() -> Generator[MagicMock, None, None]:
#     with patch("src.services.shift_services.create_shift.shift_db") as mock:
#         yield mock


# # pylint: disable=redefined-outer-name, R0801
# def test_not_a_duty_shift(mock_shift_db: MagicMock) -> None:
#     shift = Shift(
#         id="1",
#         team_id="team1",
#         name="Normal Shift",
#         acronym="NS",
#         acronym_custom=False,
#         start_time=datetime.now(timezone.utc),
#         end_time=datetime.now(timezone.utc) + timedelta(hours=8),
#         staffing=[],
#         color="#FFFFFF",
#         shift_type=ShiftType.NORMAL,
#         rest_type=ShiftRestType.NONE,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=0,
#         recuperation_duty_id=None,
#         deleted=False,
#     )
#     result = create_or_update_duty_recuperation_shift(shift)
#     assert result is None
#     mock_shift_db.get_recuperation_shift.assert_not_called()


# def test_recup_existing_no_update_needed(mock_shift_db: MagicMock) -> None:
#     shift = Shift(
#         id="1",
#         team_id="team1",
#         name="Duty Shift",
#         acronym="DS",
#         acronym_custom=False,
#         start_time=datetime(2023, 10, 1, 8, 0, tzinfo=timezone.utc),
#         end_time=datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc),
#         staffing=[],
#         color="#FF5733",
#         shift_type=ShiftType.DUTY,
#         rest_type=ShiftRestType.NONE,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=8,
#         recuperation_duty_id=None,
#         deleted=False,
#     )
#     recup_shift = Shift(
#         id="2",
#         team_id="team1",
#         name="Duty recuperation",
#         acronym="DR",
#         acronym_custom=False,
#         start_time=datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc),
#         end_time=datetime(2023, 10, 2, 0, 0, tzinfo=timezone.utc),
#         staffing=[],
#         color="#EDBB99",
#         shift_type=ShiftType.REST,
#         rest_type=ShiftRestType.RECUPERATION,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=0,
#         recuperation_duty_id="1",
#         deleted=False,
#     )
#     mock_shift_db.get_recuperation_shift.return_value = recup_shift

#     result = create_or_update_duty_recuperation_shift(shift)
#     assert result == recup_shift
#     mock_shift_db.update_shift.assert_not_called()


# def test_recup_existing_needs_update(mock_shift_db: MagicMock) -> None:
#     shift = Shift(
#         id="1",
#         team_id="team1",
#         name="Duty Shift",
#         acronym="DS",
#         acronym_custom=False,
#         start_time=datetime(2023, 10, 1, 8, 0, tzinfo=timezone.utc),
#         end_time=datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc),
#         staffing=[],
#         color="#FF5733",
#         shift_type=ShiftType.DUTY,
#         rest_type=ShiftRestType.NONE,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=8,
#         recuperation_duty_id=None,
#         deleted=False,
#     )
#     recup_shift = Shift(
#         id="2",
#         team_id="team1",
#         name="Duty recuperation",
#         acronym="DR",
#         acronym_custom=False,
#         start_time=datetime(
#             2023, 10, 1, 15, 0, tzinfo=timezone.utc
#         ),  # Incorrect start time
#         end_time=datetime(
#             2023, 10, 1, 23, 0, tzinfo=timezone.utc
#         ),  # Incorrect end time
#         staffing=[],
#         color="#EDBB99",
#         shift_type=ShiftType.REST,
#         rest_type=ShiftRestType.RECUPERATION,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=0,
#         recuperation_duty_id="1",
#         deleted=True,  # Marked as deleted
#     )
#     mock_shift_db.get_recuperation_shift.return_value = recup_shift
#     mock_shift_db.update_shift.return_value = recup_shift

#     result = create_or_update_duty_recuperation_shift(shift)
#     assert result == recup_shift
#     assert not result.deleted
#     assert result.start_time == datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc)
#     assert result.end_time == datetime(2023, 10, 2, 0, 0, tzinfo=timezone.utc)
#     mock_shift_db.update_shift.assert_called_once_with(recup_shift)


# def test_recup_does_not_exist(mock_shift_db: MagicMock) -> None:
#     shift = Shift(
#         id="1",
#         team_id="team1",
#         name="Duty Shift",
#         acronym="DS",
#         acronym_custom=False,
#         start_time=datetime(2023, 10, 1, 8, 0, tzinfo=timezone.utc),
#         end_time=datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc),
#         staffing=[],
#         color="#FF5733",
#         shift_type=ShiftType.DUTY,
#         rest_type=ShiftRestType.NONE,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=8,
#         recuperation_duty_id=None,
#         deleted=False,
#     )
#     mock_shift_db.get_recuperation_shift.return_value = None
#     mock_shift_db.create_shift.return_value = Shift(
#         id="3",
#         team_id="team1",
#         name="Duty recuperation",
#         acronym="DR",
#         acronym_custom=False,
#         start_time=datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc),
#         end_time=datetime(2023, 10, 2, 0, 0, tzinfo=timezone.utc),
#         staffing=[],
#         color="#EDBB99",
#         shift_type=ShiftType.REST,
#         rest_type=ShiftRestType.RECUPERATION,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=0,
#         recuperation_duty_id="1",
#         deleted=False,
#     )

#     result = create_or_update_duty_recuperation_shift(shift)
#     assert result is not None
#     assert result.name == "Duty recuperation"
#     assert result.start_time == datetime(2023, 10, 1, 16, 0, tzinfo=timezone.utc)
#     assert result.end_time == datetime(2023, 10, 2, 0, 0, tzinfo=timezone.utc)
#     mock_shift_db.create_shift.assert_called_once()
