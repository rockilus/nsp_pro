from datetime import date
from typing import Dict, List

from constraint_parser.mapping.map_constraint import MapConstaint
from core import ConstraintBuildAugmented, Constraints, ConstraintType, Shift, Worker


# pylint: disable=too-many-arguments
def parse_constraint(
    cbas: List[ConstraintBuildAugmented],
    schedule_id: str,
    workers: List[Worker],
    worker_dim_dict: Dict,
    days_solving: List[date],
    shifts: List[Shift],
    shift_dim_dict: Dict,
) -> Constraints:
    map_constraint = MapConstaint(
        workers, worker_dim_dict, days_solving, shifts, shift_dim_dict
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
