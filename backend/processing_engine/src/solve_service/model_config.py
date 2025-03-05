import os

from shared.schemas import (
    ConfigurationConstraints,
    CustomSolverParams,
    ModelConfig,
    ModelSetup,
    SolverParams,
    SolveStrategy,
    SystemConstraints,
)

# for key, value in os.environ.items():
#     print(f"{key}: {value}")

environment = os.getenv("ENVIRONMENT", "development").lower()
pytest_mode = os.getenv("PYTEST_VERSION", "false").lower() != "false"
github_actions_mode = os.getenv("GITHUB_ACTIONS", "false").lower() == "true"
test_mode = pytest_mode or github_actions_mode

print(f"environment: {environment}")
print(f"pytest_mode: {pytest_mode}")
print(f"github_actions_mode: {github_actions_mode}")

cpu_count = os.cpu_count() or 1

num_search_workers = 2
if (pytest_mode and environment == "production") or (
    not pytest_mode and environment == "development"
):
    num_search_workers = cpu_count
print(f"num_search_workers: {num_search_workers}")


def get_max_time_in_seconds(is_test: bool, in_github: bool, cur_env: str) -> int:
    if is_test:
        if not in_github:
            return 3
        return 5
    if cur_env == "development":
        return 60
    if cur_env == "production":
        return 45
    return 30


model_config = ModelConfig(
    solver_params=SolverParams(
        # max_time_in_seconds=5 if test_mode else 30,
        max_time_in_seconds=get_max_time_in_seconds(
            test_mode, github_actions_mode, environment
        ),
        num_search_workers=num_search_workers,
        log_search_progress=False,
        subsolvers=[
            "core",
            "default_lp",
            "max_lp",
            "quick_restart",
        ],
        ignore_subsolvers=[
            # "scheduling_intervals_lns",  # remove
            # "scheduling_precedences_lns",  # remove
            "scheduling_resource_windows_lns",
            "scheduling_time_window_lns",
            "feasibility_pump",
        ],
        core_minimization_level=1,
        cut_level=2,
        feasibility_jump_var_perburbation_range_ratio=0.1,
        linearization_level=0,
        lns_initial_deterministic_limit=0.15,
        max_presolve_iterations=1,
        symmetry_detection_deterministic_time_limit=2,
        use_symmetry_in_lp=True,
        violation_ls_compound_move_probability=0.6,
    ),
    custom_solver_params=CustomSolverParams(
        limit_number_solution=None, solve_strategy=SolveStrategy.HARD_TO_SOFT
    ),
    model_setup=ModelSetup(sol_hint=False),
    configuration_constraints=ConfigurationConstraints(work_loads=False),
    system_constraints=SystemConstraints(
        weekly_target_work_time=not test_mode,
        weekly_target_worktime_tolerance=0.2 if not test_mode else 0.0,
        monthly_target_nb_duties=not test_mode,
        mthly_target_nb_duty_tolerance=0.2 if not test_mode else 0.0,
        special_days_target_nb_duties=not test_mode,
    ),
)


# SolverParams(
#     # mutlithread
#     ignore_subsolvers=[
#         "scheduling_intervals_lns",
#         "scheduling_precedences_lns",
#         "scheduling_resource_windows_lns",
#         "scheduling_time_window_lns",
#         "rins/rens",
#     ],
#     # linear programming relaxation
#     linearization_level=2,
#     cut_level=2,
#     # constraint programming parameters
#     use_strong_propagation_in_disjunctive=True,
#     violation_ls_compound_move_probability=0.3,  # to test
#     feasibility_jump_var_perburbation_range_ratio=0.3,  # to test
#     # lns parameters
#     use_combined_no_overlap=True,
#     lns_initial_deterministic_limit=0.15,
#     lns_initial_difficulty=0.4,  # 0.6 - to test
# )

# to test: core, default_lp, quick restart
# to test: core, default_lp, quick restart, max_lp
