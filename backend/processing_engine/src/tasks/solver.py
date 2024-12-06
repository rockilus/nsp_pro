from typing import Dict

from shared.schemas import EngineInputs

from app import celery_app
from solve_service.solve_schedule import solve_schedule
from tasks.sender import submit_store_engine_outputs


@celery_app.task(name="processing_engine.solve_problem")
def solve_problem(data: Dict) -> str:
    engine_inputs = EngineInputs.from_dict(data)
    engine_outputs = solve_schedule(engine_inputs)
    print(f"Task completed: {engine_outputs}")
    task_id = submit_store_engine_outputs(engine_inputs, engine_outputs)
    return task_id
