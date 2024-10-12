from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore

from engine.model.utils.model_utils import build_var_name, get_nested_value
from engine.types.input_output_types import Request
from engine.types.model_types import Objective
from utils.constants import Constants


# pylint: disable=too-few-public-methods
class AddRequest:
    # pylint: disable=too-many-arguments
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: Dict[Tuple[str, str, str], cp_model.IntVar],
        workers: List[str],
        obj: Objective,
        model_config: Dict,
    ) -> None:
        self.model = model
        self.variables = variables
        self.workers = workers
        self.obj = obj
        self.model_config = model_config

    def add_requests(self, requests: List[Request], hard_to_soft: bool) -> None:
        penalty = get_nested_value(self.model_config, ["penalties", "request", "soft"])
        for r in requests:
            w, d, s = (
                r.worker_id,
                r.date.strftime(Constants.ENGINE_STRING_DATE_FORMAT),
                r.shift_id,
            )
            if r.hard and not hard_to_soft:
                self.model.Add(self.variables[w, d, s] == 1)
                continue
            cstr_vars: List[cp_model.IntVar] = [self.variables[w, d, s]]
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
