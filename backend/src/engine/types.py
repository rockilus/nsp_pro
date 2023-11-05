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
    category: Literal["request", "fixed_assignment", "constraint"]
    cstr_vars: List[str]
    hard_to_soft: bool
