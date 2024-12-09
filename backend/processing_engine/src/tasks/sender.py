from shared.schemas import EngineInputs, EngineOutputs

from app import celery_app


def submit_store_engine_outputs(
    engine_inputs: EngineInputs, engine_outputs: EngineOutputs
) -> str:
    data = {
        "engine_inputs": engine_inputs.to_dict(),
        "engine_outputs": engine_outputs.to_dict(),
    }
    task = celery_app.send_task(
        "storage_service.store_engine_outputs",
        args=[data],
    )
    print(f"Task submitted: {task.id}")
    return task.id
