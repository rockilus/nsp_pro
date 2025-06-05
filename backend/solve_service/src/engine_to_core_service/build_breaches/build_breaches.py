from typing import List

from shared.schemas.core import (
    Assignment,
    Breach,
    DailyShiftDemand,
    LinkShift,
    RequestAugmented,
    Schedule,
    Shift,
    Worker,
)

from engine import Breach as BreachEngine
from engine import ProcessingCache
from engine_to_core_service.build_breaches.build_breaches_model import (
    build_breaches_model,
)
from engine_to_core_service.build_breaches.build_breaches_not_model import (
    build_breaches_not_model,
)


# pylint: disable=too-many-arguments, R0801
def build_breaches(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    link_shifts: List[LinkShift],
    daily_shift_demand: List[DailyShiftDemand],
    assignments: List[Assignment],
    requests: List[RequestAugmented],
    breaches_engine: List[BreachEngine],
    processing_cache: ProcessingCache,
) -> List[Breach]:
    out = build_breaches_model(
        schedule,
        workers,
        shifts,
        link_shifts,
        daily_shift_demand,
        assignments,
        processing_cache.constraints,
        requests,
        breaches_engine,
    )
    out += build_breaches_not_model(
        schedule,
        workers,
        shifts,
        assignments,
        processing_cache,
    )
    return out
