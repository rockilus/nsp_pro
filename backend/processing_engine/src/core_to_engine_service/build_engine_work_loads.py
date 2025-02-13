import calendar
import math
from datetime import date
from typing import Dict, List, Tuple

from shared.logger import log_info
from shared.schemas import Shift, Worker, WorkerDates

from core_to_engine_service.penalties import penalties
from engine import NbDuties as NbDutiesEngine
from engine import WorkLoads as WorkLoadsEngine
from engine import WorkTime as WorkTimeEngine


# pylint: disable=too-many-arguments
def build_engine_work_loads(
    workers_not_deleted: List[Worker],
    periods_weekly: List[List[date]],
    periods_monthly: List[List[date]],
    ws_to_dates: Dict[Tuple[str, str], WorkerDates],
    shifts_work: List[Shift],
    shift_duties: List[Shift],
    shift_id_to_duration_dict: Dict[str, int],
    w_to_work_times: Dict[str, Dict[str, List[int]]],
) -> WorkLoadsEngine:
    return WorkLoadsEngine(
        weekly_work_time_contractual=build_engine_work_time(
            workers_not_deleted,
            periods_weekly,
            ws_to_dates,
            shifts_work,
            shift_id_to_duration_dict,
            w_to_work_times,
            "contract",
            penalties.configuration_constraint.weekly_worktime_contract,
        ),
        weekly_work_time_desired=build_engine_work_time(
            workers_not_deleted,
            periods_weekly,
            ws_to_dates,
            shifts_work,
            shift_id_to_duration_dict,
            w_to_work_times,
            "desired",
            penalties.configuration_constraint.weekly_worktime_desired,
        ),
        weekly_work_time_max=build_engine_work_time(
            workers_not_deleted,
            periods_weekly,
            ws_to_dates,
            shifts_work,
            shift_id_to_duration_dict,
            w_to_work_times,
            "max",
            penalties.configuration_constraint.weekly_worktime_max,
        ),
        monthly_nb_duties_desired=_build_engine_nb_duties(
            workers_not_deleted,
            periods_monthly,
            ws_to_dates,
            shift_duties,
            [w.duties_per_month for w in workers_not_deleted],
            penalties.configuration_constraint.monthly_duties_desired,
        ),
        monthly_nb_duties_max=_build_engine_nb_duties(
            workers_not_deleted,
            periods_monthly,
            ws_to_dates,
            shift_duties,
            [1000 for _ in workers_not_deleted],
            penalties.configuration_constraint.monthly_duties_max,
        ),
    )


# pylint: disable=too-many-arguments, too-many-locals
def build_engine_work_time(
    workers_not_deleted: List[Worker],
    periods: List[List[date]],
    ws_to_dates: Dict[Tuple[str, str], WorkerDates],
    shifts_work: List[Shift],
    shift_id_to_duration_dict: Dict[str, int],
    w_to_work_times: Dict[str, Dict[str, List[int]]],
    target_work_time_name: str,
    penalty: int,
) -> WorkTimeEngine:
    assignments: List[List[List[Tuple[str, str, str]]]] = []
    targets: List[List[int]] = []
    durations: List[List[List[int]]] = []
    for w in workers_not_deleted:
        w_targets = w_to_work_times.get(w.id, {}).get(target_work_time_name, None)
        if w_targets is None:
            log_info(
                f"Worker {w.id} does not have {target_work_time_name} "
                "work time target"
            )
            continue
        w_assignments, w_durations = build_engine_work_time_worker(
            w,
            periods,
            ws_to_dates,
            shifts_work,
            shift_id_to_duration_dict,
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
) -> Tuple[List[List[Tuple[str, str, str]]], List[List[int]]]:
    w_assignments: List[List[Tuple[str, str, str]]] = []
    w_durations: List[List[int]] = []

    for period in periods:
        ws_assignments: List[Tuple[str, str, str]] = []
        ws_durations: List[int] = []
        for s in shifts_work:
            dates_ws = (
                ws_to_dates[(worker.id, s.id)].dates_hist
                + ws_to_dates[(worker.id, s.id)].dates_campaign
            )
            ws_assignments.extend(
                [(worker.id, d.isoformat(), s.id) for d in period if d in dates_ws]
            )
            ws_durations.extend(
                [shift_id_to_duration_dict[s.id] for d in period if d in dates_ws]
            )
        if len(ws_assignments) == 0:
            continue
        w_assignments.append(ws_assignments)
        w_durations.append(ws_durations)

    return w_assignments, w_durations


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
        num_days_in_month = calendar.monthrange(first_day.year, first_day.month)[1]

        adjusted_target = math.ceil((target / num_days_in_month) * num_days_in_period)

        ws_assignments: List[Tuple[str, str, str]] = []
        for s in shift_duties:
            dates_ws = (
                ws_to_dates[(worker.id, s.id)].dates_hist
                + ws_to_dates[(worker.id, s.id)].dates_campaign
            )
            ws_assignments.extend(
                [(worker.id, d.isoformat(), s.id) for d in period if d in dates_ws]
            )
        if len(ws_assignments) == 0:
            continue
        w_assignments.append(ws_assignments)
        w_targets.append(adjusted_target)

    return w_assignments, w_targets
