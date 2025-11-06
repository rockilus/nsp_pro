from typing import List, Dict
from engine.types import (
    GroupsAssignmentsDurationsTargetConstraint,
    GroupsAssignmentsTargetConstraint,
)

from shared.schemas.core import (
    Assignment,
    Breach,
    LinkShift,
    RequestAugmented,
    Schedule,
    Shift,
    ShiftDemandNew,
    Worker,
    Penalties,
)
from shared.schemas.core import (
    ConstraintOperator,
    ConstraintSeq,
    ConstraintFil,
    ConstraintSum,
)

from engine import Breach as BreachEngine
from engine import Outputs as OutputsEngine
from engine import ProcessingCache
from engine_to_core_service.build_breaches.build_breaches_model import (
    build_breaches_model,
)
from engine_to_core_service.build_breaches.build_breaches_not_model import (
    build_breaches_not_model,
)


# pylint: disable=too-many-arguments, R0801
def build_breaches(
    schedule: Schedule,
    workers: List[Worker],
    shifts: List[Shift],
    link_shifts: List[LinkShift],
    daily_shift_demand: List[ShiftDemandNew],
    assignments: List[Assignment],
    requests: List[RequestAugmented],
    breaches_engine: List[BreachEngine],
    processing_cache: ProcessingCache,
    outputs: OutputsEngine | None = None,
    penalties: Penalties | None = None,
) -> List[Breach]:
    breaches_model = build_breaches_model(
        schedule,
        workers,
        shifts,
        link_shifts,
        daily_shift_demand,
        assignments,
        processing_cache.constraints,
        requests,
        breaches_engine,
    )
    breaches_not_model = build_breaches_not_model(
        schedule,
        workers,
        shifts,
        assignments,
        processing_cache,
    )
    # If an Outputs object was provided, print quick debugging stats
    if outputs is not None and penalties is not None:
        try:
            _print_breaches_debug_stats(
                outputs=outputs, breaches=breaches_model, penalties=penalties
            )
        except Exception:
            # Never fail the normal flow because of debug printing
            pass
    return breaches_model + breaches_not_model


def calculate_breach_penalty_fil(
    breach: Breach,
    assignments: List[Assignment],
    penalty: int,
    constraint: ConstraintFil | None = None,
) -> int:
    """Calculate the total penalty for a FIL-type breach.

    Behavior depends on the constraint operator:
    - If operator == YES: `constraint.constraint_variables` list the allowed
      (worker,date,shift) coordinates. Violations are assignments on the same
      worker/date that have a shift not in the allowed set.
    - If operator == NO: `constraint.constraint_variables` list the forbidden
      coordinates. Violations are assignments that match those coordinates.

    If `constraint` is None we fall back to counting assignments that match
    `breach.variables` (legacy behavior/tests).

    Args:
        breach: The Breach object containing variables to check.
        assignments: List of Assignment objects to count against the breach.
        penalty: Penalty value (int) to apply per matching assignment.
        constraint: Optional ConstraintFil that provides the operator and the
            canonical constraint variables.

    Returns:
        The total penalty for this breach (penalty * matched_count).
    """
    # Coordinate set for variables present in the breach/constraint
    breach_coords = {
        (var.worker_id, var.date, var.shift_id) for var in breach.variables
    }

    if (
        constraint is not None
        and constraint.operator == ConstraintOperator.YES
    ):
        # Allowed list: violations are assignments for the same worker/date
        # whose shift is not in the allowed set.
        workers_dates = {(v.worker_id, v.date) for v in breach.variables}
        nb_a_period = sum(
            1
            for assignment in assignments
            if (assignment.worker_id, assignment.date) in workers_dates
            and (
                assignment.worker_id,
                assignment.date,
                assignment.shift_id,
            )
            not in breach_coords
        )
    else:
        # Default / NO operator: violations are assignments that match
        # the listed coordinates.
        nb_a_period = sum(
            1
            for assignment in assignments
            if (
                assignment.worker_id,
                assignment.date,
                assignment.shift_id,
            )
            in breach_coords
        )

    return penalty * nb_a_period


def calculate_breach_penalty_seq(
    breach: Breach,
    assignments: List[Assignment],
    penalty: int,
    constraint: ConstraintSeq,
) -> int:
    """Calculate the total penalty for a SEQ-type breach.

    The calculation follows the logic used in the tests:

    - Count how many assignments match any of the breach.variables
      (worker_id, date and shift_id).
    - Apply the operator/target_value rule to compute the deviation, then
      multiply by the penalty.

    If `constraint` is not provided the function falls back to a
    best-effort default: `target_value=0` and
    `operator=ConstraintOperator.EQUAL`.

    Args:
        breach: The Breach object containing variables to check.
        assignments: List of Assignment objects to count against the breach.
        penalty: Penalty value (int) to apply per unit of deviation.
        constraint: Optional ConstraintSeq instance to derive target/operator.

    Returns:
        The total penalty for this breach.
    """
    # Build a set of coordinate tuples for faster membership checks
    breach_coords = {
        (var.worker_id, var.date, var.shift_id) for var in breach.variables
    }

    nb_a_period = sum(
        1
        for assignment in assignments
        if (
            assignment.worker_id,
            assignment.date,
            assignment.shift_id,
        )
        in breach_coords
    )

    # Derive operator and target_value from provided constraint if present
    target_value = constraint.target_value
    operator = constraint.operator

    if operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
        deviation = max(nb_a_period - target_value, 0)
    elif operator == ConstraintOperator.EQUAL:
        deviation = abs(target_value - nb_a_period)
    elif operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
        deviation = max(target_value - nb_a_period, 0)
    else:
        # Fallback: treat as absolute difference
        deviation = abs(target_value - nb_a_period)

    return penalty * deviation


def calculate_breach_penalty_sum(
    breach: Breach,
    assignments: List[Assignment],
    penalty: int,
    constraint: "ConstraintSum",
) -> int:
    """Calculate the total penalty for a SUM-type breach.

    Uses the same logic as the tests in `constraint_sum_test.py`:
    - Count assignments that match any of the breach.variables (worker_id,
      date, shift_id).
    - Apply operator/target_value rules:
      * LESS_THAN_OR_EQUAL: penalty * max(nb - target, 0)
      * EQUAL: penalty * abs(target - nb)
      * GREATER_THAN_OR_EQUAL: penalty * max(target - nb, 0)

    Args:
        breach: The Breach object containing variables to check.
        assignments: List of Assignment objects to count against the breach.
        penalty: Penalty value (int) to apply per unit of deviation.
        constraint: ConstraintSum instance used to get operator/target.

    Returns:
        The total penalty for this breach.
    """
    breach_coords = {
        (var.worker_id, var.date, var.shift_id) for var in breach.variables
    }

    nb_a_period = sum(
        1
        for assignment in assignments
        if (
            assignment.worker_id,
            assignment.date,
            assignment.shift_id,
        )
        in breach_coords
    )

    target_value = constraint.target_value
    operator = constraint.operator or ConstraintOperator.EQUAL

    if operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
        deviation = max(nb_a_period - target_value, 0)
    elif operator == ConstraintOperator.EQUAL:
        deviation = abs(target_value - nb_a_period)
    elif operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
        deviation = max(target_value - nb_a_period, 0)
    else:
        deviation = abs(target_value - nb_a_period)

    return penalty * deviation


def calculate_breach_penalty_shift_demand(
    breach: Breach,
    assignments: List[Assignment],
    penalty: int,
    target: int,
) -> int:
    """Calculate penalty for a shift demand breach.

    Mirrors AddCoverage hard-to-soft logic: penalty is applied to the
    absolute difference between assigned count and target. We count how many
    assignments in `assignments` match the breach.variables and compute
    penalty * abs(count - target).
    """
    breach_coords = {
        (var.worker_id, var.date, var.shift_id) for var in breach.variables
    }

    nb_assigned = sum(
        1
        for assignment in assignments
        if (
            assignment.worker_id,
            assignment.date,
            assignment.shift_id,
        )
        in breach_coords
    )

    return penalty * abs(nb_assigned - target)


def _print_breaches_debug_stats(
    outputs: OutputsEngine, breaches: List[Breach], penalties: Penalties
) -> None:
    """Print simple debug stats about solver outputs and breaches.

    Prints:
      - outputs.objective_value
      - number of raw engine breaches (len(outputs.breaches))
      - number of converted/model breaches per ObjectiveCategory
    """
    # Print objective value and raw engine breaches count
    print(f"Solver objective_value: {outputs.objective_value}")
    raw_breaches_len = len(outputs.breaches)
    print(f"Raw engine breaches (outputs.breaches): {raw_breaches_len}")

    # Group model breaches by objective category
    counts: dict[str, int] = {}
    for b in breaches:
        key = str(b.objective_category.name)
        counts[key] = counts.get(key, 0) + 1

    print("Model breaches by ObjectiveCategory:")
    if not counts:
        print("  (no model breaches)")
    else:
        for cat, cnt in sorted(counts.items()):
            print(f"  {cat}: {cnt}")


# Ord / request penalty: just number of breaches * penalty


def calculate_breach_penalty_work_time_week_target(
    breach: Breach,
    assignments: List[Assignment],
    penalty: int,
    constraint: GroupsAssignmentsDurationsTargetConstraint,
) -> int:
    """Compute penalty for work-time week target breaches.

    Implements the numeric steps used in
    Model.add_target_work_time_constraints.

    Steps (summary):
      - weighted_sum = sum(duration_i for assigned vars)
      - weighted_sum_x100 = weighted_sum * 100
      - tolerance_x100 = round(target * tolerance * 100)
      - division_result = (weighted_sum_x100 - tolerance_x100) // target
        (or plain subtraction when target == 0)
      - excess = max(division_result - 100, 0)
      - return penalty * excess

    The function maps tuples from constraint.assignments to durations using
    constraint.durations and finds the corresponding target/tolerance for the
    group that contains the breach variables. If no group matches, it falls
    back to target=0 and tolerance=0.
    """
    breach_coords = {
        (var.worker_id, var.date, var.shift_id) for var in breach.variables
    }

    # Build mapping from assignment tuple -> duration and tuple -> group idx.
    # Use untyped tuple keys to avoid strict typing mismatches across modules.
    assignment_to_duration: Dict[tuple, int] = {}
    assignment_to_group: Dict[tuple, int] = {}
    for g_idx, group_assignments in enumerate(constraint.assignments):
        # support older constraint shapes that include durations, but
        # default to unit durations when not provided
        group_durations = getattr(
            constraint, "durations", [None] * len(group_assignments)
        )
        if not group_durations or (
            len(group_durations) != len(group_assignments)
        ):
            group_durations = [1] * len(group_assignments)
        for a, d in zip(group_assignments, group_durations):
            # a is expected to be a tuple like (worker_id, date, shift_id)
            assignment_to_duration[a] = d
            assignment_to_group[a] = g_idx

    # Find group index for this breach by looking up any breach variable
    group_idx = None
    for var in breach.variables:
        key = (var.worker_id, var.date, var.shift_id)
        if key in assignment_to_group:
            group_idx = assignment_to_group[key]
            break

    # Derive target and tolerance for the group (fallbacks if not found)
    if group_idx is None:
        target = (
            constraint.targets[0]
            if getattr(constraint, "targets", None)
            else 0
        )
        tolerance = getattr(constraint, "tolerance", 0)
    else:
        target = constraint.targets[group_idx]
        tolerance = getattr(constraint, "tolerance", 0)

    # Sum durations for assignments that are both present in the solution and
    # belong to the breach coordinates
    weighted_sum = 0
    for assignment in assignments:
        key = (assignment.worker_id, assignment.date, assignment.shift_id)
        if key in breach_coords and key in assignment_to_duration:
            weighted_sum += assignment_to_duration[key]

    weighted_sum_x100 = weighted_sum * 100
    tolerance_x100 = round(target * tolerance * 100)

    if target == 0:
        division_result = weighted_sum_x100 - tolerance_x100
    else:
        # Integer division to mimic AddDivisionEquality behaviour
        division_result = (weighted_sum_x100 - tolerance_x100) // target

    excess = max(division_result - 100, 0)

    return penalty * excess


def calculate_breach_penalty_nb_duties_target(
    breach: Breach,
    assignments: List[Assignment],
    penalty: int,
    constraint: GroupsAssignmentsTargetConstraint,
) -> int:
    """Penalty for monthly target nb duties.

    Uses GroupsAssignmentsTargetConstraint shape.

    Logic mirrors Model.add_target_nb_duties_constraints: count assigned
    variables for the group, apply tolerance and target to compute an integer
    division result, then excess = max(division_result - 100, 0). Return
    penalty * excess.
    """
    breach_coords = {
        (var.worker_id, var.date, var.shift_id) for var in breach.variables
    }

    # Map assignment tuple to group index
    assignment_to_group: Dict[tuple, int] = {}
    for g_idx, group_assignments in enumerate(constraint.assignments):
        for a in group_assignments:
            assignment_to_group[a] = g_idx

    # find group index for breach
    group_idx = None
    for var in breach.variables:
        key = (var.worker_id, var.date, var.shift_id)
        if key in assignment_to_group:
            group_idx = assignment_to_group[key]
            break

    if group_idx is None:
        target = (
            constraint.targets[0]
            if getattr(constraint, "targets", None)
            else 0
        )
        tolerance = getattr(constraint, "tolerance", 0)
    else:
        target = constraint.targets[group_idx]
        tolerance = getattr(constraint, "tolerance", 0)

    # Count assignments present in solution that belong to the group
    count = 0
    for assignment in assignments:
        key = (assignment.worker_id, assignment.date, assignment.shift_id)
        if key in breach_coords and assignment_to_group.get(key) == group_idx:
            count += 1

    weighted_sum_x100 = count * 100
    tolerance_x100 = round(target * tolerance * 100)

    if target == 0:
        division_result = weighted_sum_x100 - tolerance_x100
    else:
        division_result = (weighted_sum_x100 - tolerance_x100) // target

    excess = max(division_result - 100, 0)
    return penalty * excess
