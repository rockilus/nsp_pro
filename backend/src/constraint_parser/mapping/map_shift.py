from typing import List

from constraint_parser.mapping.utils import find_block_by_name
from core.constraint import Block, ConstraintBuild, VarShift
from core.shift import Shift
from utils.constants import Constants


class MapShift:
    def __init__(self, shifts: List[Shift]) -> None:
        self.shifts = shifts

    def __call__(self, cstr_build: ConstraintBuild) -> VarShift:
        return VarShift(
            operator="",
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
            if not isinstance(shift_block.value, list):
                raise ValueError("Shift block value is not a list")
            for s in shift_block.value:
                if s == "all shifts":
                    return "all"
            return "equal"
        if cstr_type == "ord":
            return "all"
        raise ValueError("Shift block not found")

    def get_target_ids(self, blocks: List[Block], cstr_type: str) -> List[str]:
        shift_block = find_block_by_name(blocks, "shift")
        if shift_block:
            if not isinstance(shift_block.value, list):
                raise ValueError("Shift block value is not a list")
            out = []
            for s in shift_block.value:
                out.append(self.get_shift_id_from_name(s))
            return out
        if cstr_type == "ord":
            return []
        raise ValueError("Shift block not found")

    def get_reference_target_ids(
        self, blocks: List[Block], cstr_type: str
    ) -> List[str]:
        if cstr_type in ["sum", "seq"]:
            return []
        shift_ref_block = find_block_by_name(blocks, "shift_reference")
        if shift_ref_block:
            if not isinstance(shift_ref_block.value, list):
                raise ValueError("Shift reference block value is not a list")
            out = []
            for s in shift_ref_block.value:
                out.append(self.get_shift_id_from_name(s))
            return out
        raise ValueError("Shift reference block not found")

    def get_relative_target_ids(self, blocks: List[Block], cstr_type: str) -> List[str]:
        if cstr_type in ["sum", "seq"]:
            return []
        shift_rel_block = find_block_by_name(blocks, "shift_relative")
        if shift_rel_block:
            if not isinstance(shift_rel_block.value, list):
                raise ValueError("Shift relative block value is not a list")
            out = []
            for s in shift_rel_block.value:
                out.append(self.get_shift_id_from_name(s))
            return out
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
