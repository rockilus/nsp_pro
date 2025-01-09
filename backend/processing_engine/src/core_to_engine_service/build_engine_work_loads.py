import calendar
import math
from datetime import date
from typing import Dict, List, Tuple

from shared.schemas import Shift, Worker, WorkerDates

from engine import NbDuties as NbDutiesEngine
from engine import WorkLoads as WorkLoadsEngine
from engine import WorkTime as WorkTimeEngine
from utils.constants import Constants


# pylint: disable=too-many-arguments
def build_engine_work_loads(
    workers_not_deleted: List[Worker],
    periods_weekly: List[List[date]],
    periods_monthly: List[List[date]],
    ws_to_dates: Dict[Tuple[str, str], WorkerDates],
    shifts_work: List[Shift],
    shift_duties: List[Shift],
    shift_id_to_duration_dict: Dict[str, int],
) -> WorkLoadsEngine:
    return WorkLoadsEngine(
        weekly_work_time_contractual=_build_engine_work_time(
            workers_not_deleted,
            periods_weekly,
            ws_to_dates,
            shifts_work,
            shift_id_to_duration_dict,
            [w.weekly_hours for w in workers_not_deleted],
            100,
        ),
        weekly_work_time_desired=_build_engine_work_time(
            workers_not_deleted,
            periods_weekly,
            ws_to_dates,
            shifts_work,
            shift_id_to_duration_dict,
            [w.weekly_hours_desired for w in workers_not_deleted],
            50,
        ),
        weekly_work_time_max=_build_engine_work_time(
            workers_not_deleted,
            periods_weekly,
            ws_to_dates,
            shifts_work,
            shift_id_to_duration_dict,
            [80 for _ in workers_not_deleted],
            0,
        ),
        monthly_nb_duties_desired=_build_engine_nb_duties(
            workers_not_deleted,
            periods_monthly,
            ws_to_dates,
            shift_duties,
            [w.duties_per_month for w in workers_not_deleted],
            100,
        ),
        monthly_nb_duties_max=_build_engine_nb_duties(
            workers_not_deleted,
            periods_monthly,
            ws_to_dates,
            shift_duties,
            [1000 for _ in workers_not_deleted],
            0,
        ),
    )


# pylint: disable=too-many-arguments, too-many-locals
def _build_engine_work_time(
    workers_not_deleted: List[Worker],
    periods: List[List[date]],
    ws_to_dates: Dict[Tuple[str, str], WorkerDates],
    shifts_work: List[Shift],
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
            ws_to_dates,
            shifts_work,
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
    ws_to_dates: Dict[Tuple[str, str], WorkerDates],
    shift_duties: List[Shift],
    worker_to_target_list: List[int],
    penalty: int,
) -> NbDutiesEngine:
    assignments: List[List[List[Tuple[str, str, str]]]] = []
    targets: List[List[int]] = []
    for w, w_target in zip(workers_not_deleted, worker_to_target_list):
        w_assignments, w_targets = build_engine_nb_duties_worker(
            w,
            periods,
            ws_to_dates,
            shift_duties,
            w_target,
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
    ws_to_dates: Dict[Tuple[str, str], WorkerDates],
    shifts_work: List[Shift],
    shift_id_to_duration_dict: Dict[str, int],
    target: int,
) -> Tuple[List[List[Tuple[str, str, str]]], List[int], List[List[int]]]:
    w_assignments: List[List[Tuple[str, str, str]]] = []
    w_targets: List[int] = []
    w_durations: List[List[int]] = []

    period_target_minutes = target * Constants.NUM_MINUTES_HOUR
    for period in periods:
        # Calculate the adjusted target
        num_days_in_period = len(period)
        adjusted_target = math.ceil(
            (period_target_minutes / Constants.NUM_DAYS_WEEK)
            * num_days_in_period
        )

        ws_assignments: List[Tuple[str, str, str]] = []
        ws_durations: List[int] = []
        for s in shifts_work:
            dates_ws = (
                ws_to_dates[(worker.id, s.id)].dates_hist
                + ws_to_dates[(worker.id, s.id)].dates_campaign
            )
            ws_assignments.extend(
                [
                    (worker.id, d.isoformat(), s.id)
                    for d in period
                    if d in dates_ws
                ]
            )
            ws_durations.extend(
                [
                    shift_id_to_duration_dict[s.id]
                    for d in period
                    if d in dates_ws
                ]
            )
        if len(ws_assignments) == 0:
            continue
        w_assignments.append(ws_assignments)
        w_targets.append(adjusted_target)
        w_durations.append(ws_durations)

    return w_assignments, w_targets, w_durations


def build_engine_nb_duties_worker(
    worker: Worker,
    periods: List[List[date]],
    ws_to_dates: Dict[Tuple[str, str], WorkerDates],
    shift_duties: List[Shift],
    target: int,
) -> Tuple[List[List[Tuple[str, str, str]]], List[int]]:
    w_assignments: List[List[Tuple[str, str, str]]] = []
    w_targets: List[int] = []

    for period in periods:
        # Calculate the adjusted target
        num_days_in_period = len(period)
        if num_days_in_period == 0:
            continue
        first_day = period[0]
        num_days_in_month = calendar.monthrange(
            first_day.year, first_day.month
        )[1]

        adjusted_target = math.ceil(
            (target / num_days_in_month) * num_days_in_period
        )

        ws_assignments: List[Tuple[str, str, str]] = []
        for s in shift_duties:
            dates_ws = (
                ws_to_dates[(worker.id, s.id)].dates_hist
                + ws_to_dates[(worker.id, s.id)].dates_campaign
            )
            ws_assignments.extend(
                [
                    (worker.id, d.isoformat(), s.id)
                    for d in period
                    if d in dates_ws
                ]
            )
        if len(ws_assignments) == 0:
            continue
        w_assignments.append(ws_assignments)
        w_targets.append(adjusted_target)

    return w_assignments, w_targets
