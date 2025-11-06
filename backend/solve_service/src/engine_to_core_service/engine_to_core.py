from datetime import datetime, timezone
from typing import List, Tuple

from shared.schemas.core import (
    Assignment,
    Breach,
    LinkShift,
    Penalties,
    RequestAugmented,
    Schedule,
    Shift,
    ShiftDemandNew,
    SolverOutputMetadata,
    SolverOutputStatus,
    Worker,
    EngineInputsAugmented,
)
from shared.schemas.core.solve_task_status import ScheduleSolveStatus

from engine import Outputs as OutputsEngine
from engine import ProcessingCache
from engine_to_core_service.build_breaches.build_breaches import build_breaches
from engine_to_core_service.build_campaign_assignments import (
    build_campaign_assignments,
)
from engine_to_core_service.update_schedule import get_schedule_status

# from engine_to_core_service.update_requests import (
#     update_requests_and_build_request_breaches,
# )


# pylint: disable=too-many-arguments
def engine_to_core(
    schedule: Schedule,
    outputs: OutputsEngine,
    workers: List[Worker],
    shifts: List[Shift],
    link_shifts: List[LinkShift],
    daily_shift_demand: List[ShiftDemandNew],
    requests: List[RequestAugmented],
    as_hist: List[Assignment],
    processing_cache: ProcessingCache,
    engine_inputs: EngineInputsAugmented,
) -> Tuple[
    ScheduleSolveStatus,
    List[Assignment],
    List[Breach],
    List[RequestAugmented],
    SolverOutputMetadata,
]:
    as_campaign = build_campaign_assignments(schedule, outputs.assignments)
    assignments = as_hist + as_campaign
    breaches = build_breaches(
        schedule,
        workers,
        shifts,
        link_shifts,
        daily_shift_demand,
        assignments,
        requests,
        outputs.breaches,
        processing_cache,
        outputs,
        engine_inputs=engine_inputs,
    )
    schedule_solve_status = get_schedule_status(
        is_solution=outputs.is_solution, breaches=breaches
    )
    # requests = update_requests_and_build_request_breaches(assignments, requests)
    model_output = SolverOutputMetadata(
        status=SolverOutputStatus.from_int(outputs.status),
        objective_value=outputs.objective_value,
        wall_time=outputs.wall_time,
        output_time=datetime.now(timezone.utc),
    )
    return (
        schedule_solve_status,
        as_campaign,
        breaches,
        requests,
        model_output,
    )
