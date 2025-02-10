from shared.schemas import (
    CoveragePenalty,
    Penalties,
    Penalty,
    SystemConstraintPenalty,
    UserConstraintPenalty,
)

# pylint: disable=R0801
penalties = Penalties(
    system_constraint=SystemConstraintPenalty(
        coverage=CoveragePenalty(duty=1000, normal=200),
        duty_recup=10000,
        worker_shift_filter=10000,
        link_shift=5,
        weekly_worktime_max=5,
        weekly_worktime_desired=3,
        weekly_worktime_contract=1,
        monthly_duties_max=5,
        monthly_duties_desired=3,
    ),
    user_constraint=UserConstraintPenalty(
        eve=Penalty(hard=100, soft=10),
        fai=Penalty(hard=100, soft=10),
        fil=Penalty(hard=100, soft=10),
        ord=Penalty(hard=100, soft=10),
        seq=Penalty(hard=100, soft=10),
        sum=Penalty(hard=100, soft=10),
        request=Penalty(hard=100, soft=10),
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
- Duty coverage: penalty * delta - 1
- Non duty coverage: penalty * delta - 0.2
- Requests: penalty (change to penalty per request) - 0.1 / 0.01
- Custom constraints
    - Sum: penalty * delta - 0.1 / 0.01
    - Seq: penalty * delta
    - Ord: penalty
    - Fil: penalty * num breaches
    - Eve
    - Fai
- Linked shifts: penalty - 0.005
- Weekly worktime max: penalty * delta - 0.005
- Monthly number of duties max: penalty * delta - 0.005
- Weekly worktime desired: penalty * delta
- Monthly number of duties desired: penalty * delta
- Weekly worktime contract: penalty * delta

STARTING POINT:
- Solution hint (previous campaign solution)

DEACTIVATED CONSTRAINTS:
"""
