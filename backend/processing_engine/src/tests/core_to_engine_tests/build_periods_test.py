import calendar
from datetime import date, timedelta
from typing import List

import pytest
from shared.schemas import EngineInputs

from core_to_engine_service.build_periods import (
    build_periods_monthly,
    build_periods_weekly,
)
from tests.test_data import test_data_set_1


class TestBuildPeriods:
    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_build_periods_weekly(self, sample_data: EngineInputs) -> None:
        schedule = sample_data.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        # Call the method under test
        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)

        # Verify the output
        assert isinstance(periods_weekly, list)
        assert all(isinstance(week, list) for week in periods_weekly)
        assert all(isinstance(day, date) for week in periods_weekly for day in week)

        # Verify that the periods are correctly built
        expected_periods = []
        current_date = schedule.start_date
        while current_date <= schedule.end_date:
            start_of_week = current_date - timedelta(days=current_date.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            week_dates = [
                d for d in dates_campaign if start_of_week <= d <= end_of_week
            ]
            expected_periods.append(week_dates)
            current_date = end_of_week + timedelta(days=1)
        assert periods_weekly == expected_periods

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_build_periods_monthly(self, sample_data: EngineInputs) -> None:
        schedule = sample_data.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist: List[date] = []

        # Call the method under test
        periods_monthly = build_periods_monthly(dates_hist, dates_campaign)

        # Verify the output
        assert isinstance(periods_monthly, list)
        assert all(isinstance(month, list) for month in periods_monthly)
        assert all(isinstance(day, date) for month in periods_monthly for day in month)

        # Verify that the periods are correctly built
        expected_periods = []
        current_date = schedule.start_date
        while current_date <= schedule.end_date:
            start_of_month = date(current_date.year, current_date.month, 1)
            _, last_day_month = calendar.monthrange(
                current_date.year, current_date.month
            )
            end_of_month = date(current_date.year, current_date.month, last_day_month)
            month_dates = [
                d for d in dates_campaign if start_of_month <= d <= end_of_month
            ]
            expected_periods.append(month_dates)
            current_date = end_of_month + timedelta(days=1)
        assert periods_monthly == expected_periods

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_build_periods_weekly_with_hist(self, sample_data: EngineInputs) -> None:
        schedule = sample_data.schedule
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        date_hist_1 = schedule.start_date - timedelta(days=1)
        date_hist_2 = schedule.start_date - timedelta(days=2)
        dates_hist = [date_hist_1, date_hist_2]

        # Call the method under test
        periods_weekly = build_periods_weekly(dates_hist, dates_campaign)

        # Verify the output
        assert isinstance(periods_weekly, list)
        assert all(isinstance(week, list) for week in periods_weekly)
        assert all(isinstance(day, date) for week in periods_weekly for day in week)

        # Verify that the periods are correctly built
        expected_periods = []

        min_date_campaign = min(dates_campaign)
        current_date = min(dates_campaign)
        if current_date.weekday() != 0:
            start_of_week = min_date_campaign - timedelta(
                days=min_date_campaign.weekday()
            )
            d = start_of_week
            while d <= min_date_campaign:
                if d in dates_hist:
                    current_date = d
                    break
                d += timedelta(days=1)

        while current_date <= schedule.end_date:
            start_of_week = current_date - timedelta(days=current_date.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            week_dates = [
                d
                for d in dates_hist + dates_campaign
                if start_of_week <= d <= end_of_week
            ]
            expected_periods.append(sorted(set(week_dates)))
            current_date = end_of_week + timedelta(days=1)
        if periods_weekly != expected_periods:
            print("stop")
        assert periods_weekly == expected_periods

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_build_periods_monthly_with_hist(self, sample_data: EngineInputs) -> None:
        schedule = sample_data.schedule
        schedule.start_date = date(2025, 1, 3)
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dates_hist = [
            date(2024, 12, 30),
            date(2024, 12, 31),
            date(2025, 1, 1),
            date(2025, 1, 2),
        ]

        # Filter dates_hist to only include dates that belong to a month in
        # dates_campaign
        campaign_months = set((d.year, d.month) for d in dates_campaign)
        filtered_dates_hist = [
            d for d in dates_hist if (d.year, d.month) in campaign_months
        ]

        # Call the method under test
        periods_monthly = build_periods_monthly(filtered_dates_hist, dates_campaign)

        # Verify the output
        assert isinstance(periods_monthly, list)
        assert all(isinstance(month, list) for month in periods_monthly)
        assert all(isinstance(day, date) for month in periods_monthly for day in month)

        # Verify that the periods are correctly built
        expected_periods = []
        current_date = min(filtered_dates_hist + dates_campaign)
        while current_date <= schedule.end_date:
            start_of_month = date(current_date.year, current_date.month, 1)
            _, last_day_month = calendar.monthrange(
                current_date.year, current_date.month
            )
            end_of_month = date(current_date.year, current_date.month, last_day_month)
            month_dates = [
                d
                for d in filtered_dates_hist + dates_campaign
                if start_of_month <= d <= end_of_month
            ]
            expected_periods.append(sorted(set(month_dates)))
            current_date = end_of_month + timedelta(days=1)
        assert periods_monthly == expected_periods
