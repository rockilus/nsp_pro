from datetime import datetime

import pytest
from shared.schemas.core import (
    EngineInputsAugmented,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Staffing,
)

from core_to_engine_service.core_to_engine_inputs import (
    _build_shift_id_to_duration_dict,
)
from tests.sample_data import test_data_set_1


class TestBuildShiftIdToDurationDict:
    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_build_shift_id_to_duration_dict(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        shifts = sample_data.shifts
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)

        expected_durations = {
            shift.id: (shift.end_time - shift.start_time).total_seconds() // 60 - 1
            for shift in shifts
        }
        assert shift_id_to_duration_dict == expected_durations

    def test_empty_shifts(self) -> None:
        shifts: list[Shift] = []
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
