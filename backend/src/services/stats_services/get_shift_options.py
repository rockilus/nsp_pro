from typing import Dict, List

from constraint_parser import build_shift_options
from core import ShiftProperty, ShiftWorkerOption
from scripts.setup_database import shift_db, shift_dimension_db, shift_property_db


def get_shift_options(team_id: str) -> List[ShiftWorkerOption]:
    shifts = shift_db.get_shifts(team_id)
    shift_dimensions = shift_dimension_db.get_shift_dimensions(team_id)
    # pylint: disable=R0801
    shift_properties = shift_property_db.get_shift_properties_by_shift_ids(
        [s.id for s in shifts]
    )
    shift_properties_sd: Dict[str, List[ShiftProperty]] = {}
    for sp in shift_properties:
        sd_id = sp.shift_dimension_id
        if sd_id not in shift_properties_sd:
            shift_properties_sd[sd_id] = []
        shift_properties_sd[sd_id].append(sp)
    return build_shift_options(shifts, shift_dimensions, shift_properties_sd)
