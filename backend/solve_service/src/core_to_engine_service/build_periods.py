import calendar
from datetime import date, timedelta


def build_periods_weekly(
    dates_hist: list[date], dates_campaign: list[date]
) -> list[list[date]]:
    dates_campaign = sorted(dates_campaign)  # Ensure dates are sorted

    periods: list[list[date]] = []
    while dates_campaign:
        # Get the start of the week (Monday)
        start_date = dates_campaign[0]
        start_of_week = start_date - timedelta(days=start_date.weekday())
        end_of_week = start_of_week + timedelta(days=6)

        # Get all dates in the current week
        current_week_dates = [
            d for d in dates_campaign if start_of_week <= d <= end_of_week
        ]
        if start_of_week in dates_hist:
            current_week_dates.extend(
                d for d in dates_hist if start_of_week <= d <= end_of_week
            )
        current_week_dates = sorted(set(current_week_dates))
        periods.append(current_week_dates)

        # Remove the current week from the list of dates
        dates_campaign = [d for d in dates_campaign if d > end_of_week]
    return periods


def build_periods_monthly(
    dates_hist: list[date], dates_campaign: list[date]
) -> list[list[date]]:
    dates_campaign = sorted(dates_campaign)  # Ensure dates are sorted

    periods: list[list[date]] = []
    while dates_campaign:
        # Get the start of the month
        start_date = dates_campaign[0]
        start_of_month = date(start_date.year, start_date.month, 1)
        _, last_day_month = calendar.monthrange(start_date.year, start_date.month)
        end_of_month = date(start_date.year, start_date.month, last_day_month)

        # Get all dates in the current month
        current_month_dates = [
            d for d in dates_campaign if start_of_month <= d <= end_of_month
        ]
        if start_of_month in dates_hist:
            current_month_dates.extend(
                d for d in dates_hist if start_of_month <= d <= end_of_month
            )
        current_month_dates = sorted(set(current_month_dates))
        periods.append(current_month_dates)

        # Remove the current month from the list of dates
        dates_campaign = [d for d in dates_campaign if d > end_of_month]
    return periods


def build_periods_yearly(
    dates_hist: list[date], dates_campaign: list[date]
) -> list[list[date]]:
    """Build periods grouped by calendar year.

    For each year present in dates_campaign, collect all campaign dates in that
    year. If the first day of the year (Jan 1) appears in dates_hist, include
    historical dates that fall within the same year as well.
    """
    dates_campaign = sorted(dates_campaign)  # Ensure dates are sorted

    periods: list[list[date]] = []
    while dates_campaign:
        # Get the year for the first campaign date
        start_date = dates_campaign[0]
        start_of_year = date(start_date.year, 1, 1)
        end_of_year = date(start_date.year, 12, 31)

        # Get all dates in the current year from campaign
        current_year_dates = [
            d for d in dates_campaign if start_of_year <= d <= end_of_year
        ]

        # If Jan 1 in history, include historical dates for that year
        if start_of_year in dates_hist:
            current_year_dates.extend(
                d for d in dates_hist if start_of_year <= d <= end_of_year
            )

        current_year_dates = sorted(set(current_year_dates))
        periods.append(current_year_dates)

        # Remove the current year from the list of campaign dates
        dates_campaign = [d for d in dates_campaign if d > end_of_year]
    return periods
