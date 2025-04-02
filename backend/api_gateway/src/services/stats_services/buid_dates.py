from datetime import date, timedelta
from typing import Dict, List, Tuple

from shared.schemas import Schedule, StatsTimeFrameOptions

from src.errors import NoCampaignError


# pylint: disable=too-many-return-statements
def build_dates(
    time_frame: StatsTimeFrameOptions,
    start_date: date,
    end_date: date,
    schedules: List[Schedule],
    schedule_campaign: Schedule | None,
) -> Tuple[date, date, Dict[date, int]]:
    min_schedule_date = min(s.start_date for s in schedules)
    max_schedule_date = max(s.end_date for s in schedules)
    if time_frame == StatsTimeFrameOptions.CAMPAING:
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
    if time_frame == StatsTimeFrameOptions.LTM:
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
    if time_frame == StatsTimeFrameOptions.CUSTOM:
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
