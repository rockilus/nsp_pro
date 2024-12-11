from typing import Dict

from shared.schemas import EngineInputs, EngineOutputs, TaskServices

from app import celery_app
from db_operations import save_engine_outputs

# from notification import notify_api_gateway


@celery_app.task(name="storage_service.save_engine_outputs", bind=True)
def save_engine_outputs_task(self, data: dict) -> Dict:
    try:
        if "engine_inputs" not in data:
            raise ValueError("engine_inputs not found in data")
        if "engine_outputs" not in data:
            raise ValueError("engine_outputs not found in data")
        engine_inputs = EngineInputs.from_dict(data["engine_inputs"])
        engine_outputs = EngineOutputs.from_dict(data["engine_outputs"])
        eo_augmented = save_engine_outputs(
            engine_inputs, engine_outputs, self.request.id
        )
        out = {"eo_augmented": eo_augmented.to_dict()}
        print("TASK COMPLETE - SAVED ENGINE OUTPUTS")
        # notify_api_gateway(eo_augmented)
        # self.update_state(
        #     state="SUCCESS",
        #     meta={
        #         "schedule_id": engine_inputs.schedule.id,
        #         "last_service_completed": TaskServices.STORAGE_SERVICE.value,
        #     },
        # )
        return out
    except Exception as e:
        self.update_state(
            state="FAILURE",
            meta={
                "schedule_id": engine_inputs.schedule.id,
                "error_service": TaskServices.STORAGE_SERVICE.value,
                "error": str(e),
            },
        )
        raise e
