import time
from typing import Dict

import redis
from shared.schemas.core import Schedule, TaskServices

from app import celery_app
from config import config
from db_operations.get_engine_inputs import get_engine_inputs
from db_operations.save_engine_outputs import save_engine_outputs
from db_operations.setup_database import get_collections
from solve_service.solve_schedule import solve_schedule

redis_client = redis.StrictRedis.from_url(config.redis_url)


@celery_app.task(
    name="solve_service.solve_campaign",
    bind=True,
    max_retries=5,
    default_retry_delay=10,
)
def solve_campaign_task(self, data: dict) -> Dict:
    try:
        start_time = time.time()
        if "schedule" not in data:
            raise ValueError("schedule not found in data")
        schedule = Schedule.from_dict(data["schedule"])
        collections = get_collections()
        engine_inputs = get_engine_inputs(schedule, collections)
        engine_outputs = solve_schedule(engine_inputs)
        eo_augmented = save_engine_outputs(
            engine_inputs, engine_outputs, self.request.id, collections
        )
        out = {"eo_augmented": eo_augmented.to_dict()}
        end_time = time.time()
        total_time = end_time - start_time
        print("solve campaign time:  " + f"{total_time:.2f}s")
        print("TASK COMPLETE - SOLVE CAMPAIGN: ", self.request.id)
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
