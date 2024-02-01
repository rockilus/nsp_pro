from typing import Dict, List

from constraint_parser.mapping.utils import find_block_by_name, list_dicts_to_dict
from core.constraint import Block, ConstraintBuild, VarShift
from core.shift import Shift
from utils.constants import Constants


class MapShift:
    def __init__(self, shifts: List[Shift], shift_dim_dict: Dict) -> None:
        self.shifts = shifts
        self.shift_dim_dict = shift_dim_dict

    def __call__(self, cstr_build: ConstraintBuild) -> VarShift:
        return VarShift(
            selector=self.get_selector(cstr_build.blocks, cstr_build.constraint_type),
            target_ids=self.get_target_ids(
                cstr_build.blocks, cstr_build.constraint_type
            ),
            reference_ids=self.get_reference_target_ids(
                cstr_build.blocks, cstr_build.constraint_type
            ),
            relative_ids=self.get_relative_target_ids(
                cstr_build.blocks, cstr_build.constraint_type
            ),
        )

    def get_selector(
        self, blocks: List[Block], cstr_type: str
    ) -> Constants.VAR_SHIFT_SELECTOR_OPTIONS:
        shift_block = find_block_by_name(blocks, "shift")
        if shift_block:
            if isinstance(shift_block.value, list) and all(
                isinstance(s, dict) for s in shift_block.value
            ):
                if any(
                    "all shifts" in s.values()  # type: ignore
                    for s in shift_block.value
                ):
                    return "all"
                return "equal"
            raise ValueError("Shift block value is not a list of dicts")
        if cstr_type == "ord":
            return "all"
        raise ValueError("Shift block not found")

    def get_target_ids(self, blocks: List[Block], cstr_type: str) -> List[str]:
        if self.get_selector(blocks, cstr_type) == "all":
            return []
        shift_block = find_block_by_name(blocks, "shift")
        if shift_block:
            return self.shift_block_to_id_list(shift_block)
        if cstr_type == "ord":
            return []
        raise ValueError("Shift block not found")

    def get_reference_target_ids(
        self, blocks: List[Block], cstr_type: str
    ) -> List[str]:
        if cstr_type in ["sum", "seq", "fil"]:
            return []
        shift_ref_block = find_block_by_name(blocks, "shift_reference")
        if shift_ref_block:
            return self.shift_block_to_id_list(shift_ref_block)
        raise ValueError("Shift reference block not found")

    def get_relative_target_ids(self, blocks: List[Block], cstr_type: str) -> List[str]:
        if cstr_type in ["sum", "seq", "fil"]:
            return []
        shift_rel_block = find_block_by_name(blocks, "shift_relative")
        if shift_rel_block:
            return self.shift_block_to_id_list(shift_rel_block)
        raise ValueError("Shift relative block not found")

    def get_shift_id_from_name(self, shift_name: str) -> str:
        if shift_name in ["day off", "days off", "shift off", "shifts off"]:
            shift_name = "off"
        shift = self.find_shift_by_name(shift_name)
        if shift:
            return shift.id
        raise ValueError(f"Shift name {shift_name} not found")

    def find_shift_by_name(self, name: str) -> Shift | None:
        for shift in self.shifts:
            if shift.name.lower() == name.lower():
                return shift
        return None

    def shift_block_to_id_list(self, shift_block: Block) -> List[str]:
        if not isinstance(shift_block.value, list):
            raise ValueError("Shift block value is not a list")
        shift_dict = list_dicts_to_dict(shift_block.value)
        out = []
        for dim, props in shift_dict.items():
            if dim == "shifts":
                for w in props:
                    out.append(self.get_shift_id_from_name(w))
            else:
                if dim not in self.shift_dim_dict:
                    raise ValueError(f"Shift dimension {dim} not found")
                for prop in props:
                    if prop not in self.shift_dim_dict[dim]:
                        raise ValueError(
                            f"Shift property {prop} for dimension {dim} not found"
                        )
                    out += self.shift_dim_dict[dim][prop]
        return sorted(list(set(out)))
