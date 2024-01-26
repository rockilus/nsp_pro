from constraint_parser.mapping.map_constraint import MapConstaint
from core.constraint import Constraint, ConstraintBuild
from scripts.setup_database import shift_db, worker_db


def constraint_parse(cstr_build: ConstraintBuild) -> Constraint:
    shifts = shift_db.get_shifts()
    workers = worker_db.get_workers()
    map_constraint = MapConstaint(workers, shifts)
    return map_constraint(cstr_build)
