from shared.augment.cb_to_cb_augmented import cb_to_cb_augmented
from shared.database.database_collections import DatabaseCollections
from shared.schemas.core import (
    Attribute,
    ConstraintBuildAugmented,
    Dimension,
    DimEntry,
    Shift,
    Specialty,
    Worker,
)


# pylint: disable=too-many-arguments, R0801
def get_active_constraint_builds_by_ids(
    constraint_build_ids: list[str],
    workers: list[Worker],
    shifts: list[Shift],
    dimensions: list[Dimension],
    dim_entries: list[DimEntry],
    attributes: list[Attribute],
    specialties: list[Specialty],
    collections: DatabaseCollections,
) -> list[ConstraintBuildAugmented]:
    constraint_builds = collections.constraint_build_db.get_constraint_builds_by_ids(
        constraint_build_ids
    )
    cbs_augmented = [
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
    return [cb for cb in cbs_augmented if cb.active]
