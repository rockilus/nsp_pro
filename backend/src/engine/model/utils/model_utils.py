import json
from dataclasses import asdict
from typing import Any, List, Literal

from ortools.sat.python import cp_model  # type: ignore

from engine.types.input_output_types import Constraint, NewRequest, NewShiftDemand
from engine.types.model_types import VarName

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


def build_var_name(
    constraint: Constraint | NewRequest | NewShiftDemand | None,
    cstr_vars: List[cp_model.IntVar],
    category: Literal[
        'request',
        'constraint',
        'coverage',
        "recuperation",
        "work_time",
        "duties_per_month",
        "worker_shift_filter",
    ],
) -> str:
    return json.dumps(
        asdict(
            VarName(
                constraint_id=(
                    ""
                    if constraint is None
                    else (
                        constraint.id
                        if not isinstance(constraint, NewShiftDemand)
                        else "no_shift_demand_id"
                    )
                ),
                cstr_vars=[var.Name() for var in cstr_vars],
                category=category,
                hard_to_soft=(
                    True
                    if isinstance(constraint, NewShiftDemand) or constraint is None
                    else constraint.hard
                ),
            )
        )
    )


def build_var_name_seq(constraint: Constraint, span: List[cp_model.IntVar]) -> str:
    # pylint: disable=protected-access
    return json.dumps(
        asdict(
            VarName(
                constraint_id=constraint.id,
                cstr_vars=[
                    var.Not().Name()  # type: ignore # [CHECK IF OK]
                    for var in span
                    if isinstance(var, cp_model._NotBooleanVariable)
                ],
                category="constraint",
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


def get_nested_value(d: dict, keys: list) -> Any:
    for key in keys:
        if key in d:
            d = d[key]
        else:
            raise KeyError(f"Key {key} does not exist in the dictionary.")
    return d
