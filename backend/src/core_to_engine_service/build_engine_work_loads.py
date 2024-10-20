import math
from datetime import date
from typing import Dict, List, Tuple

from core import Shift, Worker
from core_to_engine_service.types import WorkerDates
from engine import NbDuties as NbDutiesEngine
from engine import WorkLoads as WorkLoadsEngine
from engine import WorkTime as WorkTimeEngine
from utils.constants import Constants


# pylint: disable=too-many-arguments
def build_engine_work_loads(
    workers_not_deleted: List[Worker],
    periods_weekly: List[List[date]],
    periods_monthly: List[List[date]],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    shift_duties: List[Shift],
    shift_id_to_duration_dict: Dict[str, int],
) -> WorkLoadsEngine:
    return WorkLoadsEngine(
        weekly_work_time_contractual=_build_engine_work_time(
            workers_not_deleted,
            periods_weekly,
            worker_ids_to_worker_dates,
            shifts,
            shift_id_to_duration_dict,
            [w.weekly_hours for w in workers_not_deleted],
            100,
        ),
        weekly_work_time_desired=_build_engine_work_time(
            workers_not_deleted,
            periods_weekly,
            worker_ids_to_worker_dates,
            shifts,
            shift_id_to_duration_dict,
            [w.weekly_hours_desired for w in workers_not_deleted],
            50,
        ),
        weekly_work_time_max=_build_engine_work_time(
            workers_not_deleted,
            periods_weekly,
            worker_ids_to_worker_dates,
            shifts,
            shift_id_to_duration_dict,
            [80 for _ in workers_not_deleted],
            0,
        ),
        monthly_nb_duties_desired=_build_engine_nb_duties(
            workers_not_deleted,
            periods_monthly,
            worker_ids_to_worker_dates,
            shift_duties,
            [w.duties_per_month for w in workers_not_deleted],
            100,
        ),
        monthly_nb_duties_max=_build_engine_nb_duties(
            workers_not_deleted,
            periods_monthly,
            worker_ids_to_worker_dates,
            shift_duties,
            [8 for _ in workers_not_deleted],
            0,
        ),
    )


# pylint: disable=too-many-arguments
def _build_engine_work_time(
    workers_not_deleted: List[Worker],
    periods: List[List[date]],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
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
            w,
            periods,
            worker_ids_to_worker_dates,
            shifts,
            shift_id_to_duration_dict,
            w_target,
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


def _build_engine_nb_duties(
    workers_not_deleted: List[Worker],
    periods: List[List[date]],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shift_duties: List[Shift],
    worker_to_target_list: List[int],
    penalty: int,
) -> NbDutiesEngine:
    assignments: List[List[List[Tuple[str, str, str]]]] = []
    targets: List[List[int]] = []
    for w, w_target in zip(workers_not_deleted, worker_to_target_list):
        w_assignments, w_targets = build_engine_nb_duties_worker(
            w, periods, worker_ids_to_worker_dates, shift_duties, w_target
        )
        assignments.append(w_assignments)
        targets.append(w_targets)

    return NbDutiesEngine(
        assignments=assignments,
        targets=targets,
        penalty=penalty,
    )


def build_engine_work_time_worker(
    worker: Worker,
    periods: List[List[date]],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    shift_id_to_duration_dict: Dict[str, int],
    target: int,
) -> Tuple[List[List[Tuple[str, str, str]]], List[int], List[List[int]]]:
    w_assignments: List[List[Tuple[str, str, str]]] = []
    w_targets: List[int] = []
    w_durations: List[List[int]] = []

    dates_worker_set = set(
        worker_ids_to_worker_dates[worker.id].dates_hist
        + worker_ids_to_worker_dates[worker.id].dates_campaign
    )
    period_target_minutes = target * Constants.NUM_MINUTES_HOUR
    for period in periods:
        period = list(set(period).intersection(dates_worker_set))
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


def build_engine_nb_duties_worker(
    worker: Worker,
    periods: List[List[date]],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shift_duties: List[Shift],
    target: int,
) -> Tuple[List[List[Tuple[str, str, str]]], List[int]]:
    w_assignments: List[List[Tuple[str, str, str]]] = []
    w_targets: List[int] = []

    dates_worker_set = set(
        worker_ids_to_worker_dates[worker.id].dates_hist
        + worker_ids_to_worker_dates[worker.id].dates_campaign
    )
    period_target_minutes = target * Constants.NUM_MINUTES_HOUR
    for period in periods:
        period = list(set(period).intersection(dates_worker_set))
        # Calculate the adjusted target
        num_days_in_week = len(period)
        adjusted_target = math.ceil(
            (period_target_minutes / Constants.NUM_DAYS_WEEK) * num_days_in_week
        )
        w_assignments.append(
            [(worker.id, d.isoformat(), s.id) for d in period for s in shift_duties]
        )
        w_targets.append(adjusted_target)
    return w_assignments, w_targets
