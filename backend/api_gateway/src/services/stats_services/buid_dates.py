from datetime import date, timedelta
from typing import Dict, List, Tuple

from errors import NoCampaignError

from shared.schemas import Schedule


# pylint: disable=too-many-return-statements
def build_dates(
    time_frame: str,
    start_date: date,
    end_date: date,
    schedules: List[Schedule],
    schedule_campaign: Schedule | None,
) -> Tuple[date, date, Dict[date, int]]:
    min_schedule_date = min(s.start_date for s in schedules)
    max_schedule_date = max(s.end_date for s in schedules)
    if time_frame == "campaign":
        if schedule_campaign is None:
            raise NoCampaignError("No campaign schedule found")
        return (
            schedule_campaign.start_date,
            schedule_campaign.end_date,
            {
                date: i
                for i, date in enumerate(
                    [
                        schedule_campaign.start_date + timedelta(days=i)
                        for i in range(
                            (
                                schedule_campaign.end_date
                                - schedule_campaign.start_date
                            ).days
                            + 1
                        )
                    ]
                )
            },
        )
    if time_frame == "last_12_months":
        max_minus_12_months = max_schedule_date - timedelta(days=365)
        start = max(min_schedule_date, max_minus_12_months)
        return (
            start,
            max_schedule_date,
            {
                date: i
                for i, date in enumerate(
                    [
                        start + timedelta(days=i)
                        for i in range((max_schedule_date - start).days + 1)
                    ]
                )
            },
        )
    if time_frame == "last_24_months":
        max_minus_24_months = max_schedule_date - timedelta(days=730)
        start = max(min_schedule_date, max_minus_24_months)
        return (
            start,
            max_schedule_date,
            {
                date: i
                for i, date in enumerate(
                    [
                        start + timedelta(days=i)
                        for i in range((max_schedule_date - start).days + 1)
                    ]
                )
            },
        )
    if time_frame == "last_36_months":
        max_minus_36_months = max_schedule_date - timedelta(days=1095)
        start = max(min_schedule_date, max_minus_36_months)
        return (
            start,
            max_schedule_date,
            {
                date: i
                for i, date in enumerate(
                    [
                        start + timedelta(days=i)
                        for i in range((max_schedule_date - start).days + 1)
                    ]
                )
            },
        )
    if time_frame == "all":
        return (
            start,
            max_schedule_date,
            {
                date: i
                for i, date in enumerate(
                    [
                        min_schedule_date + timedelta(days=i)
                        for i in range((max_schedule_date - min_schedule_date).days + 1)
                    ]
                )
            },
        )
    if time_frame == "custom":
        start = max(min_schedule_date, start_date)
        end = min(max_schedule_date, end_date)
        return (
            start,
            end,
            {
                date: i
                for i, date in enumerate(
                    [start + timedelta(days=i) for i in range((end - start).days + 1)]
                )
            },
        )
    raise ValueError("Invalid time_frame")
