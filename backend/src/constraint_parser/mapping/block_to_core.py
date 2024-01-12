from datetime import date
from typing import Dict, List

from core.constraint import (
    Constraint,
    ConstraintBuild,
    VarDay,
    VarShift,
    VarWorker,
)
from scripts.setup_database import shift_db


def build_constraint(cstr_build: ConstraintBuild, blocks: Dict) -> Constraint:
    constraint_type = infer_constraint_type(blocks)
    if constraint_type == "sum":
        constraint = build_constraint_sum(cstr_build, blocks)
    elif constraint_type == "sequence":
        constraint = build_constraint_seq(cstr_build, blocks)
    # elif constraint_type == "order":
    #     constraint = build_constraint_ord(blocks)
    else:
        raise ValueError(f"Constraint type {constraint_type} not recognized")
    return constraint


def infer_constraint_type(block: Dict) -> str:
    timing = block.get("TIMING")
    if timing:
        timing_text = timing.get("text")[0]
        if timing_text == "consecutive":
            return "sequence"
        if timing_text == "per week":
            return "sum"
    raise ValueError("Constraint type not recognized")


def build_constraint_sum(
    cstr_build: ConstraintBuild, blocks: Dict
) -> Constraint:
    var_worker = VarWorker(
        operator="",
        selector="all",
        target_ids=[],
        num_eligible_workers=0,
    )
    var_day = VarDay(
        selector=get_var_day_selector(blocks),
        target=0,
        start_date=date.today(),
        end_date=date.today(),
        interval=0,
    )
    var_shift = VarShift(
        operator="",
        selector="equal",
        target_ids=get_var_shift_target_ids(blocks),
        reference_id="",
        relative_id="",
    )
    constraint = Constraint(
        id=cstr_build.id,
        constraint_type="sum",
        operator=get_constraint_operator(blocks),
        target_value=get_constraint_target_value(blocks),
        target_unit="",
        worker_var=var_worker,
        day_var=var_day,
        shift_var=var_shift,
        active=cstr_build.active,
        hard=cstr_build.hard,
        priority=cstr_build.priority,
        text=cstr_build.text,
        blocks=blocks,
    )
    return constraint


def build_constraint_seq(
    cstr_build: ConstraintBuild, blocks: Dict
) -> Constraint:
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
    var_shift = VarShift(
        operator="",
        selector="equal",
        target_ids=get_var_shift_target_ids(blocks),
        reference_id="",
        relative_id="",
    )
    constraint = Constraint(
        id=cstr_build.id,
        constraint_type="seq",
        operator=get_constraint_operator(blocks),
        target_value=get_constraint_target_value(blocks),
        target_unit="",
        worker_var=var_worker,
        day_var=var_day,
        shift_var=var_shift,
        active=cstr_build.active,
        hard=cstr_build.hard,
        priority=cstr_build.priority,
        text=cstr_build.text,
        blocks=blocks,
    )
    return constraint


# def build_constraint_ord(constraint_build: ConstraintBuild) -> Constraint:
#     var_worker = VarWorker(
#         operator="",
#         selector="all",
#         target_ids=[],
#         num_eligible_workers=0,
#     )
#     var_day = VarDay(
#         selector="all",
#         target=0,
#         start_date=date.today(),
#         end_date=date.today(),
#         interval=int(
#             get_block_value_from_name(
#                 "quantity", constraint_build.build_blocks
#             )
#         ),
#     )
#     var_shift = VarShift(
#         operator="",
#         selector="equal",
#         target_ids=[],
#         reference_id=str(
#             get_block_value_from_name(
#                 "shift_id_reference", constraint_build.build_blocks
#             )
#         ),
#         relative_id=str(
#             get_block_value_from_name(
#                 "shift_id_relative", constraint_build.build_blocks
#             )
#         ),
#     )
#     constraint = Constraint(
#         id=constraint_build.id,
#         constraint_type="ord",
#         operator=convert_operator(  # type: ignore
#             str(
#                 get_block_value_from_name(
#                     "operator", constraint_build.build_blocks
#                 )
#             )
#             .lower()
#             .replace(" ", "_")
#         ),
#         target_value=0,
#         target_unit="",
#         worker_var=var_worker,
#         day_var=var_day,
#         shift_var=var_shift,
#         active=constraint_build.active,
#         hard=constraint_build.hard,
#         priority=constraint_build.priority,
#         blocks=constraint_build.build_blocks,
#     )
#     return constraint


# def get_block_value_from_name(
#     block_name: str, build_blocks: List[BuildBlock]
# ) -> str | int:
#     for block in build_blocks:
#         if block.name == block_name:
#             return block.value
#     raise ValueError(f"Block name {block_name} not found")


# VarDay
def get_var_day_selector(blocks: Dict) -> str:
    timing = blocks.get("TIMING")
    if timing:
        timing_text = timing.get("text")[0]
        if timing_text:
            if timing_text == "per week":
                return "week"
            raise ValueError(f"Operator {timing_text} not recognized")
        raise ValueError("Timing text not found")
    raise ValueError("Timing not found")


# VarShift
def get_var_shift_target_ids(blocks: Dict) -> List[str]:
    shift = blocks.get("SHIFT")
    if shift:
        shift_text = shift.get("text")
        out = []
        if shift_text:
            for s in shift_text:
                out.append(get_shift_id_from_name(s))
            return out
        raise ValueError("Shift text not found")
    raise ValueError("Shift not found")


def get_shift_id_from_name(shift_name: str) -> str:
    if shift_name in ["day off", "days off", "shift off", "shifts off"]:
        shift_name = "off"
    shift = shift_db.get_shift_by_name(shift_name.lower())
    if shift:
        return shift.id
    raise ValueError(f"Shift name {shift_name} not found")


# Constraint
def get_constraint_operator(blocks: Dict) -> str:
    operator = blocks.get("OPERATOR")
    if operator:
        operator_text = operator.get("text")[0]
        if operator_text:
            return convert_operator(operator_text)
        raise ValueError("Operator text not found")
    raise ValueError("Operator not found")


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


def get_constraint_target_value(blocks: Dict) -> int:
    o_quantity = blocks.get("OPERATOR").get("quantity")[0]
    if o_quantity:
        return int(str(o_quantity))
    s_quantity = blocks.get("SHIFT").get("quantity")[0]
    if s_quantity:
        return int(str(s_quantity))
    raise ValueError("Target value not found")
