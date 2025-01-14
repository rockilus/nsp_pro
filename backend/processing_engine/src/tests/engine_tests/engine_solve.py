from typing import Dict

from core_to_engine_service import core_to_engine_inputs
from engine.engine import Engine, Outputs


def engine_solve(sample_data: Dict) -> Outputs:
    inputs, _ = core_to_engine_inputs(
        sample_data["schedule"],
        sample_data["workers"],
        sample_data["shifts"],
        sample_data["dimensions"],
        sample_data["dim_entries"],
        sample_data["attributes"],
        sample_data["fixed_assignments"],
        sample_data["cbs_augmented"],
        sample_data["daily_shift_demands"],
        sample_data["requests"],
        sample_data["wip_assignments"],
    )
    engine = Engine()
    return engine.solve(inputs)
