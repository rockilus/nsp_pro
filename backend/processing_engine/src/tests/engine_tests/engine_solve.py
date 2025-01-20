from shared.schemas import EngineInputs

from core_to_engine_service import core_to_engine_inputs
from engine.engine import Engine, Outputs


# pylint: disable=R0801
def engine_solve_engine_inputs(engine_inputs: EngineInputs) -> Outputs:
    inputs, _ = core_to_engine_inputs(
        engine_inputs.schedule,
        engine_inputs.workers,
        engine_inputs.shifts,
        engine_inputs.link_shifts,
        engine_inputs.dimensions,
        engine_inputs.dim_entries,
        engine_inputs.attributes,
        engine_inputs.as_hist + engine_inputs.as_wip_fixed,
        engine_inputs.cbs_augmented,
        engine_inputs.daily_shift_demands,
        engine_inputs.requests,
        engine_inputs.wip_assignments,
    )
    engine = Engine()
    return engine.solve(inputs)
