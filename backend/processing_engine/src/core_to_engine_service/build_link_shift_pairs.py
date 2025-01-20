from typing import Dict, List, Tuple

from shared.schemas import LinkShift, Shift, Worker, WorkerDates


def build_link_shift_pairs(
    workers_not_deleted: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts_not_deleted: List[Shift],
    link_shifts: List[LinkShift],
) -> List[Tuple[Tuple[str, str, str], Tuple[str, str, str]]]:
    out: List[Tuple[Tuple[str, str, str], Tuple[str, str, str]]] = []
    for ls in link_shifts:
        ls_shifts_ok = True
        for shift_id in ls.shift_ids:
            if not any(s.id == shift_id for s in shifts_not_deleted):
                ls_shifts_ok = False
                break
        if not ls_shifts_ok:
            continue
        out.extend(
            [
                (
                    (w.id, d.isoformat(), ls.shift_ids[0]),
                    (w.id, d.isoformat(), ls.shift_ids[1]),
                )
                for w in workers_not_deleted
                for d in worker_ids_to_worker_dates[w.id].dates_campaign
            ]
        )
    return out
