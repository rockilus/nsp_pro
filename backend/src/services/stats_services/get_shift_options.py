from typing import Dict, List

from constraint_parser import build_shift_options
from core import Attribute, ShiftWorkerOption
from scripts.setup_database import (
    dim_entry_db,
    dimension_db,
    shift_db,
    shift_property_db,
)


def get_shift_options(team_id: str) -> List[ShiftWorkerOption]:
    shifts = shift_db.get_shifts_not_deleted(team_id)
    shift_dimensions = dimension_db.get_shift_dimensions(team_id)
    shift_dim_entries = dim_entry_db.get_dim_entries_by_dim_ids(
        [sd.id for sd in shift_dimensions]
    )
    # pylint: disable=R0801
    shift_properties = shift_property_db.get_shift_properties_by_shift_ids(
        [s.id for s in shifts]
    )
    shift_properties_sd: Dict[str, List[Attribute]] = {}
    for sp in shift_properties:
        sd_id = sp.dimension_id
        if sd_id not in shift_properties_sd:
            shift_properties_sd[sd_id] = []
        shift_properties_sd[sd_id].append(sp)
    return build_shift_options(
        shifts, shift_dimensions, shift_dim_entries, shift_properties_sd
    )
