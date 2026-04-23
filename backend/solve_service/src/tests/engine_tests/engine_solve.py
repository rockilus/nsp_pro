from shared.schemas.core import EngineInputsAugmented
from shared.schemas.core.solve_task_status import SolveScope

from core_to_engine_service import core_to_engine_inputs
from engine.engine import Engine, Outputs
from engine_to_core_service.build_breaches.build_breaches import build_breaches
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from engine_to_core_service.build_campaign_assignments import (
    build_campaign_assignments,
)


def engine_solve_engine_inputs(
    engine_inputs: EngineInputsAugmented,
    solve_scope: SolveScope | None = None,
) -> Outputs:
    inputs, _ = core_to_engine_inputs(
        engine_inputs=engine_inputs, solve_scope=solve_scope
    )
    engine = Engine()
    return engine.solve(inputs)


def engine_solve_engine_inputs_with_breach_analysis(
    engine_inputs: EngineInputsAugmented,
    solve_scope: SolveScope | None = None,
) -> Outputs:
    inputs, processing_cache = core_to_engine_inputs(
        engine_inputs=engine_inputs, solve_scope=solve_scope
    )
    engine = Engine()
    outputs = engine.solve(inputs)

    assignments = build_campaign_assignments(
        schedule=engine_inputs.schedule, as_engine=outputs.assignments
    )
    build_breaches(
        schedule=engine_inputs.schedule,
        workers=engine_inputs.workers,
        shifts=engine_inputs.shifts,
        link_shifts=engine_inputs.link_shifts,
        daily_shift_demand=engine_inputs.shift_demands,
        assignments=assignments,
        requests=engine_inputs.requests_work,
        breaches_engine=outputs.breaches,
        processing_cache=processing_cache,
        outputs=outputs,
        engine_inputs=engine_inputs,
        inputs=inputs,
    )

    return outputs
