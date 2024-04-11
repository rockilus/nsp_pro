from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore

from engine.model.utils.model_utils import build_var_name
from engine.types.input_output_types import Request
from engine.types.model_types import Objective
from utils.constants import Constants


# pylint: disable=too-few-public-methods
class AddRequest:
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: Dict[Tuple, cp_model.IntVar],
        workers: List[str],
        obj: Objective,
    ) -> None:
        self.model = model
        self.variables = variables
        self.workers = workers
        self.obj = obj

    def add_requests(self, requests: List[Request]) -> None:
        for r in requests:
            w, d, s, p = (
                r.worker_id,
                r.date.strftime(Constants.ENGINE_STRING_DATE_FORMAT),
                r.shift_id,
                r.penalty,
            )
            if r.hard and not r.hard_to_soft:
                self.model.Add(self.variables[w, d, s] == 1)
                continue
            cstr_vars: List[cp_model.IntVar] = [self.variables[w, d, s]]
            var_name = build_var_name(
                r,
                cstr_vars,
                "request",
            )
            lit = self.model.NewBoolVar(var_name)
            cstr_vars.append(lit)
            self.model.AddBoolOr(cstr_vars)
            self.obj.bool_vars.append(lit)
            self.obj.bool_coeffs.append(p)
