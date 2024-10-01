from typing import List, Tuple

from core import (
    Dimension,
    DimensionEntryType,
    DimensionType,
    DimEntry,
    ShiftProperty,
    WorkerProperty,
)
from scripts.setup_database import (
    dim_entry_db,
    dimension_db,
    shift_db,
    shift_property_db,
    worker_property_db,
)


def create_dimension(
    dimension: Dimension, dim_entries: List[DimEntry]
) -> Tuple[Dimension, List[DimEntry], List[WorkerProperty | ShiftProperty]]:
    d_created = dimension_db.create_dimension(dimension)
    des_created: List[DimEntry] = []
    for dim_entry in dim_entries:
        dim_entry.dimension_id = d_created.id
        des_created.append(dim_entry_db.create_dim_entry(dim_entry))
    properties: List[WorkerProperty | ShiftProperty] = []
    if d_created.type == DimensionType.SHIFT:
        if d_created.entry_type == DimensionEntryType.BOOL:
            if d_created.rest_shift:
                shifts = shift_db.get_rest_shifts(d_created.team_id)
            else:
                shifts = shift_db.get_work_shifts(d_created.team_id)
            for shift in shifts:
                properties.append(
                    shift_property_db.create_shift_property(
                        ShiftProperty(
                            id="",
                            value=False,
                            shift_id=shift.id,
                            dimension_id=d_created.id,
                            dim_entry_ids=[],
                        )
                    )
                )
    elif d_created.type == DimensionType.WORKER:
        if d_created.entry_type == DimensionEntryType.BOOL:
            properties.append(
                worker_property_db.create_worker_property(
                    WorkerProperty(
                        id="",
                        value=False,
                        worker_id="",
                        worker_dimension_id=d_created.id,
                        # dim_entry_ids=[],
                    )
                )
            )

    return d_created, des_created, properties
