from shared.schemas import Schedule

from task_queue_service import submit_solve_problem_task


def solve_schedule(schedule: Schedule) -> str:
    task_id = submit_solve_problem_task(schedule)
    return task_id
