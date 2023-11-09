from typing import Dict, List, Tuple

from ortools.sat.python import cp_model

from engine.model.utils.model_utils import build_var_name
from engine.types.input_output_types import Constraint
from engine.types.model_types import Objective


class AddConstraintFil:
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: Dict[Tuple, Dict],
        workers: List[str],
        days: List[str],
        shifts: List[str],
        obj: Objective,
    ) -> None:
        self.model = model
        self.variables = variables
        self.workers = workers
        self.days = days
        self.shifts = shifts
        self.obj = obj

    def add_constraint(self, constraint: Constraint) -> None:
        w_vars, d_vars, s_vars = self._get_vars_coordinates_fil(constraint)
        for w in w_vars:
            for d in d_vars:
                for s in s_vars:
                    self._add_constraint_fil_to_model(
                        constraint, self.variables[w, d, s]
                    )

    def _get_vars_coordinates_fil(
        self, constraint: Constraint
    ) -> Tuple[List[str], List[str], List[str]]:
        if constraint.worker_var.selector == "all":
            w_vars = self.workers
        elif constraint.worker_var.selector == "equal":
            if constraint.worker_var.operator == "in_target":
                w_vars = constraint.worker_var.target
            elif constraint.worker_var.operator == "out_target":
                w_vars = [
                    w for w in self.workers if w not in constraint.worker_var.target
                ]
            else:
                raise NotImplementedError(
                    f"Worker operator {constraint.worker_var.operator} "
                    + "not implemented"
                )
        else:
            raise NotImplementedError(
                f"Worker selector {constraint.worker_var.selector} " + "not implemented"
            )
        if constraint.day_var.selector == "all":
            d_vars = self.days
        if constraint.shift_var.selector == "all":
            s_vars = self.shifts
        elif constraint.shift_var.selector == "equal":
            if constraint.shift_var.operator == "in_target":
                s_vars = constraint.shift_var.target
            elif constraint.shift_var.operator == "out_target":
                s_vars = [
                    s for s in self.shifts if s not in constraint.shift_var.target
                ]
        else:
            raise NotImplementedError(
                f"Shift selector {constraint.shift_var.selector} " + "not implemented"
            )
        return w_vars, d_vars, s_vars

    def _add_constraint_fil_to_model(
        self, constraint: Constraint, cstr_var: cp_model.IntVar
    ) -> None:
        if constraint.hard:
            self.model.Add(cstr_var == 0)
        else:
            if constraint.penalty != 0:
                cstr_vars: List[cp_model.IntVar] = [cstr_var]
                var_name = build_var_name(constraint, cstr_vars, "constraint")
                cstr_vars = [var.Not() for var in cstr_vars]
                lit = self.model.NewBoolVar(var_name)
                cstr_vars.append(lit)
                self.model.AddBoolOr(cstr_vars)
                self.obj.bool_vars.append(lit)
                self.obj.bool_coeffs.append(constraint.penalty)
