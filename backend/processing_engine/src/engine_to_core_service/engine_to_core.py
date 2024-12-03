from typing import List, Tuple

from engine import Outputs as OutputsEngine
from engine_to_core_service.build_breaches import build_breaches
from engine_to_core_service.build_campaign_assignments import build_campaign_assignments
from engine_to_core_service.update_requests import (
    update_requests_and_build_request_breaches,
)
from engine_to_core_service.update_schedule import update_schedule_status

from shared.schemas import (
    Assignment,
    Breach,
    Constraints,
    DailyShiftDemand,
    Request,
    Schedule,
    Shift,
    Worker,
)


# pylint: disable=too-many-arguments
def engine_to_core(
    schedule: Schedule,
    outputs: OutputsEngine,
    workers: List[Worker],
    shifts: List[Shift],
    daily_shift_demand: List[DailyShiftDemand],
    requests: List[Request],
    constraints: Constraints,
    as_hist: List[Assignment],
) -> Tuple[Schedule, List[Assignment], List[Breach], List[Request]]:
    as_campaign = build_campaign_assignments(schedule, outputs.assignments)
    assignments = as_hist + as_campaign
    breaches = build_breaches(
        schedule,
        workers,
        shifts,
        daily_shift_demand,
        assignments,
        constraints,
        requests,
        outputs.breaches,
    )
    schedule = update_schedule_status(schedule, outputs.is_solution, breaches)
    requests = update_requests_and_build_request_breaches(assignments, requests)
    return (
        schedule,
        as_campaign,
        breaches,
        requests,
    )
