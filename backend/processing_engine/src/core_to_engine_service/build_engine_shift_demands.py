from datetime import date
from typing import Dict, List

from shared.schemas import DailyShiftDemand, Shift, Worker, WorkerDates

from engine import ShiftDemand as ShiftDemandEngine


# pylint: disable=too-many-locals
def build_engine_shift_demands(
    workers_not_deleted: List[Worker],
    dates_campaing: List[date],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts_not_deleted: List[Shift],
    daily_shift_demands: List[DailyShiftDemand],
) -> List[ShiftDemandEngine]:
    out: List[ShiftDemandEngine] = []
    for shift in shifts_not_deleted:
        dsds_shift = [
            dsd
            for dsd in daily_shift_demands
            if dsd.shift_id == shift.id and dsd.date in dates_campaing
        ]
        dates_dsds = list(set(dsd.date for dsd in dsds_shift))
        for d in dates_dsds:
            dsds_shift_date = [dsd for dsd in dsds_shift if dsd.date == d]
            total_count = sum(dsd.count for dsd in dsds_shift_date)
            for staffing in shift.staffing:
                specialty_id = staffing.specialty_id
                target_staffing = staffing.staffing * total_count

                # No specialty required (any worker can be assigned)
                if specialty_id is None:
                    out.append(
                        ShiftDemandEngine(
                            assignments=[
                                (w.id, d.isoformat(), shift.id)
                                for w in workers_not_deleted
                                if d in worker_ids_to_worker_dates[w.id].dates_campaign
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
                    ShiftDemandEngine(
                        assignments=[],
                        assignments_specialty=[
                            (
                                w.id,
                                d.isoformat(),
                                shift.id,
                                specialty_id,
                            )
                            for w in qualified_workers
                            if d in worker_ids_to_worker_dates[w.id].dates_campaign
                        ],
                        target=target_staffing,
                    )
                )
    return out
