from datetime import date
from typing import List

from shared.schemas import Request, Shift, Worker

from db_operations.setup_database import request_db


def get_requests_by_dates(
    start_date: date,
    end_date: date,
    workers: List[Worker],
    shifts: List[Shift],
) -> List[Request]:
    requests = request_db.get_requests_by_dates(start_date, end_date, workers)
    out = []
    for r in requests:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        shift = next((s for s in shifts if s.id == r.shift_id), None)
        if not worker or not shift:
            active = False
        else:
            active = (
                (not worker.deleted)
                and (worker.employment_start_date <= r.start_date)
                and (
                    worker.employment_end_date >= r.end_date
                    if worker.employment_end_date
                    else True
                )
                and (not shift.deleted if shift else False)
            )
        if active:
            out.append(r)
    return out
