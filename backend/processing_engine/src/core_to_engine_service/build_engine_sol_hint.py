from typing import Dict, List, Tuple

from core_to_engine_service.types import WorkerDates

from shared.schemas import Assignment


def core_to_engine_sol_hint(
    worker_not_deleted_ids: List[str],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shift_not_deleted_ids: List[str],
    assignments: List[Assignment],
) -> Dict[Tuple[str, str, str], int]:
    out = {
        (w, d.isoformat(), s): 0
        for w in worker_not_deleted_ids
        for d in worker_ids_to_worker_dates[w].dates_campaign
        for s in shift_not_deleted_ids
    }
    for a in assignments:
        a_in_domain = (
            a.worker_id in worker_not_deleted_ids
            and a.date in worker_ids_to_worker_dates[a.worker_id].dates_campaign
            and a.shift_id in shift_not_deleted_ids
        )
        if a_in_domain:
            out[
                a.worker_id,
                a.date.isoformat(),
                a.shift_id,
            ] = 1
    return out
