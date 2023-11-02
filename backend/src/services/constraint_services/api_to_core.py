from datetime import date
from typing import List, Union

from core.constraint import (
    BuildBlock,
    Constraint,
    ConstraintBuild,
    VarDay,
    VarShift,
    VarWorker,
)


def build_constraint_sum(constraint_build: ConstraintBuild) -> Constraint:
    var_worker = VarWorker(
        operator="",
        selector="all",
        target_ids=[],
        num_eligible_workers=0,
    )
    var_day = VarDay(
        selector=get_block_value_from_name(  # type: ignore
            "day", constraint_build.build_blocks
        ),
        target=0,
        start_date=date.today(),
        end_date=date.today(),
        interval=0,
    )
    target_shift_ids = get_block_value_from_name("shift_id", constraint_build.build_blocks)
    var_shift = VarShift(
        operator="",
        selector="equal",
        target_ids=target_shift_ids,
        reference_id="",
        relative_id="",
    )
    constraint = Constraint(
        id=constraint_build.id,
        constraint_type="sum",
        operator=convert_operator(  # type: ignore
            str(get_block_value_from_name("operator", constraint_build.build_blocks))
            .lower()
            .replace(" ", "_")
        ),
        target_value=int(
            get_block_value_from_name("quantity", constraint_build.build_blocks)
        ),
        worker_var=var_worker,
        day_var=var_day,
        shift_var=var_shift,
        active=constraint_build.active,
        hard=constraint_build.hard,
        priority=constraint_build.priority,
        build_blocks=constraint_build.build_blocks,
    )
    return constraint


def build_constraint_seq(constraint_build: ConstraintBuild) -> Constraint:
    var_worker = VarWorker(
        operator="",
        selector="all",
        target_ids=[],
        num_eligible_workers=0,
    )
    var_day = VarDay(
        selector="all",
        target=0,
        start_date=date.today(),
        end_date=date.today(),
        interval=0,
    )
    target_shift_ids = get_block_value_from_name("shift_id", constraint_build.build_blocks)
    var_shift = VarShift(
        operator="",
        selector="equal",
        target_ids=target_shift_ids,
        reference_id="",
        relative_id="",
    )
    constraint = Constraint(
        id=constraint_build.id,
        constraint_type="seq",
        operator=convert_operator(  # type: ignore
            str(get_block_value_from_name("operator", constraint_build.build_blocks))
            .lower()
            .replace(" ", "_")
        ),
        target_value=int(
            get_block_value_from_name("quantity", constraint_build.build_blocks)
        ),
        worker_var=var_worker,
        day_var=var_day,
        shift_var=var_shift,
        active=constraint_build.active,
        hard=constraint_build.hard,
        priority=constraint_build.priority,
        build_blocks=constraint_build.build_blocks,
    )
    return constraint


def build_constraint_ord(constraint_build: ConstraintBuild) -> Constraint:
    var_worker = VarWorker(
        operator="",
        selector="all",
        target_ids=[],
        num_eligible_workers=0,
    )
    var_day = VarDay(
        selector="all",
        target=0,
        start_date=date.today(),
        end_date=date.today(),
        interval=int(
            get_block_value_from_name("quantity", constraint_build.build_blocks)
        ),
    )
    var_shift = VarShift(
        operator="",
        selector="equal",
        target_ids=[],
        reference_id=str(
            get_block_value_from_name(
                "shift_id_reference", constraint_build.build_blocks
            )
        ),
        relative_id=str(
            get_block_value_from_name(
                "shift_id_relative", constraint_build.build_blocks
            )
        ),
    )
    constraint = Constraint(
        id=constraint_build.id,
        constraint_type="ord",
        operator=convert_operator(  # type: ignore
            str(get_block_value_from_name("operator", constraint_build.build_blocks))
            .lower()
            .replace(" ", "_")
        ),
        target_value=0,
        worker_var=var_worker,
        day_var=var_day,
        shift_var=var_shift,
        active=constraint_build.active,
        hard=constraint_build.hard,
        priority=constraint_build.priority,
        build_blocks=constraint_build.build_blocks,
    )
    return constraint


def build_constraint(constraint_build: ConstraintBuild) -> Constraint:
    constraint_type = ""
    for block in constraint_build.build_blocks:
        type_key = "type"
        if type_key == block.name:
            constraint_type = str(block.value)
            break
    if constraint_type == "sum":
        constraint = build_constraint_sum(constraint_build)
    elif constraint_type == "sequence":
        constraint = build_constraint_seq(constraint_build)
    elif constraint_type == "order":
        constraint = build_constraint_ord(constraint_build)
    else:
        raise ValueError(f"Constraint type {constraint_type} not recognized")
    return constraint


def get_block_value_from_name(
    block_name: str, build_blocks: List[BuildBlock]
) -> Union[str, int]:
    for block in build_blocks:
        if block.name == block_name:
            return block.value
    raise ValueError(f"Block name {block_name} not found")


def convert_operator(operator: str) -> str:
    if operator in ["less_than_or_equal", "at_most"]:
        return "less_than_or_equal"
    if operator in ["equal", "exactly"]:
        return "equal"
    if operator in ["greater_than_or_equal", "at_least"]:
        return "greater_than_or_equal"
    if operator in ["yes", "no"]:
        return operator
    raise ValueError(f"Operator {operator} not recognized")
