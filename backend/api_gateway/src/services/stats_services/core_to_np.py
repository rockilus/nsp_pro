from datetime import date
from typing import Dict, List

import numpy as np

from shared.schemas import Assignment


def core_to_np_assignments_binary(
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    assignments: List[Assignment],
) -> np.ndarray:
    a_array = np.zeros(
        (
            len(worker_to_i),
            len(date_to_i),
            len(shift_to_i),
        ),
        dtype=int,
    )
    for assignment in assignments:
        if assignment.shift_id not in shift_to_i:
            continue
        a_array[
            worker_to_i[assignment.worker_id],
            date_to_i[assignment.date],
            shift_to_i[assignment.shift_id],
        ] = 1
    return a_array


def core_to_np_assignments_worked_time(
    worker_to_i: Dict[str, int],
    date_to_i: Dict[date, int],
    shift_to_i: Dict[str, int],
    work_shift_to_duration: Dict[str, float],
    assignments: List[Assignment],
) -> np.ndarray:
    a_array = np.zeros(
        (
            len(worker_to_i),
            len(date_to_i),
            len(shift_to_i),
        ),
        dtype=float,
    )
    for assignment in assignments:
        if assignment.shift_id not in shift_to_i:
            continue
        a_array[
            worker_to_i[assignment.worker_id],
            date_to_i[assignment.date],
            shift_to_i[assignment.shift_id],
        ] = work_shift_to_duration[assignment.shift_id]
    return a_array
