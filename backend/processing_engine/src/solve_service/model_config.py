import os

from shared.schemas import (
    ConfigurationConstraints,
    ModelConfig,
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


def get_max_time_in_seconds(test_mode, github_actions_mode, environment):
    if test_mode:
        if not github_actions_mode:
            return 3
        else:
            return 5
    else:
        if environment == "development":
            return 30
        elif environment == "production":
            return 45
    return 30


model_config = ModelConfig(
    solver_params=SolverParams(
        # max_time_in_seconds=5 if test_mode else 30,
        max_time_in_seconds=get_max_time_in_seconds(
            test_mode, github_actions_mode, environment
        ),
        num_search_workers=num_search_workers,
        limit_number_solution=None,
        solve_strategy=SolveStrategy.HARD_TO_SOFT,
    ),
    configuration_constraints=ConfigurationConstraints(work_loads=False),
    system_constraints=SystemConstraints(
        weekly_target_work_time=not test_mode,
        weekly_target_worktime_tolerance=0.2 if not test_mode else 0.0,
        monthly_target_nb_duties=not test_mode,
        mthly_target_nb_duty_tolerance=0.2 if not test_mode else 0.0,
        special_days_target_nb_duties=not test_mode,
    ),
)
