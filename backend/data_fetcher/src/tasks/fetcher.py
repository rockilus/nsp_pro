from typing import Dict

from shared.schemas import Schedule

from app import celery_app
from db_operations.get_engine_inputs import get_engine_inputs


@celery_app.task(name="data_fetcher.get_engine_inputs")
def get_engine_inputs_task(data: dict) -> Dict:
    if "schedule" not in data:
        raise ValueError("schedule not found in data")
    schedule = Schedule.from_dict(data["schedule"])
    engine_inputs = get_engine_inputs(schedule)
    out = {"engine_inputs": engine_inputs.to_dict()}
    print("TASK COMPLETE - GET ENGINE INPUTS")
    return out
