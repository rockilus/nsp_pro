from datetime import date
from typing import Dict, List

from core import Shift, ShiftDemandDate, Worker
from core_to_engine_service.types import WorkerDates
from engine import ShiftDemand as NewShiftDemandEngine


def build_engine_shift_demands(
    workers_not_deleted: List[Worker],
    dates_campaing: List[date],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts_not_deleted: List[Shift],
    shift_demands: List[ShiftDemandDate],
) -> List[NewShiftDemandEngine]:
    out: List[NewShiftDemandEngine] = []
    for shift_demand in shift_demands:
        if shift_demand.date not in dates_campaing:
            continue
        shift = next(
            (s for s in shifts_not_deleted if s.id == shift_demand.shift_id),
            None,
        )
        if shift is None:
            continue
        for staffing in shift.staffing:
            specialty_id = staffing.specialty_id
            target_staffing = staffing.staffing * shift_demand.nb_times_shift

            # No specialty required (any worker can be assigned)
            if specialty_id is None:
                out.append(
                    NewShiftDemandEngine(
                        assignments=[
                            (w.id, shift_demand.date.isoformat(), shift.id)
                            for w in workers_not_deleted
                            if shift_demand.date
                            in worker_ids_to_worker_dates[w.id].dates_campaign
                        ],
                        assignments_specialty=[],
                        target=target_staffing,
                    )
                )
                continue
            # Workers qualified for this specialty
            qualified_workers = [
                w for w in workers_not_deleted if specialty_id in w.specialty_ids
            ]
            out.append(
                NewShiftDemandEngine(
                    assignments=[],
                    assignments_specialty=[
                        (
                            w.id,
                            shift_demand.date.isoformat(),
                            shift.id,
                            specialty_id,
                        )
                        for w in qualified_workers
                        if shift_demand.date
                        in worker_ids_to_worker_dates[w.id].dates_campaign
                    ],
                    target=target_staffing,
                )
            )
    return out
