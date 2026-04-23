from shared.schemas.core import EngineInputsAugmented
from shared.schemas.core.solve_task_status import SolveScope

from core_to_engine_service import core_to_engine_inputs
from engine.engine import Engine, Outputs


# pylint: disable=R0801
def engine_solve_engine_inputs(
    engine_inputs: EngineInputsAugmented,
    solve_scope: SolveScope | None = None,
) -> Outputs:
    inputs, _ = core_to_engine_inputs(
        engine_inputs=engine_inputs, solve_scope=solve_scope
    )
    engine = Engine()
    return engine.solve(inputs)
