from shared.schemas import EngineInputs, EngineOutputs

from app import celery_app
from db_operations import save_engine_outputs
from notification import notify_api_gateway


@celery_app.task(name="storage_service.save_engine_outputs")
def save_engine_outputs_task(data: dict) -> None:
    if "engine_inputs" not in data:
        raise ValueError("engine_inputs not found in data")
    if "engine_outputs" not in data:
        raise ValueError("engine_outputs not found in data")
    engine_inputs = EngineInputs.from_dict(data["engine_inputs"])
    engine_outputs = EngineOutputs.from_dict(data["engine_outputs"])
    save_engine_outputs(engine_inputs, engine_outputs)
    print("TASK COMPLETE - SAVED ENGINE OUTPUTS")
    notify_api_gateway(
        engine_outputs.schedule.id, engine_outputs.schedule.team_id
    )
