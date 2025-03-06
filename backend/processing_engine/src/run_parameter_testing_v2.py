import json
import os
from typing import Dict, List

from shared.schemas import EngineInputs, EngineInputsAugmented, SolverParams

from core_to_engine_service import core_to_engine_inputs
from engine import Engine
from solve_service.model_config import model_config
from solve_service.penalties import penalties
from solver_parameter_tuning.parameter_testing_v2 import run_parameter_tests

# pylint: disable=R0801
parameter_tests: Dict[str, List] = {
    # "linearization_level": [0, 1, 2],
    # "cut_level": [0, 1, 2],
    # "use_strong_propagation_in_disjunctive": [True, False],
    # "violation_ls_compound_move_probability": [0.5, 0.6, 0.7],
    # "feasibility_jump_var_perburbation_range_ratio": [0.05, 0.1, 0.2, 0.3],
    # "lns_initial_deterministic_limit": [0.05, 0.1, 0.15, 0.2],
    # "lns_initial_difficulty": [0.4, 0.5, 0.55, 0.6],
    # "diversify_lns_params": [True, False],
    # "core_minimization_level": [1, 2],
    # "instantiate_all_variables": [True, False],
    # "use_lns_only": [True, False],
    # "interleave_search": [True, False],
    # "optimize_with_core": [True, False],
    # "random_seed": [1, 42, 123, 789],
    # "probing_deterministic_time_limit": [0.1, 0.5, 1.0, 2.0, 5.0],
    # "max_presolve_iterations": [1, 2, 3],
    # "cp_model_probing_level": [0, 1, 2, 3],
    # "detect_table_with_cost": [True, False],
    # "symmetry_level": [1, 2, 3, 4],
    # "use_symmetry_in_lp": [True, False],
    # "symmetry_detection_deterministic_time_limit": [0, 1, 2, 5],
    # "restart_period": [40, 50, 60],
    "subsolvers": [
        None,
        # ["core", "default_lp", "quick_restart"],
        ["core", "default_lp", "max_lp", "quick_restart"],  # BEST FOR NOW
    ],
    "ignore_subsolvers": [
        None,
        # [
        #     "scheduling_intervals_lns",
        #     "scheduling_precedences_lns",
        #     "scheduling_resource_windows_lns",
        #     "scheduling_time_window_lns",
        #     "rins/rens",
        # ],
        # [
        #     "scheduling_intervals_lns",
        #     "scheduling_precedences_lns",
        #     "scheduling_resource_windows_lns",
        #     "scheduling_time_window_lns",
        #     "rins/rens",
        #     "feasibility_pump",
        #     "graph_arc_lns",
        # ],
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
        # [
        #     "scheduling_intervals_lns",
        #     "scheduling_precedences_lns",
        #     "scheduling_resource_windows_lns",
        #     "scheduling_time_window_lns",
        #     "feasibility_pump",
        #     "rins/rens",
        # ],
    ],
    # "restart_algorithms": [
    #     # None,
    #     ["NO_RESTART"],
    #     ["LUBY_RESTART"],
    #     ["DL_MOVING_AVERAGE_RESTART"],
    #     ["LBD_MOVING_AVERAGE_RESTART"],
    #     ["FIXED_RESTART"],
    # ],
}

solver_params_list: List[SolverParams] = []


if __name__ == "__main__":
    current_folder = os.path.dirname(__file__)
    file_path_test_data = os.path.join(
        current_folder,
        "tests/test_data/250301_benoit_case.json",
    )
    dir_path_output = os.path.join(
        current_folder,
        "solver_parameter_tuning/parameter_test_output",
    )
    with open(file_path_test_data, "r", encoding="utf-8") as f:
        engine_inputs = EngineInputs.from_dict(json.load(f))
    ei_augmented = EngineInputsAugmented.from_engine_inputs(
        engine_inputs, penalties, model_config
    )
    inputs, _ = core_to_engine_inputs(ei_augmented)

    engine_cls = Engine
    run_parameter_tests(
        inputs=inputs,
        engine_cls=engine_cls,
        dir_path_output=dir_path_output,
        num_runs=10,
        run_base_case=True,
        run_default_case=True,
        parameter_tests=parameter_tests,
        solver_params_list=solver_params_list,
    )
