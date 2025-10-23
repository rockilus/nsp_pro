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
    return Constraints(
        sum=[
            map_constraint.map_constraint_sum(cba, schedule_id)
            for cba in cbas
            if cba.constraint_type == ConstraintType.SUM
        ]
        + [
            map_constraint.map_constraint_eve(cba, schedule_id)
            for cba in cbas
            if cba.constraint_type == ConstraintType.EVE
        ],
        seq=[
            map_constraint.map_constraint_seq(cba, schedule_id)
            for cba in cbas
            if cba.constraint_type == ConstraintType.SEQ
        ],
        ord=[
            map_constraint.map_constraint_ord(cba, schedule_id)
            for cba in cbas
            if cba.constraint_type == ConstraintType.ORD
        ],
        fil=[
            map_constraint.map_constraint_fil(cba, schedule_id)
            for cba in cbas
            if cba.constraint_type == ConstraintType.FIL
        ],
        fai=[
            map_constraint.map_constraint_fai(cba, schedule_id)
            for cba in cbas
            if cba.constraint_type == ConstraintType.FAI
        ],
    )
