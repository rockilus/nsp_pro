from datetime import date


from src.utils.recurrence_utils import handle_daily_frequency


def test_daily_frequency_no_exclusions():
    period_start = date(2025, 1, 1)
    start_date = date(2025, 1, 1)
    end_date = date(2025, 1, 10)
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
        period_start, start_date, end_date, excluded_dates, repeat_every
    )

    assert result == expected_dates


def test_daily_frequency_with_exclusions():
    period_start = date(2025, 1, 1)
    start_date = date(2025, 1, 1)
    end_date = date(2025, 1, 10)
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
        period_start, start_date, end_date, excluded_dates, repeat_every
    )

    assert result == expected_dates


def test_daily_frequency_with_period_start():
    period_start = date(2025, 1, 5)
    start_date = date(2025, 1, 1)
    end_date = date(2025, 1, 10)
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
        period_start, start_date, end_date, excluded_dates, repeat_every
    )

    assert result == expected_dates


def test_daily_frequency_with_end_date():
    period_start = date(2025, 1, 1)
    start_date = date(2025, 1, 1)
    end_date = date(2025, 1, 5)
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
        period_start, start_date, end_date, excluded_dates, repeat_every
    )

    assert result == expected_dates


def test_daily_frequency_repeat_every_three_days():
    period_start = date(2025, 1, 1)
    start_date = date(2025, 1, 1)
    end_date = date(2025, 1, 10)
    excluded_dates = set()
    repeat_every = 3

    expected_dates = [
        date(2025, 1, 1),
        date(2025, 1, 4),
        date(2025, 1, 7),
        date(2025, 1, 10),
    ]

    result = handle_daily_frequency(
        period_start, start_date, end_date, excluded_dates, repeat_every
    )

    assert result == expected_dates


def test_daily_frequency_start_period_offset():
    period_start = date(2025, 1, 5)
    start_date = date(2025, 1, 1)
    end_date = date(2025, 1, 25)
    excluded_dates = set()
    repeat_every = 10

    expected_dates = [
        date(2025, 1, 11),
        date(2025, 1, 21),
    ]

    result = handle_daily_frequency(
        period_start, start_date, end_date, excluded_dates, repeat_every
    )

    assert result == expected_dates


def test_daily_frequency_with_number_of_occurrences():
    period_start = date(2025, 1, 1)
    start_date = date(2025, 1, 1)
    end_date = date(2025, 1, 10)
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
        period_start,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_daily_frequency_with_start_period_offset_and_occurrences():
    period_start = date(2025, 1, 3)
    start_date = date(2025, 1, 1)
    end_date = date(2025, 1, 10)
    excluded_dates = set()
    repeat_every = 1
    number_of_occurrences = 5

    expected_dates = [
        date(2025, 1, 3),
        date(2025, 1, 4),
        date(2025, 1, 5),
    ]

    result = handle_daily_frequency(
        period_start,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_daily_frequency_with_large_occurrences():
    period_start = date(2025, 1, 14)
    start_date = date(2025, 1, 1)
    end_date = date(2025, 1, 30)
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
        period_start,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates


def test_daily_frequency_with_start_period_offset_and_limited_occurrences():
    period_start = date(2025, 1, 14)
    start_date = date(2025, 1, 1)
    end_date = date(2025, 1, 30)
    excluded_dates = set()
    repeat_every = 3
    number_of_occurrences = 5

    expected_dates = []

    result = handle_daily_frequency(
        period_start,
        start_date,
        end_date,
        excluded_dates,
        repeat_every,
        number_of_occurrences=number_of_occurrences,
    )

    assert result == expected_dates
