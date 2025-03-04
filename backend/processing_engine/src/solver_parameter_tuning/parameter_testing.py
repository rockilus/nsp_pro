import copy
import json
import os
from dataclasses import asdict
from typing import Callable, Dict, List, Tuple

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


def test_solver_parameters(
    inputs: InputsEngine,
    engine: Engine,
    output_dir: str = "parameter_tests",
) -> Dict[str, SolverRun]:
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Define parameter variations to test
    parameter_tests: Dict[str, List] = {
        "subsolvers": [
            None,
            ["default_lp"],
            ["core"],
            ["quick_restart", "default_lp"],
            ["core", "default_lp", "quick_restart"],
        ],
        "linearization_level": [0, 1, 2],
        "use_lns_only": [True, False],
        "interleave_search": [True, False],
        "optimize_with_core": [True, False],
        "core_minimization_level": [1, 2],
        "random_seed": [1, 42, 123, 789],
        "probing_deterministic_time_limit": [0.1, 0.5, 1.0, 2.0, 5.0],
        "max_presolve_iterations": [1, 2, 3, 5, 10],
        "cp_model_probing_level": [0, 1, 2, 3],
        "detect_table_with_cost": [True, False],
        "diversify_lns_params": [True, False],
        "symmetry_level": [1, 2, 3, 4],
        "use_symmetry_in_lp": [True, False],
        "symmetry_detection_deterministic_time_limit": [0, 1, 2, 5],
    }
    base_params = inputs.model_config.solver_params
    # Base case run
    base_run = run_solver_with_params(inputs, engine, base_params, "base_case")
    results: Dict[str, SolverRun] = {"base_case": base_run}

    # Save base case results
    save_run_results(base_run, os.path.join(output_dir, "base_case.json"))

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
            run_result = run_solver_with_params(
                inputs, engine, test_params, test_name
            )
            results[test_name] = run_result

            # Save the results
            save_run_results(
                run_result, os.path.join(output_dir, f"{test_name}.json")
            )

    # Generate a summary report
    # generate_summary_report(results, output_dir)

    return results


def run_solver_with_params(
    inputs: InputsEngine, engine: Engine, params: SolverParams, test_name: str
) -> SolverRun:
    print(f"Running test: {test_name}")

    new_inputs = copy.deepcopy(inputs)
    new_inputs.model_config.solver_params = params
    outputs = engine.solve(new_inputs)

    return outputs.solver_run


def save_run_results(run: SolverRun, filepath: str):
    """Save the run results to a JSON file."""
    # Convert the run object to a dictionary
    run_dict = asdict(run)

    # Save to JSON
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(run_dict, f, indent=2)


# def generate_summary_report(results: Dict[str, SolverRun], output_dir: str):
#     """Generate a summary report of all test runs."""
#     summary = []

#     # Get the base case for comparison
#     base_case = results["base_case"]

#     # Add base case to summary
#     summary.append(
#         {
#             "test_name": "base_case",
#             "runtime": base_case.runtime,
#             "objective_value": base_case.objective_value,
#             "solutions_found": base_case.solutions_found,
#             "runtime_diff": 0,
#             "objective_diff": 0,
#         }
#     )

#     # Add each test case
#     for test_name, run in results.items():
#         if test_name == "base_case":
#             continue

#         # Calculate differences from base case
#         runtime_diff = run.runtime - base_case.runtime

#         if (
#             run.objective_value is not None
#             and base_case.objective_value is not None
#         ):
#             objective_diff = run.objective_value - base_case.objective_value
#         else:
#             objective_diff = None

#         summary.append(
#             {
#                 "test_name": test_name,
#                 "runtime": run.runtime,
#                 "objective_value": run.objective_value,
#                 "solutions_found": run.solutions_found,
#                 "runtime_diff": runtime_diff,
#                 "objective_diff": objective_diff,
#             }
#         )

#     # Sort by objective value (if minimizing)
#     summary.sort(
#         key=lambda x: (
#             x["objective_value"]
#             if x["objective_value"] is not None
#             else float("inf")
#         )
#     )

#     # Save summary report
#     with open(
#         os.path.join(output_dir, "summary_report.json"), "w", encoding="utf-8"
#     ) as f:
#         json.dump(summary, f, indent=2)

#     # Create a CSV version for easy import into spreadsheets
#     with open(
#         os.path.join(output_dir, "summary_report.csv"), "w", encoding="utf-8"
#     ) as f:
#         # Write header
#         f.write(
#             "test_name,runtime,objective_value,solutions_found,runtime_diff,"
#             + "objective_diff\n"
#         )

#         # Write each row
#         # for row in summary:
#         #     f.write(
#         #         f"{row['test_name']},{row['runtime']},"
#         #         + f"{row['objective_value'] if row['objective_value']
#         # is not None else 'None'},"
#         #         + f"{row['solutions_found']},{row['runtime_diff']},"
#         #         + f"{row['objective_diff'] \
#         #              if row['objective_diff'] is not None else 'None'}\n"
#         #     )

#     # Print the top 5 results
#     print("\nTop 5 parameter configurations (by objective value):")
#     for i, row in enumerate(summary[:5]):
#         print(
#             f"{i+1}. {row['test_name']}: objective={row['objective_value']}, "
#             + f"runtime={row['runtime']:.2f}s, solutions={row['solutions_found']}"
#         )


def build_base_engine_inputs(file_path: str) -> EngineInputs:
    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)
    return EngineInputs.from_dict(data)


def run_parameter_tests(
    core_to_engine_inputs_func: Callable[
        [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
    ],
    engine: Engine,
    penalties: Penalties,
    model_config: ModelConfig,
    file_path_test_data: str,
) -> None:
    engine_inputs = build_base_engine_inputs(file_path_test_data)
    ei_augmented = EngineInputsAugmented.from_engine_inputs(
        engine_inputs, penalties, model_config
    )
    inputs, _ = core_to_engine_inputs_func(ei_augmented)
    print("Running parameter tests...")
    test_solver_parameters(inputs, engine)
