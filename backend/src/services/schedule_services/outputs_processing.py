from typing import List

from core import Assignment, Schedule
from scripts.setup_database import request_db, worker_db


def update_request_status(schedule: Schedule, assignments: List[Assignment]) -> None:
    workers = worker_db.get_workers(schedule.team_id)
    requests = request_db.get_requests_by_dates(
        schedule.start_date, schedule.end_date, workers
    )
    for r in requests:
        assignment = next(
            (
                a
                for a in assignments
                if a.worker_id == r.worker_id
                and a.date == r.date
                and a.shift_id == r.shift_id
            ),
            None,
        )
        if assignment is None:
            r.status = "rejected"
        else:
            r.status = "approved"
        request_db.update_request(r)
