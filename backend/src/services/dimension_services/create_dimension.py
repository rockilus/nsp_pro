from typing import List, Tuple

from core import (
    Dimension,
    DimensionEntryType,
    DimensionType,
    ShiftProperty,
    WorkerProperty,
)
from scripts.setup_database import (
    dimension_db,
    shift_db,
    shift_property_db,
    worker_property_db,
)


def create_dimension(
    dimension: Dimension,
) -> Tuple[Dimension, List[WorkerProperty | ShiftProperty]]:
    d_created = dimension_db.create_dimension(dimension)
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

    return d_created, properties
