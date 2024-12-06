import time

# from scripts.setup_database import schedule_db
from shared.schemas import EngineInputs, EngineOutputs


# pylint: disable=too-many-locals, too-many-statements
def save_engine_outputs(
    engine_intputs: EngineInputs, engine_outputs: EngineOutputs
) -> str:
    start_time_update_db = time.time()
    print(engine_intputs, engine_outputs)
    # update_requests(
    #     engine_outputs.requests, engine_intputs.workers, engine_intputs.shifts
    # )
    # schedule_db.update_schedule(engine_outputs.schedule)
    # save_assignments(
    #     engine_outputs.assignments,
    #     engine_outputs.schedule,
    #     engine_intputs.as_wip_fixed,
    # )
    # save_breaches(engine_outputs.schedule, engine_outputs.breaches)
    end_time_update_db = time.time()
    # time stats
    total_time_update_db = end_time_update_db - start_time_update_db
    print("update db time:       " + f"{total_time_update_db:.2f}s")
    return "ok"
