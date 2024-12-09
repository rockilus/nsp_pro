from typing import List

from shared.augment.cb_to_cb_augmented import cb_to_cb_augmented
from shared.schemas import ConstraintBuildAugmented

from db_operations.setup_database import constraint_build_db


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
