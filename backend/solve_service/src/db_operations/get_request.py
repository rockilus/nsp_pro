from datetime import date
from typing import List, Tuple

from shared.augment import r_to_r_augmented
from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    Attribute,
    Dimension,
    DimEntry,
    Request,
    RequestAugmented,
    Shift,
    Worker,
)


# pylint: disable=too-many-arguments, too-many-positional-arguments
def get_requests_by_dates(
    start_date: date,
    end_date: date,
    workers: List[Worker],
    shifts: List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
    collections: DatabaseCollections,
) -> Tuple[List[RequestAugmented], List[Request]]:
    requests_work = collections.request_db.get_approved_work_demand_requests_by_dates(
        start_date, end_date, [w.id for w in workers]
    )
    r_work_augmented: List[RequestAugmented] = []
    for r in requests_work:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        r_augmented = r_to_r_augmented(
            request=r,
            worker=worker,
            shifts=shifts,
            dimensions=dimensions,
            dim_entries=dim_entries,
            attributes=attributes,
        )
        if r_augmented.active:
            r_work_augmented.append(r_augmented)
    requests_leave = (
        collections.request_db.get_approved_fulfilled_leave_requests_by_dates(
            start_date=start_date,
            end_date=end_date,
            worker_ids=[w.id for w in workers],
        )
    )
    return r_work_augmented, requests_leave


# def update_requests(
#     requests: List[Request],
#     workers: List[Worker],
#     shifts: List[Shift],
#     collections: DatabaseCollections,
# ) -> List[RequestAugmented]:
#     updated_requests = collections.request_db.update_requests(requests)
#     out: List[RequestAugmented] = []
#     for r in updated_requests:
#         worker = next((w for w in workers if w.id == r.worker_id), None)
#         shift = next((s for s in shifts if s.id == r.shift_id), None)
#         out.append(r_to_r_augmented(r, worker, shift))
#     return out
