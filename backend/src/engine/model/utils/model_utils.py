import json
from dataclasses import asdict
from typing import List, Literal, Set

from ortools.sat.python import cp_model  # type: ignore

from engine.types.input_output_types import Constraint, Request, ShiftDemand
from engine.types.model_types import VarName


def get_average_nb_shifts_per_worker(
    coverage: List[ShiftDemand],
    num_eligible_workers: int,
    days: List[str],
    shifts: List[str],
) -> float:
    total_coverage = sum(get_total_coverage_shift(coverage, s, days) for s in shifts)
    target_average = total_coverage / num_eligible_workers
    return target_average


def get_total_coverage_shift(
    coverage: List[ShiftDemand], shift_id: str, days: List[str]
) -> int:
    date_format = "%Y-%m-%d"
    return sum(
        shift_demand.staffing
        for shift_demand in coverage
        if shift_demand.shift_id == shift_id
        and shift_demand.date.strftime(date_format) in days
    )


def build_var_name(
    constraint: Constraint | Request,
    cstr_vars: List[cp_model.IntVar],
    category: Literal['request', 'fixed_assignment', 'constraint'],
) -> str:
    return json.dumps(
        asdict(
            VarName(
                constraint_id=constraint.id,
                cstr_vars=[var.Name() for var in cstr_vars],
                category=category,
                hard_to_soft=constraint.hard_to_soft,
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
                    var.Not().Name()
                    for var in span
                    if isinstance(var, cp_model._NotBooleanVariable)
                ],
                category="constraint",
                hard_to_soft=constraint.hard_to_soft,
            )
        )
    )


def build_shifts_in_coverage(coverage: List[ShiftDemand]) -> Set[str]:
    return set(
        shift_demand.shift_id for shift_demand in coverage if shift_demand.staffing > 0
    )
