from typing import Dict, List

from constraint_parser.mapping.utils import cast_to_dict_block_value, find_block_by_name
from core import Block, ConstraintBuild, DictBlockValue, Shift, VarShift
from utils.constants import Constants


class MapShift:
    def __init__(self, shifts: List[Shift], shift_dim_dict: Dict) -> None:
        self.shifts = shifts
        self.shift_dim_dict = shift_dim_dict

    def __call__(self, cstr_build: ConstraintBuild, cstr_operator: str) -> VarShift:
        shift_values = (
            self.get_shift_values(cstr_build.blocks, "shift")
            if cstr_build.constraint_type != "ord"
            else []
        )
        shift_reference_values = (
            self.get_shift_values(cstr_build.blocks, "shift_reference")
            if cstr_build.constraint_type == "ord"
            else []
        )
        shift_relative_values = (
            self.get_shift_values(cstr_build.blocks, "shift_relative")
            if cstr_build.constraint_type == "ord"
            else []
        )
        return VarShift(
            selector=self.get_selector(shift_values, cstr_build.constraint_type),
            target_ids=self.get_target_ids(
                shift_values, cstr_build.constraint_type, cstr_operator
            ),
            reference_ids=self.get_target_ids(
                shift_reference_values, cstr_build.constraint_type
            ),
            relative_ids=self.get_target_ids(
                shift_relative_values, cstr_build.constraint_type
            ),
        )

    def get_selector(
        self, values: List[DictBlockValue], cstr_type: str
    ) -> Constants.VAR_SHIFT_SELECTOR_OPTIONS:
        if cstr_type == "ord":
            return "all"
        if any("all shifts" in v.name for v in values):
            return "all"
        return "equal"

    def get_target_ids(
        self,
        values: List[DictBlockValue],
        cstr_type: str,
        cstr_operator: str = "",
    ) -> List[str]:
        if self.get_selector(values, cstr_type) == "all" and cstr_type != "ord":
            return []
        out = []
        for value in values:
            if value.id_type == "shift":
                if not self.check_shift_id(value.id):
                    raise ValueError(f"Shift {value.name} with id {value.id} not found")
                out.append(value.id)
            else:
                if value.id not in self.shift_dim_dict:
                    raise ValueError(f"Shift dimension {value.id} not found")
                if value.name.lower() not in self.shift_dim_dict[value.id]:
                    raise ValueError(
                        f"Shift property {value.name} "
                        + f"for dimension {value.id} not found"
                    )
                out += self.shift_dim_dict[value.id][value.name.lower()]
        if cstr_type == "fil" and cstr_operator == "yes":
            out += [s.id for s in self.shifts if s.is_time_off]
        return sorted(list(set(out)))

    def check_shift_id(self, shift_id: str) -> bool:
        return any(s.id == shift_id for s in self.shifts)

    @staticmethod
    def get_shift_values(blocks: List[Block], block_name: str) -> List[DictBlockValue]:
        shift_block = find_block_by_name(blocks, block_name)
        if shift_block:
            if isinstance(shift_block.value, list) and all(
                isinstance(v, dict) for v in shift_block.value
            ):
                return [
                    cast_to_dict_block_value(v)  # type: ignore
                    for v in shift_block.value
                ]
            raise ValueError("Shift block value is not a list of dicts")
        raise ValueError("Shift block not found")
