from datetime import date
from typing import List, Tuple

from shared.constraint_parser.mapping.utils import find_block_by_name
from shared.schemas.core import (
    Block,
    BlockNameOptions,
    ConstraintBuildAugmented,
    ConstraintType,
    VarDaySelectorOptions,
)

NUM_DAYS_WEEK: int = 7
WEEK_DAYS: Tuple[str, ...] = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)


class MapDay:
    def __init__(
        self,
        dates_hist: List[date],
        dates_campaign: List[date],
        periods_weekly: List[List[date]],
        periods_monthly: List[List[date]],
        periods_yearly: List[List[date]],
    ) -> None:
        self.dates_hist = dates_hist
        self.dates_campaign = dates_campaign
        self.periods_weekly = periods_weekly
        self.periods_monthly = periods_monthly
        self.periods_yearly = periods_yearly

    def get_coords_days(self, cba: ConstraintBuildAugmented) -> List[date]:
        selector = self.get_selector(cba.blocks, cba.constraint_type)
        target = self.get_target(cba.blocks, cba.constraint_type)
        if selector == VarDaySelectorOptions.ALL:
            return self.dates_campaign
        if selector == VarDaySelectorOptions.WEEK_DAY_INDEX:
            return [d for d in self.dates_campaign if d.weekday() == target]
        raise NotImplementedError(
            f"Day selector {selector} " + "not implemented"
        )

    def get_coords_days_ord(
        self, cba: ConstraintBuildAugmented, interval: int
    ) -> List[Tuple[date, date]]:
        d_vars: List[Tuple[date, date]] = []
        selector = self.get_selector(cba.blocks, cba.constraint_type)
        target = self.get_target(cba.blocks, cba.constraint_type)

        interval_abs = abs(interval)
        dates_constraint = (
            self.dates_hist[-interval_abs:] + self.dates_campaign
        )

        if selector == VarDaySelectorOptions.ALL:
            for i in range(
                abs(min(interval, 0)),
                len(dates_constraint) - max(interval, 0),
            ):
                d_vars.append(
                    (dates_constraint[i], dates_constraint[i + interval])
                )
            return d_vars
        start = target if (target + interval >= 0) else target + NUM_DAYS_WEEK
        d_constraints_weekday_0 = dates_constraint[0].weekday()
        start = (start - d_constraints_weekday_0) % NUM_DAYS_WEEK
        for i in range(
            start,
            len(dates_constraint) - max(interval, 0),
            NUM_DAYS_WEEK,
        ):
            d_vars.append(
                (
                    dates_constraint[i],
                    dates_constraint[i + interval],
                )
            )
        return d_vars

    def get_coords_days_sum(
        self, cba: ConstraintBuildAugmented
    ) -> List[List[date]]:
        selector = self.get_selector(cba.blocks, cba.constraint_type)
        if selector == VarDaySelectorOptions.ALL:
            return [self.dates_campaign]
        if selector == VarDaySelectorOptions.WEEK:
            return self.periods_weekly
        if selector == VarDaySelectorOptions.MONTH:
            return self.periods_monthly
        if selector == VarDaySelectorOptions.YEAR:
            return self.periods_yearly
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

    def get_coords_days_seq(
        self, cba: ConstraintBuildAugmented, target: int
    ) -> List[date]:
        selector = self.get_selector(cba.blocks, cba.constraint_type)

        target_abs = max(abs(target) - 1, 0)
        dates_constraint = self.dates_hist[-target_abs:] + self.dates_campaign
        if selector == VarDaySelectorOptions.ALL:
            return dates_constraint
        raise NotImplementedError(
            f"Day selector {selector} " + "not implemented"
        )

    def get_selector(
        self, blocks: List[Block], cstr_type: ConstraintType
    ) -> VarDaySelectorOptions:
        timing_block = find_block_by_name(blocks, BlockNameOptions.TIMING)
        weekday_block = find_block_by_name(blocks, BlockNameOptions.WEEKDAY)
        if timing_block:
            if cstr_type == ConstraintType.SUM:
                if timing_block.value == "per week":
                    return VarDaySelectorOptions.WEEK
                if timing_block.value == "per month":
                    return VarDaySelectorOptions.MONTH
                if timing_block.value == "per year":
                    return VarDaySelectorOptions.YEAR
                raise ValueError(
                    f"Operator {timing_block.value} not recognized"
                )
            if cstr_type == ConstraintType.SEQ:
                if timing_block.value == "consecutive":
                    return VarDaySelectorOptions.ALL
                raise ValueError(
                    f"Operator {timing_block.value} not recognized"
                )
            if cstr_type == ConstraintType.ORD:
                if timing_block.value in ["before", "after"]:
                    if weekday_block:
                        return VarDaySelectorOptions.WEEK_DAY_INDEX
                    return VarDaySelectorOptions.ALL
        if cstr_type == ConstraintType.FIL:
            return VarDaySelectorOptions.ALL
        if weekday_block:
            if cstr_type in [ConstraintType.EVE, ConstraintType.FAI]:
                return VarDaySelectorOptions.WEEK_DAY_INDEX
        raise ValueError("Timing block not found")

    def get_target(
        self, blocks: List[Block], cstr_type: ConstraintType
    ) -> int:
        if cstr_type in [ConstraintType.SUM, ConstraintType.SEQ]:
            return 0
        if (
            self.get_selector(blocks, cstr_type)
            != VarDaySelectorOptions.WEEK_DAY_INDEX
        ):
            return 0
        weekday_block = find_block_by_name(blocks, BlockNameOptions.WEEKDAY)
        if weekday_block:
            if weekday_block.value in WEEK_DAYS:
                return WEEK_DAYS.index(weekday_block.value)
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
        timing_block = find_block_by_name(blocks, BlockNameOptions.TIMING)
        if timing_block:
            qty_block = find_block_by_name(blocks, BlockNameOptions.NUMBER)
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
