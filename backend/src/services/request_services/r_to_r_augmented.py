from core import Request, RequestAugmented, Worker


def r_to_r_augmented(request: Request, worker: Worker | None) -> RequestAugmented:
    active = not worker.deleted if worker else False
    return RequestAugmented(
        id=request.id,
        worker_id=request.worker_id,
        start_date=request.start_date,
        end_date=request.end_date,
        shift_id=request.shift_id,
        hard=request.hard,
        status=request.status,
        active=active,
    )
