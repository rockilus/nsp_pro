from constraint_parser.mapping.map_constraint import MapConstaint
from core.constraint import Constraint, ConstraintBuild
from scripts.setup_database import (
    shift_db,
    shift_property_db,
    worker_db,
    worker_property_db,
)


def constraint_parse(cstr_build: ConstraintBuild) -> Constraint:
    shifts = shift_db.get_shifts()
    workers = worker_db.get_workers()
    worker_dim_dict = worker_property_db.get_workers_id_by_dim_and_prop()
    shift_dim_dict = shift_property_db.get_shifts_id_by_dim_and_prop()
    map_constraint = MapConstaint(workers, shifts, worker_dim_dict, shift_dim_dict)
    return map_constraint(cstr_build)
