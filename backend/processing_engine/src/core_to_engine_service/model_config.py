import os

from engine import ModelConfig, SolverParams, SolveStrategy, SystemConstraints

pytest_mode = os.getenv("PYTEST_RUNNING", "false").lower() == "true"
github_actions_mode = os.getenv("GITHUB_ACTIONS", "false").lower() == "true"

model_config = ModelConfig(
    solver_params=SolverParams(
        max_time_in_seconds=90 if github_actions_mode else 30,
        solve_strategy=SolveStrategy.HARD_TO_SOFT,
    ),
    system_constraints=SystemConstraints(
        weekly_target_work_time=not (pytest_mode or github_actions_mode)
    ),
)
