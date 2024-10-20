from typing import Dict, List

from constraint_parser.mapping.map_shift import MapShift
from core import MissingAttribute, Shift, ShiftWorkerOption


def parse_selected_shifts(
    selected_shifts: List[ShiftWorkerOption],
    missing_properties: List[MissingAttribute],
    shifts: List[Shift],
    shift_dim_dict: Dict,
) -> List[str]:
    string_values = [ss.name for ss in selected_shifts if isinstance(ss.name, str)]
    if any("all shifts" in v for v in string_values):
        return [s.id for s in shifts]
    map_shift = MapShift(shifts, shift_dim_dict)
    return map_shift.get_target_ids(selected_shifts, None, missing_properties)
