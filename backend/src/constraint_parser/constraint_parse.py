from typing import Dict

from constraint_parser.mapping.constraint_mapping import ConstraintMapping
from core.constraint import Constraint, ConstraintBuild
from scripts.setup_database import shift_db, worker_db


def constraint_parse(cstr_build: ConstraintBuild) -> Constraint:
    shifts = shift_db.get_shifts()
    workers = worker_db.get_workers()
    worker_dimensions: Dict = {}
    shift_dimensions: Dict = {}
    constraint_mapping = ConstraintMapping(
        workers,
        shifts,
        worker_dimensions,
        shift_dimensions,
    )
    constraint = constraint_mapping(cstr_build)
    return constraint
