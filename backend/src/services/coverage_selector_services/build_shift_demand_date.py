from datetime import date, timedelta
from typing import Dict, List, Tuple

from core import (
    CoverageSelector,
    Schedule,
    Shift,
    ShiftDemand,
    ShiftDemandDate,
    ShiftType,
    Worker,
)


# pylint: disable=too-many-locals
def build_shift_demand_dates(
    schedule: Schedule,
    coverage_selectors: List[CoverageSelector],
    shift_demands: List[ShiftDemand],
    workers: List[Worker],
    shifts: List[Shift],
) -> List[ShiftDemandDate]:
    work_shifts = [
        s for s in shifts if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
    ]
    dates = [
        schedule.start_date + timedelta(days=i)
        for i in range((schedule.end_date - schedule.start_date).days + 1)
    ]
    sd_dict: Dict[Tuple[date, str], List[ShiftDemand]] = {
        (d, s.id): [] for d in dates for s in work_shifts
    }

    cov_to_sds: Dict[str, List[ShiftDemand]] = {}
    for sd in shift_demands:
        if sd.coverage_id not in cov_to_sds:
            cov_to_sds[sd.coverage_id] = []
        cov_to_sds[sd.coverage_id].append(sd)

    for cs in coverage_selectors:
        start_date = schedule.start_date if cs.full_period else cs.start_date
        end_date = schedule.end_date if cs.full_period else cs.end_date
        i_to_sds: Dict[int, List[ShiftDemand]] = {}
        for sd in cov_to_sds.get(cs.coverage_id, []):
            if sd.day_index not in i_to_sds:
                i_to_sds[sd.day_index] = []
            i_to_sds[sd.day_index].append(sd)
        for day in range((end_date - start_date).days + 1):
            current_date = start_date + timedelta(days=day)
            current_date_index = current_date.weekday()
            sds = i_to_sds.get(current_date_index, [])
            for sd in sds:
                sd_dict[(current_date, sd.shift_id)].append(sd)

    out = []
    for s in work_shifts:
        for staffing in s.staffing:
            worker_specialized = (
                [
                    w
                    for w in workers
                    if staffing.specialty_id in w.specialty_ids and not w.deleted
                ]
                if staffing.specialty_id
                else [w for w in workers if not w.deleted]
            )
            for cur_date in dates:
                sds = sd_dict[(cur_date, s.id)]
                out.append(
                    ShiftDemandDate(
                        worker_ids=[w.id for w in worker_specialized],
                        date=cur_date,
                        shift_id=s.id,
                        staffing=staffing.staffing * len(sds),
                    )
                )
    return out
