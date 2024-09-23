from typing import List

from core import Request, RequestAugmented, Worker
from scripts.setup_database import request_db, worker_db
from services.request_services.r_to_r_augmented import r_to_r_augmented


# pylint: disable=R0801
def update_request(r_data: Request) -> RequestAugmented:
    new_request = request_db.update_request(r_data)
    worker = worker_db.get_worker_by_id(new_request.worker_id)
    return r_to_r_augmented(new_request, worker)


def update_requests(
    requests: List[Request], workers: List[Worker]
) -> List[RequestAugmented]:
    updated_requests = request_db.update_requests(requests)
    out = []
    for r in updated_requests:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        out.append(r_to_r_augmented(r, worker))
    return out
