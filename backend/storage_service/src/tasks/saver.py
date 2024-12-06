from shared.schemas import EngineInputs
from solve_service.solve_schedule import solve_schedule

from app import celery_app
from tasks.sender import submit_store_engine_outputs


@celery_app.task(name="storage_service.store_engine_outputs")
def save_engine_outputs(data: dict) -> dict:
    engine_inputs = EngineInputs.from_dict(data)
    engine_outputs = solve_schedule(engine_inputs)
    print(f"Task completed: {engine_outputs}")
    task_id = submit_store_engine_outputs(engine_outputs)
    return task_id
