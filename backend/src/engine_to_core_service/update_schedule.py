from typing import List

from core import Breach, Schedule


def update_schedule_status(
    schedule: Schedule, is_solution: bool, breaches: List[Breach]
) -> Schedule:
    if is_solution:
        if len(breaches) == 0:
            schedule.solve_status = "Solved"
        else:
            if any(b.hard_to_soft for b in breaches):
                schedule.solve_status = "Hard breached"
            else:
                schedule.solve_status = "Soft breached"
    else:
        schedule.solve_status = "No solution"
    return schedule
