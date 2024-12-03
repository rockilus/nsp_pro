# pylint: disable=R0801
from scripts.setup_database import constraint_build_db
from services.constraint_build_services.cb_to_cb_augmented import cb_to_cb_augmented
from services.data_fetching_services import fetch_workers_shifts_dim_attributes

from shared.schemas import ConstraintBuild, ConstraintBuildAugmented


def update_constraint_build(
    new_cb: ConstraintBuild,
) -> ConstraintBuildAugmented:
    constraint_build = constraint_build_db.update_constraint_build(new_cb)
    (
        workers,
        shifts,
        dimensions,
        dim_entries,
        attributes,
    ) = fetch_workers_shifts_dim_attributes(constraint_build.team_id)
    return cb_to_cb_augmented(
        constraint_build, workers, shifts, dimensions, dim_entries, attributes
    )
