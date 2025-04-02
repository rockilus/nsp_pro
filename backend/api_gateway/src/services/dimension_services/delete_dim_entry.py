from typing import List

from shared.schemas import Attribute

from src.scripts.setup_database import attribute_db, dim_entry_db


def delete_dim_entry(dim_entry_id: str) -> List[Attribute]:
    sps_with_dim_entry = attribute_db.get_attributes_by_dim_entry_id(dim_entry_id)
    updated_sps: List[Attribute] = []
    for sp in sps_with_dim_entry:
        sp.dim_entry_ids.remove(dim_entry_id)
        updated_sps.append(sp)
    sps_saved = attribute_db.update_attributes(updated_sps)
    dim_entry_db.logical_delete_dim_entry(dim_entry_id)
    return sps_saved
