from datetime import timedelta

from celery import signature  # type: ignore
from shared.schemas.core import Schedule

from src.celery_tasks.celery_app import celery_app
from src.config import config


@celery_app.task(name="api_gateway.trigger_workflow")
def submit_solve_problem_task(schedule: Schedule) -> str:
    data = {"schedule": schedule.to_dict()}
    task = signature("solve_service.solve_campaign", args=[data])
    result = task.apply_async(
        expires=timedelta(seconds=config.task_expiration).total_seconds()
    )
    print(f"Task submitted: {result.id}")
    return result.id
