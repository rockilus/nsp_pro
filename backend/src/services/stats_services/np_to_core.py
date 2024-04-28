import calendar
from typing import Dict, List, Tuple

import numpy as np

from core import DictBlockValue, Stats, StatsHeader, StatsValue
from utils.constants import Constants


# Weekday
# Nb shift worked
def np_to_core_days_worked_per_weekday(
    dw_array: np.ndarray,
    i_to_worker: Dict[int, str],
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[DictBlockValue],
) -> Stats:
    stats_headers = [
        StatsHeader(
            id=f"default_{d}",
            stats_options_id="",
            stats_unit=stats_unit,
            header_unit="weekday",
            value=Constants.WEEK_DAYS[d].capitalize(),
            selected_shifts=selected_shifts,
        )
        for d in range(Constants.NUM_DAYS_WEEK)
    ]
    stats_values = [
        StatsValue(
            worker_id=i_to_worker[w],
            header_id=f"default_{d}",
            value=dw_array[w, d],
        )
        for w in range(len(dw_array))
        for d in range(Constants.NUM_DAYS_WEEK)
    ]
    return Stats(stats_headers=stats_headers, stats_values=stats_values)


# Week
# Nb shift worked
def np_to_core_days_worked_per_week(
    dw_array: np.ndarray,
    i_to_worker: Dict[int, str],
    year_week_nb_to_i: Dict[Tuple[int, int], int],
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[DictBlockValue],
) -> Stats:
    stats_headers = [
        StatsHeader(
            id=f"default_{ywnb[0]}_W{ywnb[1]}",
            stats_options_id="",
            stats_unit=stats_unit,
            header_unit="week",
            value=f"{ywnb[0]} W{ywnb[1]}",
            selected_shifts=selected_shifts,
        )
        for ywnb in year_week_nb_to_i
    ]
    stats_values = [
        StatsValue(
            worker_id=i_to_worker[w],
            header_id=f"default_{ywnb[0]}_W{ywnb[1]}",
            value=dw_array[w, i],
        )
        for w in range(len(dw_array))
        for ywnb, i in year_week_nb_to_i.items()
    ]
    return Stats(stats_headers=stats_headers, stats_values=stats_values)


# Month
# Nb shift worked
def np_to_core_days_worked_per_month(
    dw_array: np.ndarray,
    i_to_worker: Dict[int, str],
    year_month_to_i: Dict[Tuple[int, int], int],
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[DictBlockValue],
) -> Stats:
    stats_headers = [
        StatsHeader(
            id=f"default_{calendar.month_name[ym[1]][:3]}_{ym[0]}",
            stats_options_id="",
            stats_unit=stats_unit,
            header_unit="month",
            value=f"{calendar.month_name[ym[1]][:3]} {ym[0]}",
            selected_shifts=selected_shifts,
        )
        for ym in year_month_to_i
    ]
    stats_values = [
        StatsValue(
            worker_id=i_to_worker[w],
            header_id=f"default_{calendar.month_name[ym[1]][:3]}_{ym[0]}",
            value=dw_array[w, i],
        )
        for w in range(len(dw_array))
        for ym, i in year_month_to_i.items()
    ]
    return Stats(stats_headers=stats_headers, stats_values=stats_values)


# Year
# Nb shift worked
def np_to_core_days_worked_per_year(
    dw_array: np.ndarray,
    i_to_worker: Dict[int, str],
    year_to_i: Dict[int, int],
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[DictBlockValue],
) -> Stats:
    stats_headers = [
        StatsHeader(
            id=f"default_{y}",
            stats_options_id="",
            stats_unit=stats_unit,
            header_unit="year",
            value=f"{y}",
            selected_shifts=selected_shifts,
        )
        for y in year_to_i
    ]
    stats_values = [
        StatsValue(
            worker_id=i_to_worker[w],
            header_id=f"default_{y}",
            value=dw_array[w, i],
        )
        for w in range(len(dw_array))
        for y, i in year_to_i.items()
    ]
    return Stats(stats_headers=stats_headers, stats_values=stats_values)


# All
# Nb shift worked
def np_to_core_days_worked_all(
    dw_array: np.ndarray,
    i_to_worker: Dict[int, str],
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[DictBlockValue],
) -> Stats:
    stats_headers = [
        StatsHeader(
            id="default_all",
            stats_options_id="",
            stats_unit=stats_unit,
            header_unit="all",
            value="All",
            selected_shifts=selected_shifts,
        )
    ]
    stats_values = [
        StatsValue(
            worker_id=i_to_worker[w],
            header_id="default_all",
            value=dw_array[w],
        )
        for w in range(len(dw_array))
    ]
    return Stats(stats_headers=stats_headers, stats_values=stats_values)


def np_to_core_nb_times_shift(
    stats_array: np.ndarray,
    i_to_worker: Dict[int, str],
    i_to_shift: Dict[int, str],
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[DictBlockValue],
) -> Stats:
    stats_headers = [
        StatsHeader(
            id=f"default_{i_to_shift[s]}",
            stats_options_id="",
            stats_unit=stats_unit,
            header_unit="shift",
            value=i_to_shift[s],
            selected_shifts=selected_shifts,
        )
        for s in range(len(i_to_shift))
    ]
    stats_values = [
        StatsValue(
            worker_id=i_to_worker[w],
            header_id=f"default_{i_to_shift[s]}",
            value=stats_array[w, s],
        )
        for w in range(len(stats_array))
        for s in range(len(i_to_shift))
    ]
    return Stats(stats_headers=stats_headers, stats_values=stats_values)
