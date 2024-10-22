from datetime import date, timedelta
from typing import Dict, List, Tuple

from core import (
    CoverageSelector,
    DailyShiftDemand,
    DSDSourceType,
    Schedule,
    Shift,
    ShiftDemand,
)


# pylint: disable=too-many-locals
def build_daily_shift_demands(
    schedule: Schedule,
    coverage_selectors: List[CoverageSelector],
    shift_demands: List[ShiftDemand],
    shifts_work_not_deleted: List[Shift],
) -> List[DailyShiftDemand]:
    dates = [
        schedule.start_date + timedelta(days=i)
        for i in range((schedule.end_date - schedule.start_date).days + 1)
    ]
    sd_dict: Dict[Tuple[date, str], List[ShiftDemand]] = {
        (d, s.id): [] for d in dates for s in shifts_work_not_deleted
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
    for s in shifts_work_not_deleted:
        for cur_date in dates:
            sds = sd_dict[(cur_date, s.id)]
            out.extend(
                [
                    DailyShiftDemand(
                        id="",
                        team_id=schedule.team_id,
                        schedule_id=schedule.id,
                        shift_demand_id=sd.id,
                        source_type=DSDSourceType.SHIFT_DEMAND,
                        date=cur_date,
                        shift_id=s.id,
                        count=1,
                    )
                    for sd in sds
                ]
            )
    return out
