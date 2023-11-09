from typing import Dict, List, Tuple

from ortools.sat.python import cp_model

from engine.model.utils.model_utils import build_var_name
from engine.types.input_output_types import Assignment, Request
from engine.types.model_types import Objective


class AddFAR:
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: Dict[Tuple, Dict],
        workers: List[str],
        obj: Objective,
    ) -> None:
        self.model = model
        self.variables = variables
        self.workers = workers
        self.obj = obj

    def add_fixed_assignments(self, fixed_assignments: List[Assignment]) -> None:
        date_format = "%Y-%m-%d"
        for fa in fixed_assignments:
            w, d, s = fa.worker_id, fa.date.strftime(date_format), fa.shift_id
            self.model.Add(self.variables[w, d, s] == 1)

    def add_requests(self, requests: List[Request]) -> None:
        date_format = "%Y-%m-%d"
        for r in requests:
            w, d, s, p = (
                r.worker_id,
                r.date.strftime(date_format),
                r.shift_id,
                r.penalty,
            )
            cstr_vars: List[cp_model.IntVar] = [self.variables[w, d, s]]
            var_name = build_var_name(
                r,
                cstr_vars,
                "fixed_assignment" if r.hard_to_soft else "request",
            )
            lit = self.model.NewBoolVar(var_name)
            cstr_vars.append(lit)
            self.model.AddBoolOr(cstr_vars)
            self.obj.bool_vars.append(lit)
            self.obj.bool_coeffs.append(p)
