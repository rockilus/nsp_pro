# import json
# import os
import time

from shared.schemas import EngineInputs, EngineOutputs

from core_to_engine_service import core_to_engine_inputs
from engine import Engine
from engine_to_core_service import engine_to_core
from solve_service.model_config import model_config
from solve_service.penalties import penalties


# pylint: disable=too-many-locals
def solve_schedule(engine_inputs: EngineInputs) -> EngineOutputs:
    # current_path = os.path.dirname(os.path.realpath(__file__))
    # inputs_file_path = os.path.join(current_path, "engine_inputs.json")
    # with open(inputs_file_path, "w", encoding="utf-8") as inputs_file:
    #     json.dump(engine_inputs.to_dict(), inputs_file, indent=4)
    # print(f"Inputs saved to {inputs_file_path}")

    start_time_core_to_engine = time.time()
    inputs, processing_cache = core_to_engine_inputs(
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
        engine_inputs.model_output,
        penalties,
        model_config,
    )
    end_time_core_to_engine = time.time()
    start_time_engine = time.time()
    engine = Engine()
    outputs = engine.solve(inputs)
    end_time_engine = time.time()
    start_time_engine_to_core = time.time()
    schedule, a_campaign, breaches, updated_requests, model_output = engine_to_core(
        engine_inputs.schedule,
        outputs,
        engine_inputs.workers,
        engine_inputs.shifts,
        engine_inputs.link_shifts,
        engine_inputs.daily_shift_demands,
        engine_inputs.requests,
        engine_inputs.as_hist,
        processing_cache,
    )
    end_time_engine_to_core = time.time()
    # time stats
    total_time_core_to_engine = end_time_core_to_engine - start_time_core_to_engine
    total_time_engine = end_time_engine - start_time_engine
    total_time_engine_to_core = end_time_engine_to_core - start_time_engine_to_core
    print("engine inputs time:   " + f"{total_time_core_to_engine:.2f}s")
    print("engine time:          " + f"{total_time_engine:.2f}s")
    print("process outputs time: " + f"{total_time_engine_to_core:.2f}s")
    return EngineOutputs(
        schedule=schedule,
        assignments=a_campaign,
        breaches=breaches,
        requests=updated_requests,
        model_output=model_output,
    )
