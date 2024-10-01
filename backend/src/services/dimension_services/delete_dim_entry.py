from typing import List

from core import Attribute
from scripts.setup_database import dim_entry_db, shift_property_db


def delete_dim_entry(dim_entry_id: str) -> List[Attribute]:
    sps_with_dim_entry = shift_property_db.get_attributes_by_dim_entry_id(
        dim_entry_id
    )
    updated_sps: List[Attribute] = []
    for sp in sps_with_dim_entry:
        sp.dim_entry_ids.remove(dim_entry_id)
        updated_sps.append(sp)
    sps_saved = shift_property_db.update_attributes(updated_sps)
    dim_entry_db.logical_delete_dim_entry(dim_entry_id)
    return sps_saved
