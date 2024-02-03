from typing import Dict, List

from constraint_parser.mapping.map_day import MapDay
from constraint_parser.mapping.map_shift import MapShift
from constraint_parser.mapping.map_worker import MapWorker
from constraint_parser.mapping.utils import find_block_by_name
from core.constraint import Block, Constraint, ConstraintBuild
from core.shift import Shift
from core.worker import Worker
from utils.constants import Constants


class MapConstaint:
    def __init__(
        self,
        workers: List[Worker],
        shifts: List[Shift],
        worker_dim_dict: Dict,
        shift_dim_dict: Dict,
    ) -> None:
        self.workers = workers
        self.shifts = shifts
        self.map_worker = MapWorker(workers, worker_dim_dict)
        self.map_day = MapDay()
        self.map_shift = MapShift(shifts, shift_dim_dict)

    def __call__(self, cstr_build: ConstraintBuild) -> Constraint:
        var_worker = self.map_worker(cstr_build)
        var_day = self.map_day(cstr_build)
        var_shift = self.map_shift(cstr_build)
        return Constraint(
            id=cstr_build.id,
            constraint_type=cstr_build.constraint_type,
            template_id=cstr_build.template_id,
            operator=self.get_operator(
                cstr_build.blocks, cstr_build.constraint_type
            ),
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
            text=self.blocks_to_string(cstr_build.blocks),
            blocks=cstr_build.blocks,
        )

    def get_operator(
        self, blocks: List[Block], cstr_type: str
    ) -> Constants.CONSTRAINT_OPERATOR_OPTIONS:
        if cstr_type in ["eve", "fai"]:
            return ""
        operator_block = find_block_by_name(blocks, "operator")
        if operator_block:
            if not isinstance(operator_block.value, str):
                raise ValueError("Operator block value is not a string")
            return self.convert_operator(operator_block.value)
        if cstr_type == "ord":
            return "yes"
        raise ValueError("Operator not found")

    def get_target_value(self, blocks: List[Block], cstr_type: str) -> int:
        if cstr_type in ["ord", "fil", "eve", "fai"]:
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
    ) -> Constants.CONSTRAINT_OPERATOR_OPTIONS:
        operator_mod = operator.lower().replace(" ", "_")
        if operator_mod in ["less_than"]:
            return "less_than"
        if operator_mod in [
            "less_than_or_equal",
            "less_than_or_equal_to",
            "at_most",
            "maximum",
        ]:
            return "less_than_or_equal"
        if operator_mod in ["equal", "exactly"]:
            return "equal"
        if operator_mod in ["greater_than_or_equal", "at_least"]:
            return "greater_than_or_equal"
        if operator_mod in ["yes", "no"]:
            return operator_mod  # type: ignore
        if operator_mod in ["should_only"]:
            return "yes"
        if operator_mod in ["should_not"]:
            return "no"
        raise ValueError(f"Operator {operator} not recognized")

    @staticmethod
    def blocks_to_string(blocks: List[Block]) -> str:
        values = []
        for block in blocks:
            if isinstance(block.value, list):
                block_values = block.value
                if all(isinstance(v, dict) for v in block.value):
                    block_values = [
                        v for d in block.value for v in d.values()  # type: ignore
                    ]
                if len(block_values) > 1 and all(
                    isinstance(v, str) for v in block_values
                ):
                    values.append(
                        ', '.join(block_values[:-1])  # type: ignore
                        + ' and '
                        + block_values[-1]
                    )
                elif isinstance(block_values[0], str):
                    values.append(block_values[0])
            else:
                values.append(str(block.value))
        joined_values = ' '.join(values)
        capitalized_values = joined_values.capitalize()
        return capitalized_values + '.'
