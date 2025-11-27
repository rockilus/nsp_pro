from datetime import date
from typing import Dict, List, Tuple

from shared.constraint_parser.parse_constraints import parse_constraints
from shared.schemas.core import (
    ConstraintBuildAugmented,
    ConstraintOperator,
    Constraints,
    ConstraintSum,
    ConstraintType,
    Penalties,
    Schedule,
    Shift,
    Worker,
    WorkerDates,
)


# pylint: disable=too-many-arguments, R0801
def build_engine_constraints(
    cbs_augmented: List[ConstraintBuildAugmented],
    schedule: Schedule,
    workers: List[Worker],
    dim_to_attr_value_to_worker: Dict,
    dates_hist: List[date],
    dates_campaign: List[date],
    periods_weekly: List[List[date]],
    periods_monthly: List[List[date]],
    periods_yearly: List[List[date]],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    dim_to_attr_value_to_shift: Dict,
    penalties: Penalties,
) -> Constraints:
    constraints = parse_constraints(
        cbs_augmented,
        schedule.id,
        workers,
        dim_to_attr_value_to_worker,
        dates_hist,
        dates_campaign,
        periods_weekly,
        periods_monthly,
        periods_yearly,
        worker_ids_to_worker_dates,
        shifts,
        dim_to_attr_value_to_shift,
        penalties,
    )
    constraints.sum += _build_quick_staffing_constraints(
        schedule,
        workers,
        worker_ids_to_worker_dates,
        shifts,
        penalties.user_constraint.sum.hard,
    )
    return constraints


def _build_quick_staffing_constraints(
    schedule: Schedule,
    workers: List[Worker],
    worker_ids_to_worker_dates: Dict[str, WorkerDates],
    shifts: List[Shift],
    penalty: int,
) -> List[ConstraintSum]:
    out: List[ConstraintSum] = []
    for qs in schedule.quick_staffings:
        worker = next((w for w in workers if w.id == qs.worker_id), None)
        shift = next((s for s in shifts if s.id == qs.shift_id), None)
        if worker is None or shift is None:
            continue
        constraints_vars: List[List[Tuple[str, str, str]]] = [
            [
                (worker.id, d.isoformat(), shift.id)
                for d in worker_ids_to_worker_dates[worker.id].dates_campaign
            ]
        ]
        out.append(
            ConstraintSum(
                id="",
                constraint_type=ConstraintType.SUM,
                operator=ConstraintOperator.EQUAL,
                target_value=qs.target,
                target_unit="shift",
                constraint_variables=constraints_vars,
                target_values=[qs.target],  # Single period for quick staffing
                active=True,
                hard=True,
                priority="high",
                penalty=penalty,
                schedule_id=schedule.id,
                constraint_build_id="",
            )
        )
    return out
