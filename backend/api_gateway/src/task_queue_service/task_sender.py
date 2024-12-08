from celery import chain, signature  # type: ignore
from shared.schemas import EngineInputs

from task_queue_service.celery_app import celery_app


@celery_app.task(name="api_gateway.trigger_workflow")
def submit_solve_problem_task(engine_inputs: EngineInputs) -> str:
    data = engine_inputs.to_dict()
    task_chain = chain(
        signature(
            "processing_engine.solve_problem",
            args=[data],
            # queue="processing_queue",
        ),
        signature("storage_service.save_engine_outputs"),
        # queue="storage_queue",
    )
    result = task_chain.apply_async()
    print(f"Task submitted: {result.id}")
    return result.id
