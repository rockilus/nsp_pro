from datetime import date, timedelta
from typing import List, Tuple

from core import Assignment, Schedule


def build_dates(
    schedule: Schedule, fixed_assignments: List[Assignment]
) -> Tuple[List[date], List[date], List[date]]:
    start_date_hist = min(
        (
            min(a.date for a in fixed_assignments)
            if fixed_assignments
            else schedule.start_date
        ),
        schedule.start_date,
    )
    end_date_hist = schedule.start_date - timedelta(days=1)
    dates_all = _build_dates_list(start_date_hist, schedule.end_date)
    dates_hist = _build_dates_list(start_date_hist, end_date_hist)
    dates_campaign = _build_dates_list(schedule.start_date, schedule.end_date)
    return dates_all, dates_hist, dates_campaign


def _build_dates_list(start_date: date, end_date: date) -> List[date]:
    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]
