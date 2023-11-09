from typing import Dict, List, Tuple

from ortools.sat.python import cp_model

from engine.model.utils.model_utils import build_var_name
from engine.types.input_output_types import Constraint
from engine.types.model_types import Objective


class AddConstraintOrd:
    def __init__(
        self,
        model: cp_model.CpModel,
        variables: Dict[Tuple, Dict],
        workers: List[str],
        days: List[str],
        obj: Objective,
    ) -> None:
        self.model = model
        self.variables = variables
        self.workers = workers
        self.days = days
        self.obj = obj

    def add_constraint(self, constraint: Constraint) -> None:
        w_vars, d_vars = self._get_vars_coordinates_ord(constraint)
        for w in w_vars:
            for d1, d2 in d_vars:
                constraint_vars = [
                    self.variables[w, d1, constraint.shift_var.reference],
                    self.variables[w, d2, constraint.shift_var.relative],
                ]
                self._add_constraint_ord_to_model(constraint, constraint_vars)

    def _get_vars_coordinates_ord(
        self, constraint: Constraint
    ) -> Tuple[List[str], List[List[str]]]:
        week_length = 7
        if constraint.worker_var.selector == "all":
            w_vars = self.workers
        else:
            raise NotImplementedError(
                f"Worker selector {constraint.worker_var.selector} " + "not implemented"
            )
        d_vars: List[List[str]] = []
        if constraint.day_var.selector == "all":
            for i in range(
                abs(min(constraint.day_var.interval, 0)),
                len(self.days) - max(constraint.day_var.interval, 0),
            ):
                d_vars.append(
                    [self.days[i], self.days[i + constraint.day_var.interval]]
                )
        elif constraint.day_var.selector == "week_day_index":
            start = (
                constraint.day_var.target
                if (constraint.day_var.target + constraint.day_var.interval >= 0)
                else constraint.day_var.target + week_length
            )
            for i in range(
                start,
                len(self.days) - max(constraint.day_var.interval, 0),
                week_length,
            ):
                d_vars.append(
                    [
                        self.days[i],
                        self.days[i + constraint.day_var.interval],
                    ]
                )
        else:
            raise NotImplementedError(
                f"Day selector {constraint.day_var.selector} " + "not implemented"
            )
        return w_vars, d_vars

    def _add_constraint_ord_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        if constraint.hard:
            if constraint.operator == "yes":
                transition = [cstr_vars[0].Not(), cstr_vars[1]]
            elif constraint.operator == "no":
                transition = [cstr_var.Not() for cstr_var in cstr_vars]
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
            self.model.AddBoolOr(transition)
        else:
            if constraint.penalty != 0:
                var_name = build_var_name(constraint, cstr_vars, "constraint")
                if constraint.operator == "yes":
                    transition = [cstr_vars[0].Not(), cstr_vars[1]]
                elif constraint.operator == "no":
                    transition = [cstr_var.Not() for cstr_var in cstr_vars]
                else:
                    raise NotImplementedError(
                        f"Sum constraint operator {constraint.operator} "
                        + "not implemented"
                    )
                trans_var = self.model.NewBoolVar(var_name)
                transition.append(trans_var)
                self.model.AddBoolOr(transition)
                self.obj.bool_vars.append(trans_var)
                self.obj.bool_coeffs.append(constraint.penalty)
