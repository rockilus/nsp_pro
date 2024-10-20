from datetime import date, timedelta
from typing import Dict, List, Tuple

from core import Assignment, Schedule, Worker
from core_to_engine_service.types import WorkerDates


def build_dates(
    schedule: Schedule, fixed_assignments: List[Assignment]
) -> Tuple[List[date], List[date]]:
    start_date_hist = min(
        (
            min(a.date for a in fixed_assignments)
            if fixed_assignments
            else schedule.start_date
        ),
        schedule.start_date,
    )
    end_date_hist = schedule.start_date - timedelta(days=1)
    dates_hist = _build_dates_list(start_date_hist, end_date_hist)
    dates_campaign = _build_dates_list(schedule.start_date, schedule.end_date)
    return dates_hist, dates_campaign


def build_worker_ids_to_worker_dates(
    schedule: Schedule,
    workers: List[Worker],
    assignments: List[Assignment],
    dates_campaign: List[date],
) -> Dict[str, WorkerDates]:
    worker_ids_to_worker_dates: Dict[str, WorkerDates] = {}
    for worker in workers:
        # Worker's past dates, i.e. dates for his past assignments
        a_worker_past = [
            a
            for a in assignments
            if a.worker_id == worker.id and a.date < schedule.start_date
        ]
        dates_hist_worker = list(sorted(set(a.date for a in a_worker_past)))

        # Worker's campaign dates, i.e. dates during the campaign and his
        # employment period
        if worker.deleted:
            dates_campaign_worker = []
        else:
            dates_worker_employment = _build_dates_list(
                worker.employment_start_date,
                worker.employment_end_date or schedule.end_date,
            )
            dates_campaign_worker = list(
                sorted(set(d for d in dates_campaign if d in dates_worker_employment))
            )

        worker_ids_to_worker_dates[worker.id] = WorkerDates(
            dates_hist=dates_hist_worker, dates_campaign=dates_campaign_worker
        )
    return worker_ids_to_worker_dates


def _build_dates_list(start_date: date, end_date: date) -> List[date]:
    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]
