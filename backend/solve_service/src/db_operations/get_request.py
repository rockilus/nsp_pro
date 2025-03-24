from datetime import date
from typing import List

from shared.augment import r_to_r_augmented
from shared.database.database_collections import DatabaseCollections
from shared.schemas import Request, RequestAugmented, Shift, Worker


def get_requests_by_dates(
    start_date: date,
    end_date: date,
    workers: List[Worker],
    shifts: List[Shift],
    collections: DatabaseCollections,
) -> List[Request]:
    requests = collections.request_db.get_requests_by_dates(
        start_date, end_date, [w.id for w in workers]
    )
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


def update_requests(
    requests: List[Request],
    workers: List[Worker],
    shifts: List[Shift],
    collections: DatabaseCollections,
) -> List[RequestAugmented]:
    updated_requests = collections.request_db.update_requests(requests)
    out = []
    for r in updated_requests:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        shift = next((s for s in shifts if s.id == r.shift_id), None)
        out.append(r_to_r_augmented(r, worker, shift))
    return out
