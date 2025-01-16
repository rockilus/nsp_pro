import calendar
import math
from datetime import date, timedelta
from typing import Dict, List

import pytest
from shared.schemas import Shift, ShiftType, Worker

from core_to_engine_service.build_dates import build_ws_ids_to_dates
from core_to_engine_service.build_engine_work_loads import build_engine_work_loads
from core_to_engine_service.build_periods import (
    build_periods_monthly,
    build_periods_weekly,
)
from core_to_engine_service.core_to_engine_inputs import (
    _build_shift_id_to_duration_dict,
)
from engine import WorkLoads as WorkLoadsEngine
from tests.test_data import test_data_set_0
from utils.constants import Constants


# pylint: disable=R0801
class TestBuildEngineWorkLoads:
    # pylint: disable=too-many-locals
    @pytest.mark.parametrize("sample_data", test_data_set_0)
    def test_build_engine_work_loads(self, sample_data: Dict) -> None:
        workers = sample_data["workers"]
        shifts = sample_data["shifts"]
        schedule = sample_data["schedule"]
        fixed_assignments = sample_data["fixed_assignments"]

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]
        shifts_work = [
            shift
            for shift in shifts
            if shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]
        shift_duties = [shift for shift in shifts if shift.shift_type == ShiftType.DUTY]
        periods_weekly = build_periods_weekly([], dates_campaign)
        periods_monthly = build_periods_monthly([], dates_campaign)
        ws_to_dates = build_ws_ids_to_dates(
            schedule,
            workers,
            workers_not_deleted,
            shifts,
            shifts_not_deleted,
            fixed_assignments,
            dates_campaign,
        )

        # Call the method under test
        work_loads = build_engine_work_loads(
            workers_not_deleted,
            periods_weekly,
            periods_monthly,
            ws_to_dates,
            shifts_work,
            shift_duties,
            shift_id_to_duration_dict,
        )

        # Verify the output
        assert isinstance(work_loads, WorkLoadsEngine)

        # Verify that work loads are correctly built
        assert len(work_loads.weekly_work_time_contractual.assignments) == len(
            workers_not_deleted
        )
        assert len(work_loads.weekly_work_time_desired.assignments) == len(
            workers_not_deleted
        )
        assert len(work_loads.weekly_work_time_max.assignments) == len(
            workers_not_deleted
        )
        assert len(work_loads.monthly_nb_duties_desired.assignments) == len(
            workers_not_deleted
        )
        assert len(work_loads.monthly_nb_duties_max.assignments) == len(
            workers_not_deleted
        )

    @pytest.mark.parametrize("sample_data", test_data_set_0)
    def test_empty_workers(self, sample_data: Dict) -> None:
        workers: List[Worker] = []
        shifts = sample_data["shifts"]
        schedule = sample_data["schedule"]
        fixed_assignments = sample_data["fixed_assignments"]

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]
        shifts_work = [
            shift
            for shift in shifts
            if shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]
        shift_duties = [shift for shift in shifts if shift.shift_type == ShiftType.DUTY]
        periods_weekly = build_periods_weekly([], dates_campaign)
        periods_monthly = build_periods_monthly([], dates_campaign)
        ws_to_dates = build_ws_ids_to_dates(
            schedule,
            workers,
            workers_not_deleted,
            shifts,
            shifts_not_deleted,
            fixed_assignments,
            dates_campaign,
        )

        # Call the method under test
        work_loads = build_engine_work_loads(
            workers_not_deleted,
            periods_weekly,
            periods_monthly,
            ws_to_dates,
            shifts_work,
            shift_duties,
            shift_id_to_duration_dict,
        )

        # Verify the output
        assert isinstance(work_loads, WorkLoadsEngine)
        assert len(work_loads.weekly_work_time_contractual.assignments) == 0
        assert len(work_loads.weekly_work_time_desired.assignments) == 0
        assert len(work_loads.weekly_work_time_max.assignments) == 0
        assert len(work_loads.monthly_nb_duties_desired.assignments) == 0
        assert len(work_loads.monthly_nb_duties_max.assignments) == 0

    @pytest.mark.parametrize("sample_data", test_data_set_0)
    def test_empty_shifts(self, sample_data: Dict) -> None:
        workers = sample_data["workers"]
        shifts: List[Shift] = []
        schedule = sample_data["schedule"]
        fixed_assignments = sample_data["fixed_assignments"]

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]
        shifts_work = [
            shift
            for shift in shifts
            if shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]
        shift_duties = [shift for shift in shifts if shift.shift_type == ShiftType.DUTY]
        periods_weekly = build_periods_weekly([], dates_campaign)
        periods_monthly = build_periods_monthly([], dates_campaign)
        ws_to_dates = build_ws_ids_to_dates(
            schedule,
            workers,
            workers_not_deleted,
            shifts,
            shifts_not_deleted,
            fixed_assignments,
            dates_campaign,
        )

        # Call the method under test
        work_loads = build_engine_work_loads(
            workers_not_deleted,
            periods_weekly,
            periods_monthly,
            ws_to_dates,
            shifts_work,
            shift_duties,
            shift_id_to_duration_dict,
        )

        # Verify the output
        assert isinstance(work_loads, WorkLoadsEngine)
        assert len(work_loads.weekly_work_time_contractual.assignments) == len(
            workers_not_deleted
        )
        assert isinstance(work_loads.weekly_work_time_contractual.assignments[0], list)
        assert len(work_loads.weekly_work_time_desired.assignments[0]) == 0
        assert len(work_loads.weekly_work_time_desired.assignments) == len(
            workers_not_deleted
        )
        assert len(work_loads.weekly_work_time_max.assignments) == len(
            workers_not_deleted
        )
        assert len(work_loads.monthly_nb_duties_desired.assignments) == len(
            workers_not_deleted
        )
        assert len(work_loads.monthly_nb_duties_max.assignments) == len(
            workers_not_deleted
        )

    @pytest.mark.parametrize("sample_data", test_data_set_0)
    def test_worker_with_employment_end_date(self, sample_data: Dict) -> None:
        workers = sample_data["workers"]
        workers[0].employment_end_date = date(2025, 1, 15)
        shifts = sample_data["shifts"]
        schedule = sample_data["schedule"]
        fixed_assignments = sample_data["fixed_assignments"]

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]
        shifts_work = [
            shift
            for shift in shifts
            if shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]
        shift_duties = [shift for shift in shifts if shift.shift_type == ShiftType.DUTY]
        periods_weekly = build_periods_weekly([], dates_campaign)
        periods_monthly = build_periods_monthly([], dates_campaign)
        ws_to_dates = build_ws_ids_to_dates(
            schedule,
            workers,
            workers_not_deleted,
            shifts,
            shifts_not_deleted,
            fixed_assignments,
            dates_campaign,
        )

        # Call the method under test
        work_loads = build_engine_work_loads(
            workers_not_deleted,
            periods_weekly,
            periods_monthly,
            ws_to_dates,
            shifts_work,
            shift_duties,
            shift_id_to_duration_dict,
        )

        # Verify the output
        assert isinstance(work_loads, WorkLoadsEngine)

        # Verify that work loads respect the employment end date
        for assignment in work_loads.weekly_work_time_contractual.assignments[0][0]:
            worker_id, date_str, _ = assignment
            assert worker_id != "w0" or date.fromisoformat(date_str) <= date(
                2025, 1, 15
            )

        for assignment in work_loads.weekly_work_time_desired.assignments[0][0]:
            worker_id, date_str, _ = assignment
            assert worker_id != "w0" or date.fromisoformat(date_str) <= date(
                2025, 1, 15
            )

        for assignment in work_loads.weekly_work_time_max.assignments[0][0]:
            worker_id, date_str, _ = assignment
            assert worker_id != "w0" or date.fromisoformat(date_str) <= date(
                2025, 1, 15
            )

        for assignment in work_loads.monthly_nb_duties_desired.assignments[0][0]:
            worker_id, date_str, _ = assignment
            assert worker_id != "w0" or date.fromisoformat(date_str) <= date(
                2025, 1, 15
            )

        # pylint: disable=R0801
        for assignment in work_loads.monthly_nb_duties_max.assignments[0][0]:
            worker_id, date_str, _ = assignment
            assert worker_id != "w0" or date.fromisoformat(date_str) <= date(
                2025, 1, 15
            )

    @pytest.mark.parametrize("sample_data", test_data_set_0)
    def test_deleted_worker(self, sample_data: Dict) -> None:
        workers = sample_data["workers"]
        workers[0].deleted = True
        shifts = sample_data["shifts"]
        schedule = sample_data["schedule"]
        fixed_assignments = sample_data["fixed_assignments"]

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]
        shifts_work = [
            shift
            for shift in shifts
            if shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]
        shift_duties = [shift for shift in shifts if shift.shift_type == ShiftType.DUTY]
        periods_weekly = build_periods_weekly([], dates_campaign)
        periods_monthly = build_periods_monthly([], dates_campaign)
        ws_to_dates = build_ws_ids_to_dates(
            schedule,
            workers,
            workers_not_deleted,
            shifts,
            shifts_not_deleted,
            fixed_assignments,
            dates_campaign,
        )

        # Call the method under test
        work_loads = build_engine_work_loads(
            workers_not_deleted,
            periods_weekly,
            periods_monthly,
            ws_to_dates,
            shifts_work,
            shift_duties,
            shift_id_to_duration_dict,
        )

        # Verify the output
        assert isinstance(work_loads, WorkLoadsEngine)

        # Verify that work loads do not include the deleted worker
        for i, _ in enumerate(workers_not_deleted):
            for j, week in enumerate(periods_weekly):
                for k, _ in enumerate(shifts_work * len(week)):
                    a_desired = work_loads.weekly_work_time_contractual.assignments[i][
                        j
                    ][k]
                    a_desired = work_loads.weekly_work_time_desired.assignments[i][j][k]
                    a_max = work_loads.weekly_work_time_max.assignments[i][j][k]
                    w_id_desired, _, _ = a_desired
                    w_id_desired, _, _ = a_desired
                    w_id_max, _, _ = a_max
                    assert w_id_desired != "w0"
                    assert w_id_desired != "w0"
                    assert w_id_max != "w0"

            for j, month in enumerate(periods_monthly):
                for k, _ in enumerate(shift_duties * len(month)):
                    a_desired = work_loads.monthly_nb_duties_desired.assignments[i][j][
                        k
                    ]
                    a_max = work_loads.monthly_nb_duties_max.assignments[i][j][k]
                    w_id_desired, _, _ = a_desired
                    w_id_max, _, _ = a_max
                    assert w_id_desired != "w0"
                    assert w_id_max != "w0"

    # pylint: disable=too-many-statements
    @pytest.mark.parametrize("sample_data", test_data_set_0)
    def test_work_loads_content(self, sample_data: Dict) -> None:
        workers = sample_data["workers"]
        shifts = sample_data["shifts"]
        schedule = sample_data["schedule"]
        fixed_assignments = sample_data["fixed_assignments"]

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        shift_id_to_duration_dict = _build_shift_id_to_duration_dict(shifts)
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]
        shifts_work = [
            shift
            for shift in shifts
            if shift.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]
        shift_duties = [shift for shift in shifts if shift.shift_type == ShiftType.DUTY]
        periods_weekly = build_periods_weekly([], dates_campaign)
        periods_monthly = build_periods_monthly([], dates_campaign)
        ws_to_dates = build_ws_ids_to_dates(
            schedule,
            workers,
            workers_not_deleted,
            shifts,
            shifts_not_deleted,
            fixed_assignments,
            dates_campaign,
        )

        # Call the method under test
        work_loads = build_engine_work_loads(
            workers_not_deleted,
            periods_weekly,
            periods_monthly,
            ws_to_dates,
            shifts_work,
            shift_duties,
            shift_id_to_duration_dict,
        )

        # Verify the output
        assert isinstance(work_loads, WorkLoadsEngine)

        for i, _ in enumerate(workers_not_deleted):
            for j, week in enumerate(periods_weekly):
                t_contractual = work_loads.weekly_work_time_contractual.targets[i][j]
                t_desired = work_loads.weekly_work_time_desired.targets[i][j]
                t_max = work_loads.weekly_work_time_max.targets[i][j]
                for k, _ in enumerate(shifts_work * len(week)):
                    a_contractual = work_loads.weekly_work_time_contractual.assignments[
                        i
                    ][j][k]
                    a_desired = work_loads.weekly_work_time_desired.assignments[i][j][k]
                    a_max = work_loads.weekly_work_time_max.assignments[i][j][k]
                    w_id_contractual, d_contractual, s_contractual = a_contractual
                    w_id_desired, d_desired, s_desired = a_desired
                    w_id_max, d_max, s_max = a_max
                    assert w_id_contractual == w_id_desired == w_id_max
                    assert d_contractual == d_desired == d_max
                    assert s_contractual == s_desired == s_max
                    worker = next(
                        (
                            worker
                            for worker in workers_not_deleted
                            if worker.id == w_id_contractual
                        ),
                        None,
                    )
                    assert worker is not None
                    num_days_in_period = len(week)
                    target_period_contract_minutes = (
                        worker.weekly_hours * Constants.NUM_MINUTES_HOUR
                    )
                    target_adj_contract = math.ceil(
                        (target_period_contract_minutes / Constants.NUM_DAYS_WEEK)
                        * num_days_in_period
                    )
                    target_period_desired_minutes = (
                        worker.weekly_hours_desired * Constants.NUM_MINUTES_HOUR
                    )
                    target_adj_desired = math.ceil(
                        (target_period_desired_minutes / Constants.NUM_DAYS_WEEK)
                        * num_days_in_period
                    )
                    target_period_max_minutes = 80 * Constants.NUM_MINUTES_HOUR
                    target_adj_max = math.ceil(
                        (target_period_max_minutes / Constants.NUM_DAYS_WEEK)
                        * num_days_in_period
                    )
                    assert t_contractual == target_adj_contract
                    assert t_desired == target_adj_desired
                    assert t_max == target_adj_max

            for j, month in enumerate(periods_monthly):
                num_days_in_period = len(month)
                if num_days_in_period == 0:
                    continue
                first_day = month[0]
                num_days_in_month = calendar.monthrange(
                    first_day.year, first_day.month
                )[1]
                coef_adj = (1 / num_days_in_month) * num_days_in_period

                nb_desired = work_loads.monthly_nb_duties_desired.targets[i][j]
                nb_max = work_loads.monthly_nb_duties_max.targets[i][j]
                for k, _ in enumerate(shift_duties * len(month)):
                    a_desired = work_loads.monthly_nb_duties_desired.assignments[i][j][
                        k
                    ]
                    a_max = work_loads.monthly_nb_duties_max.assignments[i][j][k]
                    w_id_desired, d_desired, s_desired = a_desired
                    w_id_max, d_max, s_max = a_max
                    assert w_id_desired == w_id_max
                    assert d_desired == d_max
                    assert s_desired == s_max
                    worker = next(
                        (
                            worker
                            for worker in workers_not_deleted
                            if worker.id == w_id_desired
                        ),
                        None,
                    )
                    assert worker is not None
                    if nb_desired != worker.duties_per_month:
                        print("stop")
                    assert nb_desired == math.ceil(worker.duties_per_month * coef_adj)
                    assert nb_max == math.ceil(1000 * coef_adj)
