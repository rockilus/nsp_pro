from datetime import date
from typing import List

from constraint_parser.mapping.utils import find_block_by_name
from core.constraint import Block, ConstraintBuild, VarDay
from utils.constants import Constants


class MapDay:
    def __call__(self, cstr_build: ConstraintBuild) -> VarDay:
        return VarDay(
            selector=self.get_selector(cstr_build.blocks, cstr_build.constraint_type),
            target=self.get_target(cstr_build.blocks, cstr_build.constraint_type),
            start_date=date.today(),
            end_date=date.today(),
            interval=self.get_interval(cstr_build.blocks, cstr_build.constraint_type),
        )

    def get_selector(
        self, blocks: List[Block], cstr_type: str
    ) -> Constants.VAR_DAY_SELECTOR_OPTIONS:
        timing_block = find_block_by_name(blocks, "timing")
        if timing_block:
            if cstr_type == "sum":
                if timing_block.value == "per week":
                    return "week"
                raise ValueError(f"Operator {timing_block.value} not recognized")
            if cstr_type == "seq":
                if timing_block.value == "consecutive":
                    return "all"
                raise ValueError(f"Operator {timing_block.value} not recognized")
            if cstr_type == "ord":
                if timing_block.value in ["before", "after"]:
                    weekday_block = find_block_by_name(blocks, "weekday")
                    if weekday_block:
                        return "week_day_index"
                    return "all"
        if cstr_type == "fil":
            return "all"
        raise ValueError("Timing block not found")

    def get_target(self, blocks: List[Block], cstr_type: str) -> int:
        if cstr_type in ["sum", "seq"]:
            return 0
        if self.get_selector(blocks, cstr_type) != "week_day_index":
            return 0
        weekday_block = find_block_by_name(blocks, "weekday")
        if weekday_block:
            if weekday_block.value in Constants.WEEK_DAYS:
                return Constants.WEEK_DAYS.index(weekday_block.value)
            raise ValueError(f"Weekday {weekday_block.value} not recognized")
        raise ValueError("Weekday block not found")

    def get_interval(self, blocks: List[Block], cstr_type: str) -> int:
        if cstr_type in ["sum", "seq"]:
            return 0
        timing_block = find_block_by_name(blocks, "timing")
        if timing_block:
            qty_block = find_block_by_name(blocks, "#")
            if qty_block and isinstance(qty_block.value, int):
                if timing_block.value == "before":
                    return qty_block.value * -1
                if timing_block.value == "after":
                    return qty_block.value
            raise ValueError("Quantity block not found")
        return 0
