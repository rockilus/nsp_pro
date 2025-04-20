from typing import Dict, List, Tuple

from shared.schemas.core import (
    Assignment,
    DailyShiftDemand,
    Request,
    Shift,
    ShiftLeaveType,
    ShiftType,
    Worker,
    WorkerDates,
)


# pylint: disable=too-many-arguments, R0801
def core_to_engine_fixed_values(
    workers: List[Worker],
    workers_not_deleted: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    daily_shift_demands: List[DailyShiftDemand],
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
    # Normal and duty shifts without daily shift demands
    for w in workers_not_deleted:
        for d in worker_ids_to_worker_dates[w.id].dates_campaign:
            shifts_in_dsds = [
                dsd.shift_id for dsd in daily_shift_demands if dsd.date == d
            ]
            for s in [
                s
                for s in shifts
                if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
                and s.id not in shifts_in_dsds
                and s.deleted is False
            ]:
                if (w.id, d.isoformat(), s.id) not in out:
                    out[w.id, d.isoformat(), s.id] = 0
    return out
