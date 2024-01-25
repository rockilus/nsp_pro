from typing import List

from constraint_parser.mapping.utils import find_block_by_name
from core.constraint import (
    Block,
    Constraint,
    ConstraintBuild,
    VarDay,
    VarShift,
    VarWorker,
)


class MapConstaint:
    def __call__(
        self,
        cstr_build: ConstraintBuild,
        var_worker: VarWorker,
        var_day: VarDay,
        var_shift: VarShift,
    ) -> Constraint:
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

    def get_operator(self, blocks: List[Block], cstr_type: str) -> str:
        operator_block = find_block_by_name(blocks, "operator")
        if operator_block:
            if not isinstance(operator_block.value, str):
                raise ValueError("Operator block value is not a string")
            return self.convert_operator(operator_block.value)
        elif cstr_type == "ord":
            return "yes"
        raise ValueError("Operator not found")

    def get_target_value(self, blocks: List[Block], cstr_type: str) -> int:
        if cstr_type == "ord":
            return 0
        qty_block = find_block_by_name(blocks, "#")
        if qty_block:
            if not isinstance(qty_block.value, int):
                raise ValueError("Quantity block value is not an int")
            return qty_block.value
        raise ValueError("Target value not found")

    @staticmethod
    def convert_operator(operator: str) -> str:
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
            return operator_mod
        raise ValueError(f"Operator {operator} not recognized")

    @staticmethod
    def blocks_to_string(blocks: List[Block]) -> str:
        values = []
        for block in blocks:
            if isinstance(block.value, list):
                if len(block.value) > 1:
                    values.append(
                        ', '.join(block.value[:-1]) + ' and ' + block.value[-1]
                    )
                else:
                    values.append(block.value[0])
            else:
                values.append(str(block.value))
        joined_values = ' '.join(values)
        capitalized_values = joined_values.capitalize()
        return capitalized_values + '.'
