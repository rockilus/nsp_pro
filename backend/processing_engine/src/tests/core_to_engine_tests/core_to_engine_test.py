from datetime import datetime
from typing import Dict, List

from shared.schemas import Shift, ShiftLeaveType, ShiftRestType, ShiftType, Staffing

from core_to_engine_service.core_to_engine_inputs import (
    _build_shift_id_to_duration_dict,
)

# pylint: disable=unused-import
from tests.test_data import sample_data  # noqa: F401


class TestBuildShiftIdToDurationDict:
    # pylint: disable=redefined-outer-name
    def test_build_shift_id_to_duration_dict(
        self, sample_data: Dict  # noqa: F811
    ) -> None:
        shifts = sample_data["shifts"]
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)

        # Verify the shift durations
        expected_durations = {
            "s0": 239,  # 4 hours (240 minutes) - 1 minute
            "s1": 239,  # 4 hours (240 minutes) - 1 minute
            "s2": 239,  # 4 hours (240 minutes) - 1 minute
            "s3": 1439,  # 24 hours (1440 minutes) - 1 minute
            "s4": 719,  # 12 hours (720 minutes) - 1 minute
            "s5": 1439,  # 24 hours (1440 minutes) - 1 minute
            "s6": 719,  # 12 hours (720 minutes) - 1 minute
        }
        assert shift_id_to_duration_dict == expected_durations

    def test_empty_shifts(self) -> None:
        shifts: List[Shift] = []
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)

        # Verify the shift durations
        assert shift_id_to_duration_dict == {}

    def test_single_shift(self) -> None:
        # pylint: disable=R0801
        shifts = [
            Shift(
                id="s0",
                team_id="t0",
                name="Single Shift",
                acronym="SS",
                acronym_custom=False,
                start_time=datetime(2025, 1, 1, 8, 0),
                end_time=datetime(2025, 1, 1, 12, 0),
                staffing=[Staffing(specialty_id=None, staffing=1)],
                color="blue",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            )
        ]
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)

        # Verify the shift duration
        expected_durations = {
            "s0": 239,  # 4 hours (240 minutes) - 1 minute
        }
        assert shift_id_to_duration_dict == expected_durations
