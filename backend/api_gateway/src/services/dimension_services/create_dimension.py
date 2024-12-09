from typing import List, Tuple

from shared.schemas import (
    Attribute,
    AttributeOwnerType,
    Dimension,
    DimensionEntryType,
    DimensionType,
    DimEntry,
)

from scripts.setup_database import (
    attribute_db,
    dim_entry_db,
    dimension_db,
    shift_db,
    worker_db,
)


def create_dimension(
    dimension: Dimension, dim_entries: List[DimEntry]
) -> Tuple[Dimension, List[DimEntry], List[Attribute]]:
    d_created = dimension_db.create_dimension(dimension)
    des_created: List[DimEntry] = []
    for dim_entry in dim_entries:
        dim_entry.dimension_id = d_created.id
        des_created.append(dim_entry_db.create_dim_entry(dim_entry))
    attributes: List[Attribute] = []
    attributes_saved: List[Attribute] = []
    if d_created.entry_type == DimensionEntryType.BOOL:
        if d_created.dim_types in [
            DimensionType.SHIFT,
            DimensionType.REST_SHIFT,
        ]:
            if d_created.dim_types == DimensionType.REST_SHIFT:
                shifts = shift_db.get_rest_shifts(d_created.team_id)
            else:
                shifts = shift_db.get_work_shifts(d_created.team_id)
            for shift in shifts:
                # pylint: disable=R0801
                attributes.append(
                    Attribute(
                        id="",
                        value=False,
                        owner_type=AttributeOwnerType.SHIFT,
                        owner_id=shift.id,
                        dimension_id=d_created.id,
                        dim_entry_ids=[],
                    )
                )
        elif d_created.dim_types == DimensionType.WORKER:
            workers = worker_db.get_workers(d_created.team_id)
            for worker in workers:
                attributes.append(
                    Attribute(
                        id="",
                        value=False,
                        owner_type=AttributeOwnerType.WORKER,
                        owner_id=worker.id,
                        dimension_id=d_created.id,
                        dim_entry_ids=[],
                    )
                )
        attributes_saved = attribute_db.create_attributes(attributes)
    return d_created, des_created, attributes_saved
