import json
from dataclasses import asdict
from typing import List

from ortools.sat.python import cp_model  # type: ignore
from shared.schemas import Constraint

from engine.types import ObjectiveCategory, Request, VarName

# def get_average_nb_shifts_per_worker(
#     coverage: List[ShiftDemand],
#     num_eligible_workers: int,
#     days: List[str],
#     shifts: List[str],
# ) -> float:
#     total_coverage = sum(get_total_coverage_shift(coverage, s, days) for s in shifts)
#     target_average = total_coverage / num_eligible_workers
#     return target_average


# def get_total_coverage_shift(
#     coverage: List[ShiftDemand], shift_id: str, days: List[str]
# ) -> int:
#     return sum(
#         shift_demand.nb_times_shift  # QUICK FIX TO CHANGE XXX
#         for shift_demand in coverage
#         if shift_demand.shift_id == shift_id and shift_demand.date.isoformat() in days
#     )


def build_var_name_constraint(
    constraint: Constraint | Request,
    cstr_vars: List[cp_model.IntVar],
    category: ObjectiveCategory,
) -> str:
    return json.dumps(
        asdict(
            VarName(
                objective_id=constraint.id,
                cstr_vars=[var.Name() for var in cstr_vars],
                objective_category=category.value,
                hard_to_soft=constraint.hard,
            )
        )
    )


def build_var_name_work_time(
    cstr_vars: List[cp_model.IntVar], category: ObjectiveCategory
) -> str:
    return json.dumps(
        asdict(
            VarName(
                objective_id=None,
                cstr_vars=[var.Name() for var in cstr_vars],
                objective_category=category.value,
                hard_to_soft=None,
            )
        )
    )


def build_var_name_daily_shift_demand(
    cstr_vars: List[cp_model.IntVar],
    category: ObjectiveCategory,
) -> str:
    return json.dumps(
        asdict(
            VarName(
                objective_id=None,
                cstr_vars=[var.Name() for var in cstr_vars],
                objective_category=category.value,
                hard_to_soft=None,
            )
        )
    )


def build_var_name_link_shift(
    cstr_vars: List[cp_model.IntVar],
    category: ObjectiveCategory,
    link_shift_id: str,
) -> str:
    return json.dumps(
        asdict(
            VarName(
                objective_id=link_shift_id,
                cstr_vars=[var.Name() for var in cstr_vars],
                objective_category=category.value,
                hard_to_soft=None,
            )
        )
    )


# def build_var_name_constraint(
#     constraint: Constraint | Request | ShiftDemand | None,
#     cstr_vars: List[cp_model.IntVar],
#     category: Literal[
#         'request',
#         'constraint',
#         'coverage',
#         "recuperation",
#         "work_time",
#         "duties_per_month",
#         "worker_shift_filter",
#     ],
# ) -> str:
#     return json.dumps(
#         asdict(
#             VarName(
#                 objective_id=(
#                     ""
#                     if constraint is None
#                     else (
#                         constraint.id
#                         if not isinstance(constraint, ShiftDemand)
#                         else "no_shift_demand_id"
#                     )
#                 ),
#                 cstr_vars=[var.Name() for var in cstr_vars],
#                 objective_category=category,
#                 hard_to_soft=(
#                     True
#                     if isinstance(constraint, ShiftDemand)
#                     or constraint is None
#                     else constraint.hard
#                 ),
#             )
#         )
#     )


def build_var_name_seq(constraint: Constraint, span: List[cp_model.IntVar]) -> str:
    # pylint: disable=protected-access
    return json.dumps(
        asdict(
            VarName(
                objective_id=constraint.id,
                cstr_vars=[
                    var.Not().Name()  # type: ignore # [CHECK IF OK]
                    for var in span
                    if isinstance(var, cp_model._NotBooleanVariable)
                ],
                objective_category=ObjectiveCategory.CONSTRAINT.value,
                hard_to_soft=constraint.hard,
            )
        )
    )


# def build_shifts_in_coverage(coverage: List[ShiftDemand]) -> Set[str]:
#     return set(
#         shift_demand.shift_id
#         for shift_demand in coverage
#         if shift_demand.nb_times_shift > 0  # QUICK FIX TO CHANGE XXX
#     )
