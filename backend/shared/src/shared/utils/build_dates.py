from datetime import date, timedelta
from typing import Dict, List

from shared.schemas.core import (
    Assignment,
    Worker,
    WorkerDates,
)


def build_worker_ids_to_worker_dates(
    start_date: date,
    end_date: date,
    workers: List[Worker],
    assignments: List[Assignment],
) -> Dict[str, WorkerDates]:
    dates_campaign = build_dates_list(start_date=start_date, end_date=end_date)
    worker_ids_to_worker_dates: Dict[str, WorkerDates] = {}
    for worker in workers:
        # Worker's past dates, i.e. dates for his past assignments
        a_worker_past = [
            a for a in assignments if a.worker_id == worker.id and a.date < start_date
        ]
        dates_hist_worker = list(sorted(set(a.date for a in a_worker_past)))

        # Worker's campaign dates, i.e. dates during the campaign and his
        # employment period
        if worker.deleted:
            dates_campaign_worker = []
        else:
            dates_worker_employment = build_dates_list(
                worker.employment_start_date,
                worker.employment_end_date or end_date,
            )
            dates_campaign_worker = list(
                sorted(set(d for d in dates_campaign if d in dates_worker_employment))
            )

        worker_ids_to_worker_dates[worker.id] = WorkerDates(
            dates_hist=dates_hist_worker, dates_campaign=dates_campaign_worker
        )
    return worker_ids_to_worker_dates


def build_dates_list(start_date: date, end_date: date) -> List[date]:
    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]
