from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name_seq
from engine.types.input_output_types import Constraint


class AddConstraintSeq(AddConstraint):
    def add_constraint(self, constraint: Constraint) -> None:
        w_vars, d_vars, s_vars = self.get_vars_coordinates(constraint)
        for w in w_vars:
            for s in s_vars:
                constraint_vars = []
                for d in d_vars:
                    constraint_vars.append(self.variables[w, d, s])
            self._add_constraint_seq_to_model(constraint, constraint_vars)

    def _add_constraint_seq_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        if constraint.hard:
            if constraint.operator == "less_than_or_equal":
                self._add_constraint_seq_less_than_or_equal_hard_to_model(
                    constraint, cstr_vars
                )
            elif constraint.operator == "equal":
                self._add_constraint_seq_less_than_or_equal_hard_to_model(
                    constraint, cstr_vars
                )
                self._add_constraint_seq_greater_than_or_equal_hard_to_model(
                    constraint, cstr_vars
                )
            elif constraint.operator == "greater_than_or_equal":
                self._add_constraint_seq_greater_than_or_equal_hard_to_model(
                    constraint, cstr_vars
                )
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
        else:
            if constraint.penalty != 0:
                if constraint.operator == "less_than_or_equal":
                    self._add_constraint_seq_less_than_or_equal_soft_to_model(
                        constraint, cstr_vars
                    )
                elif constraint.operator == "equal":
                    self._add_constraint_seq_less_than_or_equal_soft_to_model(
                        constraint, cstr_vars
                    )
                    self._add_constraint_seq_greater_than_or_equal_soft_to_model(
                        constraint, cstr_vars
                    )
                elif constraint.operator == "greater_than_or_equal":
                    self._add_constraint_seq_greater_than_or_equal_soft_to_model(
                        constraint, cstr_vars
                    )

    def _add_constraint_seq_less_than_or_equal_hard_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for start in range(len(cstr_vars) - constraint.target_value):
            self.model.AddBoolOr(
                [
                    cstr_vars[i].Not()
                    for i in range(start, start + constraint.target_value + 1)
                ]
            )

    def _add_constraint_seq_greater_than_or_equal_hard_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for length in range(1, constraint.target_value):
            for start in range(len(cstr_vars) - length + 1):
                self.model.AddBoolOr(
                    AddConstraintSeq._negated_bounded_span(cstr_vars, start, length)
                )

    def _add_constraint_seq_less_than_or_equal_soft_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for length in range(constraint.target_value + 1, len(cstr_vars) + 1):
            for start in range(len(cstr_vars) - length + 1):
                span = AddConstraintSeq._negated_bounded_span(cstr_vars, start, length)
                # pylint: disable=protected-access
                var_name = build_var_name_seq(constraint, span)
                lit = self.model.NewBoolVar(var_name)
                span.append(lit)
                self.model.AddBoolOr(span)
                self.obj.bool_vars.append(lit)
                self.obj.bool_coeffs.append(
                    constraint.penalty * (length - constraint.target_value)
                )

    def _add_constraint_seq_greater_than_or_equal_soft_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for length in range(1, constraint.target_value):
            for start in range(len(cstr_vars) - length + 1):
                span = AddConstraintSeq._negated_bounded_span(cstr_vars, start, length)
                # pylint: disable=protected-access
                var_name = build_var_name_seq(constraint, span)
                lit = self.model.NewBoolVar(var_name)
                span.append(lit)
                self.model.AddBoolOr(span)
                self.obj.bool_vars.append(lit)
                self.obj.bool_coeffs.append(
                    constraint.penalty * (constraint.target_value - length)
                )

    @staticmethod
    def _negated_bounded_span(
        cstr_vars: List[cp_model.IntVar], start: int, length: int
    ) -> List[cp_model.IntVar]:
        sequence = []
        if start > 0:
            sequence.append(cstr_vars[start - 1])
        for i in range(length):
            sequence.append(cstr_vars[start + i].Not())
        if start + length < len(cstr_vars):
            sequence.append(cstr_vars[start + length])
        return sequence
