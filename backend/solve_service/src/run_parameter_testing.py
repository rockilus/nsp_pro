import json
import os
from typing import Dict, List

from shared.schemas.core import (
    EngineInputs,
    EngineInputsAugmented,
    SolverParams,
)

from core_to_engine_service import core_to_engine_inputs
from engine import Engine
from solve_service.model_config import model_config
from solve_service.penalties import penalties
from solver_parameter_tuning.parameter_testing_v2 import run_parameter_tests

# from math import inf


params_test_limits: Dict[str, List] = {
    "interleave_search": [True, False],
}

params_test_other: Dict[str, List] = {
    "random_seed": [None, 1],
}

params_test_mutlithread: Dict[str, List] = {  # done
    "num_search_workers": [1, 2, 4, 8],
    "subsolvers": [
        None,  # Best
        ["core", "default_lp", "max_lp", "quick_restart"],  # BEST FOR NOW
    ],
    "ignore_subsolvers": [
        None,
        [
            "scheduling_resource_windows_lns",
            "scheduling_time_window_lns",
            "feasibility_pump",
        ],
        # pylint: disable=R0801
        [
            "scheduling_intervals_lns",
            "scheduling_precedences_lns",
            "scheduling_resource_windows_lns",
            "scheduling_time_window_lns",
            "feasibility_pump",
        ],  # Best
    ],
}


params_test_presolve: Dict[str, List] = {  # done
    "max_presolve_iterations": [1, 2, 3],  # 3
    # "cp_model_probing_level": [2, 3],  # 3
    # "detect_table_with_cost": [True, False],  # True
}

params_test_restart: Dict[str, List] = {  # done
    # "restart_algorithms": [
    #     None,
    #     ["LUBY_RESTART"],  # Best
    #     ["LBD_MOVING_AVERAGE_RESTART"],
    #     ["FIXED_RESTART"],
    # ],
    "restart_period": [40, 50, 60],  # 50
}

params_test_lp_relax: Dict[str, List] = {
    "linearization_level": [0, 1],
    "cut_level": [1, 2],
}
params_test_lns: Dict[str, List] = {
    "lns_initial_difficulty": [0.4, 0.5],
    "lns_initial_deterministic_limit": [0.1, 0.15, 0.2],
    # "use_symmetry_in_lp": [True, False],
    "symmetry_detection_deterministic_time_limit": [1, 2, 5],
    "diversify_lns_params": [True, False],
}

params_test_cp: Dict[str, List] = {
    "violation_ls_compound_move_probability": [0.5, 0.6, 0.7, 0.8],
    "feasibility_jump_var_perburbation_range_ratio": [0.05, 0.1, 0.2],
    "instantiate_all_variables": [True, False],
    "optimize_with_core": [True, False],
}

params_test_max_sat: Dict[str, List] = {
    "core_minimization_level": [1, 2],
}


# pylint: disable=R0801
params_tests_all: Dict[str, List] = {
    # LIMITS
    "interleave_search": [True, False],
    # OTHER PARAMETERs
    "random_seed": [1, 42, 123, 789],
    # PRESOLVE
    "probing_deterministic_time_limit": [0.1, 0.5, 1.0, 2.0, 5.0],
    "max_presolve_iterations": [1, 2, 3],
    "cp_model_probing_level": [0, 1, 2, 3],
    "detect_table_with_cost": [True, False],
    # MULTITHREAD
    "subsolvers": [
        None,
        ["core", "default_lp", "quick_restart"],
        ["core", "default_lp", "max_lp", "quick_restart"],  # BEST FOR NOW
    ],
    "ignore_subsolvers": [
        None,
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
    # RESTART
    "restart_period": [40, 50, 60],
    "restart_algorithms": [
        # None,
        ["NO_RESTART"],
        ["LUBY_RESTART"],
        ["DL_MOVING_AVERAGE_RESTART"],
        ["LBD_MOVING_AVERAGE_RESTART"],
        ["FIXED_RESTART"],
    ],
    # LINEAR PROGRAMMING RELAXATION
    "linearization_level": [0, 1, 2],
    "cut_level": [0, 1, 2],
    # LNS PARAMETERS
    "lns_initial_difficulty": [0.4, 0.5],
    "lns_initial_deterministic_limit": [0.1, 0.15, 0.2],
    "use_lns_only": [True, False],
    "use_combined_no_overlap": [True, False],
    "symmetry_level": [1, 2, 3, 4],
    "use_symmetry_in_lp": [True, False],
    "symmetry_detection_deterministic_time_limit": [1, 2, 5],
    "diversify_lns_params": [True, False],
    # CONSTRAINT PROGRAMMING PARAMETERS
    "use_strong_propagation_in_disjunctive": [True, False],
    "violation_ls_compound_move_probability": [0.5, 0.6, 0.7, 0.8],
    "feasibility_jump_var_perburbation_range_ratio": [0.05, 0.1, 0.2],
    "instantiate_all_variables": [True, False],
    "optimize_with_core": [True, False],
    # MAX_SAT PARAMETERS
    "core_minimization_level": [1, 2],
}

parameter_tests: Dict[str, List] = {
    # **params_test_mutlithread,
    # **params_test_presolve,
    # **params_test_restart,
    # **params_test_lp_relax,
    # **params_test_lns,
    # **params_test_cp,
    # **params_test_max_sat,
}

solver_params_list: List[SolverParams] = [
    # SolverParams(
    #     core_minimization_level=1,
    #     cp_model_probing_level=2,
    #     cut_level=2,
    #     detect_table_with_cost=False,
    #     diversify_lns_params=False,
    #     feasibility_jump_var_perburbation_range_ratio=0.1,
    #     ignore_subsolvers=[
    #         "scheduling_resource_windows_lns",
    #         "scheduling_time_window_lns",
    #         "feasibility_pump",
    #     ],
    #     instantiate_all_variables=True,
    #     interleave_search=False,
    #     linearization_level=0,
    #     lns_initial_deterministic_limit=0.15,
    #     lns_initial_difficulty=0.5,
    #     log_search_progress=True,
    #     log_subsolver_statistics=True,
    #     max_presolve_iterations=1,
    #     max_time_in_seconds=30,
    #     num_search_workers=8,
    #     optimize_with_core=False,
    #     probing_deterministic_time_limit=1.0,
    #     random_seed=1,
    #     restart_algorithms=None,
    #     restart_period=50,
    #     subsolvers=["core", "default_lp", "max_lp", "quick_restart"],
    #     symmetry_detection_deterministic_time_limit=2,
    #     symmetry_level=2,
    #     use_combined_no_overlap=False,
    #     use_lns_only=False,
    #     use_strong_propagation_in_disjunctive=False,
    #     use_symmetry_in_lp=True,
    #     violation_ls_compound_move_probability=0.6,
    # ),
    # SolverParams(
    #     core_minimization_level=2,
    #     cp_model_probing_level=2,
    #     cut_level=2,
    #     detect_table_with_cost=True,
    #     diversify_lns_params=True,
    #     feasibility_jump_var_perburbation_range_ratio=0.1,
    #     ignore_subsolvers=[
    #         "scheduling_resource_windows_lns",
    #         "scheduling_time_window_lns",
    #         "feasibility_pump",
    #     ],
    #     instantiate_all_variables=False,
    #     interleave_search=False,
    #     linearization_level=1,
    #     lns_initial_deterministic_limit=0.2,
    #     lns_initial_difficulty=0.5,
    #     log_search_progress=True,
    #     log_subsolver_statistics=True,
    #     max_presolve_iterations=2,
    #     max_time_in_seconds=30,
    #     num_search_workers=8,
    #     optimize_with_core=True,
    #     probing_deterministic_time_limit=1.0,
    #     random_seed=1,
    #     restart_algorithms=None,
    #     restart_period=50,
    #     subsolvers=["core", "default_lp", "max_lp", "quick_restart"],
    #     symmetry_detection_deterministic_time_limit=2,
    #     symmetry_level=2,
    #     use_combined_no_overlap=False,
    #     use_lns_only=False,
    #     use_strong_propagation_in_disjunctive=False,
    #     use_symmetry_in_lp=True,
    #     violation_ls_compound_move_probability=0.7,
    # ),
    # SolverParams(
    #     core_minimization_level=2,
    #     cp_model_probing_level=3,
    #     cut_level=2,
    #     detect_table_with_cost=True,
    #     diversify_lns_params=True,
    #     feasibility_jump_var_perburbation_range_ratio=0.05,
    #     ignore_subsolvers=[
    #         "scheduling_resource_windows_lns",
    #         "scheduling_time_window_lns",
    #         "feasibility_pump",
    #     ],
    #     instantiate_all_variables=False,
    #     interleave_search=False,
    #     linearization_level=1,
    #     lns_initial_deterministic_limit=0.2,
    #     lns_initial_difficulty=0.4,
    #     log_search_progress=True,
    #     log_subsolver_statistics=True,
    #     max_presolve_iterations=2,
    #     max_time_in_seconds=30,
    #     num_search_workers=8,
    #     optimize_with_core=True,
    #     probing_deterministic_time_limit=0.5,
    #     random_seed=1,
    #     restart_algorithms=None,
    #     restart_period=50,
    #     subsolvers=["core", "default_lp", "max_lp", "quick_restart"],
    #     symmetry_detection_deterministic_time_limit=5,
    #     symmetry_level=3,
    #     use_combined_no_overlap=False,
    #     use_lns_only=False,
    #     use_strong_propagation_in_disjunctive=False,
    #     use_symmetry_in_lp=False,
    #     violation_ls_compound_move_probability=0.7,
    # ),
]


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

    inputs.model_config.solver_params.max_time_in_seconds = 30
    inputs.model_config.solver_params.num_search_workers = 8
    inputs.model_config.solver_params.log_search_progress = True
    inputs.model_config.solver_params.log_subsolver_statistics = True
    inputs.model_config.solver_params.random_seed = 1

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
