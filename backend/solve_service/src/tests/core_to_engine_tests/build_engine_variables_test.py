from datetime import date, timedelta

import pytest
from shared.schemas.core import (
    EngineInputsAugmented,
    Shift,
    ShiftRestType,
    ShiftType,
    Worker,
)

from core_to_engine_service.build_dates import build_worker_ids_to_worker_dates
from core_to_engine_service.build_engine_variables import (
    build_engine_variables,
)
from core_to_engine_service.core_to_engine_inputs import (
    _build_shift_id_to_duration_dict,
)
from engine import Variables as VariablesEngine
from tests.sample_data import test_data_set_1


class TestBuildEngineVariables:
    # pylint: disable=too-many-locals
    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_build_engine_variables(self, sample_data: EngineInputsAugmented) -> None:
        workers = sample_data.workers
        shifts = sample_data.shifts
        schedule = sample_data.schedule
        fixed_assignments = sample_data.as_hist + sample_data.as_campaign_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        variables = build_engine_variables(
            workers,
            worker_ids_to_worker_dates,
            shifts,
            shifts_not_deleted,
            shift_id_to_duration_dict,
        )

        # Verify the output
        assert isinstance(variables, VariablesEngine)
        assert len(variables.assignments) > 0
        assert len(variables.shift_intervals) > 0

        # Verify that all combinations of worker ids, dates, and shifts are included
        expected_assignments = [
            (worker.id, date.isoformat(), shift.id)
            for worker in workers
            for date in worker_ids_to_worker_dates[worker.id].dates_campaign
            for shift in shifts_not_deleted
        ]
        assert sorted(variables.assignments) == sorted(expected_assignments)

        # Verify that shift intervals are correctly built
        for interval in variables.shift_intervals:
            start_time, duration, end_time, assignment = interval
            worker_id, date_str, shift_id = assignment
            shift = next((shift for shift in shifts if shift.id == shift_id), None)
            assert shift is not None
            date_obj = date.fromisoformat(date_str)
            day_diff_start = 0
            if shift.rest_type == ShiftRestType.RECUPERATION:
                s_duty = next(
                    (
                        s
                        for s in shifts_not_deleted
                        if s.shift_type == ShiftType.DUTY
                        and s.id == shift.recuperation_duty_id
                    ),
                    None,
                )
                assert s_duty is not None
                day_diff_start = (
                    s_duty.end_time.date() - s_duty.start_time.date()
                ).days
            expected_start_time = int(
                (
                    shift.start_time.replace(
                        year=date_obj.year,
                        month=date_obj.month,
                        day=date_obj.day,
                    )
                    + timedelta(days=day_diff_start)
                ).timestamp()
                // 60
            )
            day_diff = (
                shift.end_time.date() - shift.start_time.date()
            ).days + day_diff_start
            expected_end_time = int(
                (
                    shift.end_time.replace(
                        year=date_obj.year,
                        month=date_obj.month,
                        day=date_obj.day,
                    )
                    + timedelta(days=day_diff)
                ).timestamp()
                // 60
                - 1
            )
            expected_duration = shift_id_to_duration_dict[shift_id]
            assert start_time == expected_start_time
            assert end_time == expected_end_time
            assert duration == expected_duration
            assert (worker_id, date_str, shift_id) in variables.assignments

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_empty_workers(self, sample_data: EngineInputsAugmented) -> None:
        workers: list[Worker] = []
        shifts = sample_data.shifts
        schedule = sample_data.schedule
        fixed_assignments = sample_data.as_hist + sample_data.as_campaign_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        variables = build_engine_variables(
            workers,
            worker_ids_to_worker_dates,
            shifts,
            shifts_not_deleted,
            shift_id_to_duration_dict,
        )

        # Verify the output
        assert isinstance(variables, VariablesEngine)
        assert len(variables.assignments) == 0
        assert len(variables.shift_intervals) == 0

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_empty_shifts(self, sample_data: EngineInputsAugmented) -> None:
        workers = sample_data.workers
        shifts: list[Shift] = []
        schedule = sample_data.schedule
        fixed_assignments = sample_data.as_hist + sample_data.as_campaign_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        variables = build_engine_variables(
            workers,
            worker_ids_to_worker_dates,
            shifts,
            shifts_not_deleted,
            shift_id_to_duration_dict,
        )

        # Verify the output
        assert isinstance(variables, VariablesEngine)
        assert len(variables.assignments) == 0
        assert len(variables.shift_intervals) == 0

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_worker_with_employment_end_date(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        workers = sample_data.workers
        workers[0].employment_end_date = date(2025, 1, 15)
        shifts = sample_data.shifts
        schedule = sample_data.schedule
        fixed_assignments = sample_data.as_hist + sample_data.as_campaign_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        variables = build_engine_variables(
            workers,
            worker_ids_to_worker_dates,
            shifts,
            shifts_not_deleted,
            shift_id_to_duration_dict,
        )

        # Verify the output
        assert isinstance(variables, VariablesEngine)
        assert len(variables.assignments) > 0
        assert len(variables.shift_intervals) > 0

        # Verify that assignments and intervals respect the employment end date
        for assignment in variables.assignments:
            worker_id, date_str, _ = assignment
            assert worker_id != "w0" or date.fromisoformat(date_str) <= date(
                2025, 1, 15
            )

        for interval in variables.shift_intervals:
            _, _, _, assignment = interval
            worker_id, date_str, _ = assignment
            assert worker_id != "w0" or date.fromisoformat(date_str) <= date(
                2025, 1, 15
            )

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_deleted_worker(self, sample_data: EngineInputsAugmented) -> None:
        workers = sample_data.workers
        workers[0].deleted = True
        shifts = sample_data.shifts
        schedule = sample_data.schedule
        fixed_assignments = sample_data.as_hist + sample_data.as_campaign_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        variables = build_engine_variables(
            workers,
            worker_ids_to_worker_dates,
            shifts,
            shifts_not_deleted,
            shift_id_to_duration_dict,
        )

        # Verify the output
        assert isinstance(variables, VariablesEngine)
        assert len(variables.assignments) > 0
        assert len(variables.shift_intervals) > 0

        # Verify that assignments and intervals do not include the deleted worker
        for assignment in variables.assignments:
            worker_id, _, _ = assignment
            assert worker_id != "w0"

        for interval in variables.shift_intervals:
            _, _, _, assignment = interval
            worker_id, _, _ = assignment
            assert worker_id != "w0"

    # pylint: disable=too-many-locals
    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_duty_recup_variables(self, sample_data: EngineInputsAugmented) -> None:
        workers = sample_data.workers

        shifts = sample_data.shifts
        shifts_duty = [shift for shift in shifts if shift.shift_type == ShiftType.DUTY]
        shift_target = shifts_duty[0]
        shift_id_target = shift_target.id
        shift_recup = next(
            (
                shift
                for shift in shifts
                if shift.rest_type == ShiftRestType.RECUPERATION
                and shift.recuperation_duty_id == shift_id_target
            ),
            None,
        )
        assert shift_recup is not None
        shift_id_recup = shift_recup.id
        shifts_test = [shift_target, shift_recup]
        sample_data.shifts = shifts_test

        schedule = sample_data.schedule
        fixed_assignments = sample_data.as_hist + sample_data.as_campaign_fixed

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)

        # Call the method under test
        variables = build_engine_variables(
            workers,
            worker_ids_to_worker_dates,
            shifts,
            shifts_test,
            shift_id_to_duration_dict,
        )

        # Verify the output
        assert isinstance(variables, VariablesEngine)
        assert len(variables.assignments) > 0
        assert len(variables.shift_intervals) > 0

        # Verify that all combinations of worker ids, dates, and shifts are included
        expected_assignments = [
            (worker.id, date.isoformat(), shift.id)
            for worker in workers
            for date in worker_ids_to_worker_dates[worker.id].dates_campaign
            for shift in shifts_test
        ]
        assert sorted(variables.assignments) == sorted(expected_assignments)

        # Verify that shift intervals are correctly built
        for interval in variables.shift_intervals:
            _, _, end_time, assignment = interval
            worker_id, date_str, shift_id = assignment
            if shift_id == shift_id_target:
                vi_recup = next(
                    (
                        vi
                        for vi in variables.shift_intervals
                        if vi[3] == (worker_id, date_str, shift_id_recup)
                    ),
                    None,
                )
                assert vi_recup is not None
                start_time_recup, _, _, _ = vi_recup
                assert start_time_recup == end_time + 1
