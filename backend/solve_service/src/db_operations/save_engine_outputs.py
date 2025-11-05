import time
from typing import List, Tuple

from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    Assignment,
    Breach,
    EngineInputs,
    EngineOutputs,
    Schedule,
    SolverOutputMetadata,
)
from shared.schemas.core.solve_task_status import ScheduleSolveStatus

from db_operations.assignment_services import save_assignments
from db_operations.save_breaches import save_breaches

# from db_operations.get_request import update_requests


def save_engine_outputs(
    schedule: Schedule,
    engine_intputs: EngineInputs,
    engine_outputs: EngineOutputs,
    collections: DatabaseCollections,
) -> Tuple[ScheduleSolveStatus, List[Assignment], List[Breach], SolverOutputMetadata]:
    start_time_update_db = time.time()
    # requests_aug_saved = update_requests(
    #     engine_intputs.requests,
    #     engine_intputs.workers,
    #     engine_intputs.shifts,
    #     collections,
    # )
    assignments_saved = save_assignments(
        assignments=engine_outputs.assignments,
        schedule=schedule,
        shifts=engine_intputs.shifts,
        collections=collections,
    )
    breaches_saved = save_breaches(
        schedule=schedule,
        breaches=engine_outputs.breaches,
        collections=collections,
    )

    end_time_update_db = time.time()
    # time stats
    total_time_update_db = end_time_update_db - start_time_update_db
    print("update db time:       " + f"{total_time_update_db:.2f}s")

    return (
        engine_outputs.schedule_solve_status,
        assignments_saved,
        breaches_saved,
        engine_outputs.model_output,
    )


# schedule_solve_status=ScheduleSolveStatus,
# assignments: List[Assignment],
# breaches: List[Breach],
# solver_outputs: SolverOutputMetadata,
