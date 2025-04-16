from datetime import date
from typing import Dict, List, Tuple

from shared.schemas.core import (
    DailyShiftDemand,
    LinkShift,
    Shift,
    Worker,
    WorkerDates,
)


# pylint: disable=too-many-arguments
def build_link_shift_pairs(
    workers_not_deleted: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts_not_deleted: List[Shift],
    link_shifts: List[LinkShift],
    daily_shift_demands: List[DailyShiftDemand],
    penalty: int,
) -> List[Tuple[Tuple[str, str, str], Tuple[str, str, str], str, int]]:
    out: List[Tuple[Tuple[str, str, str], Tuple[str, str, str], str, int]] = []

    shift_demand_dates: Dict[str, List[date]] = {}
    for demand in daily_shift_demands:
        if demand.shift_id not in shift_demand_dates:
            shift_demand_dates[demand.shift_id] = []
        shift_demand_dates[demand.shift_id].append(demand.date)

    for ls in link_shifts:
        ls_shifts_ok = True
        for shift_id in ls.shift_ids:
            if not any(s.id == shift_id for s in shifts_not_deleted):
                ls_shifts_ok = False
                break
            if shift_id not in shift_demand_dates:
                ls_shifts_ok = False
                break
        if not ls_shifts_ok:
            continue
        out.extend(
            [
                (
                    (w.id, d.isoformat(), ls.shift_ids[0]),
                    (w.id, d.isoformat(), ls.shift_ids[1]),
                    ls.id,
                    penalty,
                )
                for w in workers_not_deleted
                for d in worker_ids_to_worker_dates[w.id].dates_campaign
                if d in shift_demand_dates[ls.shift_ids[0]]
                and d in shift_demand_dates[ls.shift_ids[1]]
            ]
        )
    return out
