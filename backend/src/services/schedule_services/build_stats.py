from datetime import date
from typing import Dict, List, Tuple

import numpy as np
from core.schedule import Assignment, Stats


def build_stats(
    workers: List[str],
    start_date: date,
    end_date: date,
    shifts: List[str],
    assignments: List[Assignment],
) -> Stats:
    stats = assignments_to_np(
        workers, start_date, end_date, shifts, assignments
    )
    return Stats(number=10)


def assignments_to_np(
    workers: List[str],
    start_date: date,
    end_date: date,
    shifts: List[str],
    assignments: List[Assignment],
) -> np.ndarray:
    num_workers = len(workers)
    num_dates = (end_date - start_date).days + 1
    num_shifts = len(shifts)
    schedule_array = np.zeros(
        (len(workers), (end_date - start_date).days + 1, len(shifts)),
        dtype=int,
    )
    for assignment in assignments:
        worker_index = workers.index(assignment.worker_id)
        date_index = (assignment.date - start_date).days
        shift_index = shifts.index(assignment.shift_id)

        schedule_array[
            workers.index(assignment.worker_id),
            (assignment.date - start_date).days,
            shifts.index(assignment.shift_id),
        ] = 1

    return schedule_array
