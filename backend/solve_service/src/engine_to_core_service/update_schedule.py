from typing import List

from shared.schemas.core import Breach
from shared.schemas.core.solve_task_status import ScheduleSolveStatus


def get_schedule_status(
    is_solution: bool, breaches: List[Breach]
) -> ScheduleSolveStatus:
    if is_solution:
        if len(breaches) == 0:
            return ScheduleSolveStatus.SOLVED_NO_BREACH
        if any(b.hard_to_soft for b in breaches):
            return ScheduleSolveStatus.SOLVED_HARD_BREACHED
        return ScheduleSolveStatus.SOLVED_SOFT_BREACHED
    return ScheduleSolveStatus.NO_SOLUTION
