from datetime import datetime, timezone

from shared.schemas import Schedule, SolveDetails, SolveDetailsStatus

from scripts.setup_database import schedule_db
from task_queue_service import submit_solve_problem_task


def solve_schedule(schedule_id: str) -> Schedule:
    schedule = schedule_db.get_schedule_by_id(schedule_id)
    task_id = submit_solve_problem_task(schedule)
    schedule.solve_details = SolveDetails(
        task_id=task_id,
        status=SolveDetailsStatus.PENDING,
        updated_at=datetime.now(tz=timezone.utc),
        result=None,
    )
    schedule = schedule_db.update_schedule(schedule)
    return schedule
