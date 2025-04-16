from typing import List

from shared.schemas.core import Breach, Schedule, ScheduleSolveStatus


def update_schedule_status(
    schedule: Schedule, is_solution: bool, breaches: List[Breach]
) -> Schedule:
    if is_solution:
        if len(breaches) == 0:
            schedule.solve_status = ScheduleSolveStatus.SOLVED
        else:
            if any(b.hard_to_soft for b in breaches):
                schedule.solve_status = ScheduleSolveStatus.HARD_BREACHED
            else:
                schedule.solve_status = ScheduleSolveStatus.SOFT_BREACHED
    else:
        schedule.solve_status = ScheduleSolveStatus.NO_SOLUTION
    return schedule
