from typing import List

from shared.augment.r_to_r_augmented import r_to_r_augmented
from shared.schemas import RequestAugmented, Worker

from scripts.setup_database import request_db, shift_db, worker_db


def get_requests(team_id: str) -> List[RequestAugmented]:
    workers = worker_db.get_workers(team_id)
    shifts = shift_db.get_shifts(team_id)
    requests = request_db.get_requests(workers)
    rs_augmented = []
    for r in requests:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        shift = next((s for s in shifts if s.id == r.shift_id), None)
        rs_augmented.append(r_to_r_augmented(r, worker, shift))
    return rs_augmented


def get_requests_by_workers(workers: List[Worker]) -> List[RequestAugmented]:
    shifts = shift_db.get_shifts(workers[0].team_id)
    requests = request_db.get_requests(workers)
    rs_augmented = []
    for r in requests:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        shift = next((s for s in shifts if s.id == r.shift_id), None)
        rs_augmented.append(r_to_r_augmented(r, worker, shift))
    return rs_augmented
