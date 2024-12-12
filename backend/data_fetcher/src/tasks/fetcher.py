from typing import Dict

from shared.schemas import Schedule, TaskServices

from app import celery_app
from db_operations.get_engine_inputs import get_engine_inputs


@celery_app.task(name="data_fetcher.get_engine_inputs", bind=True)
def get_engine_inputs_task(self, data: dict) -> Dict:
    try:
        if "schedule" not in data:
            raise ValueError("schedule not found in data")
        schedule = Schedule.from_dict(data["schedule"])
        engine_inputs = get_engine_inputs(schedule)
        out = {"engine_inputs": engine_inputs.to_dict()}
        # self.update_state(
        #     state="SUCCESS",
        #     meta={
        #         "schedule_id": schedule.id,
        #         "last_service_completed": TaskServices.DATA_FETCHER.value,
        #     },
        # )
        print("TASK COMPLETE - GET ENGINE INPUTS")
        return out
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
