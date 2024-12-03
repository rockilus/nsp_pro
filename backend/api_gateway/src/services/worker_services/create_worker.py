from typing import List, Tuple

from scripts.setup_database import attribute_db, dimension_db, worker_db

from shared.schemas import (
    Attribute,
    AttributeOwnerType,
    DimensionEntryType,
    DimensionType,
    Worker,
)


def create_worker(worker: Worker) -> Tuple[Worker, List[Attribute]]:
    worker_created = worker_db.create_worker(worker)
    d_bool = dimension_db.get_dimensions_by_dim_types_and_entry_type(
        [DimensionType.WORKER],
        DimensionEntryType.BOOL,
        worker_created.team_id,
    )
    attributes: List[Attribute] = []
    attributes_saved: List[Attribute] = []
    for d in d_bool:
        # pylint: disable=R0801
        attributes.append(
            Attribute(
                id="",
                value=False,
                owner_type=AttributeOwnerType.WORKER,
                owner_id=worker_created.id,
                dimension_id=d.id,
                dim_entry_ids=[],
            )
        )
    attributes_saved = attribute_db.create_attributes(attributes)
    return worker_created, attributes_saved
