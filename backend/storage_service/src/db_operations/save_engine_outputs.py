import time
from datetime import datetime, timezone

from shared.schemas import (
    EngineInputs,
    EngineOutputs,
    EngineOutputsAugmented,
    SolveDetails,
    SolveDetailsStatus,
)

from db_operations.assignment_services import save_assignments
from db_operations.save_breaches import save_breaches
from db_operations.setup_database import schedule_db
from db_operations.update_requests import update_requests


def save_engine_outputs(
    engine_intputs: EngineInputs, engine_outputs: EngineOutputs, task_id: str
) -> EngineOutputsAugmented:
    start_time_update_db = time.time()
    requests_aug_saved = update_requests(
        engine_intputs.requests, engine_intputs.workers, engine_intputs.shifts
    )
    engine_outputs.schedule.solve_details = SolveDetails(
        task_id=task_id,
        status=SolveDetailsStatus.SUCCESS,
        updated_at=datetime.now(tz=timezone.utc),
        result={"output": engine_outputs.schedule.to_dict()},
    )

    schedule_saved = schedule_db.update_schedule(engine_outputs.schedule)
    assignments_saved = save_assignments(
        engine_outputs.assignments,
        engine_outputs.schedule,
        engine_intputs.as_wip_fixed,
    )
    breaches_saved = save_breaches(engine_outputs.schedule, engine_outputs.breaches)
    end_time_update_db = time.time()
    # time stats
    total_time_update_db = end_time_update_db - start_time_update_db
    print("update db time:       " + f"{total_time_update_db:.2f}s")
    return EngineOutputsAugmented(
        schedule=schedule_saved,
        assignments=assignments_saved,
        breaches=breaches_saved,
        requests=requests_aug_saved,
        shifts_recup_new=engine_intputs.shifts_recup_new,
    )
