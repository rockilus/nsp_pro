from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import (
    build_shifts_in_coverage,
    build_var_name,
    get_average_nb_shifts_per_worker,
    get_nested_value,
)
from engine.types.input_output_types import Constraint, ShiftDemand


class AddConstraintFai(AddConstraint):
    def add_constraint(
        self,
        constraint: Constraint,
        coverage: List[ShiftDemand],
    ) -> None:
        w_vars, d_vars, s_vars = self.get_vars_coordinates(
            constraint, build_shifts_in_coverage(coverage)
        )
        if not all(isinstance(item, str) for item in d_vars):
            raise TypeError(
                "Expected a list of strings, "
                + f"but got {format(type(d_vars))} instead."
            )
        constraints_vars = [
            [self.variables[w, d, s] for d in d_vars for s in s_vars]  # type: ignore
            for w in w_vars
        ]
        target_average = get_average_nb_shifts_per_worker(
            coverage, len(w_vars), d_vars, s_vars  # type: ignore
        )

        for constraint_vars in constraints_vars:
            self._add_constraint_fai_to_model(
                constraint, constraint_vars, target_average
            )

    def _add_constraint_fai_to_model(
        self,
        constraint: Constraint,
        cstr_vars: List[cp_model.IntVar],
        target_average: float,
    ) -> None:
        penalty = get_nested_value(
            self.model_config,
            [
                "penalties",
                "user_constraint",
                "fai",
                "hard" if constraint.hard else "soft",
            ],
        )
        target_average_int = int(target_average)
        var_name = build_var_name(constraint, cstr_vars, "constraint")
        delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
        # pylint: disable=R0801
        self.model.Add(delta == sum(cstr_vars) - target_average_int)
        excess = self.model.NewIntVar(
            -len(cstr_vars),
            len(cstr_vars),
            var_name,
        )
        self.model.AddAbsEquality(excess, delta)
        self.obj.int_vars.append(excess)
        self.obj.int_coeffs.append(penalty)
        if target_average != target_average_int:
            delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
            self.model.Add(delta == sum(cstr_vars) - target_average_int - 1)
            excess = self.model.NewIntVar(
                -len(cstr_vars),
                len(cstr_vars),
                var_name,
            )
            self.model.AddAbsEquality(excess, delta)
            self.obj.int_vars.append(excess)
            self.obj.int_coeffs.append(penalty)
