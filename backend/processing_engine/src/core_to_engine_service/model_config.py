import os

from engine import ModelConfig, SolverParams, SolveStrategy, SystemConstraints

# for key, value in os.environ.items():
#     print(f"{key}: {value}")

pytest_mode = os.getenv("PYTEST_VERSION", "false").lower() != "false"
github_actions_mode = os.getenv("GITHUB_ACTIONS", "false").lower() == "true"
test_mode = pytest_mode or github_actions_mode

print(f"pytest_mode: {pytest_mode}")
print(f"github_actions_mode: {github_actions_mode}")

model_config = ModelConfig(
    solver_params=SolverParams(
        max_time_in_seconds=90 if github_actions_mode else 90,
        solve_strategy=SolveStrategy.HARD_TO_SOFT,
    ),
    system_constraints=SystemConstraints(
        weekly_target_work_time=not test_mode,
        weekly_target_worktime_tolerance=0.2 if not test_mode else 0.0,
        monthly_target_nb_duties=not test_mode,
        mthly_target_nb_duty_tolerance=0.2 if not test_mode else 0.0,
        special_days_target_nb_duties=not test_mode,
    ),
)
