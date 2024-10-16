from datetime import date
from typing import List

from core import Request, RequestAugmented, Shift, Worker
from scripts.setup_database import request_db, shift_db, worker_db
from services.request_services.r_to_r_augmented import r_to_r_augmented


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
