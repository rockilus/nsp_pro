from shared.schemas import EngineInputs

from task_queue_service.celery_app import celery_app


def submit_solve_problem_task(engine_inputs: EngineInputs) -> str:
    data = engine_inputs.to_dict()
    task = celery_app.send_task(
        "processing_engine.solve_problem",
        args=[data],
    )
    print(f"Task submitted: {task.id}")
    return task.id
