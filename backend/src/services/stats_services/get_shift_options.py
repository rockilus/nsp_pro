from typing import Dict, List

from constraint_templates import build_options
from core import Attribute, AttributeOwnerType, DimensionType, ShiftWorkerOption
from scripts.setup_database import attribute_db, dim_entry_db, dimension_db, shift_db


def get_shift_options(team_id: str) -> List[ShiftWorkerOption]:
    shifts = shift_db.get_shifts_not_deleted(team_id)
    s_ids = [s.id for s in shifts]
    dimensions = dimension_db.get_dimensions_by_dim_types_not_deleted(
        [DimensionType.SHIFT, DimensionType.REST_SHIFT], team_id
    )
    dim_entries = dim_entry_db.get_dim_entries_by_dim_ids([d.id for d in dimensions])
    attributes = attribute_db.get_attributes_by_owner_ids(s_ids)
    # pylint: disable=R0801
    dim_to_attributes: Dict[str, List[Attribute]] = {}
    for a in attributes:
        d_id = a.dimension_id
        if d_id not in dim_to_attributes:
            dim_to_attributes[d_id] = []
        dim_to_attributes[d_id].append(a)
    return build_options(
        AttributeOwnerType.SHIFT,
        shifts,
        dimensions,
        dim_entries,
        dim_to_attributes,
    )
