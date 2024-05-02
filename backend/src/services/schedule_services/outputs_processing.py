from typing import List

from core import Assignment, Request
from scripts.setup_database import request_db


def update_request_status(
    assignments: List[Assignment], requests: List[Request]
) -> None:
    updated_requests = []
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
        updated_requests.append(r)
    request_db.update_requests(updated_requests)
