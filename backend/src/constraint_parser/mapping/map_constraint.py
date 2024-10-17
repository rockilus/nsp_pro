from datetime import date
from typing import Dict, List, Tuple

from constraint_parser.mapping.map_day import MapDay
from constraint_parser.mapping.map_shift import MapShift
from constraint_parser.mapping.map_worker import MapWorker
from constraint_parser.mapping.utils import find_block_by_name
from core import (
    Block,
    Constraint,
    ConstraintBuildAugmented,
    ConstraintOperator,
    ConstraintType,
    Shift,
    Worker,
    ConstraintSum,
)


class MapConstaint:
    def __init__(
        self,
        workers: List[Worker],
        worker_dim_dict: Dict,
        days_solving: List[date],
        shifts: List[Shift],
        shift_dim_dict: Dict,
        shift_ids_in_coverage: List[str] | None = None,
    ) -> None:
        self.workers = workers
        self.shifts = shifts
        self.map_worker = MapWorker(workers, worker_dim_dict)
        self.map_day = MapDay(days_solving)
        self.map_shift = MapShift(
            shifts, shift_dim_dict, shift_ids_in_coverage
        )

    def map_constraint_sum(
        self, cba: ConstraintBuildAugmented, schedule_id: str
    ) -> ConstraintSum:
        cstr_operator = self.get_operator(cba.blocks, cba.constraint_type)
        coord_workers = self.map_worker.get_coord_workers(cba)
        coord_days = self.map_day.get_coords_days_sum(cba)
        coord_shifts = self.map_shift.get_coords_shifts(cba, cstr_operator)
        # w_vars, d_vars, s_vars = self.get_vars_coordinates(constraint)
        # if not all(isinstance(item, str) for item in s_vars):
        #     raise TypeError(
        #         "Expected a list of strings, "
        #         + f"but got {format(type(s_vars))} instead."
        #     )
        # if constraint.target_unit == "hour":
        #     for w in w_vars:
        #         for period in d_vars:
        #             constraint_vars = []
        #             constraint_durs = []
        #             for s in s_vars:
        #                 constraint_vars.extend(
        #                     [self.variables[w, d, s] for d in period]  # type: ignore
        #                 )
        #                 constraint_durs.extend(
        #                     [self.durations[s] for _ in period]  # type: ignore
        #                 )
        #             self._add_constraint_sum_hour(
        #                 constraint,
        #                 constraint_vars,
        #                 constraint_durs,
        #                 hard_to_soft,
        #             )
        # else:
        constraints_vars = []
        for w in coord_workers:
            for period in coord_days:
                constraint_vars = []
                for s in coord_shifts:
                    constraint_vars += [
                        (w.id, d.isoformat(), s.id) for d in period
                    ]
                constraints_vars.append(constraint_vars)
        return ConstraintSum(
            id=cba.id,
            constraint_type=cba.constraint_type,
            operator=cstr_operator,
            target_value=self.get_target_value(
                cba.blocks, cba.constraint_type
            ),
            target_unit="",
            constraint_variables=constraints_vars,
            active=cba.active,
            hard=cba.hard,
            priority=cba.priority,
            schedule_id=schedule_id,
            constraint_build_id=cba.id,
        )

    def __call__(
        self, cstr_build: ConstraintBuildAugmented, schedule_id: str
    ) -> Constraint:
        var_worker = self.map_worker(cstr_build)
        var_day = self.map_day(cstr_build)
        cstr_operator = self.get_operator(
            cstr_build.blocks, cstr_build.constraint_type
        )
        var_shift = self.map_shift(cstr_build, cstr_operator)
        return Constraint(
            id=cstr_build.id,
            constraint_type=cstr_build.constraint_type,
            operator=cstr_operator,
            target_value=self.get_target_value(
                cstr_build.blocks, cstr_build.constraint_type
            ),
            target_unit="",
            worker_var=var_worker,
            day_var=var_day,
            shift_var=var_shift,
            active=cstr_build.active,
            hard=cstr_build.hard,
            priority=cstr_build.priority,
            schedule_id=schedule_id,
            constraint_build_id=cstr_build.id,
        )

    def get_operator(
        self, blocks: List[Block], cstr_type: ConstraintType
    ) -> ConstraintOperator | None:
        if cstr_type in [ConstraintType.EVE, ConstraintType.FAI]:
            return None
        operator_block = find_block_by_name(blocks, "operator")
        if operator_block:
            if not isinstance(operator_block.value, str):
                raise ValueError("Operator block value is not a string")
            return self.convert_operator(operator_block.value)
        if cstr_type == ConstraintType.ORD:
            return ConstraintOperator.YES
        raise ValueError("Operator not found")

    def get_target_value(
        self, blocks: List[Block], cstr_type: ConstraintType
    ) -> int:
        if cstr_type in [
            ConstraintType.ORD,
            ConstraintType.FIL,
            ConstraintType.EVE,
            ConstraintType.FAI,
        ]:
            return 0
        qty_block = find_block_by_name(blocks, "#")
        if qty_block:
            if not isinstance(qty_block.value, int):
                raise ValueError("Quantity block value is not an int")
            return qty_block.value
        raise ValueError("Target value not found")

    @staticmethod
    # pylint: disable=too-many-return-statements
    def convert_operator(
        operator: str,
    ) -> ConstraintOperator | None:
        operator_mod = operator.lower().replace(" ", "_")
        if operator_mod in ["less_than"]:
            return ConstraintOperator.LESS_THAN
        if operator_mod in [
            "less_than_or_equal",
            "less_than_or_equal_to",
            "at_most",
            "maximum",
        ]:
            return ConstraintOperator.LESS_THAN_OR_EQUAL
        if operator_mod in ["equal", "exactly"]:
            return ConstraintOperator.EQUAL
        if operator_mod in ["greater_than_or_equal", "at_least"]:
            return ConstraintOperator.GREATER_THAN_OR_EQUAL
        if operator_mod in ["yes", "should_only"]:
            return ConstraintOperator.YES
        if operator_mod in ["no", "should_not"]:
            return ConstraintOperator.NO
        raise ValueError(f"Operator {operator} not recognized")

    # @staticmethod
    # # pylint: disable=R0801
    # def blocks_to_string_constraint(blocks: List[Block]) -> str:
    #     values = []
    #     for block in blocks:
    #         if isinstance(block.value, list):
    #             block_values = block.value
    #             if all(isinstance(v, dict) for v in block.value):
    #                 block_values = [v["name"] for v in block_values]  # type: ignore
    #             if len(block_values) > 1 and all(
    #                 isinstance(v, str) for v in block_values
    #             ):
    #                 values.append(
    #                     ', '.join(block_values[:-1])  # type: ignore
    #                     + ' and '
    #                     + block_values[-1]
    #                 )
    #             elif isinstance(block_values[0], str):
    #                 values.append(block_values[0])
    #         else:
    #             values.append(str(block.value))
    #     joined_values = ' '.join(values)
    #     capitalized_values = joined_values.capitalize()
    #     return capitalized_values + '.'
