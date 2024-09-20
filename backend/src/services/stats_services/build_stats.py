from datetime import date
from typing import Dict, List, Tuple

from constraint_parser import parse_selected_shifts
from core import (
    Assignment,
    Block,
    Shift,
    ShiftDimension,
    ShiftWorkerOption,
    Stats,
    StatsHeader,
    StatsOptions,
    Worker,
)
from scripts.setup_database import (
    assignment_db,
    schedule_db,
    shift_db,
    shift_dimension_db,
    shift_property_db,
    stats_header_db,
    worker_db,
)
from services.constraint_build_services.cb_to_cb_augmented import (
    build_missing_properties_list_and_active_shift,
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
from utils.constants import Constants


# pylint: disable=too-many-locals
def build_stats(
    team_id: str,
    stats_options: StatsOptions,
) -> Stats:
    schedules = schedule_db.get_schedules(team_id)
    workers = worker_db.get_workers(team_id)
    start_date, end_date, date_to_i = build_dates(
        stats_options.time_frame,
        stats_options.start_date,
        stats_options.end_date,
        schedules,
    )
    shifts = shift_db.get_shifts(team_id)
    shift_dimensions = shift_dimension_db.get_shift_dimensions(team_id)
    shift_dim_dict = shift_property_db.get_shifts_id_by_dim_and_prop()
    assignments = assignment_db.get_assignments_by_dates(
        start_date, end_date, schedules
    )
    if stats_options.stats_unit == "custom":
        stats_headers = stats_header_db.get_stats_headers_by_team_id(team_id)
        return build_stats_custom(
            team_id,
            workers,
            date_to_i,
            shifts,
            shift_dimensions,
            shift_dim_dict,
            assignments,
            stats_headers,
        )
    stats_headers = stats_header_db.get_stats_headers_by_team_unit_shifts(
        team_id, stats_options.stats_unit, stats_options.header_unit
    )
    (
        worker_to_i,
        work_shift_to_i,
        rest_shift_to_i,
        work_shift_to_duration,
        i_to_worker,
        i_to_work_shift,
        i_to_rest_shift,
    ) = build_work_shift_indexes(
        workers,
        shifts,
        shift_dimensions,
        shift_dim_dict,
        stats_options.selected_shifts,
    )
    return build_stats_for_stats_unit(
        team_id,
        stats_options.header_unit,
        worker_to_i,
        date_to_i,
        work_shift_to_i,
        rest_shift_to_i,
        work_shift_to_duration,
        i_to_worker,
        i_to_work_shift,
        i_to_rest_shift,
        assignments,
        stats_options.stats_unit,
        stats_options.selected_shifts,
        stats_headers,
    )


def build_work_shift_indexes(
    workers: List[Worker],
    shifts: List[Shift],
    shift_dimensions: List[ShiftDimension],
    shift_dim_dict: Dict,
    selected_shifts: List[ShiftWorkerOption],
) -> Tuple[
    Dict[str, int],
    Dict[str, int],
    Dict[str, int],
    Dict[str, float],
    Dict[int, str],
    Dict[int, str],
    Dict[int, str],
]:
    block = Block(
        name="shift",
        type="shift_worker_option",
        value=selected_shifts,
    )
    missing_properties, _ = build_missing_properties_list_and_active_shift(
        block, shift_dimensions
    )
    selected_shifts_ids = parse_selected_shifts(
        selected_shifts, missing_properties, shifts, shift_dim_dict
    )
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
    return (
        worker_to_i,
        work_shift_to_i,
        rest_shift_to_i,
        work_shift_to_duration,
        i_to_worker,
        i_to_work_shift,
        i_to_rest_shift,
    )


# pylint: disable=too-many-arguments
def build_stats_custom(
    team_id: str,
    workers: List[Worker],
    date_to_i: Dict[date, int],
    shifts: List[Shift],
    shift_dimensions: List[ShiftDimension],
    shift_dim_dict: Dict,
    assignments: List[Assignment],
    stats_headers: List[StatsHeader],
) -> Stats:
    sh_by_su_hu_ss: Dict[
        Tuple[
            Constants.STATS_UNIT_OPTIONS,
            Constants.HEADER_UNIT_OPTIONS,
            Tuple[str, ...],
        ],
        List[StatsHeader],
    ] = {}
    for sh in stats_headers:
        ss_ids = tuple(sorted(ss.id for ss in sh.selected_shifts))
        dict_key = (sh.stats_unit, sh.header_unit, ss_ids)
        if dict_key not in sh_by_su_hu_ss:
            sh_by_su_hu_ss[dict_key] = []
        sh_by_su_hu_ss[dict_key].append(sh)
    stats = Stats([], [])
    for (su, hu, _), shs in sh_by_su_hu_ss.items():
        selected_shifts = shs[0].selected_shifts
        (
            worker_to_i,
            work_shift_to_i,
            rest_shift_to_i,
            work_shift_to_duration,
            i_to_worker,
            i_to_work_shift,
            i_to_rest_shift,
        ) = build_work_shift_indexes(
            workers, shifts, shift_dimensions, shift_dim_dict, selected_shifts
        )
        su_stats = build_stats_for_stats_unit(
            team_id,
            hu,
            worker_to_i,
            date_to_i,
            work_shift_to_i,
            rest_shift_to_i,
            work_shift_to_duration,
            i_to_worker,
            i_to_work_shift,
            i_to_rest_shift,
            assignments,
            su,
            selected_shifts,
            shs,
        )
        sh_ids = [sh.id for sh in shs]
        stats.stats_headers.extend(sh for sh in su_stats.stats_headers if sh.in_custom)
        stats.stats_values.extend(
            sv for sv in su_stats.stats_values if sv.header_id in sh_ids
        )
    return stats


# pylint: disable=too-many-arguments, too-many-return-statements
def build_stats_for_stats_unit(
    team_id: str,
    header_unit: str,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    work_shift_to_i: Dict[str, int],
    rest_shift_to_i: Dict[str, int],
    work_shift_to_duration: Dict[str, float],
    i_to_worker: Dict[int, str],
    i_to_work_shift: Dict[int, str],
    i_to_rest_shift: Dict[int, str],
    assignments: List[Assignment],
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers: List[StatsHeader],
) -> Stats:
    if stats_unit == "nb_days_worked":
        return build_stats_nb_days_worked(
            team_id,
            header_unit,
            worker_to_i,
            date_to_i,
            work_shift_to_i,
            i_to_worker,
            assignments,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if stats_unit == "time_worked":
        return build_stats_time_worked(
            team_id,
            header_unit,
            worker_to_i,
            date_to_i,
            work_shift_to_i,
            work_shift_to_duration,
            i_to_worker,
            assignments,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if stats_unit == "nb_shifts_worked":
        return build_stats_nb_shifts_worked(
            team_id,
            header_unit,
            worker_to_i,
            date_to_i,
            work_shift_to_i,
            i_to_worker,
            assignments,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if stats_unit == "nb_rest_days":
        return build_stats_nb_days_rest(
            team_id,
            header_unit,
            worker_to_i,
            date_to_i,
            work_shift_to_i,
            i_to_worker,
            assignments,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if stats_unit == "nb_rest_shifts":
        return build_stats_nb_shifts_worked(
            team_id,
            header_unit,
            worker_to_i,
            date_to_i,
            rest_shift_to_i,
            i_to_worker,
            assignments,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if stats_unit == "nb_times_shift":
        return build_stats_nb_times_shifts(
            team_id,
            worker_to_i,
            date_to_i,
            work_shift_to_i,
            i_to_worker,
            i_to_work_shift,
            assignments,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if stats_unit == "nb_times_rest":
        return build_stats_nb_times_shifts(
            team_id,
            worker_to_i,
            date_to_i,
            rest_shift_to_i,
            i_to_worker,
            i_to_rest_shift,
            assignments,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    raise ValueError(f"Unknown target_value: {stats_unit}")


# pylint: disable=too-many-arguments
def build_stats_nb_days_worked(
    team_id: str,
    header_unit: str,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    i_to_worker: Dict[int, str],
    assignments: List[Assignment],
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers: List[StatsHeader],
) -> Stats:
    a_array = core_to_np_assignments_binary(
        worker_to_i, date_to_i, shift_to_i, assignments
    )
    if header_unit == "weekday":
        stats_array = calc_stats_per_weekday(a_array, date_to_i, True)
        return np_to_core_days_worked_per_weekday(
            stats_array,
            i_to_worker,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "week":
        stats_array, year_week_nb_to_i = calc_stats_per_week(a_array, date_to_i, True)
        return np_to_core_days_worked_per_week(
            stats_array,
            i_to_worker,
            year_week_nb_to_i,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "month":
        stats_array, year_month_to_i = calc_stats_per_month(a_array, date_to_i, True)
        return np_to_core_days_worked_per_month(
            stats_array,
            i_to_worker,
            year_month_to_i,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "year":
        stats_array, year_to_i = calc_stats_per_year(a_array, date_to_i, True)
        return np_to_core_days_worked_per_year(
            stats_array,
            i_to_worker,
            year_to_i,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "all":
        stats_array = calc_stats_all(a_array, True)
        return np_to_core_days_worked_all(
            stats_array,
            i_to_worker,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    raise ValueError(f"Unknown target_column: {header_unit}")


# pylint: disable=too-many-arguments
def build_stats_nb_shifts_worked(
    team_id: str,
    header_unit: str,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    i_to_worker: Dict[int, str],
    assignments: List[Assignment],
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers: List[StatsHeader],
) -> Stats:
    a_array = core_to_np_assignments_binary(
        worker_to_i, date_to_i, shift_to_i, assignments
    )
    if header_unit == "weekday":
        stats_array = calc_stats_per_weekday(a_array, date_to_i)
        return np_to_core_days_worked_per_weekday(
            stats_array,
            i_to_worker,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "week":
        stats_array, year_week_nb_to_i = calc_stats_per_week(a_array, date_to_i)
        return np_to_core_days_worked_per_week(
            stats_array,
            i_to_worker,
            year_week_nb_to_i,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "month":
        stats_array, year_month_to_i = calc_stats_per_month(a_array, date_to_i)
        return np_to_core_days_worked_per_month(
            stats_array,
            i_to_worker,
            year_month_to_i,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "year":
        stats_array, year_to_i = calc_stats_per_year(a_array, date_to_i)
        return np_to_core_days_worked_per_year(
            stats_array,
            i_to_worker,
            year_to_i,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "all":
        stats_array = calc_stats_all(a_array)
        return np_to_core_days_worked_all(
            stats_array,
            i_to_worker,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    raise ValueError(f"Unknown target_column: {header_unit}")


# pylint: disable=too-many-arguments
def build_stats_time_worked(
    team_id: str,
    header_unit: str,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    work_shift_to_duration: Dict[str, float],
    i_to_worker: Dict[int, str],
    assignments: List[Assignment],
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers: List[StatsHeader],
) -> Stats:
    a_array = core_to_np_assignments_worked_time(
        worker_to_i, date_to_i, shift_to_i, work_shift_to_duration, assignments
    )
    if header_unit == "weekday":
        stats_array = calc_stats_per_weekday(a_array, date_to_i)
        return np_to_core_days_worked_per_weekday(
            stats_array,
            i_to_worker,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "week":
        stats_array, year_week_nb_to_i = calc_stats_per_week(a_array, date_to_i)
        return np_to_core_days_worked_per_week(
            stats_array,
            i_to_worker,
            year_week_nb_to_i,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "month":
        stats_array, year_month_to_i = calc_stats_per_month(a_array, date_to_i)
        return np_to_core_days_worked_per_month(
            stats_array,
            i_to_worker,
            year_month_to_i,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "year":
        stats_array, year_to_i = calc_stats_per_year(a_array, date_to_i)
        return np_to_core_days_worked_per_year(
            stats_array,
            i_to_worker,
            year_to_i,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "all":
        stats_array = calc_stats_all(a_array)
        return np_to_core_days_worked_all(
            stats_array,
            i_to_worker,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    raise ValueError(f"Unknown target_column: {header_unit}")


# pylint: disable=too-many-arguments
def build_stats_nb_days_rest(
    team_id: str,
    header_unit: str,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    i_to_worker: Dict[int, str],
    assignments: List[Assignment],
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers: List[StatsHeader],
) -> Stats:
    a_array = core_to_np_assignments_binary(
        worker_to_i, date_to_i, shift_to_i, assignments
    )
    if header_unit == "weekday":
        stats_array = calc_stats_per_weekday(a_array, date_to_i, True, True)
        return np_to_core_days_worked_per_weekday(
            stats_array,
            i_to_worker,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "week":
        stats_array, year_week_nb_to_i = calc_stats_per_week(
            a_array, date_to_i, True, True
        )
        return np_to_core_days_worked_per_week(
            stats_array,
            i_to_worker,
            year_week_nb_to_i,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "month":
        stats_array, year_month_to_i = calc_stats_per_month(
            a_array, date_to_i, True, True
        )
        return np_to_core_days_worked_per_month(
            stats_array,
            i_to_worker,
            year_month_to_i,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "year":
        stats_array, year_to_i = calc_stats_per_year(a_array, date_to_i, True, True)
        return np_to_core_days_worked_per_year(
            stats_array,
            i_to_worker,
            year_to_i,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == "all":
        stats_array = calc_stats_all(a_array, True, True)
        return np_to_core_days_worked_all(
            stats_array,
            i_to_worker,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    raise ValueError(f"Unknown target_column: {header_unit}")


# pylint: disable=too-many-arguments
def build_stats_nb_times_shifts(
    team_id: str,
    # target_column: str,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    i_to_worker: Dict[int, str],
    i_to_shift: Dict[int, str],
    assignments: List[Assignment],
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers: List[StatsHeader],
) -> Stats:
    a_array = core_to_np_assignments_binary(
        worker_to_i, date_to_i, shift_to_i, assignments
    )
    # if target_column == "work_shifts":
    stats_array = a_array.sum(axis=1)
    return np_to_core_nb_times_shift(
        stats_array,
        i_to_worker,
        i_to_shift,
        team_id,
        stats_unit,
        selected_shifts,
        stats_headers,
    )
    # raise ValueError(f"Unknown target_column: {target_column}")
