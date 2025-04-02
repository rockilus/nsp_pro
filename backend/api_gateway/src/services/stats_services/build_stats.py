from datetime import date
from typing import Dict, List, Tuple

from shared.augment import build_missing_attributes_and_active_owner
from shared.constraint_parser import parse_selected_shifts
from shared.schemas import (
    Assignment,
    Attribute,
    AttributeOwnerType,
    Block,
    BlockNameOptions,
    BlockTypeOptions,
    Dimension,
    DimEntry,
    HeaderUnitOptions,
    ScheduleStatus,
    Shift,
    ShiftType,
    ShiftWorkerOption,
    Stats,
    StatsHeader,
    StatsOptions,
    StatsTimeFrameOptions,
    StatsUnitOptions,
    Worker,
)

from src.errors import NoCampaignError
from src.scripts.setup_database import (
    assignment_db,
    attribute_db,
    dim_entry_db,
    dimension_db,
    schedule_db,
    shift_db,
    stats_header_db,
    worker_db,
)
from src.services.stats_services.buid_dates import build_dates
from src.services.stats_services.calc_per_week_day import (
    calc_stats_all,
    calc_stats_per_month,
    calc_stats_per_week,
    calc_stats_per_weekday,
    calc_stats_per_year,
)
from src.services.stats_services.core_to_np import (
    core_to_np_assignments_binary,
    core_to_np_assignments_worked_time,
)
from src.services.stats_services.np_to_core import (
    np_to_core_days_worked_all,
    np_to_core_days_worked_per_month,
    np_to_core_days_worked_per_week,
    np_to_core_days_worked_per_weekday,
    np_to_core_days_worked_per_year,
    np_to_core_nb_times_shift,
)


# pylint: disable=too-many-locals
def build_stats(
    team_id: str,
    stats_options: StatsOptions,
) -> Stats:
    schedules = schedule_db.get_schedules(team_id)
    schedule_campaign = next(
        (s for s in schedules if s.status == ScheduleStatus.CAMPAIGN), None
    )
    if (
        stats_options.time_frame == StatsTimeFrameOptions.CAMPAING
        and not schedule_campaign
    ):
        return Stats([], [])
    try:
        start_date, end_date, date_to_i = build_dates(
            stats_options.time_frame,
            stats_options.start_date,
            stats_options.end_date,
            schedules,
            schedule_campaign,
        )
    except NoCampaignError as e:
        raise e
    workers = worker_db.get_workers_not_deleted(team_id)
    shifts = shift_db.get_shifts_not_deleted(team_id)
    dimensions = dimension_db.get_dimensions(team_id)
    dim_entries = dim_entry_db.get_dim_entries_by_dim_ids([d.id for d in dimensions])
    attributes = attribute_db.get_attributes_by_owner_ids([s.id for s in shifts])
    shift_dim_dict = attribute_db.get_shifts_id_by_dim_and_attr()
    assignments = assignment_db.get_assignments_by_dates(team_id, start_date, end_date)
    if stats_options.show_favorites is True:
        stats_headers = stats_header_db.get_stats_headers_by_team_id(team_id)
        return build_stats_favorites(
            team_id,
            workers,
            date_to_i,
            shifts,
            dimensions,
            dim_entries,
            attributes,
            shift_dim_dict,
            assignments,
            stats_headers,
        )
    stats_headers = stats_header_db.get_stats_headers_by_team_unit_shifts(
        team_id, stats_options.stats_unit, stats_options.header_unit
    )
    # pylint: disable=R0801
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
        dimensions,
        dim_entries,
        attributes,
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


# pylint: disable=too-many-arguments
def build_work_shift_indexes(
    workers: List[Worker],
    shifts: List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
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
        name=BlockNameOptions.SHIFT,
        type=BlockTypeOptions.SHIFT_WORKER_OPTION,
        value=selected_shifts,
    )
    # pylint: disable=R0801
    missing_attributes, _ = build_missing_attributes_and_active_owner(
        AttributeOwnerType.SHIFT,
        block,
        shifts,
        dimensions,
        dim_entries,
        attributes,
        [],
    )
    selected_shifts_ids = parse_selected_shifts(
        selected_shifts, missing_attributes, shifts, shift_dim_dict
    )
    worker_to_i = {worker.id: i for i, worker in enumerate(workers)}
    # shift_to_i = {shift.id: i for i, shift in enumerate(shifts)}
    work_shift_to_i = {
        shift.id: i
        for i, shift in enumerate(
            [
                s
                for s in shifts
                if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
                and s.id in selected_shifts_ids
            ]
        )
    }
    work_shift_to_duration = {
        s.id: (s.end_time - s.start_time).total_seconds() / 3600
        for s in shifts
        if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        and s.id in selected_shifts_ids
    }
    rest_shift_to_i = {
        shift.id: i
        for i, shift in enumerate(
            [
                s
                for s in shifts
                if s.shift_type in [ShiftType.REST, ShiftType.LEAVE]
                and s.id in selected_shifts_ids
            ]
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
def build_stats_favorites(
    team_id: str,
    workers: List[Worker],
    date_to_i: Dict[date, int],
    shifts: List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
    shift_dim_dict: Dict,
    assignments: List[Assignment],
    stats_headers: List[StatsHeader],
) -> Stats:
    sh_by_su_hu_ss: Dict[
        Tuple[
            StatsUnitOptions,
            HeaderUnitOptions,
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
        # pylint: disable=R0801
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
            dimensions,
            dim_entries,
            attributes,
            shift_dim_dict,
            selected_shifts,
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
        stats.stats_headers.extend(
            sh for sh in su_stats.stats_headers if sh.is_favorite
        )
        stats.stats_values.extend(
            sv for sv in su_stats.stats_values if sv.header_id in sh_ids
        )
    return stats


# pylint: disable=too-many-arguments, too-many-return-statements
def build_stats_for_stats_unit(
    team_id: str,
    header_unit: HeaderUnitOptions,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    work_shift_to_i: Dict[str, int],
    rest_shift_to_i: Dict[str, int],
    work_shift_to_duration: Dict[str, float],
    i_to_worker: Dict[int, str],
    i_to_work_shift: Dict[int, str],
    i_to_rest_shift: Dict[int, str],
    assignments: List[Assignment],
    stats_unit: StatsUnitOptions,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers: List[StatsHeader],
) -> Stats:
    if stats_unit == StatsUnitOptions.NB_DAYS_WORKED:
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
    if stats_unit == StatsUnitOptions.TIME_WORKED:
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
    if stats_unit == StatsUnitOptions.NB_SHIFTS_WORKED:
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
    if stats_unit == StatsUnitOptions.NB_REST_DAYS:
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
    if stats_unit == StatsUnitOptions.NB_REST_SHIFTS:
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
    if stats_unit == StatsUnitOptions.NB_TIMES_SHIFT:
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
    if stats_unit == StatsUnitOptions.NB_TIMES_REST:
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
    header_unit: HeaderUnitOptions,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    i_to_worker: Dict[int, str],
    assignments: List[Assignment],
    stats_unit: StatsUnitOptions,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers: List[StatsHeader],
) -> Stats:
    a_array = core_to_np_assignments_binary(
        worker_to_i, date_to_i, shift_to_i, assignments
    )
    if header_unit == HeaderUnitOptions.WEEKDAY:
        stats_array = calc_stats_per_weekday(a_array, date_to_i, True)
        return np_to_core_days_worked_per_weekday(
            stats_array,
            i_to_worker,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == HeaderUnitOptions.WEEK:
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
    if header_unit == HeaderUnitOptions.MONTH:
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
    if header_unit == HeaderUnitOptions.YEAR:
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
    if header_unit == HeaderUnitOptions.ALL:
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
    header_unit: HeaderUnitOptions,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    i_to_worker: Dict[int, str],
    assignments: List[Assignment],
    stats_unit: StatsUnitOptions,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers: List[StatsHeader],
) -> Stats:
    a_array = core_to_np_assignments_binary(
        worker_to_i, date_to_i, shift_to_i, assignments
    )
    if header_unit == HeaderUnitOptions.WEEKDAY:
        stats_array = calc_stats_per_weekday(a_array, date_to_i)
        return np_to_core_days_worked_per_weekday(
            stats_array,
            i_to_worker,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == HeaderUnitOptions.WEEK:
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
    if header_unit == HeaderUnitOptions.MONTH:
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
    if header_unit == HeaderUnitOptions.YEAR:
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
    if header_unit == HeaderUnitOptions.ALL:
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
    header_unit: HeaderUnitOptions,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    work_shift_to_duration: Dict[str, float],
    i_to_worker: Dict[int, str],
    assignments: List[Assignment],
    stats_unit: StatsUnitOptions,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers: List[StatsHeader],
) -> Stats:
    a_array = core_to_np_assignments_worked_time(
        worker_to_i, date_to_i, shift_to_i, work_shift_to_duration, assignments
    )
    if header_unit == HeaderUnitOptions.WEEKDAY:
        stats_array = calc_stats_per_weekday(a_array, date_to_i)
        return np_to_core_days_worked_per_weekday(
            stats_array,
            i_to_worker,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == HeaderUnitOptions.WEEK:
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
    if header_unit == HeaderUnitOptions.MONTH:
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
    if header_unit == HeaderUnitOptions.YEAR:
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
    if header_unit == HeaderUnitOptions.ALL:
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
    header_unit: HeaderUnitOptions,
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    i_to_worker: Dict[int, str],
    assignments: List[Assignment],
    stats_unit: StatsUnitOptions,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers: List[StatsHeader],
) -> Stats:
    a_array = core_to_np_assignments_binary(
        worker_to_i, date_to_i, shift_to_i, assignments
    )
    if header_unit == HeaderUnitOptions.WEEKDAY:
        stats_array = calc_stats_per_weekday(a_array, date_to_i, True, True)
        return np_to_core_days_worked_per_weekday(
            stats_array,
            i_to_worker,
            team_id,
            stats_unit,
            selected_shifts,
            stats_headers,
        )
    if header_unit == HeaderUnitOptions.WEEK:
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
    if header_unit == HeaderUnitOptions.MONTH:
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
    if header_unit == HeaderUnitOptions.YEAR:
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
    if header_unit == HeaderUnitOptions.ALL:
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
    stats_unit: StatsUnitOptions,
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
