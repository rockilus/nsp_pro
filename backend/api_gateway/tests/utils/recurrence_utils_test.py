from datetime import date
from unittest.mock import patch

from shared.schemas.core import (
    FrequencyType,
    MonthRepeatType,
    OccurrenceInfo,
    OccurrenceType,
    RecurrenceEndType,
    RecurrenceExclusion,
    RecurrenceRule,
)

from src.utils.date_utils import build_dates_list
from src.utils.recurrence_utils import (
    generate_recurring_dates,
    handle_daily_frequency,
    handle_monthly_frequency,
    handle_weekly_frequency,
    handle_yearly_frequency,
)


# pylint: disable=too-many-lines
def test_daily_frequency_no_exclusions():
    period_start = date(2025, 1, 1)
    end_date = date(2025, 1, 10)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 1

    expected_dates = [
        date(2025, 1, 1),
        date(2025, 1, 2),
        date(2025, 1, 3),
        date(2025, 1, 4),
        date(2025, 1, 5),
        date(2025, 1, 6),
        date(2025, 1, 7),
        date(2025, 1, 8),
        date(2025, 1, 9),
        date(2025, 1, 10),
    ]

    result = handle_daily_frequency(
        period_dates, start_date, end_date, excluded_dates, repeat_every
    )

    assert result == expected_dates


def test_daily_frequency_with_exclusions():
    period_start = date(2025, 1, 1)
    end_date = date(2025, 1, 10)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = {date(2025, 1, 3), date(2025, 1, 7)}
    repeat_every = 1

    expected_dates = [
        date(2025, 1, 1),
        date(2025, 1, 2),
        date(2025, 1, 4),
        date(2025, 1, 5),
        date(2025, 1, 6),
        date(2025, 1, 8),
        date(2025, 1, 9),
        date(2025, 1, 10),
    ]

    result = handle_daily_frequency(
        period_dates, start_date, end_date, excluded_dates, repeat_every
    )

    assert result == expected_dates


def test_daily_frequency_with_period_start():
    period_start = date(2025, 1, 5)
    end_date = date(2025, 1, 10)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 1

    expected_dates = [
        date(2025, 1, 5),
        date(2025, 1, 6),
        date(2025, 1, 7),
        date(2025, 1, 8),
        date(2025, 1, 9),
        date(2025, 1, 10),
    ]

    result = handle_daily_frequency(
        period_dates, start_date, end_date, excluded_dates, repeat_every
    )

    assert result == expected_dates


def test_daily_frequency_with_end_date():
    period_start = date(2025, 1, 1)
    end_date = date(2025, 1, 5)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 1

    expected_dates = [
        date(2025, 1, 1),
        date(2025, 1, 2),
        date(2025, 1, 3),
        date(2025, 1, 4),
        date(2025, 1, 5),
    ]

    result = handle_daily_frequency(
        period_dates, start_date, end_date, excluded_dates, repeat_every
    )

    assert result == expected_dates


def test_daily_frequency_repeat_every_three_days():
    period_start = date(2025, 1, 1)
    end_date = date(2025, 1, 10)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 3

    expected_dates = [
        date(2025, 1, 1),
        date(2025, 1, 4),
        date(2025, 1, 7),
        date(2025, 1, 10),
    ]

    result = handle_daily_frequency(
        period_dates, start_date, end_date, excluded_dates, repeat_every
    )

    assert result == expected_dates


def test_daily_frequency_start_period_offset():
    period_start = date(2025, 1, 5)
    end_date = date(2025, 1, 25)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 10

    expected_dates = [
        date(2025, 1, 11),
        date(2025, 1, 21),
    ]

    result = handle_daily_frequency(
        period_dates, start_date, end_date, excluded_dates, repeat_every
    )

    assert result == expected_dates


def test_daily_frequency_with_number_of_occurrences():
    period_start = date(2025, 1, 1)
    end_date = date(2025, 1, 10)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 1
    number_of_occurrences = 5

    expected_dates = [
        date(2025, 1, 1),
        date(2025, 1, 2),
        date(2025, 1, 3),
        date(2025, 1, 4),
        date(2025, 1, 5),
    ]

    result = handle_daily_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_daily_frequency_with_start_period_offset_and_occurrences():
    period_start = date(2025, 1, 3)
    end_date = date(2025, 1, 10)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 1
    number_of_occurrences = 5

    expected_dates = [
        date(2025, 1, 3),
        date(2025, 1, 4),
        date(2025, 1, 5),
    ]

    result = handle_daily_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_daily_frequency_with_large_occurrences():
    period_start = date(2025, 1, 14)
    end_date = date(2025, 1, 30)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 3
    number_of_occurrences = 20

    expected_dates = [
        date(2025, 1, 16),
        date(2025, 1, 19),
        date(2025, 1, 22),
        date(2025, 1, 25),
        date(2025, 1, 28),
    ]

    result = handle_daily_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_daily_frequency_with_start_period_offset_and_limited_occurrences():
    period_start = date(2025, 1, 14)
    end_date = date(2025, 1, 30)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 3
    number_of_occurrences = 5

    expected_dates = []

    result = handle_daily_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_weekly_frequency_no_exclusions():
    period_start = date(2025, 1, 1)
    end_date = date(2025, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 1
    week_days = [0]  # Mondays

    expected_dates = [
        date(2025, 1, 6),
        date(2025, 1, 13),
        date(2025, 1, 20),
        date(2025, 1, 27),
    ]

    result = handle_weekly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        week_days,
    )

    assert result == expected_dates


def test_weekly_frequency_with_exclusions():
    period_start = date(2025, 1, 1)
    end_date = date(2025, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = {date(2025, 1, 13), date(2025, 1, 14), date(2025, 1, 27)}
    repeat_every = 1
    week_days = [0]  # Mondays

    expected_dates = [
        date(2025, 1, 6),
        date(2025, 1, 20),
    ]

    result = handle_weekly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        week_days,
    )

    assert result == expected_dates


def test_weekly_frequency_repeat_every_two():
    period_start = date(2025, 1, 1)
    end_date = date(2025, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 2
    week_days = [0]  # Mondays

    expected_dates = [
        date(2025, 1, 13),
        date(2025, 1, 27),
    ]

    result = handle_weekly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        week_days,
    )

    assert result == expected_dates


def test_weekly_frequency_multiple_weekdays():
    period_start = date(2025, 1, 1)
    end_date = date(2025, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 2
    week_days = [0, 4]  # Mondays and Fridays

    expected_dates = [
        date(2025, 1, 3),
        date(2025, 1, 13),
        date(2025, 1, 17),
        date(2025, 1, 27),
        date(2025, 1, 31),
    ]

    result = handle_weekly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        week_days,
    )

    assert result == expected_dates


def test_weekly_frequency_multiple_weekdays_with_occurrences():
    period_start = date(2025, 1, 1)
    end_date = date(2025, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 2
    week_days = [0, 4]  # Mondays and Fridays
    number_of_occurrences = 4

    expected_dates = [
        date(2025, 1, 3),
        date(2025, 1, 13),
        date(2025, 1, 17),
        date(2025, 1, 27),
    ]

    result = handle_weekly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        week_days,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_weekly_frequency_with_period_start():
    period_start = date(2025, 1, 7)
    end_date = date(2025, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 1
    week_days = [0]  # Mondays

    expected_dates = [
        date(2025, 1, 13),
        date(2025, 1, 20),
        date(2025, 1, 27),
    ]

    result = handle_weekly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        week_days,
    )

    assert result == expected_dates


def test_weekly_frequency_with_occurrences_and_period_start():
    period_start = date(2025, 1, 7)
    end_date = date(2025, 2, 28)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 1
    week_days = [0]  # Mondays
    number_of_occurrences = 4

    expected_dates = [
        date(2025, 1, 13),
        date(2025, 1, 20),
        date(2025, 1, 27),
    ]

    result = handle_weekly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        week_days,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_monthly_frequency_day_in_month():
    period_start = date(2025, 1, 10)
    end_date = date(2027, 1, 10)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 10)
    excluded_dates = set()
    repeat_every = 1
    month_repeat_type = MonthRepeatType.DAY_IN_MONTH

    expected_dates = [
        date(2025, 1, 10),
        date(2025, 2, 10),
        date(2025, 3, 10),
        date(2025, 4, 10),
        date(2025, 5, 10),
        date(2025, 6, 10),
        date(2025, 7, 10),
        date(2025, 8, 10),
        date(2025, 9, 10),
        date(2025, 10, 10),
        date(2025, 11, 10),
        date(2025, 12, 10),
        date(2026, 1, 10),
        date(2026, 2, 10),
        date(2026, 3, 10),
        date(2026, 4, 10),
        date(2026, 5, 10),
        date(2026, 6, 10),
        date(2026, 7, 10),
        date(2026, 8, 10),
        date(2026, 9, 10),
        date(2026, 10, 10),
        date(2026, 11, 10),
        date(2026, 12, 10),
        date(2027, 1, 10),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
    )

    assert result == expected_dates


def test_monthly_frequency_day_in_month_end_of_month_31_days():
    period_start = date(2025, 1, 10)
    end_date = date(2027, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 31)
    excluded_dates = set()
    repeat_every = 1
    month_repeat_type = MonthRepeatType.DAY_IN_MONTH

    expected_dates = [
        date(2025, 1, 31),
        date(2025, 3, 31),
        date(2025, 5, 31),
        date(2025, 7, 31),
        date(2025, 8, 31),
        date(2025, 10, 31),
        date(2025, 12, 31),
        date(2026, 1, 31),
        date(2026, 3, 31),
        date(2026, 5, 31),
        date(2026, 7, 31),
        date(2026, 8, 31),
        date(2026, 10, 31),
        date(2026, 12, 31),
        date(2027, 1, 31),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
    )

    assert result == expected_dates


def test_monthly_frequency_day_in_month_every_two_months():
    period_start = date(2025, 1, 10)
    end_date = date(2027, 1, 10)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 10)
    excluded_dates = set()
    repeat_every = 2
    month_repeat_type = MonthRepeatType.DAY_IN_MONTH

    expected_dates = [
        date(2025, 1, 10),
        date(2025, 3, 10),
        date(2025, 5, 10),
        date(2025, 7, 10),
        date(2025, 9, 10),
        date(2025, 11, 10),
        date(2026, 1, 10),
        date(2026, 3, 10),
        date(2026, 5, 10),
        date(2026, 7, 10),
        date(2026, 9, 10),
        date(2026, 11, 10),
        date(2027, 1, 10),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
    )

    assert result == expected_dates


def test_monthly_frequency_day_in_month_with_period_start():
    period_start = date(2025, 11, 10)
    end_date = date(2027, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 31)
    excluded_dates = set()
    repeat_every = 1
    month_repeat_type = MonthRepeatType.DAY_IN_MONTH

    expected_dates = [
        date(2025, 12, 31),
        date(2026, 1, 31),
        date(2026, 3, 31),
        date(2026, 5, 31),
        date(2026, 7, 31),
        date(2026, 8, 31),
        date(2026, 10, 31),
        date(2026, 12, 31),
        date(2027, 1, 31),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
    )

    assert result == expected_dates


def test_monthly_frequency_day_in_month_with_occurrences():
    period_start = date(2025, 1, 10)
    end_date = date(2027, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 10)
    excluded_dates = set()
    repeat_every = 1
    month_repeat_type = MonthRepeatType.DAY_IN_MONTH
    number_of_occurrences = 5

    expected_dates = [
        date(2025, 1, 10),
        date(2025, 2, 10),
        date(2025, 3, 10),
        date(2025, 4, 10),
        date(2025, 5, 10),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_monthly_frequency_day_in_month_with_period_start_and_occurrences():
    period_start = date(2025, 4, 10)
    end_date = date(2027, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 10)
    excluded_dates = set()
    repeat_every = 1
    month_repeat_type = MonthRepeatType.DAY_IN_MONTH
    number_of_occurrences = 5

    expected_dates = [
        date(2025, 4, 10),
        date(2025, 5, 10),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_monthly_frequency_day_in_month_with_exclusion():
    period_start = date(2025, 1, 10)
    end_date = date(2027, 1, 10)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 10)
    excluded_dates = {date(2025, 2, 10)}
    repeat_every = 1
    month_repeat_type = MonthRepeatType.DAY_IN_MONTH

    expected_dates = [
        date(2025, 1, 10),
        date(2025, 3, 10),
        date(2025, 4, 10),
        date(2025, 5, 10),
        date(2025, 6, 10),
        date(2025, 7, 10),
        date(2025, 8, 10),
        date(2025, 9, 10),
        date(2025, 10, 10),
        date(2025, 11, 10),
        date(2025, 12, 10),
        date(2026, 1, 10),
        date(2026, 2, 10),
        date(2026, 3, 10),
        date(2026, 4, 10),
        date(2026, 5, 10),
        date(2026, 6, 10),
        date(2026, 7, 10),
        date(2026, 8, 10),
        date(2026, 9, 10),
        date(2026, 10, 10),
        date(2026, 11, 10),
        date(2026, 12, 10),
        date(2027, 1, 10),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
    )

    assert result == expected_dates


def test_monthly_frequency_weekday_scenario_1():
    period_start = date(2025, 1, 10)
    end_date = date(2027, 1, 10)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 10)
    excluded_dates = set()
    repeat_every = 1
    month_repeat_type = MonthRepeatType.WEEKDAY

    expected_dates = [
        date(2025, 1, 10),
        date(2025, 2, 14),
        date(2025, 3, 14),
        date(2025, 4, 11),
        date(2025, 5, 9),
        date(2025, 6, 13),
        date(2025, 7, 11),
        date(2025, 8, 8),
        date(2025, 9, 12),
        date(2025, 10, 10),
        date(2025, 11, 14),
        date(2025, 12, 12),
        date(2026, 1, 9),
        date(2026, 2, 13),
        date(2026, 3, 13),
        date(2026, 4, 10),
        date(2026, 5, 8),
        date(2026, 6, 12),
        date(2026, 7, 10),
        date(2026, 8, 14),
        date(2026, 9, 11),
        date(2026, 10, 9),
        date(2026, 11, 13),
        date(2026, 12, 11),
        date(2027, 1, 8),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
    )

    assert result == expected_dates


def test_monthly_frequency_weekday_scenario_2():
    period_start = date(2025, 1, 10)
    end_date = date(2027, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 31)
    excluded_dates = set()
    repeat_every = 1
    month_repeat_type = MonthRepeatType.WEEKDAY

    expected_dates = [
        date(2025, 1, 31),
        date(2025, 5, 30),
        date(2025, 8, 29),
        date(2025, 10, 31),
        date(2026, 1, 30),
        date(2026, 5, 29),
        date(2026, 7, 31),
        date(2026, 10, 30),
        date(2027, 1, 29),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
    )

    assert result == expected_dates


def test_monthly_frequency_weekday_scenario_3():
    period_start = date(2025, 1, 10)
    end_date = date(2027, 1, 10)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 10)
    excluded_dates = set()
    repeat_every = 2
    month_repeat_type = MonthRepeatType.WEEKDAY

    expected_dates = [
        date(2025, 1, 10),
        date(2025, 3, 14),
        date(2025, 5, 9),
        date(2025, 7, 11),
        date(2025, 9, 12),
        date(2025, 11, 14),
        date(2026, 1, 9),
        date(2026, 3, 13),
        date(2026, 5, 8),
        date(2026, 7, 10),
        date(2026, 9, 11),
        date(2026, 11, 13),
        date(2027, 1, 8),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
    )

    assert result == expected_dates


def test_monthly_frequency_weekday_scenario_4():
    period_start = date(2025, 11, 10)
    end_date = date(2027, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 31)
    excluded_dates = set()
    repeat_every = 1
    month_repeat_type = MonthRepeatType.WEEKDAY

    expected_dates = [
        date(2026, 1, 30),
        date(2026, 5, 29),
        date(2026, 7, 31),
        date(2026, 10, 30),
        date(2027, 1, 29),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
    )

    assert result == expected_dates


def test_monthly_frequency_weekday_scenario_5():
    period_start = date(2025, 1, 10)
    end_date = date(2027, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 10)
    excluded_dates = set()
    repeat_every = 1
    month_repeat_type = MonthRepeatType.WEEKDAY
    number_of_occurrences = 5

    expected_dates = [
        date(2025, 1, 10),
        date(2025, 2, 14),
        date(2025, 3, 14),
        date(2025, 4, 11),
        date(2025, 5, 9),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_monthly_frequency_weekday_scenario_6():
    period_start = date(2025, 4, 10)
    end_date = date(2027, 1, 31)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 10)
    excluded_dates = set()
    repeat_every = 1
    month_repeat_type = MonthRepeatType.WEEKDAY
    number_of_occurrences = 5

    expected_dates = [
        date(2025, 4, 11),
        date(2025, 5, 9),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_monthly_frequency_weekday_with_exclusion():
    period_start = date(2025, 1, 10)
    end_date = date(2027, 1, 10)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 10)
    excluded_dates = {date(2025, 2, 14)}
    repeat_every = 1
    month_repeat_type = MonthRepeatType.WEEKDAY

    expected_dates = [
        date(2025, 1, 10),
        date(2025, 3, 14),
        date(2025, 4, 11),
        date(2025, 5, 9),
        date(2025, 6, 13),
        date(2025, 7, 11),
        date(2025, 8, 8),
        date(2025, 9, 12),
        date(2025, 10, 10),
        date(2025, 11, 14),
        date(2025, 12, 12),
        date(2026, 1, 9),
        date(2026, 2, 13),
        date(2026, 3, 13),
        date(2026, 4, 10),
        date(2026, 5, 8),
        date(2026, 6, 12),
        date(2026, 7, 10),
        date(2026, 8, 14),
        date(2026, 9, 11),
        date(2026, 10, 9),
        date(2026, 11, 13),
        date(2026, 12, 11),
        date(2027, 1, 8),
    ]

    result = handle_monthly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        month_repeat_type=month_repeat_type,
    )

    assert result == expected_dates


def test_yearly_frequency_scenario_1():
    period_start = date(2025, 1, 1)
    end_date = date(2030, 1, 1)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 1

    expected_dates = [
        date(2025, 1, 1),
        date(2026, 1, 1),
        date(2027, 1, 1),
        date(2028, 1, 1),
        date(2029, 1, 1),
        date(2030, 1, 1),
    ]

    result = handle_yearly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
    )

    assert result == expected_dates


def test_yearly_frequency_scenario_2():
    period_start = date(2025, 1, 1)
    end_date = date(2030, 1, 1)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = {date(2025, 1, 1)}
    repeat_every = 1

    expected_dates = [
        date(2026, 1, 1),
        date(2027, 1, 1),
        date(2028, 1, 1),
        date(2029, 1, 1),
        date(2030, 1, 1),
    ]

    result = handle_yearly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
    )

    assert result == expected_dates


def test_yearly_frequency_scenario_3():
    period_start = date(2026, 1, 1)
    end_date = date(2030, 1, 1)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 1

    expected_dates = [
        date(2026, 1, 1),
        date(2027, 1, 1),
        date(2028, 1, 1),
        date(2029, 1, 1),
        date(2030, 1, 1),
    ]

    result = handle_yearly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
    )

    assert result == expected_dates


def test_yearly_frequency_scenario_4():
    period_start = date(2025, 1, 1)
    end_date = date(2030, 1, 1)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 2

    expected_dates = [
        date(2025, 1, 1),
        date(2027, 1, 1),
        date(2029, 1, 1),
    ]

    result = handle_yearly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
    )

    assert result == expected_dates


def test_yearly_frequency_scenario_5():
    period_start = date(2025, 1, 1)
    end_date = date(2030, 1, 1)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 1
    number_of_occurrences = 3

    expected_dates = [
        date(2025, 1, 1),
        date(2026, 1, 1),
        date(2027, 1, 1),
    ]

    result = handle_yearly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_yearly_frequency_scenario_6():
    period_start = date(2027, 1, 1)
    end_date = date(2030, 1, 1)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2025, 1, 1)
    excluded_dates = set()
    repeat_every = 1
    number_of_occurrences = 3

    expected_dates = [
        date(2027, 1, 1),
    ]

    result = handle_yearly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_yearly_frequency_scenario_7():
    period_start = date(2027, 1, 1)
    end_date = date(2040, 1, 1)
    period_dates = build_dates_list(period_start, end_date)
    start_date = date(2024, 2, 29)
    excluded_dates = set()
    repeat_every = 1

    expected_dates = [
        date(2028, 2, 29),
        date(2032, 2, 29),
        date(2036, 2, 29),
    ]

    result = handle_yearly_frequency(
        period_dates,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
    )

    assert result == expected_dates


def test_generate_recurring_dates_calls_correct_handler():
    period_start = date(2025, 1, 1)
    period_end = date(2026, 1, 31)
    period_dates = build_dates_list(period_start, period_end)
    recurrence_rule = RecurrenceRule(
        id="rr_0",
        team_id="team_0",
        occurrence_type=OccurrenceType.ASSIGNMENT,
        occurrence_info=OccurrenceInfo(shift_id="shift_0"),
        repeat_every=1,
        frequency_type=FrequencyType.DAY,
        week_days=[],
        month_repeat_type=None,
        recurrence_end_type=RecurrenceEndType.NUMBER_OF_OCCURRENCES,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        number_of_occurrences=None,
    )
    exclusions = []

    with patch(
        "src.utils.recurrence_utils.handle_daily_frequency",
        return_value=[date(2025, 1, 1)],
    ) as mock_handler:

        result = generate_recurring_dates(period_dates, recurrence_rule, exclusions)

        mock_handler.assert_called_once_with(
            period_dates,
            recurrence_rule.start_date,
            period_end,
            set(),
            recurrence_rule.repeat_every,
            recurrence_rule.week_days,
            recurrence_rule.month_repeat_type,
            recurrence_rule.number_of_occurrences,
        )

        assert result == [date(2025, 1, 1)]


def test_generate_recurring_dates_scenario_1():
    period_start = date(2025, 1, 1)
    period_end = date(2026, 1, 31)
    period_dates = build_dates_list(period_start, period_end)
    recurrence_rule = RecurrenceRule(
        id="rr_0",
        team_id="team_0",
        occurrence_type=OccurrenceType.ASSIGNMENT,
        occurrence_info=OccurrenceInfo(shift_id="shift_0"),
        repeat_every=1,
        frequency_type=FrequencyType.DAY,
        week_days=[],
        month_repeat_type=None,
        recurrence_end_type=RecurrenceEndType.END_DATE,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        number_of_occurrences=None,
    )
    exclusions = []

    with patch(
        "src.utils.recurrence_utils.handle_daily_frequency", return_value=[]
    ) as mock_handler:
        generate_recurring_dates(period_dates, recurrence_rule, exclusions)
        mock_handler.assert_called_once_with(
            period_dates,
            recurrence_rule.start_date,
            recurrence_rule.end_date,
            set(),
            recurrence_rule.repeat_every,
            recurrence_rule.week_days,
            recurrence_rule.month_repeat_type,
            recurrence_rule.number_of_occurrences,
        )


def test_generate_recurring_dates_scenario_2():
    period_start = date(2025, 1, 1)
    period_end = date(2026, 1, 31)
    period_dates = build_dates_list(period_start, period_end)
    recurrence_rule = RecurrenceRule(
        id="rr_0",
        team_id="team_0",
        occurrence_type=OccurrenceType.ASSIGNMENT,
        occurrence_info=OccurrenceInfo(shift_id="shift_0"),
        repeat_every=1,
        frequency_type=FrequencyType.DAY,
        week_days=[],
        month_repeat_type=None,
        recurrence_end_type=RecurrenceEndType.NEVER,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        number_of_occurrences=2,
    )
    exclusions = []

    with patch(
        "src.utils.recurrence_utils.handle_daily_frequency", return_value=[]
    ) as mock_handler:
        generate_recurring_dates(period_dates, recurrence_rule, exclusions)
        mock_handler.assert_called_once_with(
            period_dates,
            recurrence_rule.start_date,
            period_end,
            set(),
            recurrence_rule.repeat_every,
            recurrence_rule.week_days,
            recurrence_rule.month_repeat_type,
            None,
        )


def test_generate_recurring_dates_scenario_3():
    period_start = date(2025, 1, 1)
    period_end = date(2026, 1, 31)
    period_dates = build_dates_list(period_start, period_end)
    recurrence_rule = RecurrenceRule(
        id="rr_0",
        team_id="team_0",
        occurrence_type=OccurrenceType.ASSIGNMENT,
        occurrence_info=OccurrenceInfo(shift_id="shift_0"),
        repeat_every=1,
        frequency_type=FrequencyType.DAY,
        week_days=[],
        month_repeat_type=None,
        recurrence_end_type=RecurrenceEndType.NUMBER_OF_OCCURRENCES,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        number_of_occurrences=2,
    )
    exclusions = []

    with patch(
        "src.utils.recurrence_utils.handle_daily_frequency", return_value=[]
    ) as mock_handler:
        generate_recurring_dates(period_dates, recurrence_rule, exclusions)
        mock_handler.assert_called_once_with(
            period_dates,
            recurrence_rule.start_date,
            period_end,
            set(),
            recurrence_rule.repeat_every,
            recurrence_rule.week_days,
            recurrence_rule.month_repeat_type,
            recurrence_rule.number_of_occurrences,
        )


def test_generate_recurring_dates_scenario_4():
    period_start = date(2025, 1, 1)
    period_end = date(2026, 1, 31)
    period_dates = build_dates_list(period_start, period_end)
    recurrence_rule = RecurrenceRule(
        id="rr_0",
        team_id="team_0",
        occurrence_type=OccurrenceType.ASSIGNMENT,
        occurrence_info=OccurrenceInfo(shift_id="shift_0"),
        repeat_every=1,
        frequency_type=FrequencyType.DAY,
        week_days=[],
        month_repeat_type=None,
        recurrence_end_type=RecurrenceEndType.NEVER,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        number_of_occurrences=None,
    )
    exclusions = [
        RecurrenceExclusion(
            id="exclusion_0",
            recurrence_rule_id="rr_0",
            excluded_date=date(2025, 1, 1),
        )
    ]

    with patch(
        "src.utils.recurrence_utils.handle_daily_frequency", return_value=[]
    ) as mock_handler:
        generate_recurring_dates(period_dates, recurrence_rule, exclusions)
        mock_handler.assert_called_once_with(
            period_dates,
            recurrence_rule.start_date,
            period_end,
            {date(2025, 1, 1)},
            recurrence_rule.repeat_every,
            recurrence_rule.week_days,
            recurrence_rule.month_repeat_type,
            recurrence_rule.number_of_occurrences,
        )


def test_generate_recurring_dates_scenario_5():
    period_start = date(2025, 1, 1)
    period_end = date(2026, 1, 31)
    period_dates = build_dates_list(period_start, period_end)
    recurrence_rule = RecurrenceRule(
        id="rr_0",
        team_id="team_0",
        occurrence_type=OccurrenceType.ASSIGNMENT,
        occurrence_info=OccurrenceInfo(shift_id="shift_0"),
        repeat_every=1,
        frequency_type=FrequencyType.WEEK,
        week_days=[],
        month_repeat_type=None,
        recurrence_end_type=RecurrenceEndType.NEVER,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        number_of_occurrences=None,
    )
    exclusions = []

    with patch(
        "src.utils.recurrence_utils.handle_weekly_frequency", return_value=[]
    ) as mock_handler:
        generate_recurring_dates(period_dates, recurrence_rule, exclusions)
        mock_handler.assert_called_once_with(
            period_dates,
            recurrence_rule.start_date,
            period_end,
            set(),
            recurrence_rule.repeat_every,
            recurrence_rule.week_days,
            recurrence_rule.month_repeat_type,
            recurrence_rule.number_of_occurrences,
        )


def test_generate_recurring_dates_scenario_6():
    period_start = date(2025, 1, 1)
    period_end = date(2026, 1, 31)
    period_dates = build_dates_list(period_start, period_end)
    recurrence_rule = RecurrenceRule(
        id="rr_0",
        team_id="team_0",
        occurrence_type=OccurrenceType.ASSIGNMENT,
        occurrence_info=OccurrenceInfo(shift_id="shift_0"),
        repeat_every=1,
        frequency_type=FrequencyType.MONTH,
        week_days=[],
        month_repeat_type=None,
        recurrence_end_type=RecurrenceEndType.NEVER,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        number_of_occurrences=None,
    )
    exclusions = []

    with patch(
        "src.utils.recurrence_utils.handle_monthly_frequency", return_value=[]
    ) as mock_handler:
        generate_recurring_dates(period_dates, recurrence_rule, exclusions)
        mock_handler.assert_called_once_with(
            period_dates,
            recurrence_rule.start_date,
            period_end,
            set(),
            recurrence_rule.repeat_every,
            recurrence_rule.week_days,
            recurrence_rule.month_repeat_type,
            recurrence_rule.number_of_occurrences,
        )


def test_generate_recurring_dates_scenario_7():
    period_start = date(2025, 1, 1)
    period_end = date(2026, 1, 31)
    period_dates = build_dates_list(period_start, period_end)
    recurrence_rule = RecurrenceRule(
        id="rr_0",
        team_id="team_0",
        occurrence_type=OccurrenceType.ASSIGNMENT,
        occurrence_info=OccurrenceInfo(shift_id="shift_0"),
        repeat_every=1,
        frequency_type=FrequencyType.YEAR,
        week_days=[],
        month_repeat_type=None,
        recurrence_end_type=RecurrenceEndType.NEVER,
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 31),
        number_of_occurrences=None,
    )
    exclusions = []

    with patch(
        "src.utils.recurrence_utils.handle_yearly_frequency", return_value=[]
    ) as mock_handler:
        generate_recurring_dates(period_dates, recurrence_rule, exclusions)
        mock_handler.assert_called_once_with(
            period_dates,
            recurrence_rule.start_date,
            period_end,
            set(),
            recurrence_rule.repeat_every,
            recurrence_rule.week_days,
            recurrence_rule.month_repeat_type,
            recurrence_rule.number_of_occurrences,
        )
