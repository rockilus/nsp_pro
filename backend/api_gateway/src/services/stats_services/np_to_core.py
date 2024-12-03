import calendar
from typing import Dict, List, Tuple

import numpy as np
from utils.constants import Constants

from shared.schemas import ShiftWorkerOption, Stats, StatsHeader, StatsValue


# Weekday
# Nb shift worked
# pylint: disable=too-many-arguments
def np_to_core_days_worked_per_weekday(
    dw_array: np.ndarray,
    i_to_worker: Dict[int, str],
    team_id: str,
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers_custom: List[StatsHeader],
) -> Stats:
    stats_headers = []
    stats_values = []
    for d in range(Constants.NUM_DAYS_WEEK):
        existing_sh = next(
            (
                sh
                for sh in stats_headers_custom
                if sh.header_unit == "weekday"
                and sh.stats_unit == stats_unit
                and sh.value == Constants.WEEK_DAYS[d].capitalize()
                and sorted(sh.selected_shifts, key=lambda x: x.id)
                == sorted(selected_shifts, key=lambda x: x.id)
            ),
            None,
        )
        if existing_sh:
            stats_headers.append(existing_sh)
        else:
            stats_headers.append(
                StatsHeader(
                    id=f"default_{d}",
                    team_id=team_id,
                    stats_unit=stats_unit,
                    header_unit="weekday",
                    value=Constants.WEEK_DAYS[d].capitalize(),
                    selected_shifts=selected_shifts,
                    in_custom=False,
                )
            )
        stats_values.extend(
            [
                StatsValue(
                    worker_id=i_to_worker[w],
                    header_id=(existing_sh.id if existing_sh else f"default_{d}"),
                    value=dw_array[w, d],
                )
                for w in range(len(dw_array))
            ]
        )
    return Stats(stats_headers=stats_headers, stats_values=stats_values)
    # stats_headers = [
    #     StatsHeader(
    #         id=f"default_{d}",
    #         team_id=team_id,
    #         stats_unit=stats_unit,
    #         header_unit="weekday",
    #         value=Constants.WEEK_DAYS[d].capitalize(),
    #         selected_shifts=selected_shifts,
    #         in_custom=False,
    #     )
    #     for d in range(Constants.NUM_DAYS_WEEK)
    # ]
    # stats_values = [
    #     StatsValue(
    #         worker_id=i_to_worker[w],
    #         header_id=f"default_{d}",
    #         value=dw_array[w, d],
    #     )
    #     for w in range(len(dw_array))
    #     for d in range(Constants.NUM_DAYS_WEEK)
    # ]
    # return Stats(stats_headers=stats_headers, stats_values=stats_values)


# Week
# Nb shift worked
# pylint: disable=too-many-arguments
def np_to_core_days_worked_per_week(
    dw_array: np.ndarray,
    i_to_worker: Dict[int, str],
    year_week_nb_to_i: Dict[Tuple[int, int], int],
    team_id: str,
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers_custom: List[StatsHeader],
) -> Stats:
    stats_headers = []
    stats_values = []
    for ywnb, i in year_week_nb_to_i.items():
        existing_sh = next(
            (
                sh
                for sh in stats_headers_custom
                if sh.header_unit == "week"
                and sh.stats_unit == stats_unit
                and sh.value == f"{ywnb[0]} W{ywnb[1]}"
                and sorted(sh.selected_shifts, key=lambda x: x.id)
                == sorted(selected_shifts, key=lambda x: x.id)
            ),
            None,
        )
        if existing_sh:
            stats_headers.append(existing_sh)
        else:
            stats_headers.append(
                StatsHeader(
                    id=f"default_{ywnb[0]}_W{ywnb[1]}",
                    team_id=team_id,
                    stats_unit=stats_unit,
                    header_unit="week",
                    value=f"{ywnb[0]} W{ywnb[1]}",
                    selected_shifts=selected_shifts,
                    in_custom=False,
                )
            )
        stats_values.extend(
            [
                StatsValue(
                    worker_id=i_to_worker[w],
                    header_id=(
                        existing_sh.id
                        if existing_sh
                        else f"default_{ywnb[0]}_W{ywnb[1]}"
                    ),
                    value=dw_array[w, i],
                )
                for w in range(len(dw_array))
            ]
        )
    return Stats(stats_headers=stats_headers, stats_values=stats_values)

    # stats_headers = [
    #     StatsHeader(
    #         id=f"default_{ywnb[0]}_W{ywnb[1]}",
    #         team_id=team_id,
    #         stats_unit=stats_unit,
    #         header_unit="week",
    #         value=f"{ywnb[0]} W{ywnb[1]}",
    #         selected_shifts=selected_shifts,
    #         in_custom=False,
    #     )
    #     for ywnb in year_week_nb_to_i
    # ]
    # stats_values = [
    #     StatsValue(
    #         worker_id=i_to_worker[w],
    #         header_id=f"default_{ywnb[0]}_W{ywnb[1]}",
    #         value=dw_array[w, i],
    #     )
    #     for w in range(len(dw_array))
    #     for ywnb, i in year_week_nb_to_i.items()
    # ]
    # return Stats(stats_headers=stats_headers, stats_values=stats_values)


# Month
# Nb shift worked
# pylint: disable=too-many-arguments
def np_to_core_days_worked_per_month(
    dw_array: np.ndarray,
    i_to_worker: Dict[int, str],
    year_month_to_i: Dict[Tuple[int, int], int],
    team_id: str,
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers_custom: List[StatsHeader],
) -> Stats:
    stats_headers = []
    stats_values = []
    for ym, i in year_month_to_i.items():
        existing_sh = next(
            (
                sh
                for sh in stats_headers_custom
                if sh.header_unit == "month"
                and sh.stats_unit == stats_unit
                and sh.value == f"{calendar.month_name[ym[1]][:3]} {ym[0]}"
                and sorted(sh.selected_shifts, key=lambda x: x.id)
                == sorted(selected_shifts, key=lambda x: x.id)
            ),
            None,
        )
        if existing_sh:
            stats_headers.append(existing_sh)
        else:
            stats_headers.append(
                StatsHeader(
                    id=f"default_{calendar.month_name[ym[1]][:3]}_{ym[0]}",
                    team_id=team_id,
                    stats_unit=stats_unit,
                    header_unit="month",
                    value=f"{calendar.month_name[ym[1]][:3]} {ym[0]}",
                    selected_shifts=selected_shifts,
                    in_custom=False,
                )
            )
        stats_values.extend(
            [
                StatsValue(
                    worker_id=i_to_worker[w],
                    header_id=(
                        existing_sh.id
                        if existing_sh
                        else f"default_{calendar.month_name[ym[1]][:3]}_{ym[0]}"
                    ),
                    value=dw_array[w, i],
                )
                for w in range(len(dw_array))
            ]
        )
    return Stats(stats_headers=stats_headers, stats_values=stats_values)

    # stats_headers = [
    #     StatsHeader(
    #         id=f"default_{calendar.month_name[ym[1]][:3]}_{ym[0]}",
    #         team_id=team_id,
    #         stats_unit=stats_unit,
    #         header_unit="month",
    #         value=f"{calendar.month_name[ym[1]][:3]} {ym[0]}",
    #         selected_shifts=selected_shifts,
    #         in_custom=False,
    #     )
    #     for ym in year_month_to_i
    # ]
    # stats_values = [
    #     StatsValue(
    #         worker_id=i_to_worker[w],
    #         header_id=f"default_{calendar.month_name[ym[1]][:3]}_{ym[0]}",
    #         value=dw_array[w, i],
    #     )
    #     for w in range(len(dw_array))
    #     for ym, i in year_month_to_i.items()
    # ]
    # return Stats(stats_headers=stats_headers, stats_values=stats_values)


# Year
# Nb shift worked
# pylint: disable=too-many-arguments
def np_to_core_days_worked_per_year(
    dw_array: np.ndarray,
    i_to_worker: Dict[int, str],
    year_to_i: Dict[int, int],
    team_id: str,
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers_custom: List[StatsHeader],
) -> Stats:
    stats_headers = []
    stats_values = []
    for y, i in year_to_i.items():
        existing_sh = next(
            (
                sh
                for sh in stats_headers_custom
                if sh.header_unit == "year"
                and sh.stats_unit == stats_unit
                and sh.value == f"{y}"
                and sorted(sh.selected_shifts, key=lambda x: x.id)
                == sorted(selected_shifts, key=lambda x: x.id)
            ),
            None,
        )
        if existing_sh:
            stats_headers.append(existing_sh)
        else:
            stats_headers.append(
                StatsHeader(
                    id=f"default_{y}",
                    team_id=team_id,
                    stats_unit=stats_unit,
                    header_unit="year",
                    value=f"{y}",
                    selected_shifts=selected_shifts,
                    in_custom=False,
                )
            )
        stats_values.extend(
            [
                StatsValue(
                    worker_id=i_to_worker[w],
                    header_id=(existing_sh.id if existing_sh else f"default_{y}"),
                    value=dw_array[w, i],
                )
                for w in range(len(dw_array))
            ]
        )
    return Stats(stats_headers=stats_headers, stats_values=stats_values)

    # stats_headers = [
    #     StatsHeader(
    #         id=f"default_{y}",
    #         team_id=team_id,
    #         stats_unit=stats_unit,
    #         header_unit="year",
    #         value=f"{y}",
    #         selected_shifts=selected_shifts,
    #         in_custom=False,
    #     )
    #     for y in year_to_i
    # ]
    # stats_values = [
    #     StatsValue(
    #         worker_id=i_to_worker[w],
    #         header_id=f"default_{y}",
    #         value=dw_array[w, i],
    #     )
    #     for w in range(len(dw_array))
    #     for y, i in year_to_i.items()
    # ]
    # return Stats(stats_headers=stats_headers, stats_values=stats_values)


# All
# Nb shift worked
# pylint: disable=too-many-arguments
def np_to_core_days_worked_all(
    dw_array: np.ndarray,
    i_to_worker: Dict[int, str],
    team_id: str,
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers_custom: List[StatsHeader],
) -> Stats:
    existing_sh = next(
        (
            sh
            for sh in stats_headers_custom
            if sh.header_unit == "all"
            and sh.stats_unit == stats_unit
            and sh.value == "All"
            and sorted(sh.selected_shifts, key=lambda x: x.id)
            == sorted(selected_shifts, key=lambda x: x.id)
        ),
        None,
    )
    if existing_sh:
        stats_headers = [existing_sh]
    else:
        stats_headers = [
            StatsHeader(
                id="default_all",
                team_id=team_id,
                stats_unit=stats_unit,
                header_unit="all",
                value="All",
                selected_shifts=selected_shifts,
                in_custom=False,
            )
        ]

    stats_values = [
        StatsValue(
            worker_id=i_to_worker[w],
            header_id=(existing_sh.id if existing_sh else "default_all"),
            value=dw_array[w],
        )
        for w in range(len(dw_array))
    ]
    return Stats(stats_headers=stats_headers, stats_values=stats_values)

    # stats_headers = [
    #     StatsHeader(
    #         id="default_all",
    #         team_id=team_id,
    #         stats_unit=stats_unit,
    #         header_unit="all",
    #         value="All",
    #         selected_shifts=selected_shifts,
    #         in_custom=False,
    #     )
    # ]
    # stats_values = [
    #     StatsValue(
    #         worker_id=i_to_worker[w],
    #         header_id="default_all",
    #         value=dw_array[w],
    #     )
    #     for w in range(len(dw_array))
    # ]
    # return Stats(stats_headers=stats_headers, stats_values=stats_values)


# pylint: disable=too-many-arguments
def np_to_core_nb_times_shift(
    stats_array: np.ndarray,
    i_to_worker: Dict[int, str],
    i_to_shift: Dict[int, str],
    team_id: str,
    stats_unit: Constants.STATS_UNIT_OPTIONS,
    selected_shifts: List[ShiftWorkerOption],
    stats_headers_custom: List[StatsHeader],
) -> Stats:
    stats_headers = []
    stats_values = []
    for i, s in i_to_shift.items():
        existing_sh = next(
            (
                sh
                for sh in stats_headers_custom
                if sh.header_unit == "shift"
                and sh.stats_unit == stats_unit
                and sh.value == s
                and sorted(sh.selected_shifts, key=lambda x: x.id)
                == sorted(selected_shifts, key=lambda x: x.id)
            ),
            None,
        )
        if existing_sh:
            stats_headers.append(existing_sh)
        else:
            stats_headers.append(
                StatsHeader(
                    id=f"default_{s}",
                    team_id=team_id,
                    stats_unit=stats_unit,
                    header_unit="shift",
                    value=s,
                    selected_shifts=selected_shifts,
                    in_custom=False,
                )
            )
        stats_values.extend(
            [
                StatsValue(
                    worker_id=i_to_worker[w],
                    header_id=(existing_sh.id if existing_sh else f"default_{s}"),
                    value=stats_array[w, i],
                )
                for w in range(len(stats_array))
            ]
        )
    return Stats(stats_headers=stats_headers, stats_values=stats_values)

    # stats_headers = [
    #     StatsHeader(
    #         id=f"default_{i_to_shift[s]}",
    #         team_id=team_id,
    #         stats_unit=stats_unit,
    #         header_unit="shift",
    #         value=i_to_shift[s],
    #         selected_shifts=selected_shifts,
    #         in_custom=False,
    #     )
    #     for s in range(len(i_to_shift))
    # ]
    # stats_values = [
    #     StatsValue(
    #         worker_id=i_to_worker[w],
    #         header_id=f"default_{i_to_shift[s]}",
    #         value=stats_array[w, s],
    #     )
    #     for w in range(len(stats_array))
    #     for s in range(len(i_to_shift))
    # ]
    # return Stats(stats_headers=stats_headers, stats_values=stats_values)
