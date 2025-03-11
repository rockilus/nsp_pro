import copy
import json
import os
import time
from dataclasses import asdict
from typing import Callable, Dict, List, Tuple, Type

# pylint: disable=R0801
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


# pylint: disable=too-many-locals, too-many-arguments
def test_solver_parameters(
    inputs: InputsEngine,
    engine_cls: Type[Engine],
    dir_path_output: str = "solver_parameter_tuning/parameter_test_output",
    num_runs: int = 1,
    run_base_case: bool = True,
    run_param_tests: bool = True,
) -> Dict[str, SolverRun]:
    # Create output directory if it doesn't exist
    os.makedirs(dir_path_output, exist_ok=True)

    # Define parameter variations to test
    # pylint: disable=R0801
    parameter_tests: Dict[str, List] = {
        "linearization_level": [0, 1, 2],
        "cut_level": [0, 1, 2],
        "use_strong_propagation_in_disjunctive": [True, False],
        "violation_ls_compound_move_probability": [0.5, 0.6, 0.7],
        "feasibility_jump_var_perburbation_range_ratio": [0.05, 0.1, 0.2, 0.3],
        "lns_initial_deterministic_limit": [0.05, 0.1, 0.15, 0.2],
        "lns_initial_difficulty": [0.4, 0.5, 0.55, 0.6],
        "diversify_lns_params": [True, False],
        "core_minimization_level": [1, 2],
        "instantiate_all_variables": [True, False],
        "use_lns_only": [True, False],
        "interleave_search": [True, False],
        "optimize_with_core": [True, False],
        "random_seed": [1, 42, 123, 789],
        "probing_deterministic_time_limit": [0.1, 0.5, 1.0, 2.0, 5.0],
        "max_presolve_iterations": [1, 2, 3],
        "cp_model_probing_level": [0, 1, 2, 3],
        "detect_table_with_cost": [True, False],
        "symmetry_level": [1, 2, 3, 4],
        "use_symmetry_in_lp": [True, False],
        "symmetry_detection_deterministic_time_limit": [0, 1, 2, 5],
        "restart_period": [40, 50, 60],
        "subsolvers": [
            None,
            ["core", "default_lp", "quick_restart"],
            ["core", "default_lp", "max_lp", "quick_restart"],  # BEST FOR NOW
        ],
        "ignore_subsolvers": [
            [
                "scheduling_intervals_lns",
                "scheduling_precedences_lns",
                "scheduling_resource_windows_lns",
                "scheduling_time_window_lns",
                "rins/rens",
            ],
            [
                "scheduling_intervals_lns",
                "scheduling_precedences_lns",
                "scheduling_resource_windows_lns",
                "scheduling_time_window_lns",
                "rins/rens",
                "feasibility_pump",
                "graph_arc_lns",
            ],
            [
                "scheduling_resource_windows_lns",
                "scheduling_time_window_lns",
                "feasibility_pump",
            ],  # BEST FOR NOW
            [
                "scheduling_intervals_lns",
                "scheduling_precedences_lns",
                "scheduling_resource_windows_lns",
                "scheduling_time_window_lns",
                "feasibility_pump",
            ],
            [
                "scheduling_intervals_lns",
                "scheduling_precedences_lns",
                "scheduling_resource_windows_lns",
                "scheduling_time_window_lns",
                "feasibility_pump",
                "rins/rens",
            ],
        ],
        "restart_algorithms": [
            # None,
            ["NO_RESTART"],
            ["LUBY_RESTART"],
            ["DL_MOVING_AVERAGE_RESTART"],
            ["LBD_MOVING_AVERAGE_RESTART"],
            ["FIXED_RESTART"],
        ],
    }

    base_params = inputs.model_config.solver_params
    results: Dict[str, SolverRun] = {}
    if run_base_case:
        test_name = "base_case"
        for i in range(num_runs):
            # Base case run
            base_run = run_solver_with_params(
                inputs, engine_cls, base_params, test_name, i, num_runs
            )
            results[test_name] = base_run

            # Save base case results
            save_run_results(
                base_run,
                os.path.join(
                    dir_path_output,
                    f"{test_name}_{base_run.run_timestamp}.json",
                ),
            )

    # Run each parameter variation
    if run_param_tests:
        for param_name, param_values in parameter_tests.items():
            for value in param_values:
                # Skip if this is the same as the base value
                base_value = getattr(base_params, param_name)
                if value == base_value:
                    continue

                # Create a new params object with just this parameter changed
                # pylint: disable=R0801
                test_params = SolverParams(**asdict(base_params))
                setattr(test_params, param_name, value)

                # Create a test name
                test_name = f"{param_name}_{value}"
                if param_name in [
                    "subsolvers",
                    "ignore_subsolvers",
                    "restart_algorithms",
                ]:
                    test_name = f"{param_name}_{'_'.join(value)}"
                    test_name = test_name[:100]

                # Run the solver
                for i in range(num_runs):
                    run_result = run_solver_with_params(
                        inputs, engine_cls, test_params, test_name, i, num_runs
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


# pylint: disable=too-many-arguments
def run_solver_with_params(
    inputs: InputsEngine,
    engine_cls: Type[Engine],
    params: SolverParams,
    test_name: str,
    iter_num: int = 1,
    num_runs: int = 1,
) -> SolverRun:
    print(f"Running test: {test_name} {iter_num+1}/{num_runs}")

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
    run_param_tests: bool = True,
) -> None:
    start_time = time.time()
    engine_inputs = build_base_engine_inputs(file_path_test_data)
    ei_augmented = EngineInputsAugmented.from_engine_inputs(
        engine_inputs, penalties, model_config
    )
    inputs, _ = core_to_engine_inputs_func(ei_augmented)

    inputs.model_config.solver_params.max_time_in_seconds = 30
    inputs.model_config.solver_params.num_search_workers = 8
    inputs.model_config.solver_params.log_search_progress = True
    inputs.model_config.solver_params.log_subsolver_statistics = True

    print("Running parameter tests...")
    test_solver_parameters(
        inputs,
        engine_cls,
        dir_path_output,
        num_runs,
        run_base_case,
        run_param_tests,
    )
    end_time = time.time()
    print(f"Parameter tests completed in {end_time - start_time:.2f} seconds.")


# problem subsolvers: [
#   core,
#   default_lp,
#   fixed,
#   lb_tree_search,
#   max_lp,
#   no_lp,
#   probing,
#   pseudo_costs,
#   quick_restart,
#   quick_restart_no_lp,
#   reduced_costs
# ]
# first solution subsolvers: [
#   fj(2),
#   fs_random,
#   fs_random_no_lp,
#   fs_random_quick_restart_no_lp
# ]
# interleaved subsolvers: [
# feasibility_pump,
# graph_arc_lns,
# graph_cst_lns,
# graph_dec_lns,
# graph_var_lns,
# lb_relax_lns,
# ls,
# ls_lin,
# rins/rens,
# rnd_cst_lns,
# rnd_var_lns,
# scheduling_intervals_lns,
# scheduling_precedences_lns,
# scheduling_resource_windows_lns,
# scheduling_time_window_lns
# ]
# helper subsolvers: [
# neighborhood_helper,
# synchronization_agent,
# update_gap_integral
# ]
