from typing import Dict, List

from constraint_parser.mapping.map_shift import MapShift
from core import DictBlockValue, Shift


def parse_selected_shifts(
    selected_shifts: List[DictBlockValue],
    shifts: List[Shift],
    shift_dim_dict: Dict,
) -> List[str]:
    if any("all shifts" in ss.name for ss in selected_shifts):
        return [s.id for s in shifts]
    map_shift = MapShift(shifts, shift_dim_dict)
    return map_shift.get_target_ids(selected_shifts, "stats")
