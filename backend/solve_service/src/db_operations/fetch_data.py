from typing import List, Tuple

from shared.database.database_collections import DatabaseCollections

from shared.schemas import (
    Attribute,
    Dimension,
    DimEntry,
    Shift,
    Specialty,
    Worker,
)


def fetch_workers_shifts_dim_attributes_spe(
    team_id: str, collections: DatabaseCollections
) -> Tuple[
    List[Worker],
    List[Shift],
    List[Dimension],
    List[DimEntry],
    List[Attribute],
    List[Specialty],
]:
    workers = collections.worker_db.get_workers(team_id)
    shifts = collections.shift_db.get_shifts(team_id)
    dimensions = collections.dimension_db.get_dimensions(team_id)
    dim_entries = collections.dim_entry_db.get_dim_entries_by_dim_ids(
        [d.id for d in dimensions]
    )
    attributes = collections.attribute_db.get_attributes_by_owner_ids(
        [s.id for s in shifts] + [w.id for w in workers]
    )
    specialties = collections.specialty_db.get_specialties_by_team_id(team_id)
    return workers, shifts, dimensions, dim_entries, attributes, specialties
