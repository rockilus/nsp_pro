import random
from typing import List

import pytest
from shared.schemas import (
    EngineInputs,
    QuickStaffing,
    Schedule,
    Shift,
    ShiftType,
    Worker,
)

from tests.engine_tests.engine_solve import engine_solve_engine_inputs
from tests.test_data import test_data_set_2


# pylint: disable=too-few-public-methods, R0801
class TestConstraintSumQuickStaffing:
    @pytest.mark.parametrize("sample_data", test_data_set_2)
    def test_build_quick_staffing_constraints(self, sample_data: EngineInputs) -> None:
        target = random.randint(1, 3)

        shifts: List[Shift] = sample_data.shifts
        target_shift = shifts[0]

        workers: List[Worker] = sample_data.workers
        target_worker = workers[0]

        schedule: Schedule = sample_data.schedule
        target_qs = QuickStaffing(
            shift_id=target_shift.id,
            worker_id=target_worker.id,
            target=target,
        )
        schedule.quick_staffings.append(target_qs)
        sample_data.schedule = schedule

        output = engine_solve_engine_inputs(sample_data)

        assignments = output.assignments
        assert (
            sum(
                1
                for assignment in assignments
                if assignment.worker_id == target_worker.id
                and assignment.shift_id == target_shift.id
            )
            == target
        )

    @pytest.mark.parametrize("sample_data", test_data_set_2)
    def test_build_quick_staffing_constraints_no_staffing(
        self, sample_data: EngineInputs
    ) -> None:
        shifts: List[Shift] = sample_data.shifts
        workers: List[Worker] = sample_data.workers
        target_worker = workers[0]

        schedule: Schedule = sample_data.schedule
        target_qss = [
            QuickStaffing(
                shift_id=s.id,
                worker_id=target_worker.id,
                target=0,
            )
            for s in shifts
            if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]
        schedule.quick_staffings = target_qss
        sample_data.schedule = schedule

        output = engine_solve_engine_inputs(sample_data)

        assignments = output.assignments
        assert (
            sum(
                1
                for assignment in assignments
                if assignment.worker_id == target_worker.id
            )
            == 0
        )
