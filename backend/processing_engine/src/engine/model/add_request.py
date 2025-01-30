from typing import Dict, List, Tuple

from ortools.sat.python import cp_model  # type: ignore

from engine.model.utils.model_utils import build_var_name_constraint
from engine.types import ModelConfig, Objective, ObjectiveCategory, Request


# pylint: disable=too-few-public-methods
class AddRequest:
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: Dict[Tuple[str, str, str], cp_model.IntVar],
        obj: Objective,
        model_config: ModelConfig,
    ) -> None:
        self.model = model
        self.variables = variables
        self.obj = obj
        self.model_config = model_config

    def add_requests(self, requests: List[Request], hard_to_soft: bool) -> None:
        for r in requests:
            c_variables: List[cp_model.IntVar] = [
                self.variables[a] for a in r.assignments
            ]
            c_var_len = len(c_variables)

            if r.hard and not hard_to_soft:
                self.model.Add(
                    sum(c_variables) == 0
                    if r.negative
                    else sum(c_variables) == c_var_len
                )
            else:
                penalty = (
                    self.model_config.penalties.user_constraint.request.hard
                    if r.hard
                    else self.model_config.penalties.user_constraint.request.soft
                )
                var_name = build_var_name_constraint(
                    r, c_variables, ObjectiveCategory.REQUEST
                )
                lit = self.model.NewBoolVar(var_name)
                if r.negative:
                    # (x or y) => p
                    # model.AddImplication(x, p)
                    # model.AddImplication(y, p)
                    for var in c_variables:
                        self.model.AddImplication(var, lit)
                else:
                    for var in c_variables:
                        self.model.AddImplication(var.Not(), lit)
                self.obj.bool_vars.append(lit)
                self.obj.bool_coeffs.append(penalty)

            # for var in c_variables:
            #     if r.hard and not hard_to_soft:
            #         self.model.Add(var == 0 if r.negative else var == 1)
            #         continue
            #     penalty = (
            #         self.model_config.penalties.user_constraint.request.hard
            #         if r.hard
            #         else self.model_config.penalties.user_constraint.request.soft
            #     )
            #     cstr_vars: List[
            #         cp_model.IntVar | cp_model._NotBooleanVariable
            #     ] = [var]
            #     if any(
            #         # pylint: disable=protected-access
            #         isinstance(var, cp_model._NotBooleanVariable)
            #         for var in cstr_vars
            #     ):
            #         raise ValueError(
            #             "Request constraints should be boolean variables"
            #         )
            #     var_name = build_var_name_constraint(
            #         r, cstr_vars, ObjectiveCategory.REQUEST  # type: ignore
            #     )
            #     # pylint: disable=R0801
            #     lit = self.model.NewBoolVar(var_name)
            #     if r.negative:
            #         cstr_vars = [var.Not() for var in cstr_vars]
            #     cstr_vars.append(lit)
            #     self.model.AddBoolOr(cstr_vars)
            #     self.obj.bool_vars.append(lit)
            #     self.obj.bool_coeffs.append(penalty)
