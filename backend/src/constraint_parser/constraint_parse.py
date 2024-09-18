from typing import Dict, List

from constraint_parser.mapping.map_constraint import MapConstaint
from core import Constraint, ConstraintBuildAugmented, Shift, Worker


# pylint: disable=too-many-arguments
def parse_constraint(
    cstr_build: ConstraintBuildAugmented,
    workers: List[Worker],
    shifts: List[Shift],
    worker_dim_dict: Dict,
    shift_dim_dict: Dict,
    schedule_id: str,
) -> Constraint:
    map_constraint = MapConstaint(workers, shifts, worker_dim_dict, shift_dim_dict)
    return map_constraint(cstr_build, schedule_id)
