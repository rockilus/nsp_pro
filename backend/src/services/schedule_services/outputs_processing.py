from datetime import timedelta
from typing import List

from core import Assignment, Request
from scripts.setup_database import request_db


def update_request_status(
    assignments: List[Assignment], requests: List[Request]
) -> List[Request]:
    updated_requests = []
    for r in requests:
        dates = [
            r.start_date + timedelta(days=i)
            for i in range((r.end_date - r.start_date).days + 1)
        ]
        a_filtered = [
            a
            for a in assignments
            if a.worker_id == r.worker_id
            and a.date in dates
            and a.shift_id == r.shift_id
        ]
        if len(a_filtered) < len(dates):
            r.status = "rejected"
        else:
            r.status = "approved"
        updated_requests.append(r)
    return request_db.update_requests(updated_requests)
