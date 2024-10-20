from typing import Dict, List

from core import Attribute, Dimension, DimensionEntryType, DimEntry, Shift, Worker


def build_dim_to_attr_value_to_owner(
    owners: List[Worker] | List[Shift],
    dimensions: List[Dimension],
    dim_entries: List[DimEntry],
    attributes: List[Attribute],
) -> Dict[str, Dict[str | int | float | bool, List[str]]]:
    out = {}
    owner_not_deleted_ids = [o.id for o in owners if not o.deleted]
    for dim in dimensions:
        attr_value_to_owner: Dict[str | int | float | bool, List[str]] = {}
        a_dim = [
            a
            for a in attributes
            if a.dimension_id == dim.id and a.owner_id in owner_not_deleted_ids
        ]
        if not a_dim:
            continue
        if dim.entry_type == DimensionEntryType.DIM_ENTRIES:
            for a in a_dim:
                de_names = [de.name for de in dim_entries if de.id in a.dim_entry_ids]
                for de_name in de_names:
                    if de_name not in attr_value_to_owner:
                        attr_value_to_owner[de_name] = []
                    attr_value_to_owner[de_name].append(a.owner_id)
        else:
            for a in a_dim:
                if a.value not in attr_value_to_owner:
                    attr_value_to_owner[a.value] = []
                attr_value_to_owner[a.value].append(a.owner_id)
        out[dim.id] = attr_value_to_owner
    return out
