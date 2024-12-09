from typing import Dict, List, Tuple

from shared.schemas import (
    Assignment,
    Request,
    Shift,
    ShiftLeaveType,
    Worker,
    WorkerDates,
)


# pylint: disable=too-many-arguments, R0801
def core_to_engine_fixed_values(
    workers: List[Worker],
    workers_not_deleted: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    assignments: List[Assignment],
    requests: List[Request],
) -> Dict[Tuple[str, str, str], int]:
    # Assignments before campaign
    out = {
        (w.id, d.isoformat(), s.id): 0
        for w in workers
        for d in worker_ids_to_worker_dates[w.id].dates_hist
        for s in shifts
    }
    for a in assignments:
        out[
            a.worker_id,
            a.date.isoformat(),
            a.shift_id,
        ] = 1
    # Leave shifts not requested:
    for w in workers_not_deleted:
        for d in worker_ids_to_worker_dates[w.id].dates_campaign:
            for s in [s for s in shifts if s.leave_type != ShiftLeaveType.NONE]:
                request = [
                    r
                    for r in requests
                    if r.worker_id == w.id
                    and r.shift_id == s.id
                    and r.start_date <= d <= r.end_date
                ]
                if not request:
                    out[w.id, d.isoformat(), s.id] = 0

    return out
