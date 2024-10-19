from datetime import date
from typing import Dict, List, Tuple

from core import Assignment, Request, Shift, ShiftLeaveType, Worker


# pylint: disable=too-many-arguments, R0801
def core_to_engine_fixed_values(
    workers: List[Worker],
    days_not_solving: List[str],
    days_solving: List[str],
    shifts: List[Shift],
    assignments: List[Assignment],
    requests: List[Request],
) -> Dict[Tuple[str, str, str], int]:
    # Assignments before solving period
    out = {
        (w.id, d, s.id): 0 for w in workers for d in days_not_solving for s in shifts
    }
    for a in assignments:
        out[
            a.worker_id,
            a.date.isoformat(),
            a.shift_id,
        ] = 1
    # Assignments during solving period
    # Deleted workers and shifts
    for w in [w for w in workers if w.deleted]:
        for d in days_solving:
            for s in shifts:
                out[w.id, d, s.id] = 0
    for w in workers:
        for d in days_solving:
            for s in [s for s in shifts if s.deleted]:
                out[w.id, d, s.id] = 0
    # Leave shifts not requested:
    for w in [w for w in workers if not w.deleted]:
        for d in days_solving:
            for s in [s for s in shifts if s.leave_type != ShiftLeaveType.NONE]:
                d_date = date.fromisoformat(d)
                request = [
                    r
                    for r in requests
                    if r.worker_id == w.id
                    and r.shift_id == s.id
                    and r.start_date <= d_date <= r.end_date
                ]
                if not request:
                    out[w.id, d, s.id] = 0

    return out
