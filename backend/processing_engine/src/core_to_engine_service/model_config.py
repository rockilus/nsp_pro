import os

from engine import ModelConfig, SolverParams, SolveStrategy, SystemConstraints

# for key, value in os.environ.items():
#     print(f"{key}: {value}")

pytest_mode = os.getenv("PYTEST_VERSION", "false").lower() != "false"
github_actions_mode = os.getenv("GITHUB_ACTIONS", "false").lower() == "true"

print(f"pytest_mode: {pytest_mode}")
print(f"github_actions_mode: {github_actions_mode}")

model_config = ModelConfig(
    solver_params=SolverParams(
        max_time_in_seconds=90 if github_actions_mode else 30,
        solve_strategy=SolveStrategy.HARD_TO_SOFT,
    ),
    system_constraints=SystemConstraints(
        weekly_target_work_time=not (pytest_mode or github_actions_mode)
    ),
)
