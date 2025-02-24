from datetime import date
from typing import Dict, List, Tuple

from shared.schemas import DailyShiftDemand, Shift, ShiftType, Worker, WorkerDates

from core_to_engine_service.penalties import penalties
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
            assignments: List[Tuple[str, str, str]] = []
            assignments_specialty: List[List[Tuple[str, str, str, str]]] = []
            target: int = 0
            target_specialty: List[int] = []
            for staffing in shift.staffing:
                specialty_id = staffing.specialty_id
                target_staffing = staffing.staffing * total_count

                assignments += [
                    (w.id, d.isoformat(), shift.id)
                    for w in workers_not_deleted
                    if d in worker_ids_to_worker_dates[w.id].dates_campaign
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
                            d.isoformat(),
                            shift.id,
                            specialty_id,
                        )
                        for w in workers_qualified
                        if d in worker_ids_to_worker_dates[w.id].dates_campaign
                    ]
                )
                target_specialty.append(target_staffing)
            out.append(
                ShiftDemandEngine(
                    assignments=list(set(assignments)),
                    assignments_specialties=assignments_specialty,
                    target=target,
                    target_specialties=target_specialty,
                    penalty=(
                        penalties.configuration_constraint.coverage.duty
                        if shift.shift_type == ShiftType.DUTY
                        else penalties.configuration_constraint.coverage.normal
                    ),
                )
            )
    return out
