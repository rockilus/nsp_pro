from engine.types import (
    CoveragePenalty,
    ModelConfig,
    Penalties,
    Penalty,
    RequestPenalty,
    SolverParams,
    SolveStrategy,
    SystemConstraintPenalty,
    UserConstraintPenalty,
)

model_config = ModelConfig(
    penalties=Penalties(
        system_constraint=SystemConstraintPenalty(
            duty_recup=100,
            eve=Penalty(hard=1, soft=1),
            fai=Penalty(hard=1, soft=1),
        ),
        user_constraint=UserConstraintPenalty(
            eve=Penalty(hard=1, soft=1),
            fai=Penalty(hard=1, soft=1),
            fil=Penalty(hard=100, soft=1),
            ord=Penalty(hard=1, soft=1),
            seq=Penalty(hard=1, soft=1),
            sum=Penalty(hard=100, soft=1),
        ),
        coverage=CoveragePenalty(duty=10, normal=1),
        request=RequestPenalty(hard=10, soft=1),
    ),
    solver_params=SolverParams(
        max_time_in_seconds=20, solve_strategy=SolveStrategy.SEQUENTIAL
    ),
)


"""
MODEL CALIBRATION:

HARD CONSTRAINTS:
- Fixed assignments (passed assignments + campaign fixed assignments)
- No assignment overlap
- Coverage by specialty

SOFT CONSTRAINTS:
- Duty coverage
  - Obj impact per shift demand per day = penalty * delta
- Duty recuperation
    - Obj impact per missing recuperation = penalty
- Non duty coverage
- Linked shifts
- Worker-shift filters
- Requests
- Custom constraints
- Weekly worktime max
- Monthly number of duties max
- Weekly worktime desired
- Monthly number of duties desired
- Weekly worktime contract

STARTING POINT:
- Solution hint (previous campaign solution)

DEACTIVATED CONSTRAINTS:
"""
