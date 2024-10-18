import math
from datetime import date, timedelta
from typing import Dict, List, Tuple

from core import Shift, Worker
from engine import WorkTime as WorkTimeEngine
from engine import WorkTimes as WorkTimesEngine
from utils.constants import Constants


def build_engine_work_times(
    workers_not_deleted: List[Worker],
    dates_campaign: List[date],
    shifts: List[Shift],
    shift_id_to_duration_dict: Dict[str, int],
) -> WorkTimesEngine:
    periods_weekly = _build_periods_weekly(dates_campaign)
    return WorkTimesEngine(
        weekly_work_time_contractual=_build_engine_work_time(
            workers_not_deleted,
            periods_weekly,
            shifts,
            shift_id_to_duration_dict,
            [w.weekly_hours for w in workers_not_deleted],
            100,
        ),
        weekly_work_time_desired=_build_engine_work_time(
            workers_not_deleted,
            periods_weekly,
            shifts,
            shift_id_to_duration_dict,
            [w.weekly_hours_desired for w in workers_not_deleted],
            50,
        ),
        weekly_work_time_max=_build_engine_work_time(
            workers_not_deleted,
            periods_weekly,
            shifts,
            shift_id_to_duration_dict,
            [80 for _ in workers_not_deleted],
            0,
        ),
    )


# pylint: disable=too-many-arguments
def _build_engine_work_time(
    workers_not_deleted: List[Worker],
    periods: List[List[date]],
    shifts: List[Shift],
    shift_id_to_duration_dict: Dict[str, int],
    worker_to_target_list: List[int],
    penalty: int,
) -> WorkTimeEngine:
    assignments: List[List[List[Tuple[str, str, str]]]] = []
    targets: List[List[int]] = []
    durations: List[List[List[int]]] = []
    for w, w_target in zip(workers_not_deleted, worker_to_target_list):
        w_assignments, w_targets, w_durations = build_engine_work_time_worker(
            w, periods, shifts, shift_id_to_duration_dict, w_target
        )
        assignments.append(w_assignments)
        targets.append(w_targets)
        durations.append(w_durations)

    return WorkTimeEngine(
        assignments=assignments,
        targets=targets,
        durations=durations,
        penalty=penalty,
    )


def _build_periods_weekly(dates_campaign: List[date]) -> List[List[date]]:
    dates_campaign = sorted(dates_campaign)  # Ensure dates are sorted

    periods: List[List[date]] = []
    while dates_campaign:
        # Get the start of the week (Monday)
        start_date = dates_campaign[0]
        start_of_week = start_date - timedelta(days=start_date.weekday())
        end_of_week = start_of_week + timedelta(days=6)

        # Get all dates in the current week
        periods.append([d for d in dates_campaign if start_of_week <= d <= end_of_week])
        dates_campaign = [d for d in dates_campaign if d > end_of_week]
    return periods


def build_engine_work_time_worker(
    worker: Worker,
    periods: List[List[date]],
    shifts: List[Shift],
    shift_id_to_duration_dict: Dict[str, int],
    target: int,
) -> Tuple[List[List[Tuple[str, str, str]]], List[int], List[List[int]]]:
    w_assignments: List[List[Tuple[str, str, str]]] = []
    w_targets: List[int] = []
    w_durations: List[List[int]] = []

    period_target_minutes = target * Constants.NUM_MINUTES_HOUR
    for period in periods:
        # Calculate the adjusted target
        num_days_in_week = len(period)
        adjusted_target = math.ceil(
            (period_target_minutes / Constants.NUM_DAYS_WEEK) * num_days_in_week
        )
        w_assignments.append(
            [(worker.id, d.isoformat(), s.id) for d in period for s in shifts]
        )
        w_targets.append(adjusted_target)
        w_durations.append(
            [shift_id_to_duration_dict[s.id] for _ in period for s in shifts]
        )
    return w_assignments, w_targets, w_durations
