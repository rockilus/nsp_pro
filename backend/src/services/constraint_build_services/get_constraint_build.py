from typing import List

from core import ConstraintBuildAugmented
from scripts.setup_database import constraint_build_db
from services.constraint_build_services.cb_to_cb_augmented import cb_to_cb_augmented
from services.data_fetching_services import fetch_workers_shifts_dim_attributes


def get_constraint_builds(team_id: str) -> List[ConstraintBuildAugmented]:
    # pylint: disable=R0801
    constraint_builds = constraint_build_db.get_constraint_builds(team_id)
    (
        workers,
        shifts,
        dimensions,
        dim_entries,
        attributes,
    ) = fetch_workers_shifts_dim_attributes(team_id)
    return [
        cb_to_cb_augmented(cb, workers, shifts, dimensions, dim_entries, attributes)
        for cb in constraint_builds
    ]


# pylint: disable=too-many-arguments
def get_active_constraint_builds_by_ids(
    constraint_build_ids: List[str],
    workers,
    shifts,
    dimensions,
    dim_entries,
    attributes,
) -> List[ConstraintBuildAugmented]:
    constraint_builds = constraint_build_db.get_constraint_builds_by_ids(
        constraint_build_ids
    )
    cbs_augmented = [
        cb_to_cb_augmented(cb, workers, shifts, dimensions, dim_entries, attributes)
        for cb in constraint_builds
    ]
    return [cb for cb in cbs_augmented if cb.active]
