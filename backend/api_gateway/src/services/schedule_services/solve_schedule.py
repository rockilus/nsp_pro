from datetime import datetime, timezone

from celery.result import AsyncResult  # type: ignore
from shared.schemas import Schedule, SolveDetails, SolveDetailsStatus

from scripts.setup_database import schedule_db
from task_queue_service import submit_solve_problem_task
from task_queue_service.celery_app import celery_app


def solve_schedule(schedule_id: str) -> Schedule:
    schedule = schedule_db.get_schedule_by_id(schedule_id)
    if schedule.solve_details and schedule.solve_details.status in [
        SolveDetailsStatus.PENDING,
        SolveDetailsStatus.STARTED,
        SolveDetailsStatus.RETRY,
    ]:
        async_result = AsyncResult(schedule.solve_details.task_id, app=celery_app)
        if not async_result.ready():
            raise ValueError("Schedule is already being solved")
    task_id = submit_solve_problem_task(schedule)
    schedule.solve_details = SolveDetails(
        task_id=task_id,
        status=SolveDetailsStatus.PENDING,
        updated_at=datetime.now(tz=timezone.utc),
        result=None,
    )
    schedule = schedule_db.update_schedule(schedule)
    return schedule
