from shared.schemas import EngineInputsAugmented

from core_to_engine_service import core_to_engine_inputs
from engine.engine import Engine, Outputs


# pylint: disable=R0801
def engine_solve_engine_inputs(
    engine_inputs: EngineInputsAugmented,
) -> Outputs:
    inputs, _ = core_to_engine_inputs(engine_inputs)
    engine = Engine()
    return engine.solve(inputs)
