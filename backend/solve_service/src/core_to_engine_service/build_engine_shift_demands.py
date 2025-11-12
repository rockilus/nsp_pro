from datetime import date
from typing import Dict, List, Tuple

from shared.schemas.core import (
    CoveragePenalty,
    Shift,
    ShiftDemandNew,
    ShiftType,
    Worker,
    WorkerDates,
)

from engine import ShiftDemand as ShiftDemandEngine


# pylint: disable=too-many-locals, too-many-arguments
def build_engine_shift_demands(
    workers_not_deleted: List[Worker],
    dates_campaign: List[date],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts_not_deleted: List[Shift],
    daily_shift_demands: List[ShiftDemandNew],
    c_penalty: CoveragePenalty,
) -> List[ShiftDemandEngine]:
    out: List[ShiftDemandEngine] = []
    seen_pair = set()
    for shift_demand in daily_shift_demands:
        pair = (shift_demand.date.isoformat(), shift_demand.shift_id)
        if pair in seen_pair:
            continue
        if shift_demand.date not in dates_campaign:
            continue
        shift = next(
            (s for s in shifts_not_deleted if s.id == shift_demand.shift_id),
            None,
        )
        if shift is None:
            continue
        seen_pair.add(pair)
        assignments: List[Tuple[str, str, str]] = []
        assignments_specialty: List[List[Tuple[str, str, str, str]]] = []
        target: int = 0
        target_specialty: List[int] = []
        for staffing in shift.staffing:
            specialty_id = staffing.specialty_id
            target_staffing = staffing.staffing * shift_demand.count

            assignments += [
                (w.id, shift_demand.date.isoformat(), shift.id)
                for w in workers_not_deleted
                if shift_demand.date in worker_ids_to_worker_dates[w.id].dates_campaign
            ]
            target += target_staffing
            if specialty_id is None:
                continue
            workers_qualified = [
                w for w in workers_not_deleted if specialty_id in w.specialty_ids
            ]
            assignments_specialty.append(
                [
                    (
                        w.id,
                        shift_demand.date.isoformat(),
                        shift.id,
                        specialty_id,
                    )
                    for w in workers_qualified
                    if shift_demand.date
                    in worker_ids_to_worker_dates[w.id].dates_campaign
                ]
            )
            target_specialty.append(target_staffing)
        out.append(
            ShiftDemandEngine(
                id=shift_demand.id if shift_demand.id else "",
                assignments=list(set(assignments)),
                assignments_specialties=assignments_specialty,
                target=target,
                target_specialties=target_specialty,
                penalty=(
                    c_penalty.duty
                    if shift.shift_type == ShiftType.DUTY
                    else c_penalty.normal
                ),
            )
        )
    return out
