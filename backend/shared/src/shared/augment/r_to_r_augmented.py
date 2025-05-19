from shared.schemas.core import Request, RequestAugmented, Shift, Worker


def r_to_r_augmented(
    request: Request, worker: Worker | None, shift: Shift | None
) -> RequestAugmented:
    active = (not worker.deleted if worker else False) and (
        not shift.deleted if shift else False
    )
    return RequestAugmented(
        id=request.id,
        team_id=request.team_id,
        request_type=request.request_type,
        worker_id=request.worker_id,
        start_date=request.start_date,
        end_date=request.end_date,
        shift_id=request.shift_id,
        negative=request.negative,
        hard=request.hard,
        status=request.status,
        fulfillment=request.fulfillment,
        comment=request.comment,
        created_at=request.created_at,
        active=active,
    )
