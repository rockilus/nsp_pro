from engine.types import (
    CoveragePenalty,
    ModelConfig,
    Penalties,
    Penalty,
    SolverParams,
    SolveStrategy,
    SystemConstraintPenalty,
    UserConstraintPenalty,
)

model_config = ModelConfig(
    penalties=Penalties(
        system_constraint=SystemConstraintPenalty(
            coverage=CoveragePenalty(duty=10, normal=1),
            duty_recup=100,
            worker_shift_filter=100,
            link_shift=100,
            weekly_worktime_max=100,
            weekly_worktime_desired=100,
            weekly_worktime_contract=100,
            monthly_duties_max=100,
            monthly_duties_desired=100,
        ),
        user_constraint=UserConstraintPenalty(
            eve=Penalty(hard=1, soft=1),
            fai=Penalty(hard=1, soft=1),
            fil=Penalty(hard=100, soft=1),
            ord=Penalty(hard=1, soft=1),
            seq=Penalty(hard=1, soft=1),
            sum=Penalty(hard=100, soft=1),
            request=Penalty(hard=10, soft=1),
        ),
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
- Worker-shift filters: penalty
- Duty recuperation: penalty

SOFT CONSTRAINTS:
- Duty coverage: penalty * delta
- Non duty coverage: penalty * delta
- Requests: penalty (change to penalty per request)
- Custom constraints
    - Sum: penalty * delta
    - Seq: penalty * delta
    - Ord: penalty
    - Fil: penalty * num breaches
    - Eve
    - Fai
- Linked shifts: penalty
- Weekly worktime max: penalty * delta
- Monthly number of duties max: penalty * delta
- Weekly worktime desired: penalty * delta
- Monthly number of duties desired: penalty * delta
- Weekly worktime contract: penalty * delta

STARTING POINT:
- Solution hint (previous campaign solution)

DEACTIVATED CONSTRAINTS:
"""
