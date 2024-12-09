from datetime import timedelta
from typing import Dict, List

from shared.schemas import Request, WorkerDates

from engine import Request as RequestEngine


def build_engine_requests(
    worker_not_deleted_ids: List[str],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shift_not_deleted_ids: List[str],
    requests: List[Request],
) -> List[RequestEngine]:
    out = []
    for r in requests:
        dates_request = [
            r.start_date + timedelta(days=x)
            for x in range((r.end_date - r.start_date).days + 1)
        ]
        worker_ok = r.worker_id in worker_not_deleted_ids
        dates_ok = any(
            d in worker_ids_to_worker_dates[r.worker_id].dates_campaign
            for d in dates_request
        )
        shift_ok = r.shift_id in shift_not_deleted_ids
        if not worker_ok or not dates_ok or not shift_ok:
            continue
        out.append(
            RequestEngine(
                id=r.id,
                assignments=[
                    (r.worker_id, d.isoformat(), r.shift_id)
                    for d in dates_request
                    if d in worker_ids_to_worker_dates[r.worker_id].dates_campaign
                ],
                negative=r.negative,
                hard=r.hard,
            )
        )
    return out
