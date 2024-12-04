from typing import List

from shared.schemas import Request, RequestAugmented, Shift, Worker

from scripts.setup_database import request_db, shift_db, worker_db
from services.request_services.r_to_r_augmented import r_to_r_augmented


# pylint: disable=R0801
def update_request(r_data: Request) -> RequestAugmented:
    new_request = request_db.update_request(r_data)
    worker = worker_db.get_worker_by_id(new_request.worker_id)
    shift = shift_db.get_shift_by_id(new_request.shift_id)
    return r_to_r_augmented(new_request, worker, shift)


def update_requests(
    requests: List[Request], workers: List[Worker], shifts: List[Shift]
) -> List[RequestAugmented]:
    updated_requests = request_db.update_requests(requests)
    out = []
    for r in updated_requests:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        shift = next((s for s in shifts if s.id == r.shift_id), None)
        out.append(r_to_r_augmented(r, worker, shift))
    return out
