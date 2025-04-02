from datetime import timedelta

from celery import signature  # type: ignore
from shared.schemas import Schedule

from src.task_queue_service.celery_app import celery_app
from src.utils.env_config import TASK_EXIPRATION


@celery_app.task(name="api_gateway.trigger_workflow")
def submit_solve_problem_task(schedule: Schedule) -> str:
    data = {"schedule": schedule.to_dict()}
    task = signature("solve_service.solve_campaign", args=[data])
    result = task.apply_async(
        expires=timedelta(seconds=TASK_EXIPRATION).total_seconds()
    )
    print(f"Task submitted: {result.id}")
    return result.id
