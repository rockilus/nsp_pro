from datetime import timedelta

from celery import chain, signature  # type: ignore
from shared.schemas import Schedule

from task_queue_service.celery_app import celery_app

EXPIRATION_TIME = timedelta(seconds=45)


@celery_app.task(name="api_gateway.trigger_workflow")
def submit_solve_problem_task(schedule: Schedule) -> str:
    data = {"schedule": schedule.to_dict()}
    task_chain = chain(
        signature("data_fetcher.get_engine_inputs", args=[data]),
        signature("processing_engine.solve_problem"),
        signature("storage_service.save_engine_outputs"),
    )
    result = task_chain.apply_async(expires=EXPIRATION_TIME.total_seconds())
    print(f"Task submitted: {result.id}")
    return result.id
