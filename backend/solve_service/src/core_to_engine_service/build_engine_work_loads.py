from datetime import date

from shared.logger import log_info
from shared.schemas.core import Penalties, Shift, Worker, WorkerDates

from engine import NbDuties as NbDutiesEngine
from engine import WorkLoads as WorkLoadsEngine
from engine import WorkTime as WorkTimeEngine


# pylint: disable=too-many-arguments
def build_engine_work_loads(
    workers_not_deleted: list[Worker],
    periods_weekly: list[list[date]],
    periods_monthly: list[list[date]],
    ws_to_dates: dict[tuple[str, str], WorkerDates],
    shifts_work: list[Shift],
    shift_duties: list[Shift],
    shift_id_to_duration_dict: dict[str, int],
    w_to_work_times: dict[str, dict[str, list[int]]],
    w_to_nb_duties: dict[str, dict[str, list[int]]],
    penalties: Penalties,
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
        monthly_nb_duties_desired=build_engine_nb_duties(
            workers_not_deleted,
            periods_monthly,
            ws_to_dates,
            shift_duties,
            w_to_nb_duties,
            "desired",
            penalties.configuration_constraint.monthly_duties_desired,
        ),
        monthly_nb_duties_max=build_engine_nb_duties(
            workers_not_deleted,
            periods_monthly,
            ws_to_dates,
            shift_duties,
            w_to_nb_duties,
            "max",
            penalties.configuration_constraint.monthly_duties_max,
        ),
    )


# pylint: disable=too-many-arguments, too-many-locals
def build_engine_work_time(
    workers_not_deleted: list[Worker],
    periods: list[list[date]],
    ws_to_dates: dict[tuple[str, str], WorkerDates],
    shifts_work: list[Shift],
    shift_id_to_duration_dict: dict[str, int],
    w_to_work_times: dict[str, dict[str, list[int]]],
    target_work_time_name: str,
    penalty: int,
    tolerance: float = 0.0,
) -> WorkTimeEngine:
    assignments: list[list[list[tuple[str, str, str]]]] = []
    targets: list[list[int]] = []
    durations: list[list[list[int]]] = []
    for w in workers_not_deleted:
        w_targets = w_to_work_times.get(w.id, {}).get(target_work_time_name, None)
        if w_targets is None:
            log_info(
                f"Worker {w.id} does not have {target_work_time_name} work time target"
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
        tolerance=tolerance,
    )


def build_engine_nb_duties(
    workers_not_deleted: list[Worker],
    periods: list[list[date]],
    ws_to_dates: dict[tuple[str, str], WorkerDates],
    shift_duties: list[Shift],
    w_to_nb_duties: dict[str, dict[str, list[int]]],
    target_nb_duties_name: str,
    penalty: int,
    tolerance: float = 0.0,
) -> NbDutiesEngine:
    assignments: list[list[list[tuple[str, str, str]]]] = []
    targets: list[list[int]] = []
    for w in workers_not_deleted:
        w_targets = w_to_nb_duties.get(w.id, {}).get(target_nb_duties_name, None)
        if w_targets is None:
            log_info(
                f"Worker {w.id} does not have {target_nb_duties_name} nb duties target"
            )
            continue
        w_assignments = build_engine_nb_duties_worker(
            w,
            periods,
            ws_to_dates,
            shift_duties,
        )
        assignments.append(w_assignments)
        targets.append(w_targets)

    return NbDutiesEngine(
        assignments=assignments,
        targets=targets,
        penalty=penalty,
        tolerance=tolerance,
    )


def build_engine_work_time_worker(
    worker: Worker,
    periods: list[list[date]],
    ws_to_dates: dict[tuple[str, str], WorkerDates],
    shifts_work: list[Shift],
    shift_id_to_duration_dict: dict[str, int],
) -> tuple[list[list[tuple[str, str, str]]], list[list[int]]]:
    w_assignments: list[list[tuple[str, str, str]]] = []
    w_durations: list[list[int]] = []

    for period in periods:
        ws_assignments: list[tuple[str, str, str]] = []
        ws_durations: list[int] = []
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
    periods: list[list[date]],
    ws_to_dates: dict[tuple[str, str], WorkerDates],
    shift_duties: list[Shift],
) -> list[list[tuple[str, str, str]]]:
    w_assignments: list[list[tuple[str, str, str]]] = []

    for period in periods:
        ws_assignments: list[tuple[str, str, str]] = []
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

    return w_assignments
