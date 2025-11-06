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
from db_operations.request_services import update_requests
from db_operations.save_breaches import save_breaches
from engine import ProcessingCache


def save_engine_outputs(
    schedule: Schedule,
    engine_intputs: EngineInputs,
    engine_outputs: EngineOutputs,
    processing_cache: ProcessingCache,
    collections: DatabaseCollections,
) -> Tuple[ScheduleSolveStatus, List[Assignment], List[Breach], SolverOutputMetadata]:
    start_time_update_db = time.time()
    assignments_saved = save_assignments(
        assignments=engine_outputs.assignments,
        schedule=schedule,
        shifts=engine_intputs.shifts,
        collections=collections,
    )
    update_requests(
        requests=engine_intputs.requests_work + engine_intputs.requests_leave,
        workers=engine_intputs.workers,
        shifts=engine_intputs.shifts,
        dimensions=engine_intputs.dimensions,
        dim_entries=engine_intputs.dim_entries,
        attributes=engine_intputs.attributes,
        assignments=assignments_saved,
        dim_to_attr_value_to_shift=processing_cache.dim_to_attr_value_to_shift,
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
