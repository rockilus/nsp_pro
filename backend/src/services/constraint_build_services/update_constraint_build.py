# pylint: disable=R0801
from core import ConstraintBuild, ConstraintBuildAugmented
from scripts.setup_database import (
    constraint_build_db,
    dimension_db,
    shift_db,
    worker_db,
    worker_dimension_db,
)
from services.constraint_build_services.cb_to_cb_augmented import cb_to_cb_augmented


def update_constraint_build(
    new_cb: ConstraintBuild,
) -> ConstraintBuildAugmented:
    workers = worker_db.get_workers(new_cb.team_id)
    shifts = shift_db.get_shifts(new_cb.team_id)
    worker_dimensions = worker_dimension_db.get_worker_dimensions(new_cb.team_id)
    shift_dimensions = dimension_db.get_shift_dimensions(new_cb.team_id)
    constraint_build = constraint_build_db.update_constraint_build(new_cb)
    return cb_to_cb_augmented(
        constraint_build, workers, shifts, worker_dimensions, shift_dimensions
    )
