from datetime import date
from typing import List, Tuple

from constraint_parser.mapping.utils import find_block_by_name
from core import Block, ConstraintBuildAugmented, ConstraintType
from utils.constants import Constants


class MapDay:
    def __init__(self, days_solving: List[date]) -> None:
        self.days_solving = days_solving

    def get_coords_days(
        self, cba: ConstraintBuildAugmented
    ) -> List[List[str]]:
        selector = self.get_selector(cba.blocks, cba.constraint_type)
        target = self.get_target(cba.blocks, cba.constraint_type)
        if selector == "all":
            return self.days
        if selector == "week_day_index":
            return [
                self.days[i]
                for i in range(
                    target,
                    len(self.days),
                    Constants.NUM_DAYS_WEEK,
                )
            ]
        raise NotImplementedError(
            f"Day selector {selector} " + "not implemented"
        )

    def get_coords_days_ord(
        self, cba: ConstraintBuildAugmented
    ) -> List[Tuple[str, str]]:
        d_vars: List[Tuple[str, str]] = []
        selector = self.get_selector(cba.blocks, cba.constraint_type)
        interval = self.get_interval(cba.blocks, cba.constraint_type)
        target = self.get_target(cba.blocks, cba.constraint_type)
        if selector == "all":
            for i in range(
                abs(min(interval, 0)),
                len(self.days) - max(interval, 0),
            ):
                d_vars.append((self.days[i], self.days[i + interval]))
            return d_vars
        start = (
            target
            if (target + interval >= 0)
            else target + Constants.NUM_DAYS_WEEK
        )
        for i in range(
            start,
            len(self.days) - max(interval, 0),
            Constants.NUM_DAYS_WEEK,
        ):
            d_vars.append(
                (
                    self.days[i],
                    self.days[i + interval],
                )
            )
        return d_vars

    def get_coords_days_sum(
        self, cba: ConstraintBuildAugmented
    ) -> List[List[date]]:
        selector = self.get_selector(cba.blocks, cba.constraint_type)
        if selector == "all":
            return [self.days_solving]
        if selector == "week":
            weekday_first_day = self.days_solving[0].weekday()
            d_indexes = self._build_weeks_day_index_list(
                weekday_first_day, len(self.days_solving)
            )
            return [
                [self.days_solving[i] for i in d_index]
                for d_index in d_indexes
            ]
        raise ValueError(f"Selector {selector} not recognized")
        # period = [
        #     cba.day_var.start_date + timedelta(days=i)
        #     for i in range(
        #         (cba.day_var.end_date - cba.day_var.start_date).days + 1
        #     )
        # ]
        # return [
        #     [
        #         day.strftime(Constants.ENGINE_STRING_DATE_FORMAT)
        #         for day in period
        #         if day.strftime(Constants.ENGINE_STRING_DATE_FORMAT)
        #         in self.days
        #     ]
        # ]

    def get_selector(
        self, blocks: List[Block], cstr_type: ConstraintType
    ) -> Constants.VAR_DAY_SELECTOR_OPTIONS:
        timing_block = find_block_by_name(blocks, "timing")
        weekday_block = find_block_by_name(blocks, "weekday")
        if timing_block:
            if cstr_type == ConstraintType.SUM:
                if timing_block.value == "per week":
                    return "week"
                raise ValueError(
                    f"Operator {timing_block.value} not recognized"
                )
            if cstr_type == ConstraintType.SEQ:
                if timing_block.value == "consecutive":
                    return "all"
                raise ValueError(
                    f"Operator {timing_block.value} not recognized"
                )
            if cstr_type == ConstraintType.ORD:
                if timing_block.value in ["before", "after"]:
                    if weekday_block:
                        return "week_day_index"
                    return "all"
        if cstr_type == ConstraintType.FIL:
            return "all"
        if weekday_block:
            if cstr_type in [ConstraintType.EVE, ConstraintType.FAI]:
                return "week_day_index"
        raise ValueError("Timing block not found")

    def get_target(
        self, blocks: List[Block], cstr_type: ConstraintType
    ) -> int:
        if cstr_type in [ConstraintType.SUM, ConstraintType.SEQ]:
            return 0
        if self.get_selector(blocks, cstr_type) != "week_day_index":
            return 0
        weekday_block = find_block_by_name(blocks, "weekday")
        if weekday_block:
            if weekday_block.value in Constants.WEEK_DAYS:
                return Constants.WEEK_DAYS.index(weekday_block.value)
            raise ValueError(f"Weekday {weekday_block.value} not recognized")
        raise ValueError("Weekday block not found")

    def get_interval(
        self, blocks: List[Block], cstr_type: ConstraintType
    ) -> int:
        if cstr_type in [
            ConstraintType.SUM,
            ConstraintType.SEQ,
            ConstraintType.FIL,
            ConstraintType.EVE,
        ]:
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

    @staticmethod
    def _build_weeks_day_index_list(
        first_day_index: int, num_days: int
    ) -> List[List[int]]:
        week_length = 7
        weeks = []
        week_start_index = 0
        while week_start_index < num_days:
            if week_start_index == 0:
                week_end_index = min(
                    week_start_index + week_length - first_day_index, num_days
                )
            else:
                week_end_index = min(week_start_index + week_length, num_days)
            weeks.append(list(range(week_start_index, week_end_index)))
            week_start_index = week_end_index
        return weeks
