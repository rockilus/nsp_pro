from typing import Dict

import redis
from shared.schemas import EngineInputs, TaskServices

from app import celery_app
from config import config
from solve_service.solve_schedule import solve_schedule

redis_client = redis.StrictRedis.from_url(config.redis_url)


@celery_app.task(
    name="processing_engine.solve_problem",
    bind=True,
    max_retries=5,
    default_retry_delay=10,
)
def solve_problem(self, data: Dict) -> Dict:
    try:
        if "engine_inputs" not in data:
            raise ValueError("engine_inputs not found in data")
        engine_inputs = EngineInputs.from_dict(data["engine_inputs"])
        engine_outputs = solve_schedule(engine_inputs)
        print("PROCESSING ENGINE TASKS COMPLETE")
        out = {
            "engine_inputs": engine_inputs.to_dict(),
            "engine_outputs": engine_outputs.to_dict(),
        }
        # self.update_state(
        #     state="SUCCESS",
        #     meta={
        #         "schedule_id": engine_inputs.schedule.id,
        #         "last_service_completed": TaskServices.PROCESSING_ENGINE.value,
        #     },
        # )
        print("SENT TO STORAGE SERVICE")
        return out
    except redis.ConnectionError as exc:
        raise self.retry(exc=exc)
    except Exception as e:
        self.update_state(
            state="FAILURE",
            meta={
                "schedule_id": engine_inputs.schedule.id,
                "error_service": TaskServices.PROCESSING_ENGINE.value,
                "error": str(e),
            },
        )
        raise e
