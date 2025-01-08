from typing import Dict

import redis
from shared.schemas import Schedule, TaskServices

from app import celery_app
from config import config
from db_operations.get_engine_inputs import get_engine_inputs
from db_operations.setup_database import get_collections

redis_client = redis.StrictRedis.from_url(config.redis_url)


@celery_app.task(
    name="data_fetcher.get_engine_inputs",
    bind=True,
    max_retries=5,
    default_retry_delay=10,
)
def get_engine_inputs_task(self, data: dict) -> Dict:
    try:
        if "schedule" not in data:
            raise ValueError("schedule not found in data")
        schedule = Schedule.from_dict(data["schedule"])
        collections = get_collections()
        engine_inputs = get_engine_inputs(schedule, collections)
        out = {"engine_inputs": engine_inputs.to_dict()}
        print("TASK COMPLETE - GET ENGINE INPUTS")
        return out
    except redis.ConnectionError as exc:
        raise self.retry(exc=exc)
    except Exception as e:
        self.update_state(
            state="FAILURE",
            meta={
                "schedule_id": schedule.id,
                "error_service": TaskServices.DATA_FETCHER.value,
                "error": str(e),
            },
        )
        raise e
