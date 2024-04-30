from datetime import date, timedelta
from typing import Dict, List, Tuple

from core import Schedule


def build_dates(
    time_frame: str, schedules: List[Schedule]
) -> Tuple[date, date, Dict[date, int]]:
    min_schedule_date = min(s.start_date for s in schedules)
    max_schedule_date = max(s.end_date for s in schedules)
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
    return (min_schedule_date, max_schedule_date, {})
