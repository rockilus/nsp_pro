from datetime import date
from typing import Dict, List

from shared.constraint_parser.mapping.map_constraint import MapConstaint
from shared.schemas.core import (
    ConstraintBuildAugmented,
    Constraints,
    ConstraintType,
    Penalties,
    Shift,
    Worker,
    WorkerDates,
)


# pylint: disable=too-many-arguments
def parse_constraints(
    cbas: List[ConstraintBuildAugmented],
    schedule_id: str,
    workers: List[Worker],
    worker_dim_dict: Dict,
    dates_hist: List[date],
    dates_campaign: List[date],
    periods_weekly: List[List[date]],
    periods_monthly: List[List[date]],
    periods_yearly: List[List[date]],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    shift_dim_dict: Dict,
    penalties: Penalties,
) -> Constraints:
    map_constraint = MapConstaint(
        workers,
        worker_dim_dict,
        dates_hist,
        dates_campaign,
        periods_weekly,
        periods_monthly,
        periods_yearly,
        worker_ids_to_worker_dates,
        shifts,
        shift_dim_dict,
        penalties,
    )
    # Build raw constraint lists
    sum_constraints = [
        map_constraint.map_constraint_sum(cba, schedule_id)
        for cba in cbas
        if cba.constraint_type == ConstraintType.SUM
    ] + [
        map_constraint.map_constraint_eve(cba, schedule_id)
        for cba in cbas
        if cba.constraint_type == ConstraintType.EVE
    ]

    seq_constraints = [
        map_constraint.map_constraint_seq(cba, schedule_id)
        for cba in cbas
        if cba.constraint_type == ConstraintType.SEQ
    ]

    ord_constraints = [
        map_constraint.map_constraint_ord(cba, schedule_id)
        for cba in cbas
        if cba.constraint_type == ConstraintType.ORD
    ]

    fil_constraints = [
        map_constraint.map_constraint_fil(cba, schedule_id)
        for cba in cbas
        if cba.constraint_type == ConstraintType.FIL
    ]

    fai_constraints = [
        map_constraint.map_constraint_fai(cba, schedule_id)
        for cba in cbas
        if cba.constraint_type == ConstraintType.FAI
    ]

    # Helper to determine if a constraint has non-empty variables.
    # Supports nested-list shapes and flat-list shapes.
    def _has_non_empty_variables(constraint) -> bool:
        cvars = getattr(constraint, "constraint_variables", None)
        if not cvars:
            return False
        # If first element is a list, keep if any inner list is non-empty
        first = cvars[0]
        if isinstance(first, list):
            return any(bool(inner) for inner in cvars)
        # Otherwise cvars is a flat list of tuples -> non-empty list means keep
        return len(cvars) > 0

    # Filter out constraints with empty constraint_variables
    sum_constraints = [
        c for c in sum_constraints if _has_non_empty_variables(c)
    ]
    seq_constraints = [
        c for c in seq_constraints if _has_non_empty_variables(c)
    ]
    ord_constraints = [
        c for c in ord_constraints if _has_non_empty_variables(c)
    ]
    fil_constraints = [
        c for c in fil_constraints if _has_non_empty_variables(c)
    ]
    fai_constraints = [
        c for c in fai_constraints if _has_non_empty_variables(c)
    ]

    return Constraints(
        sum=sum_constraints,
        seq=seq_constraints,
        ord=ord_constraints,
        fil=fil_constraints,
        fai=fai_constraints,
    )
