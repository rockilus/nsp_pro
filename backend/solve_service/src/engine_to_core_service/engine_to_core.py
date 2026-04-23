from datetime import UTC, datetime

from shared.schemas.core import (
    Assignment,
    Breach,
    EngineInputsAugmented,
    LinkShift,
    RequestAugmented,
    Schedule,
    Shift,
    ShiftDemandNew,
    SolverOutputMetadata,
    SolverOutputStatus,
    Worker,
)
from shared.schemas.core.solve_task_status import ScheduleSolveStatus

from engine import Inputs, ProcessingCache
from engine import Outputs as OutputsEngine
from engine_to_core_service.build_breaches.build_breaches import build_breaches
from engine_to_core_service.build_campaign_assignments import (
    build_campaign_assignments,
)
from engine_to_core_service.update_schedule import get_schedule_status

# from engine_to_core_service.update_requests import (
#     update_requests_and_build_request_breaches,
# )


# pylint: disable=too-many-arguments, too-many-locals, too-many-positional-arguments
def engine_to_core(
    schedule: Schedule,
    outputs: OutputsEngine,
    workers: list[Worker],
    shifts: list[Shift],
    link_shifts: list[LinkShift],
    daily_shift_demand: list[ShiftDemandNew],
    requests: list[RequestAugmented],
    as_hist: list[Assignment],
    processing_cache: ProcessingCache,
    engine_inputs: EngineInputsAugmented,
    inputs: Inputs,
) -> tuple[
    ScheduleSolveStatus,
    list[Assignment],
    list[Breach],
    list[RequestAugmented],
    SolverOutputMetadata,
]:
    as_campaign = build_campaign_assignments(
        schedule=schedule, as_engine=outputs.assignments
    )
    assignments = as_hist + as_campaign
    breaches = build_breaches(
        schedule=schedule,
        workers=workers,
        shifts=shifts,
        link_shifts=link_shifts,
        daily_shift_demand=daily_shift_demand,
        assignments=assignments,
        requests=requests,
        breaches_engine=outputs.breaches,
        processing_cache=processing_cache,
        outputs=outputs,
        engine_inputs=engine_inputs,
        inputs=inputs,
    )
    schedule_solve_status = get_schedule_status(
        is_solution=outputs.is_solution, breaches=breaches
    )
    # requests = update_requests_and_build_request_breaches(assignments, requests)
    model_output = SolverOutputMetadata(
        status=SolverOutputStatus.from_int(outputs.status),
        objective_value=outputs.objective_value,
        wall_time=outputs.wall_time,
        output_time=datetime.now(UTC),
    )
    return (
        schedule_solve_status,
        as_campaign,
        breaches,
        requests,
        model_output,
    )
