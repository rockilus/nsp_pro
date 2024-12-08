from typing import List, Tuple

from shared.schemas import Attribute, Dimension, DimEntry, Shift, Worker

from db_operations.setup_database import (
    attribute_db,
    dim_entry_db,
    dimension_db,
    shift_db,
    worker_db,
)


def fetch_workers_shifts_dim_attributes(
    team_id: str,
) -> Tuple[
    List[Worker],
    List[Shift],
    List[Dimension],
    List[DimEntry],
    List[Attribute],
]:
    workers = worker_db.get_workers(team_id)
    shifts = shift_db.get_shifts(team_id)
    dimensions = dimension_db.get_dimensions(team_id)
    dim_entries = dim_entry_db.get_dim_entries_by_dim_ids([d.id for d in dimensions])
    attributes = attribute_db.get_attributes_by_owner_ids(
        [s.id for s in shifts] + [w.id for w in workers]
    )
    return workers, shifts, dimensions, dim_entries, attributes
