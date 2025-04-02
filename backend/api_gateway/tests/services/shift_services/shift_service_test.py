# from datetime import datetime, timezone
# from unittest.mock import MagicMock

# import pytest
# from shared.database.database_collections import DatabaseCollections
# from shared.schemas import Shift, ShiftLeaveType, ShiftRestType, ShiftType

# from src.services.shift_services.shift_service import ShiftService


# @pytest.fixture
# def mock_collection() -> MagicMock:
#     return MagicMock(spec=DatabaseCollections)


# @pytest.fixture
# def shift_service(mock_collection: MagicMock) -> ShiftService:
#     return ShiftService(mock_collection)


# def test_shift_duty_not_a_duty_shift(shift_service: ShiftService) -> None:
#     shift_duty = Shift(
#         id="1",
#         team_id="team1",
#         name="Normal Shift",
#         acronym="NS",
#         acronym_custom=False,
#         start_time=datetime(2023, 10, 1, 9, 0, tzinfo=timezone.utc),
#         end_time=datetime(2023, 10, 1, 17, 0, tzinfo=timezone.utc),
#         staffing=[],
#         color="#FFFFFF",
#         shift_type=ShiftType.NORMAL,
#         rest_type=ShiftRestType.NONE,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=0,
#         recuperation_duty_id=None,
#         deleted=False,
#     )
#     result = shift_service.create_or_update_duty_recuperation_shift(shift_duty)
#     assert result is None


# def test_recup_existing_exists_no_update_needed(
#     shift_service: ShiftService, mock_collection: MagicMock
# ) -> None:
#     shift_duty = Shift(
#         id="1",
#         team_id="team1",
#         name="Duty Shift",
#         acronym="DS",
#         acronym_custom=False,
#         start_time=datetime(2023, 10, 1, 9, 0, tzinfo=timezone.utc),
#         end_time=datetime(2023, 10, 1, 17, 0, tzinfo=timezone.utc),
#         staffing=[],
#         color="#FFFFFF",
#         shift_type=ShiftType.DUTY,
#         rest_type=ShiftRestType.NONE,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=2,
#         recuperation_duty_id=None,
#         deleted=False,
#     )
#     recup_existing = Shift(
#         id="2",
#         team_id="team1",
#         name="Duty recuperation",
#         acronym="DR",
#         acronym_custom=False,
#         start_time=datetime(2023, 10, 1, 17, 0, tzinfo=timezone.utc),
#         end_time=datetime(2023, 10, 1, 19, 0, tzinfo=timezone.utc),
#         staffing=[],
#         color="#EDBB99",
#         shift_type=ShiftType.REST,
#         rest_type=ShiftRestType.RECUPERATION,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=0,
#         recuperation_duty_id="1",
#         deleted=False,
#     )
#     mock_collection.shift_db.get_recuperation_shift.return_value = recup_existing

#     result = shift_service.create_or_update_duty_recuperation_shift(shift_duty)
#     assert result == recup_existing


# def test_recup_existing_exists_needs_update(
#     shift_service: ShiftService, mock_collection: MagicMock
# ) -> None:
#     shift_duty = Shift(
#         id="1",
#         team_id="team1",
#         name="Duty Shift",
#         acronym="DS",
#         acronym_custom=False,
#         start_time=datetime(2023, 10, 1, 9, 0, tzinfo=timezone.utc),
#         end_time=datetime(2023, 10, 1, 17, 0, tzinfo=timezone.utc),
#         staffing=[],
#         color="#FFFFFF",
#         shift_type=ShiftType.DUTY,
#         rest_type=ShiftRestType.NONE,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=3,
#         recuperation_duty_id=None,
#         deleted=False,
#     )
#     recup_existing = Shift(
#         id="2",
#         team_id="team1",
#         name="Duty recuperation",
#         acronym="DR",
#         acronym_custom=False,
#         start_time=datetime(2023, 10, 1, 17, 0, tzinfo=timezone.utc),
#         end_time=datetime(2023, 10, 1, 19, 0, tzinfo=timezone.utc),
#         staffing=[],
#         color="#EDBB99",
#         shift_type=ShiftType.REST,
#         rest_type=ShiftRestType.RECUPERATION,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=0,
#         recuperation_duty_id="1",
#         deleted=False,
#     )
#     mock_collection.shift_db.get_recuperation_shift.return_value = recup_existing
#     mock_collection.shift_db.update_shift.return_value = recup_existing

#     result = shift_service.create_or_update_duty_recuperation_shift(shift_duty)
#     assert result.start_time == datetime(2023, 10, 1, 17, 0, tzinfo=timezone.utc)
#     assert result.end_time == datetime(2023, 10, 1, 20, 0, tzinfo=timezone.utc)
#     mock_collection.shift_db.update_shift.assert_called_once()


# def test_recup_existing_does_not_exist(
#     shift_service: ShiftService, mock_collection: MagicMock
# ) -> None:
#     shift_duty = Shift(
#         id="1",
#         team_id="team1",
#         name="Duty Shift",
#         acronym="DS",
#         acronym_custom=False,
#         start_time=datetime(2023, 10, 1, 9, 0, tzinfo=timezone.utc),
#         end_time=datetime(2023, 10, 1, 17, 0, tzinfo=timezone.utc),
#         staffing=[],
#         color="#FFFFFF",
#         shift_type=ShiftType.DUTY,
#         rest_type=ShiftRestType.NONE,
#         leave_type=ShiftLeaveType.NONE,
#         recuperation_time=2,
#         recuperation_duty_id=None,
#         deleted=False,
#     )
#     mock_collection.shift_db.get_recuperation_shift.return_value = None
#     mock_collection.shift_db.create_shift.return_value = MagicMock()

#     result = shift_service.create_or_update_duty_recuperation_shift(shift_duty)
#     assert result is not None
#     mock_collection.shift_db.create_shift.assert_called_once()
