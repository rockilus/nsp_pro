import json
import os
from typing import Dict

from shared.schemas.core import (
    EngineInputs,
    EngineInputsAugmented,
    ModelConfig,
    Penalties,
)


def load_json_from_file(filename: str) -> Dict:
    current_folder = os.path.dirname(__file__)
    file_path = os.path.join(current_folder, filename)
    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)
    return data


def engine_inputs_to_engine_inputs_augmented(
    engine_inputs: EngineInputs,
    penalties: Penalties,
    model_config: ModelConfig,
) -> EngineInputsAugmented:
    return EngineInputsAugmented(
        schedule=engine_inputs.schedule,
        workers=engine_inputs.workers,
        shifts=engine_inputs.shifts,
        link_shifts=engine_inputs.link_shifts,
        dimensions=engine_inputs.dimensions,
        dim_entries=engine_inputs.dim_entries,
        attributes=engine_inputs.attributes,
        as_hist=engine_inputs.as_hist,
        as_wip_fixed=engine_inputs.as_wip_fixed,
        cbs_augmented=engine_inputs.cbs_augmented,
        daily_shift_demands=engine_inputs.daily_shift_demands,
        requests_work=engine_inputs.requests_work,
        requests_leave=engine_inputs.requests_leave,
        model_output=engine_inputs.model_output,
        penalties=penalties,
        model_config=model_config,
    )
