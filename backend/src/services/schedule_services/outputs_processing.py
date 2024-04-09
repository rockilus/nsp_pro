from typing import List

from core import Assignment, Schedule
from scripts.setup_database import fixed_assignment_db, request_db, worker_db


def update_far_status(
    schedule: Schedule, assignments: List[Assignment]
) -> None:
    workers = worker_db.get_workers(schedule.team_id)
    fixed_assignments = fixed_assignment_db.get_fixed_assignments_by_dates(
        schedule.start_date, schedule.end_date, workers
    )
    requests = request_db.get_requests_by_dates(
        schedule.start_date, schedule.end_date, workers
    )
    for fa in fixed_assignments:
        assignment = next(
            (
                a
                for a in assignments
                if a.worker_id == fa.worker_id
                and a.date == fa.date
                and a.shift_id == fa.shift_id
            ),
            None,
        )
        if assignment is None:
            fa.status = "rejected"
        else:
            fa.status = "approved"
        fixed_assignment_db.update_fixed_assignment(fa)
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
