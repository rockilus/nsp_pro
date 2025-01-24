from engine.types import (
    CoveragePenalty,
    ModelConfig,
    Penalties,
    Penalty,
    RequestPenalty,
    SolverParams,
    SystemConstraintPenalty,
    UserConstraintPenalty,
)

model_config = ModelConfig(
    penalties=Penalties(
        system_constraint=SystemConstraintPenalty(
            eve=Penalty(hard=1, soft=1),
            fai=Penalty(hard=1, soft=1),
        ),
        user_constraint=UserConstraintPenalty(
            eve=Penalty(hard=1, soft=1),
            fai=Penalty(hard=1, soft=1),
            fil=Penalty(hard=1, soft=1),
            ord=Penalty(hard=1, soft=1),
            seq=Penalty(hard=1, soft=1),
            sum=Penalty(hard=10, soft=1),
        ),
        coverage=CoveragePenalty(hard=10),
        request=RequestPenalty(hard=10, soft=1),
    ),
    solver_params=SolverParams(max_time_in_seconds=20),
)
