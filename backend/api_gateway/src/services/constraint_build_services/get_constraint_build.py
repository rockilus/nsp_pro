from typing import List

from shared.augment.cb_to_cb_augmented import cb_to_cb_augmented
from shared.schemas import ConstraintBuildAugmented

from src.scripts.setup_database import constraint_build_db
from src.services.data_fetching_services.fetch_data import (
    fetch_workers_shifts_dim_attributes_spe,
)


def get_constraint_builds(team_id: str) -> List[ConstraintBuildAugmented]:
    # pylint: disable=R0801
    constraint_builds = constraint_build_db.get_constraint_builds(team_id)
    (
        workers,
        shifts,
        dimensions,
        dim_entries,
        attributes,
        specialties,
    ) = fetch_workers_shifts_dim_attributes_spe(team_id)
    return [
        cb_to_cb_augmented(
            cb,
            workers,
            shifts,
            dimensions,
            dim_entries,
            attributes,
            specialties,
        )
        for cb in constraint_builds
    ]
