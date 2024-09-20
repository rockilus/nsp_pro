from typing import List

from core import ConstraintBuildAugmented
from scripts.setup_database import (
    constraint_build_db,
    shift_db,
    shift_dimension_db,
    worker_db,
    worker_dimension_db,
)
from services.constraint_build_services.cb_to_cb_augmented import cb_to_cb_augmented


def get_constraint_builds(team_id: str) -> List[ConstraintBuildAugmented]:
    workers = worker_db.get_workers(team_id)
    shifts = shift_db.get_shifts(team_id)
    worker_dimensions = worker_dimension_db.get_worker_dimensions(team_id)
    shift_dimensions = shift_dimension_db.get_shift_dimensions(team_id)
    constraint_builds = constraint_build_db.get_constraint_builds(team_id)
    return [
        cb_to_cb_augmented(cb, workers, shifts, worker_dimensions, shift_dimensions)
        for cb in constraint_builds
    ]


def get_active_constraint_builds_by_ids(
    team_id: str, constraint_build_ids: List[str]
) -> List[ConstraintBuildAugmented]:
    workers = worker_db.get_workers(team_id)
    shifts = shift_db.get_shifts(team_id)
    worker_dimensions = worker_dimension_db.get_worker_dimensions(team_id)
    shift_dimensions = shift_dimension_db.get_shift_dimensions(team_id)
    constraint_builds = constraint_build_db.get_constraint_builds_by_ids(
        constraint_build_ids
    )
    cbs_augmented = [
        cb_to_cb_augmented(cb, workers, shifts, worker_dimensions, shift_dimensions)
        for cb in constraint_builds
    ]
    return [cb for cb in cbs_augmented if cb.active]
