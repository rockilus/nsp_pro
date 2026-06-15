# import json
# import os
import time

from shared.schemas.core import (
    EngineInputs,
    EngineInputsAugmented,
    EngineOutputs,
    SlotPeriods,
    TeamGenerationSettings,
)
from shared.schemas.core.solve_task_status import SolveScope

from core_to_engine_service import core_to_engine_inputs
from engine import Engine, ProcessingCache
from engine_to_core_service import engine_to_core
from solve_service.model_config import model_config
from solve_service.penalties import penalties


# pylint: disable=too-many-locals
def solve_schedule(
    engine_inputs: EngineInputs,
    solve_scope: SolveScope | None = None,
    team_settings: TeamGenerationSettings | None = None,
    slot_periods: SlotPeriods | None = None,
) -> tuple[EngineOutputs, ProcessingCache]:
    # current_path = os.path.dirname(os.path.realpath(__file__))
    # inputs_file_path = os.path.join(current_path, "engine_inputs.json")
    # with open(inputs_file_path, "w", encoding="utf-8") as inputs_file:
    #     json.dump(engine_inputs.to_dict(), inputs_file, indent=4)
    # print(f"Inputs saved to {inputs_file_path}")

    start_time_core_to_engine = time.time()
    ei_augmented = EngineInputsAugmented.from_engine_inputs(
        engine_inputs, penalties, model_config
    )
    inputs, processing_cache = core_to_engine_inputs(
        ei_augmented, solve_scope, team_settings, slot_periods
    )
    end_time_core_to_engine = time.time()
    start_time_engine = time.time()
    engine = Engine()
    outputs = engine.solve(inputs)
    end_time_engine = time.time()
    start_time_engine_to_core = time.time()
    (
        schedule_solve_status,
        a_campaign,
        breaches,
        updated_requests,
        model_output,
    ) = engine_to_core(
        engine_inputs.schedule,
        outputs,
        engine_inputs.workers,
        engine_inputs.shifts,
        engine_inputs.link_shifts,
        engine_inputs.shift_demands,
        engine_inputs.requests_work,
        engine_inputs.as_hist,
        processing_cache,
        ei_augmented,
        inputs,
    )
    end_time_engine_to_core = time.time()
    # time stats
    total_time_core_to_engine = end_time_core_to_engine - start_time_core_to_engine
    total_time_engine = end_time_engine - start_time_engine
    total_time_engine_to_core = end_time_engine_to_core - start_time_engine_to_core
    print("engine inputs time:   " + f"{total_time_core_to_engine:.2f}s")
    print("engine time:          " + f"{total_time_engine:.2f}s")
    print("process outputs time: " + f"{total_time_engine_to_core:.2f}s")
    return (
        EngineOutputs(
            schedule_solve_status=schedule_solve_status,
            assignments=a_campaign,
            breaches=breaches,
            requests=updated_requests,
            model_output=model_output,
        ),
        processing_cache,
    )
