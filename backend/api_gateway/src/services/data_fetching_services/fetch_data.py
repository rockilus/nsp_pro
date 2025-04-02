from typing import List, Tuple

from shared.schemas import (
    Attribute,
    Dimension,
    DimEntry,
    Shift,
    Specialty,
    Worker,
)

from src.scripts.setup_database import (
    attribute_db,
    dim_entry_db,
    dimension_db,
    shift_db,
    specialty_db,
    worker_db,
)


def fetch_workers_shifts_dim_attributes_spe(
    team_id: str,
) -> Tuple[
    List[Worker],
    List[Shift],
    List[Dimension],
    List[DimEntry],
    List[Attribute],
    List[Specialty],
]:
    workers = worker_db.get_workers(team_id)
    shifts = shift_db.get_shifts(team_id)
    dimensions = dimension_db.get_dimensions(team_id)
    dim_entries = dim_entry_db.get_dim_entries_by_dim_ids([d.id for d in dimensions])
    attributes = attribute_db.get_attributes_by_owner_ids(
        [s.id for s in shifts] + [w.id for w in workers]
    )
    specialties = specialty_db.get_specialties_by_team_id(team_id)
    return workers, shifts, dimensions, dim_entries, attributes, specialties


def fetch_workers_not_d_shifts_not_d_dim_not_d_attributes_spes(
    team_id: str,
) -> Tuple[
    List[Worker],
    List[Shift],
    List[Dimension],
    List[DimEntry],
    List[Attribute],
    List[Specialty],
]:
    workers = worker_db.get_workers_not_deleted(team_id)
    shifts = shift_db.get_shifts_not_deleted(team_id)
    sw_ids = [s.id for s in shifts] + [w.id for w in workers]
    dimensions = dimension_db.get_dimensions_not_deleted(team_id)
    dim_entries = dim_entry_db.get_dim_entries_by_dim_ids([d.id for d in dimensions])
    attributes = attribute_db.get_attributes_by_owner_ids(sw_ids)
    specialties = specialty_db.get_specialties_not_deleted_by_team_id(team_id)
    return workers, shifts, dimensions, dim_entries, attributes, specialties
