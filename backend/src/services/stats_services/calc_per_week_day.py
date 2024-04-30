from datetime import date
from typing import Dict, Tuple

import numpy as np

from utils.constants import Constants


# Weekday
def calc_stats_per_weekday(
    a_array: np.ndarray,
    dates: Dict[date, int],
    nb_days: bool = False,
    rest_days: bool = False,
) -> np.ndarray:
    # Get the weekday for each date (0 = Monday, 6 = Sunday)
    weekdays = np.array([d.weekday() for d in dates])

    # Sum the shifts for each worker for each weekday
    out = np.zeros((a_array.shape[0], Constants.NUM_DAYS_WEEK), dtype=int)
    for i in range(Constants.NUM_DAYS_WEEK):
        # Get a mask of the dates that are on the current weekday
        mask = weekdays == i

        if nb_days:
            if rest_days:
                # Count the days not worked for all dates on the current weekday
                out[:, i] = (a_array[:, mask, :].sum(axis=2) == 0).sum(axis=1)
            else:
                # Count the days worked for all dates on the current weekday
                out[:, i] = (a_array[:, mask, :].sum(axis=2) > 0).sum(axis=1)
        else:
            # Sum the shifts for all dates on the current weekday
            out[:, i] = a_array[:, mask, :].sum(axis=(1, 2))
    return out


# Week
# Sum all
def calc_stats_per_week(
    a_array: np.ndarray,
    dates: Dict[date, int],
    nb_days: bool = False,
    rest_days: bool = False,
) -> Tuple[np.ndarray, Dict[Tuple[int, int], int]]:
    # Get the year and week number for each date
    year_week_numbers = np.array([(d.year, d.isocalendar()[1]) for d in dates])

    # Get the unique year-week number pairs
    unique_year_week_numbers = np.unique(year_week_numbers, axis=0)

    # Sum the shifts for each worker for each unique year-week number pair
    out = np.zeros((a_array.shape[0], len(unique_year_week_numbers)), dtype=int)
    for i, year_week_number in enumerate(unique_year_week_numbers):
        # Get a mask of the dates that are in the current year and week
        mask = np.all(year_week_numbers == year_week_number, axis=1)

        if nb_days:
            if rest_days:
                # Count the days not worked for all dates in the current year and week
                out[:, i] = (a_array[:, mask, :].sum(axis=2) == 0).sum(axis=1)
            else:
                # Count the days worked for all dates in the current year and week
                out[:, i] = (a_array[:, mask, :].sum(axis=2) > 0).sum(axis=1)
        else:
            # Sum the shifts for all dates in the current year and week
            out[:, i] = a_array[:, mask, :].sum(axis=(1, 2))
    year_week_nb_to_i = {
        (int(year), int(week)): i
        for i, (year, week) in enumerate(map(tuple, unique_year_week_numbers))
    }
    return out, year_week_nb_to_i


def calc_stats_per_month(
    a_array: np.ndarray,
    dates: Dict[date, int],
    nb_days: bool = False,
    rest_days: bool = False,
) -> Tuple[np.ndarray, Dict[Tuple[int, int], int]]:
    # Get the year and month for each date
    year_months = np.array([(d.year, d.month) for d in dates])

    # Get the unique year-month pairs
    unique_year_months = np.unique(year_months, axis=0)

    # Sum the shifts for each worker for each unique year-month pair
    out = np.zeros((a_array.shape[0], len(unique_year_months)), dtype=int)
    for i, year_month in enumerate(map(tuple, unique_year_months)):
        # Get a mask of the dates that are in the current year and month
        mask = np.all(year_months == year_month, axis=1)

        if nb_days:
            if rest_days:
                # Count the days not worked for all dates in the current year and month
                out[:, i] = (a_array[:, mask, :].sum(axis=2) == 0).sum(axis=1)
            else:
                # Count the days worked for all dates in the current year and month
                out[:, i] = (a_array[:, mask, :].sum(axis=2) > 0).sum(axis=1)
        else:
            # Sum the shifts for all dates in the current year and month
            out[:, i] = a_array[:, mask, :].sum(axis=(1, 2))

    year_month_to_i = {
        (int(year), int(month)): i
        for i, (year, month) in enumerate(map(tuple, unique_year_months))
    }
    return out, year_month_to_i


def calc_stats_per_year(
    a_array: np.ndarray,
    dates: Dict[date, int],
    nb_days: bool = False,
    rest_days: bool = False,
) -> Tuple[np.ndarray, Dict[int, int]]:
    # Get the year for each date
    years = np.array([d.year for d in dates])

    # Get the unique years
    unique_years = np.unique(years)

    # Sum the shifts for each worker for each unique year
    out = np.zeros((a_array.shape[0], len(unique_years)), dtype=int)
    for i, year in enumerate(unique_years):
        # Get a mask of the dates that are in the current year
        mask = years == year

        if nb_days:
            if rest_days:
                # Count the days not worked for all dates in the current year
                out[:, i] = (a_array[:, mask, :].sum(axis=2) == 0).sum(axis=1)
            else:
                # Count the days worked for all dates in the current year
                out[:, i] = (a_array[:, mask, :].sum(axis=2) > 0).sum(axis=1)
        else:
            # Sum the shifts for all dates in the current year
            out[:, i] = a_array[:, mask, :].sum(axis=(1, 2))

    year_to_i = {int(year): i for i, year in enumerate(unique_years)}
    return out, year_to_i


def calc_stats_all(
    a_array: np.ndarray, nb_days: bool = False, rest_days: bool = False
) -> np.ndarray:
    if nb_days:
        if rest_days:
            return (a_array.sum(axis=2) == 0).sum(axis=1)
        return (a_array.sum(axis=2) > 0).sum(axis=1)
    return a_array.sum(axis=(1, 2))
