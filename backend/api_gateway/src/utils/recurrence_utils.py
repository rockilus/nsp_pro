from datetime import date, timedelta
from typing import Callable, Dict, List, Optional, Set

from shared.schemas.core import (
    FrequencyType,
    MonthRepeatType,
    RecurrenceEndType,
    RecurrenceExclusion,
    RecurrenceRule,
)


# pylint: disable=too-many-arguments, too-many-positional-arguments
def handle_daily_frequency(
    period_start: date,
    start_date: date,
    end_date: date,
    excluded_dates: Set[date],
    repeat_every: int,
    _0: Optional[List[int]] = None,
    _1: Optional[MonthRepeatType] = None,
    number_of_occurrences: Optional[int] = None,
) -> List[date]:
    dates = []

    # Initialize current_date based on the conditions
    if start_date >= period_start:
        current_date = start_date
        occurrences_count = 0
    else:
        days_difference = (period_start - start_date).days
        offset = days_difference % repeat_every
        current_date = (
            period_start
            if offset == 0
            else period_start + timedelta(days=repeat_every - offset)
        )
        occurrences_count = ((current_date - start_date).days) // repeat_every

    # Iterate and collect dates
    while current_date <= end_date:
        # Stop if the number of occurrences is reached
        if number_of_occurrences and occurrences_count >= number_of_occurrences:
            break
        if current_date not in excluded_dates:
            dates.append(current_date)
            occurrences_count += 1
        current_date += timedelta(days=repeat_every)

    return dates


# pylint: disable=too-many-locals
def handle_weekly_frequency(
    period_start: date,
    start_date: date,
    end_date: date,
    excluded_dates: Set[date],
    repeat_every: int,
    week_days: Optional[List[int]] = None,
    _: Optional[MonthRepeatType] = None,
    number_of_occurrences: Optional[int] = None,
) -> List[date]:
    if week_days is None:
        return []

    dates = []

    current_week_start = start_date - timedelta(days=start_date.weekday())
    occurrences_count = 0

    while current_week_start <= end_date:
        # Define the current week (Monday to Sunday) working period
        current_week_end = min(current_week_start + timedelta(days=6), end_date)
        current_week = [
            current_week_start + timedelta(days=i)
            for i in range((current_week_end - current_week_start).days + 1)
        ]

        # Collect dates in the current week that match week_days
        for day in current_week:
            if day < start_date:
                continue
            if day.weekday() in week_days and day not in excluded_dates:
                if day >= period_start:
                    dates.append(day)
                occurrences_count += 1
                # Stop if the number of occurrences is reached
                if number_of_occurrences and occurrences_count >= number_of_occurrences:
                    return dates

        # Move to the next week based on repeat_every
        current_week_start += timedelta(weeks=repeat_every)

    return dates


# pylint: disable=too-many-branches, too-many-statements
def handle_monthly_frequency(
    period_start: date,
    start_date: date,
    end_date: date,
    excluded_dates: Set[date],
    repeat_every: int,
    _: Optional[List[int]] = None,
    month_repeat_type: Optional[MonthRepeatType] = None,
    number_of_occurrences: Optional[int] = None,
) -> List[date]:
    if month_repeat_type is None:
        return []

    dates = []
    current_date = start_date.replace(day=1)
    occurrences_count = 0

    # Iterate and collect dates
    while current_date <= end_date:
        candidate_date = None
        if month_repeat_type == MonthRepeatType.DAY_IN_MONTH:
            try:
                candidate_date = current_date.replace(day=start_date.day)
            except ValueError:
                # Handle invalid day (e.g., February 30th)
                candidate_date = None
        elif month_repeat_type == MonthRepeatType.WEEKDAY:
            first_day_of_month = current_date.replace(day=1)
            weekday_offset = (
                start_date.weekday() - first_day_of_month.weekday() + 7
            ) % 7
            candidate_date = first_day_of_month + timedelta(days=weekday_offset)
            week_number = (start_date.day - 1) // 7
            candidate_date += timedelta(weeks=week_number)

            if (
                candidate_date.year != current_date.year
                or candidate_date.month != current_date.month
            ):
                candidate_date = None

        if (
            candidate_date
            and start_date <= candidate_date <= end_date
            and candidate_date not in excluded_dates
        ):
            occurrences_count += 1
            if period_start <= candidate_date:
                dates.append(candidate_date)
            if number_of_occurrences and occurrences_count >= number_of_occurrences:
                break

        # Move to the next month based on repeat_every
        new_month = current_date.month + repeat_every
        year_increment = (new_month - 1) // 12
        new_month = (new_month - 1) % 12 + 1
        current_date = current_date.replace(
            year=current_date.year + year_increment,
            month=new_month,
            day=1,
        )
    return dates


def handle_yearly_frequency(
    period_start: date,
    start_date: date,
    end_date: date,
    excluded_dates: Set[date],
    repeat_every: int,
    _0: Optional[List[int]] = None,
    _1: Optional[MonthRepeatType] = None,
    number_of_occurrences: Optional[int] = None,
) -> List[date]:
    dates = []
    current_date = start_date
    occurrences_count = 0

    # Iterate and collect dates
    while current_date <= end_date:
        if current_date not in excluded_dates:
            occurrences_count += 1
            if current_date >= period_start:
                dates.append(current_date)
            if number_of_occurrences and occurrences_count >= number_of_occurrences:
                break

        # Move to the next year based on repeat_every
        try:
            current_date = current_date.replace(year=current_date.year + repeat_every)
        except ValueError:
            # Handle February 29th for non-leap years by moving to the next valid year
            increment_count = 1
            while True:
                try:
                    current_date = current_date.replace(
                        year=current_date.year + repeat_every * increment_count
                    )
                    break
                except ValueError:
                    increment_count += 1
                    continue

    return dates


FrequencyHandler = Callable[
    [
        date,  # period_start
        date,  # start_date
        date,  # end_date
        Set[date],  # excluded_dates
        int,  # repeat_every
        Optional[List[int]],  # week_days or unused parameter
        Optional[MonthRepeatType],  # month_repeat_type or unused parameter
        Optional[int],  # number_of_occurrences
    ],
    List[date],  # Return type
]


def generate_recurring_dates(
    period_start: date,
    period_end: date,
    recurrence_rule: RecurrenceRule,
    exclusions: List[RecurrenceExclusion],
) -> List[date]:
    FREQUENCY_HANDLERS: Dict[FrequencyType, FrequencyHandler] = {
        FrequencyType.DAY: handle_daily_frequency,
        FrequencyType.WEEK: handle_weekly_frequency,
        FrequencyType.MONTH: handle_monthly_frequency,
        FrequencyType.YEAR: handle_yearly_frequency,
    }

    end_date = min(
        [period_end]
        + (
            [recurrence_rule.end_date]
            if recurrence_rule.end_date
            and recurrence_rule.recurrence_end_type == RecurrenceEndType.END_DATE
            else []
        )
    )
    number_of_occurrences = (
        recurrence_rule.number_of_occurrences
        if recurrence_rule.recurrence_end_type
        == RecurrenceEndType.NUMBER_OF_OCCURRENCES
        else None
    )
    excluded_dates: Set[date] = {exclusion.excluded_date for exclusion in exclusions}

    handler = FREQUENCY_HANDLERS.get(recurrence_rule.frequency_type, None)
    if not handler:
        raise ValueError(f"Invalid frequency type: {recurrence_rule.frequency_type}")

    return handler(
        period_start,
        recurrence_rule.start_date,
        end_date,
        excluded_dates,
        recurrence_rule.repeat_every,
        recurrence_rule.week_days,
        recurrence_rule.month_repeat_type,
        number_of_occurrences,
    )
