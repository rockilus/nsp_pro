import time

from shared.schemas import EngineInputs, EngineOutputs, EngineOutputsAugmented

from db_operations.assignment_services import save_assignments
from db_operations.save_breaches import save_breaches
from db_operations.update_requests import update_requests
from db_operations.setup_database import request_db, schedule_db


def save_engine_outputs(
    engine_intputs: EngineInputs, engine_outputs: EngineOutputs
) -> EngineOutputsAugmented:
    start_time_update_db = time.time()
    r_augmented = update_requests(
        engine_intputs.requests, engine_intputs.workers, engine_intputs.shifts
    )
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
    return EngineOutputsAugmented(
        schedule=engine_outputs.schedule,
        assignments=engine_outputs.assignments,
        breaches=engine_outputs.breaches,
        requests=r_augmented,
        shifts_recup_new=engine_intputs.shifts_recup_new,
    )
