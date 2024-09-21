from datetime import date
from typing import List

from core import Request, RequestAugmented, Worker
from scripts.setup_database import request_db, worker_db
from services.request_services.r_to_r_augmented import r_to_r_augmented


def get_requests(team_id: str) -> List[RequestAugmented]:
    workers = worker_db.get_workers(team_id)
    requests = request_db.get_requests(workers)
    rs_augmented = []
    for r in requests:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        rs_augmented.append(r_to_r_augmented(r, worker))
    return rs_augmented


def get_requests_by_workers(workers: List[Worker]) -> List[RequestAugmented]:
    requests = request_db.get_requests(workers)
    rs_augmented = []
    for r in requests:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        rs_augmented.append(r_to_r_augmented(r, worker))
    return rs_augmented


def get_requests_by_dates(
    start_date: date, end_date: date, workers: List[Worker]
) -> List[Request]:
    requests = request_db.get_requests_by_dates(start_date, end_date, workers)
    out = []
    for r in requests:
        worker = next((w for w in workers if w.id == r.worker_id), None)
        active = not worker.deleted if worker else False
        if active:
            out.append(r)
    return out
