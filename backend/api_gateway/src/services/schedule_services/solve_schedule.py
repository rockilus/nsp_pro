from datetime import datetime, timedelta, timezone

from celery.result import AsyncResult  # type: ignore
from shared.schemas import Schedule, SolveDetails, SolveDetailsStatus

from scripts.setup_database import schedule_db
from task_queue_service import submit_solve_problem_task
from task_queue_service.celery_app import celery_app

EXPIRATION_TIME = timedelta(minutes=2)


def solve_schedule(schedule_id: str) -> Schedule:
    schedule = schedule_db.get_schedule_by_id(schedule_id)
    if schedule.solve_details and schedule.solve_details.status in [
        SolveDetailsStatus.PENDING,
        SolveDetailsStatus.STARTED,
        SolveDetailsStatus.RETRY,
    ]:
        async_result = AsyncResult(schedule.solve_details.task_id, app=celery_app)
        # test_status = async_result.status
        # test_task_id = schedule.solve_details.task_id

        try:
            string = f"Task {schedule.solve_details.task_id} is {async_result.status}"
            print(string)
            if not async_result.ready():
                if (
                    datetime.now(tz=timezone.utc) - schedule.solve_details.updated_at
                    > EXPIRATION_TIME
                ):
                    async_result.revoke()
                    # schedule.solve_details.status = SolveDetailsStatus.FAILURE
                    # schedule.solve_details.updated_at = datetime.now(
                    #     tz=timezone.utc
                    # )
                    # schedule = schedule_db.update_schedule(schedule)
                else:
                    raise ValueError(f"Schedule is already being solved: {string}")
        except Exception as e:
            print(e)
            raise ValueError(
                f"Error with task {schedule.solve_details.task_id} and "
                + "async_result:",
                e,
            ) from e
    task_id = submit_solve_problem_task(schedule)
    schedule.solve_details = SolveDetails(
        task_id=task_id,
        status=SolveDetailsStatus.PENDING,
        updated_at=datetime.now(tz=timezone.utc),
        result=None,
    )
    schedule = schedule_db.update_schedule(schedule)
    return schedule
