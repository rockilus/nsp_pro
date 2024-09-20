from core import ConstraintBuild, ConstraintBuildAugmented
from scripts.setup_database import (
    constraint_build_db,
    schedule_db,
    shift_db,
    shift_dimension_db,
    worker_db,
    worker_dimension_db,
)
from services.constraint_build_services.cb_to_cb_augmented import cb_to_cb_augmented


def create_constraint_build(
    cb_data: ConstraintBuild,
) -> ConstraintBuildAugmented:
    workers = worker_db.get_workers(cb_data.team_id)
    shifts = shift_db.get_shifts(cb_data.team_id)
    worker_dimensions = worker_dimension_db.get_worker_dimensions(cb_data.team_id)
    shift_dimensions = shift_dimension_db.get_shift_dimensions(cb_data.team_id)
    constraint_build = constraint_build_db.create_constraint_build(cb_data)
    schedule_wip = schedule_db.get_schedule_wip(cb_data.team_id)
    if schedule_wip:
        schedule_wip.constraint_build_ids.append(constraint_build.id)
        schedule_db.update_schedule(schedule_wip)
    return cb_to_cb_augmented(
        constraint_build, workers, shifts, worker_dimensions, shift_dimensions
    )
