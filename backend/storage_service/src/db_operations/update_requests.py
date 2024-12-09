from typing import List

from db_operations.setup_database import request_db
from shared.augment import r_to_r_augmented
from shared.schemas import Request, RequestAugmented, Shift, Worker


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
