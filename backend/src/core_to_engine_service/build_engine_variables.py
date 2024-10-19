from datetime import date, timedelta
from typing import Dict, List, Tuple

from core import Shift, Worker
from engine import Variables as VariablesEngine
from utils.constants import Constants


def build_engine_variables(
    workers: List[Worker],
    dates_all: List[date],
    shifts: List[Shift],
    shift_id_to_duration_dict: Dict[str, int],
) -> VariablesEngine:
    assignment_vars: List[Tuple[str, str, str]] = []
    shift_interval_vars: List[Tuple[int, int, int, Tuple[str, str, str]]] = []
    for w in workers:
        for d in dates_all:
            for s in shifts:
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
                        s.end_time.replace(year=d.year, month=d.month, day=d.day)
                        + timedelta(day_diff)
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
