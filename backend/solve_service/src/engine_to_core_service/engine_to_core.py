from datetime import datetime, timezone
from typing import List, Tuple

from shared.schemas.core import (
    Assignment,
    Breach,
    DailyShiftDemand,
    LinkShift,
    ModelOutput,
    ModelOutputStatus,
    Request,
    Schedule,
    Shift,
    Worker,
)

from engine import Outputs as OutputsEngine
from engine import ProcessingCache
from engine_to_core_service.build_breaches.build_breaches import build_breaches
from engine_to_core_service.build_campaign_assignments import (
    build_campaign_assignments,
)
from engine_to_core_service.update_requests import (
    update_requests_and_build_request_breaches,
)
from engine_to_core_service.update_schedule import update_schedule_status


# pylint: disable=too-many-arguments
def engine_to_core(
    schedule: Schedule,
    outputs: OutputsEngine,
    workers: List[Worker],
    shifts: List[Shift],
    link_shifts: List[LinkShift],
    daily_shift_demand: List[DailyShiftDemand],
    requests: List[Request],
    as_hist: List[Assignment],
    processing_cache: ProcessingCache,
) -> Tuple[Schedule, List[Assignment], List[Breach], List[Request], ModelOutput]:
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
    )
    schedule = update_schedule_status(schedule, outputs.is_solution, breaches)
    requests = update_requests_and_build_request_breaches(assignments, requests)
    model_output = ModelOutput(
        id="",
        schedule_id=schedule.id,
        status=ModelOutputStatus(outputs.status),
        var_sol=outputs.var_sol,
        var_spe_sol=outputs.var_spe_sol,
        objective_value=outputs.objective_value,
        wall_time=outputs.wall_time,
        output_time=datetime.now(timezone.utc),
    )
    return (
        schedule,
        as_campaign,
        breaches,
        requests,
        model_output,
    )
