from datetime import date
from typing import Dict, List, Tuple

from core import Assignment


def core_to_engine_sol_hint(
    workers_not_deleted: List[str],
    dates_campaign: List[date],
    dates_campaign_str: List[str],
    shifts_not_deleted: List[str],
    assignments: List[Assignment],
) -> Dict[Tuple[str, str, str], int]:
    out = {
        (w, d, s): 0
        for w in workers_not_deleted
        for d in dates_campaign_str
        for s in shifts_not_deleted
    }
    for a in assignments:
        a_in_domain = (
            a.worker_id in workers_not_deleted
            and a.date in dates_campaign
            and a.shift_id in shifts_not_deleted
        )
        if a_in_domain:
            out[
                a.worker_id,
                a.date.isoformat(),
                a.shift_id,
            ] = 1
    return out
