from datetime import date
from typing import Dict, List

from constraint_parser import parse_selected_shifts
from core import Assignment, DictBlockValue, Stats
from scripts.setup_database import (
    assignment_db,
    schedule_db,
    shift_db,
    shift_property_db,
    worker_db,
)
from services.stats_services.buid_dates import build_dates
from services.stats_services.calc_per_week_day import (
    calc_stats_all,
    calc_stats_per_month,
    calc_stats_per_week,
    calc_stats_per_weekday,
    calc_stats_per_year,
)
from services.stats_services.core_to_np import (
    core_to_np_assignments_binary,
    core_to_np_assignments_worked_time,
)
from services.stats_services.np_to_core import (
    np_to_core_days_worked_all,
    np_to_core_days_worked_per_month,
    np_to_core_days_worked_per_week,
    np_to_core_days_worked_per_weekday,
    np_to_core_days_worked_per_year,
    np_to_core_nb_times_shift,
)


# pylint: disable=too-many-locals, too-many-return-statements
def build_stats(
    team_id: str,
    time_frame: str,
    target_value: str,
    target_column: str,
    selected_shifts: List[DictBlockValue],
) -> Stats:
    # stats_options = stats_options_db.get_stats_options(team_id)
    # if stats_options is None:
    #     return Stats([], [])
    schedules = schedule_db.get_schedules(team_id)
    workers = worker_db.get_workers(team_id)
    start_date, end_date, date_to_i = build_dates(time_frame, schedules)
    shifts = shift_db.get_shifts(team_id)
    shift_dim_dict = shift_property_db.get_shifts_id_by_dim_and_prop()
    assignments = assignment_db.get_assignments_by_dates(
        start_date, end_date, schedules
    )
    selected_shifts_ids = parse_selected_shifts(selected_shifts, shifts, shift_dim_dict)
    worker_to_i = {worker.id: i for i, worker in enumerate(workers)}
    # shift_to_i = {shift.id: i for i, shift in enumerate(shifts)}
    work_shift_to_i = {
        shift.id: i
        for i, shift in enumerate(
            [s for s in shifts if not s.is_time_off and s.id in selected_shifts_ids]
        )
    }
    work_shift_to_duration = {
        shift.id: (shift.end_time - shift.start_time).total_seconds() / 3600
        for shift in shifts
        if not shift.is_time_off and shift.id in selected_shifts_ids
    }
    rest_shift_to_i = {
        shift.id: i
        for i, shift in enumerate(
            [s for s in shifts if s.is_time_off and s.id in selected_shifts_ids]
        )
    }
    i_to_worker = {i: worker for worker, i in worker_to_i.items()}
    i_to_work_shift = {i: shift for shift, i in work_shift_to_i.items()}
    i_to_rest_shift = {i: shift for shift, i in rest_shift_to_i.items()}
    if target_value == "nb_days_worked":
        return build_stats_nb_days_worked(
            target_column,
            worker_to_i,
            date_to_i,
            work_shift_to_i,
            i_to_worker,
            assignments,
        )
    if target_value == "time_worked":
        return build_stats_time_worked(
            target_column,
            worker_to_i,
            date_to_i,
            work_shift_to_i,
            work_shift_to_duration,
            i_to_worker,
            assignments,
        )
    if target_value == "nb_shifts_worked":
        return build_stats_nb_shifts_worked(
            target_column,
            worker_to_i,
            date_to_i,
            work_shift_to_i,
            i_to_worker,
            assignments,
        )
    if target_value == "nb_rest_days":
        return build_stats_nb_days_rest(
            target_column,
            worker_to_i,
            date_to_i,
            work_shift_to_i,
            i_to_worker,
            assignments,
        )
    if target_value == "nb_rest_shifts":
        return build_stats_nb_shifts_worked(
            target_column,
            worker_to_i,
            date_to_i,
            rest_shift_to_i,
            i_to_worker,
            assignments,
        )
    if target_value == "nb_times_shift":
        return build_stats_nb_times_shifts(
            worker_to_i,
            date_to_i,
            work_shift_to_i,
            i_to_worker,
            i_to_work_shift,
            assignments,
        )
    if target_value == "nb_times_rest":
        return build_stats_nb_times_shifts(
            worker_to_i,
            date_to_i,
            rest_shift_to_i,
            i_to_worker,
            i_to_rest_shift,
            assignments,
        )
    raise ValueError(f"Unknown target_value: {target_value}")


# pylint: disable=too-many-arguments
def build_stats_nb_days_worked(
    target_column: str,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    i_to_worker: Dict[int, str],
    assignments: List[Assignment],
) -> Stats:
    a_array = core_to_np_assignments_binary(
        worker_to_i, date_to_i, shift_to_i, assignments
    )
    if target_column == "weekday":
        stats_array = calc_stats_per_weekday(a_array, date_to_i, True)
        return np_to_core_days_worked_per_weekday(stats_array, i_to_worker)
    if target_column == "week":
        stats_array, year_week_nb_to_i = calc_stats_per_week(a_array, date_to_i, True)
        return np_to_core_days_worked_per_week(
            stats_array, i_to_worker, year_week_nb_to_i
        )
    if target_column == "month":
        stats_array, year_month_to_i = calc_stats_per_month(a_array, date_to_i, True)
        return np_to_core_days_worked_per_month(
            stats_array, i_to_worker, year_month_to_i
        )
    if target_column == "year":
        stats_array, year_to_i = calc_stats_per_year(a_array, date_to_i, True)
        return np_to_core_days_worked_per_year(stats_array, i_to_worker, year_to_i)
    if target_column == "all":
        stats_array = calc_stats_all(a_array, True)
        return np_to_core_days_worked_all(stats_array, i_to_worker)
    raise ValueError(f"Unknown target_column: {target_column}")


# pylint: disable=too-many-arguments
def build_stats_nb_shifts_worked(
    target_column: str,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    i_to_worker: Dict[int, str],
    assignments: List[Assignment],
) -> Stats:
    a_array = core_to_np_assignments_binary(
        worker_to_i, date_to_i, shift_to_i, assignments
    )
    if target_column == "weekday":
        stats_array = calc_stats_per_weekday(a_array, date_to_i)
        return np_to_core_days_worked_per_weekday(stats_array, i_to_worker)
    if target_column == "week":
        stats_array, year_week_nb_to_i = calc_stats_per_week(a_array, date_to_i)
        return np_to_core_days_worked_per_week(
            stats_array, i_to_worker, year_week_nb_to_i
        )
    if target_column == "month":
        stats_array, year_month_to_i = calc_stats_per_month(a_array, date_to_i)
        return np_to_core_days_worked_per_month(
            stats_array, i_to_worker, year_month_to_i
        )
    if target_column == "year":
        stats_array, year_to_i = calc_stats_per_year(a_array, date_to_i)
        return np_to_core_days_worked_per_year(stats_array, i_to_worker, year_to_i)
    if target_column == "all":
        stats_array = calc_stats_all(a_array)
        return np_to_core_days_worked_all(stats_array, i_to_worker)
    raise ValueError(f"Unknown target_column: {target_column}")


# pylint: disable=too-many-arguments
def build_stats_time_worked(
    target_column: str,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    work_shift_to_duration: Dict[str, float],
    i_to_worker: Dict[int, str],
    assignments: List[Assignment],
) -> Stats:
    a_array = core_to_np_assignments_worked_time(
        worker_to_i, date_to_i, shift_to_i, work_shift_to_duration, assignments
    )
    if target_column == "weekday":
        stats_array = calc_stats_per_weekday(a_array, date_to_i)
        return np_to_core_days_worked_per_weekday(stats_array, i_to_worker)
    if target_column == "week":
        stats_array, year_week_nb_to_i = calc_stats_per_week(a_array, date_to_i)
        return np_to_core_days_worked_per_week(
            stats_array, i_to_worker, year_week_nb_to_i
        )
    if target_column == "month":
        stats_array, year_month_to_i = calc_stats_per_month(a_array, date_to_i)
        return np_to_core_days_worked_per_month(
            stats_array, i_to_worker, year_month_to_i
        )
    if target_column == "year":
        stats_array, year_to_i = calc_stats_per_year(a_array, date_to_i)
        return np_to_core_days_worked_per_year(stats_array, i_to_worker, year_to_i)
    if target_column == "all":
        stats_array = calc_stats_all(a_array)
        return np_to_core_days_worked_all(stats_array, i_to_worker)
    raise ValueError(f"Unknown target_column: {target_column}")


# pylint: disable=too-many-arguments
def build_stats_nb_days_rest(
    target_column: str,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    i_to_worker: Dict[int, str],
    assignments: List[Assignment],
) -> Stats:
    a_array = core_to_np_assignments_binary(
        worker_to_i, date_to_i, shift_to_i, assignments
    )
    if target_column == "weekday":
        stats_array = calc_stats_per_weekday(a_array, date_to_i, True, True)
        return np_to_core_days_worked_per_weekday(stats_array, i_to_worker)
    if target_column == "week":
        stats_array, year_week_nb_to_i = calc_stats_per_week(
            a_array, date_to_i, True, True
        )
        return np_to_core_days_worked_per_week(
            stats_array, i_to_worker, year_week_nb_to_i
        )
    if target_column == "month":
        stats_array, year_month_to_i = calc_stats_per_month(
            a_array, date_to_i, True, True
        )
        return np_to_core_days_worked_per_month(
            stats_array, i_to_worker, year_month_to_i
        )
    if target_column == "year":
        stats_array, year_to_i = calc_stats_per_year(a_array, date_to_i, True, True)
        return np_to_core_days_worked_per_year(stats_array, i_to_worker, year_to_i)
    if target_column == "all":
        stats_array = calc_stats_all(a_array, True, True)
        return np_to_core_days_worked_all(stats_array, i_to_worker)
    raise ValueError(f"Unknown target_column: {target_column}")


# pylint: disable=too-many-arguments
def build_stats_nb_times_shifts(
    # target_column: str,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    i_to_worker: Dict[int, str],
    i_to_shift: Dict[int, str],
    assignments: List[Assignment],
) -> Stats:
    a_array = core_to_np_assignments_binary(
        worker_to_i, date_to_i, shift_to_i, assignments
    )
    # if target_column == "work_shifts":
    stats_array = a_array.sum(axis=1)
    return np_to_core_nb_times_shift(stats_array, i_to_worker, i_to_shift)
    # raise ValueError(f"Unknown target_column: {target_column}")
