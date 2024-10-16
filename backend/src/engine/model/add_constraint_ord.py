from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name, get_nested_value
from engine.types.input_output_types import Constraint, ConstraintOperator


class AddConstraintOrd(AddConstraint):
    def add_constraint(self, constraint: Constraint, hard_to_soft: bool) -> None:
        w_vars, d_vars, s_vars = self.get_vars_coordinates(constraint)
        if not all(isinstance(item, list) for item in d_vars):
            raise TypeError(
                "Expected a list of lists of strings, "
                + f"but got {format(type(d_vars))} instead."
            )
        for w in w_vars:
            for d1, d2 in d_vars:  # type: ignore
                for s_ref, s_rel in s_vars:  # type: ignore
                    constraint_vars = [
                        self.variables[w, d1, s_ref],
                        self.variables[w, d2, s_rel],
                    ]
                    self._add_constraint_ord_to_model(
                        constraint, constraint_vars, hard_to_soft
                    )

    def _add_constraint_ord_to_model(
        self,
        constraint: Constraint,
        cstr_vars: List[cp_model.IntVar],
        hard_to_soft: bool,
    ) -> None:
        if constraint.hard and not hard_to_soft:
            if constraint.operator == ConstraintOperator.YES:
                transition = [cstr_vars[0].Not(), cstr_vars[1]]
            elif constraint.operator == ConstraintOperator.NO:
                transition = [cstr_var.Not() for cstr_var in cstr_vars]
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
            self.model.AddBoolOr(transition)  # type: ignore # [CHECK IF OK]
        # pylint: disable=R0801
        else:
            penalty = get_nested_value(
                self.model_config,
                [
                    "penalties",
                    "user_constraint",
                    "ord",
                    "hard" if constraint.hard else "soft",
                ],
            )
            var_name = build_var_name(constraint, cstr_vars, "constraint")
            if constraint.operator == ConstraintOperator.YES:
                transition = [cstr_vars[0].Not(), cstr_vars[1]]
            elif constraint.operator == ConstraintOperator.NO:
                transition = [cstr_var.Not() for cstr_var in cstr_vars]
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
            trans_var = self.model.NewBoolVar(var_name)
            transition.append(trans_var)
            self.model.AddBoolOr(transition)  # type: ignore # [CHECK IF OK]
            self.obj.bool_vars.append(trans_var)
            self.obj.bool_coeffs.append(penalty)
