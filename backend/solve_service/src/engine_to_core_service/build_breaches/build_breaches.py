from typing import List

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
