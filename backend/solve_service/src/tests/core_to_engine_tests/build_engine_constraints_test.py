import random
from datetime import timedelta
from typing import List

import pytest
from shared.schemas.core import (
    ConstraintOperator,
    ConstraintSum,
    ConstraintType,
    EngineInputsAugmented,
    QuickStaffing,
    Schedule,
    Shift,
    Worker,
)

from core_to_engine_service.build_dates import build_worker_ids_to_worker_dates
from core_to_engine_service.build_engine_constraints import (
    _build_quick_staffing_constraints,
)
from tests.sample_data import test_data_set_1


# pylint: disable=too-few-public-methods
class TestBuildQuickStaffingConstraints:
    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_build_quick_staffing_constraints(
        self,
        sample_data: EngineInputsAugmented,
    ) -> None:
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

        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, [], dates_campaign
        )

        constraints = _build_quick_staffing_constraints(
            schedule,
            workers,
            worker_ids_to_worker_dates,
            shifts,
            sample_data.penalties.user_constraint.sum.hard,
        )

        assert isinstance(constraints, list)
        assert all(isinstance(constraint, ConstraintSum) for constraint in constraints)

        expected_out = ConstraintSum(
            id="",
            constraint_type=ConstraintType.SUM,
            operator=ConstraintOperator.EQUAL,
            target_value=target_qs.target,
            target_unit="shift",
            constraint_variables=[
                [
                    (target_worker.id, d.isoformat(), target_shift.id)
                    for d in worker_ids_to_worker_dates[target_worker.id].dates_campaign
                ]
            ],
            active=True,
            hard=True,
            priority="high",
            penalty=sample_data.penalties.user_constraint.sum.hard,
            schedule_id=schedule.id,
            constraint_build_id="",
        )
        assert constraints == [expected_out]
