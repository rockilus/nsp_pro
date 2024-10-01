from typing import List

from core import ShiftProperty
from scripts.setup_database import dim_entry_db, shift_property_db


def delete_dim_entry(dim_entry_id: str) -> List[ShiftProperty]:
    sps_with_dim_entry = shift_property_db.get_shift_properties_by_dim_entry_id(
        dim_entry_id
    )
    updated_sps: List[ShiftProperty] = []
    for sp in sps_with_dim_entry:
        sp.dim_entry_ids.remove(dim_entry_id)
        updated_sps.append(sp)
    sps_saved = shift_property_db.update_shift_properties(updated_sps)
    dim_entry_db.logical_delete_dim_entry(dim_entry_id)
    return sps_saved
