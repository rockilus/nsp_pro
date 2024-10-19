from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore

from engine.model.utils.model_utils import build_var_name, get_nested_value
from engine.types.input_output_types import NewRequest
from engine.types.model_types import Objective


# pylint: disable=too-few-public-methods
class AddRequest:
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: Dict[Tuple[str, str, str], cp_model.IntVar],
        obj: Objective,
        model_config: Dict,
    ) -> None:
        self.model = model
        self.variables = variables
        self.obj = obj
        self.model_config = model_config

    def add_requests(self, requests: List[NewRequest], hard_to_soft: bool) -> None:
        penalty = get_nested_value(self.model_config, ["penalties", "request", "soft"])
        for r in requests:
            c_variables: List[cp_model.IntVar] = [
                self.variables[a] for a in r.assignments
            ]
            for var in c_variables:
                if r.hard and not hard_to_soft:
                    self.model.Add(var == 1)
                    continue
                cstr_vars: List[cp_model.IntVar] = [var]
                var_name = build_var_name(
                    r,
                    cstr_vars,
                    "request",
                )
                # pylint: disable=R0801
                lit = self.model.NewBoolVar(var_name)
                cstr_vars.append(lit)
                self.model.AddBoolOr(cstr_vars)
                self.obj.bool_vars.append(lit)
                self.obj.bool_coeffs.append(penalty)
