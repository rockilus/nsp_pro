from shared.schemas.core import (
    Assignment,
    Breach,
    EngineInputsAugmented,
    LinkShift,
    ObjectiveCategory,
    RequestAugmented,
    Schedule,
    Shift,
    ShiftDemandNew,
    Worker,
)

from engine import Breach as BreachEngine
from engine import Inputs, ProcessingCache
from engine import Outputs as OutputsEngine
from engine_to_core_service.build_breaches.build_breaches_debug import (
    debug_breaches,
)
from engine_to_core_service.build_breaches.build_breaches_model import (
    build_breaches_model,
)

# from engine_to_core_service.build_breaches.build_breaches_not_model import (
#     build_breaches_not_model,
# )

# helper functions moved to build_breaches_debug


# pylint: disable=too-many-arguments, R0801
def build_breaches(
    schedule: Schedule,
    workers: list[Worker],
    shifts: list[Shift],
    link_shifts: list[LinkShift],
    daily_shift_demand: list[ShiftDemandNew],
    assignments: list[Assignment],
    requests: list[RequestAugmented],
    breaches_engine: list[BreachEngine],
    processing_cache: ProcessingCache,
    outputs: OutputsEngine | None = None,
    engine_inputs: EngineInputsAugmented | None = None,
    inputs: Inputs | None = None,
) -> list[Breach]:
    breaches_model, breaches_parsed = build_breaches_model(
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
    # breaches_not_model = build_breaches_not_model(
    #     schedule,
    #     workers,
    #     shifts,
    #     assignments,
    #     processing_cache,
    # )
    # If an Outputs object was provided, print quick debugging stats
    if outputs is not None and engine_inputs is not None and inputs is not None:
        try:
            debug_breaches(
                outputs=outputs,
                breaches=breaches_parsed,
                assignments=assignments,
                engine_inputs=engine_inputs,
                inputs=inputs,
            )
        except Exception:
            # Never fail the normal flow because of debug printing
            pass
    breaches_model = [
        b
        for b in breaches_model
        if b.objective_category
        not in [
            ObjectiveCategory.WORK_TIME_WEEK_TARGET,
            ObjectiveCategory.DUTIES_PER_MONTH_TARGET,
            ObjectiveCategory.SPECIAL_DAYS_TARGET,
            ObjectiveCategory.MAX_WEEKLY_NB_DUTIES,
            ObjectiveCategory.MAX_WEEK_DAY_NB_DUTIES,
            ObjectiveCategory.OFF_SHIFT_PENALTY,
        ]
    ]
    # return breaches_model + breaches_not_model
    return breaches_model
