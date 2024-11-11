from core import ConstraintBuild, ConstraintBuildAugmented
from scripts.setup_database import constraint_build_db, schedule_db
from services.constraint_build_services.cb_to_cb_augmented import cb_to_cb_augmented
from services.data_fetching_services.fetch_data import (
    fetch_workers_shifts_dim_attributes,
)


def create_constraint_build(
    cb_data: ConstraintBuild,
) -> ConstraintBuildAugmented:
    constraint_build = constraint_build_db.create_constraint_build(cb_data)
    schedule_wip = schedule_db.get_schedule_campaign(cb_data.team_id)
    if schedule_wip:
        schedule_wip.constraint_build_ids.append(constraint_build.id)
        schedule_db.update_schedule(schedule_wip)
    # pylint: disable=R0801
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
