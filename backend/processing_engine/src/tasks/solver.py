from typing import Dict

from shared.schemas import EngineInputs, TaskServices

from app import celery_app
from solve_service.solve_schedule import solve_schedule


@celery_app.task(name="processing_engine.solve_problem", bind=True)
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
