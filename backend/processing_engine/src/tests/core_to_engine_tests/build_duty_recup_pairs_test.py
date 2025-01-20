from datetime import date, timedelta
from typing import List

import pytest
from shared.schemas import EngineInputs, Shift, ShiftType, Worker, WorkerDates

from core_to_engine_service.build_dates import build_worker_ids_to_worker_dates
from core_to_engine_service.build_duty_recup_pairs import build_duty_recup_pairs
from tests.test_data import test_data_set_1


# pylint: disable=R0801
class TestBuildDutyRecupPairs:
    # pylint: disable=too-many-locals
    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_build_duty_recup_pairs(self, sample_data: EngineInputs) -> None:
        workers = sample_data.workers
        shifts = sample_data.shifts
        schedule = sample_data.schedule
        fixed_assignments = sample_data.as_hist + sample_data.as_wip_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]
        shift_duties_not_deleted = [
            shift
            for shift in shifts
            if shift.shift_type == ShiftType.DUTY and not shift.deleted
        ]

        # Call the method under test
        duty_recup_pairs = build_duty_recup_pairs(
            workers_not_deleted,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            shift_duties_not_deleted,
        )

        # Verify the output
        assert isinstance(duty_recup_pairs, list)
        assert all(isinstance(pair, tuple) for pair in duty_recup_pairs)
        assert all(
            isinstance(pair[0], tuple) and isinstance(pair[1], tuple)
            for pair in duty_recup_pairs
        )
        for pair in duty_recup_pairs:
            w_duty_id, d_duty, s_duty_id = pair[0]
            w_recup_id, d_recup, s_recup_id = pair[1]
            assert w_duty_id == w_recup_id
            assert d_duty == d_recup
            if s_duty_id == "s3":
                assert s_recup_id == "s5"
            elif s_duty_id == "s4":
                assert s_recup_id == "s6"
        w_ids_in_pairs = sorted(
            set(w_id for pair in duty_recup_pairs for w_id, _, _ in pair)
        )
        assert w_ids_in_pairs == sorted(set(w.id for w in workers_not_deleted))
        dates_in_pairs = sorted(
            set(date.fromisoformat(d) for pair in duty_recup_pairs for _, d, _ in pair)
        )
        assert dates_in_pairs == sorted(dates_campaign)

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_empty_workers(self, sample_data: EngineInputs) -> None:
        workers: List[Worker] = []
        shifts = sample_data.shifts
        schedule = sample_data.schedule
        fixed_assignments = sample_data.as_hist + sample_data.as_wip_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]
        shift_duties_not_deleted = [
            shift
            for shift in shifts
            if shift.shift_type == ShiftType.DUTY and not shift.deleted
        ]

        # Call the method under test
        duty_recup_pairs = build_duty_recup_pairs(
            workers,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            shift_duties_not_deleted,
        )

        # Verify the output
        assert isinstance(duty_recup_pairs, list)
        assert len(duty_recup_pairs) == 0

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_empty_shifts(self, sample_data: EngineInputs) -> None:
        workers = sample_data.workers
        shifts: List[Shift] = []
        schedule = sample_data.schedule
        fixed_assignments = sample_data.as_hist + sample_data.as_wip_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )

        # Call the method under test
        duty_recup_pairs = build_duty_recup_pairs(
            workers_not_deleted,
            worker_ids_to_worker_dates,
            shifts,
            [],
        )

        # Verify the output
        assert isinstance(duty_recup_pairs, list)
        assert len(duty_recup_pairs) == 0

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_worker_with_no_dates(self, sample_data: EngineInputs) -> None:
        workers = sample_data.workers
        shifts = sample_data.shifts

        # Build necessary inputs
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = {
            worker.id: WorkerDates(dates_hist=[], dates_campaign=[])
            for worker in workers_not_deleted
        }
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]
        shift_duties_not_deleted = [
            shift
            for shift in shifts
            if shift.shift_type == ShiftType.DUTY and not shift.deleted
        ]

        # Call the method under test
        duty_recup_pairs = build_duty_recup_pairs(
            workers_not_deleted,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            shift_duties_not_deleted,
        )

        # Verify the output
        assert isinstance(duty_recup_pairs, list)
        assert len(duty_recup_pairs) == 0
