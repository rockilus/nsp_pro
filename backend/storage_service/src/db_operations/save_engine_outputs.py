import time

from shared.schemas import EngineInputs, EngineOutputs

from db_operations.assignment_services import save_assignments
from db_operations.save_breaches import save_breaches
from db_operations.setup_database import request_db, schedule_db


def save_engine_outputs(
    engine_intputs: EngineInputs, engine_outputs: EngineOutputs
) -> None:
    start_time_update_db = time.time()
    request_db.update_requests(engine_outputs.requests)
    schedule_db.update_schedule(engine_outputs.schedule)
    save_assignments(
        engine_outputs.assignments,
        engine_outputs.schedule,
        engine_intputs.as_wip_fixed,
    )
    save_breaches(engine_outputs.schedule, engine_outputs.breaches)
    end_time_update_db = time.time()
    # time stats
    total_time_update_db = end_time_update_db - start_time_update_db
    print("update db time:       " + f"{total_time_update_db:.2f}s")
