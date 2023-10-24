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
        selector=get_block_value_from_name(
            "day", constraint_build.build_blocks
        ),
        target=[],
        start_date=date.today(),
        end_date=date.today(),
        interval=0,
    )
    var_shift = VarShift(
        operator="",
        selector="equal",
        target_ids=[
            get_block_value_from_name(
                "shift_id", constraint_build.build_blocks
            )
        ],
        reference_id="",
        relative_id="",
    )
    constraint = Constraint(
        id=constraint_build.id,
        constraint_type="sum",
        operator=convert_operator(
            get_block_value_from_name(
                "operator", constraint_build.build_blocks
            )
            .lower()
            .replace(" ", "_")
        ),
        target_value=get_block_value_from_name(
            "quantity", constraint_build.build_blocks
        ),
        worker_var=var_worker,
        day_var=var_day,
        shift_var=var_shift,
        active=constraint_build.active,
        hard=True,
        penalty=0,
        build_blocks=constraint_build.build_blocks,
    )
    return constraint


def build_constraint(constraint_build: ConstraintBuild) -> Constraint:
    constraint_type = ""
    for block in constraint_build.build_blocks:
        type_key = "type"
        if type_key == block.name:
            constraint_type = block.value
            break
    if constraint_type == "sum":
        constraint = build_constraint_sum(constraint_build)
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
    elif operator in ["equal", "exactly"]:
        return "equal"
    elif operator in ["greater_than_or_equal", "at_least"]:
        return "greater_than_or_equal"
    else:
        raise ValueError(f"Operator {operator} not recognized")


# # pylint: disable=too-many-branches
# def build_constraint(
#     constraint_inputs: Dict, constraint_definition: Dict
# ) -> Tuple[Dict, Dict]:
#     constraint_keys = [
#         "constraint_type",  # constraint
#         "operator",  # constraint_definition
#         "target_value",  # constraint_definition
#         "hard_constraint",  # constraint
#         "penalty",  # constraint
#         "active",
#     ]
#     variables: Dict[str, List] = {
#         "worker": [],
#         "day": [],
#         "shift": ["off", "morning", "afternoon", "night"],
#     }
#     penalty = {
#         "low": 3,
#         "medium": 7,
#         "high": 20,
#     }

#     constraint = {}
#     for key in constraint_keys:
#         if key in constraint_inputs:
#             constraint[key] = constraint_inputs[key]
#         elif key == "hard_constraint":
#             constraint[key] = constraint_inputs["soft_or_hard"] == "hard"
#         elif key == "penalty" and constraint_inputs["soft_priority"] != "":
#             constraint[key] = penalty[constraint_inputs["soft_priority"]]

#     constraint_variables: Dict[str, Dict[str, Union[str, int, bool]]] = {
#         "worker": {
#             "param": "worker",
#         },
#         "day": {
#             "param": "day",
#         },
#         "shift": {
#             "param": "shift",
#         },
#     }
#     for key, value in constraint_definition.items():
#         if key in ["timing", "reference_variable", "other_variable"]:
#             continue
#         if key == "quantity":
#             constraint["target_value"] = value
#         elif key == "operator" and value != "":
#             constraint["operator"] = value
#         elif (
#             key == "quantified_variable"
#             and constraint_inputs["constraint_type"] != "sum"
#         ):
#             constraint_variables[value]["intra"] = True
#         elif key == "var_value" and value != "":
#             var = constraint_definition["quantified_variable"]
#             constraint_variables[var]["value"] = variables[var].index(value)
#             if constraint_inputs["constraint_type"] == "order":
#                 constraint_variables[var]["operator"] = "pair"
#             else:
#                 constraint_variables[var]["operator"] = "equal"
#         elif key == "ref_var_value" and value != "":
#             var = constraint_definition["reference_variable"]
#             if var == "day":
#                 if constraint_inputs["constraint_type"] == "order":
#                     constraint_variables[var]["operator"] = "offset"
#                     constraint_variables[var]["interval"] = value
#                 elif value == "week":
#                     constraint_variables[var]["operator"] = "interval"
#                     constraint_variables[var]["value"] = 0
#                     constraint_variables[var]["interval"] = 7
#             elif var == "shift":
#                 constraint_variables[var]["operator"] = "equal"
#                 constraint_variables[var]["value"] = variables[var].index(value)
#         elif key == "other_var_value" and value != "":
#             var = constraint_definition["other_variable"]
#             if var == "shift":
#                 constraint_variables[var]["other_value"] = variables[var].index(value)

#     return constraint, constraint_variables
