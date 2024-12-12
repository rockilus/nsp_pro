import time

from shared.schemas import EngineInputs, EngineOutputs

from core_to_engine_service import core_to_engine_inputs
from engine import Engine
from engine_to_core_service import engine_to_core


# pylint: disable=too-many-locals
def solve_schedule(engine_inputs: EngineInputs) -> EngineOutputs:
    start_time_core_to_engine = time.time()
    inputs, constraints = core_to_engine_inputs(
        engine_inputs.schedule,
        engine_inputs.workers,
        engine_inputs.shifts,
        engine_inputs.dimensions,
        engine_inputs.dim_entries,
        engine_inputs.attributes,
        engine_inputs.as_hist + engine_inputs.as_wip_fixed,
        engine_inputs.cbs_augmented,
        engine_inputs.daily_shift_demands,
        engine_inputs.requests,
        engine_inputs.wip_assignments,
    )
    end_time_core_to_engine = time.time()
    start_time_engine = time.time()
    engine = Engine()
    outputs = engine.solve(inputs)
    end_time_engine = time.time()
    start_time_engine_to_core = time.time()
    schedule, a_campaign, breaches, updated_requests = engine_to_core(
        engine_inputs.schedule,
        outputs,
        engine_inputs.workers,
        engine_inputs.shifts,
        engine_inputs.daily_shift_demands,
        engine_inputs.requests,
        constraints,
        engine_inputs.as_hist,
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
    )
