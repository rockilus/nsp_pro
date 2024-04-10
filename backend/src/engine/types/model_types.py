from dataclasses import dataclass, field
from typing import List, Literal

from ortools.sat.python import cp_model  # type: ignore


@dataclass
class Objective:
    int_vars: List[cp_model.IntVar] = field(default_factory=list)
    int_coeffs: List[int] = field(default_factory=list)
    bool_vars: List[cp_model.IntVar] = field(default_factory=list)
    bool_coeffs: List[int] = field(default_factory=list)


@dataclass
class VarName:
    constraint_id: str
    category: Literal["request", "constraint"]
    cstr_vars: List[str]
    hard_to_soft: bool


@dataclass
class BenchmarkTimes:
    total_start: float = 0.0
    total_end: float = 0.0
    full_setup_start: float = 0.0
    full_setup_end: float = 0.0
    variables_start: float = 0.0
    variables_end: float = 0.0
    constraints_start: float = 0.0
    constraints_end: float = 0.0
    objective_start: float = 0.0
    objective_end: float = 0.0


# status 0: UNKNOWN
# status 1: MODEL_INVALID
# status 2: FEASIBLE
# status 3: INFEASIBLE
# status 4: OPTIMAL
