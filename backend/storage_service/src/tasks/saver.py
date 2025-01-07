from typing import Dict

import redis
from shared.schemas import EngineInputs, EngineOutputs, TaskServices

from app import celery_app
from config import config
from db_operations import save_engine_outputs
from db_operations.setup_database import get_collections

redis_client = redis.StrictRedis.from_url(config.redis_url)


@celery_app.task(
    name="storage_service.save_engine_outputs",
    bind=True,
    max_retries=5,
    default_retry_delay=10,
)
def save_engine_outputs_task(self, data: dict) -> Dict:
    try:
        if "engine_inputs" not in data:
            raise ValueError("engine_inputs not found in data")
        if "engine_outputs" not in data:
            raise ValueError("engine_outputs not found in data")
        engine_inputs = EngineInputs.from_dict(data["engine_inputs"])
        engine_outputs = EngineOutputs.from_dict(data["engine_outputs"])
        collections = get_collections()
        eo_augmented = save_engine_outputs(
            engine_inputs, engine_outputs, self.request.id, collections
        )
        out = {"eo_augmented": eo_augmented.to_dict()}
        print("TASK COMPLETE - SAVED ENGINE OUTPUTS")
        return out
    except redis.ConnectionError as exc:
        raise self.retry(exc=exc)
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
