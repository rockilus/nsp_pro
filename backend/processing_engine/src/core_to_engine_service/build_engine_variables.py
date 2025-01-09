from datetime import timedelta
from typing import Dict, List, Tuple

from shared.schemas import Shift, Worker, WorkerDates

from engine import Variables as VariablesEngine
from utils.constants import Constants


def build_engine_variables(
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    shifts_not_deleted: List[Shift],
    shift_id_to_duration_dict: Dict[str, int],
) -> VariablesEngine:
    assignment_vars: List[Tuple[str, str, str]] = []
    shift_interval_vars: List[Tuple[int, int, int, Tuple[str, str, str]]] = []
    for w in workers:
        for d in worker_ids_to_worker_dates[w.id].dates_hist:
            for s in shifts:
                assignment_vars.append((w.id, d.isoformat(), s.id))

        for d in worker_ids_to_worker_dates[w.id].dates_campaign:
            for s in shifts_not_deleted:
                if s.id == "67800f1abc89660c3ced3ec6":
                    print("Shift ID: ", s.id)
                assignment_vars.append((w.id, d.isoformat(), s.id))
                s_duration = shift_id_to_duration_dict[s.id]
                s_start_time = int(
                    s.start_time.replace(
                        year=d.year, month=d.month, day=d.day
                    ).timestamp()
                    // Constants.NUM_SECONDS_MINUTE
                )
                day_diff = (s.end_time.date() - s.start_time.date()).days
                s_end_time = int(
                    (
                        s.end_time.replace(
                            year=d.year, month=d.month, day=d.day
                        )
                        + timedelta(days=day_diff)
                    ).timestamp()
                    // Constants.NUM_SECONDS_MINUTE
                    - 1
                )
                shift_interval_vars.append(
                    (
                        s_start_time,
                        s_duration,
                        s_end_time,
                        (w.id, d.isoformat(), s.id),
                    )
                )
    return VariablesEngine(
        assignments=assignment_vars,
        shift_intervals=shift_interval_vars,
    )
