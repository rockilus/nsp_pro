import copy
import json
import os
import time
from dataclasses import asdict
from typing import Callable, Dict, List, Tuple, Type

from shared.schemas import (
    EngineInputs,
    EngineInputsAugmented,
    ModelConfig,
    Penalties,
    SolverParams,
)

from engine import Engine
from engine import Inputs as InputsEngine
from engine import ProcessingCache, SolverRun


# pylint: disable=too-many-locals
def test_solver_parameters(
    inputs: InputsEngine,
    engine_cls: Type[Engine],
    dir_path_output: str = "solver_parameter_tuning/parameter_test_output",
    num_runs: int = 1,
    run_base_case: bool = True,
) -> Dict[str, SolverRun]:
    # Create output directory if it doesn't exist
    os.makedirs(dir_path_output, exist_ok=True)

    # Define parameter variations to test
    parameter_tests: Dict[str, List] = {
        # "subsolvers": [
        #     None,
        #     ["default_lp"],
        #     ["core"],
        #     ["quick_restart", "default_lp"],
        #     ["core", "default_lp", "quick_restart"],
        # ],
        # "linearization_level": [0, 1, 2],
        # "use_lns_only": [True, False],
        # "interleave_search": [True, False],
        # "optimize_with_core": [True, False],
        # "core_minimization_level": [1, 2],
        # "random_seed": [1, 42, 123, 789],
        # "probing_deterministic_time_limit": [0.1, 0.5, 1.0, 2.0, 5.0],
        # "max_presolve_iterations": [1, 2, 3, 5, 10],
        # "cp_model_probing_level": [0, 1, 2, 3],
        # "detect_table_with_cost": [True, False],
        # "diversify_lns_params": [True, False],
        # "symmetry_level": [1, 2, 3, 4],
        # "use_symmetry_in_lp": [True, False],
        # "symmetry_detection_deterministic_time_limit": [0, 1, 2, 5],
    }
    base_params = inputs.model_config.solver_params
    results: Dict[str, SolverRun] = {}
    if run_base_case:
        for _ in range(num_runs):
            # Base case run
            base_run = run_solver_with_params(
                inputs, engine_cls, base_params, "base_case"
            )
            results["base_case"] = base_run

            # Save base case results
            save_run_results(
                base_run,
                os.path.join(
                    dir_path_output, f"base_case_{base_run.run_timestamp}.json"
                ),
            )

    # Run each parameter variation
    for param_name, param_values in parameter_tests.items():
        for value in param_values:
            # Skip if this is the same as the base value
            base_value = getattr(base_params, param_name)
            if value == base_value:
                continue

            # Create a new params object with just this parameter changed
            test_params = SolverParams(**asdict(base_params))
            setattr(test_params, param_name, value)

            # Create a test name
            test_name = f"{param_name}_{value}"

            # Run the solver
            for _ in range(num_runs):
                run_result = run_solver_with_params(
                    inputs, engine_cls, test_params, test_name
                )
                results[test_name] = run_result

                # Save the results
                save_run_results(
                    run_result,
                    os.path.join(
                        dir_path_output,
                        f"{test_name}_{run_result.run_timestamp}.json",
                    ),
                )

    return results


def run_solver_with_params(
    inputs: InputsEngine,
    engine_cls: Type[Engine],
    params: SolverParams,
    test_name: str,
) -> SolverRun:
    print(f"Running test: {test_name}")

    new_inputs = copy.deepcopy(inputs)
    new_inputs.model_config.solver_params = params

    engine = engine_cls()
    outputs = engine.solve(new_inputs)

    return outputs.solver_run


def save_run_results(run: SolverRun, filepath: str):
    """Save the run results to a JSON file."""
    # Convert the run object to a dictionary
    run_dict = asdict(run)

    # Save to JSON
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(run_dict, f, indent=2)


def build_base_engine_inputs(file_path: str) -> EngineInputs:
    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)
    return EngineInputs.from_dict(data)


# pylint: disable=too-many-arguments
def run_parameter_tests(
    core_to_engine_inputs_func: Callable[
        [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
    ],
    engine_cls: Type[Engine],
    penalties: Penalties,
    model_config: ModelConfig,
    file_path_test_data: str,
    dir_path_output: str,
    num_runs: int = 1,
    run_base_case: bool = True,
) -> None:
    start_time = time.time()
    engine_inputs = build_base_engine_inputs(file_path_test_data)
    ei_augmented = EngineInputsAugmented.from_engine_inputs(
        engine_inputs, penalties, model_config
    )
    inputs, _ = core_to_engine_inputs_func(ei_augmented)

    inputs.model_config.solver_params.max_time_in_seconds = 30
    inputs.model_config.solver_params.num_search_workers = 16
    inputs.model_config.solver_params.log_search_progress = True

    print("Running parameter tests...")
    test_solver_parameters(inputs, engine_cls, dir_path_output, num_runs, run_base_case)
    end_time = time.time()
    print(f"Parameter tests completed in {end_time - start_time:.2f} seconds.")
