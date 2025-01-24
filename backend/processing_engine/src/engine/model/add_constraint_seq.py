from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name_constraint, build_var_name_seq
from engine.types import ConstraintOperator, ConstraintSeq, ObjectiveCategory


# pylint: disable=too-few-public-methods
class AddConstraintSeq(AddConstraint):
    def add_constraint(self, constraint: ConstraintSeq, hard_to_soft: bool) -> None:
        for coords in constraint.constraint_variables:
            constraint_vars = [self.variables[coord] for coord in coords]
            self._add_constraint_seq_to_model(constraint, constraint_vars, hard_to_soft)

    def _add_constraint_seq_to_model(
        self,
        constraint: ConstraintSeq,
        cstr_vars: List[cp_model.IntVar],
        hard_to_soft: bool,
    ) -> None:
        if constraint.hard and not hard_to_soft:
            if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                self._add_constraint_seq_less_than_or_equal_hard_to_model(
                    constraint, cstr_vars
                )
            elif constraint.operator == ConstraintOperator.EQUAL:
                self._add_constraint_seq_less_than_or_equal_hard_to_model(
                    constraint, cstr_vars
                )
                self._add_constraint_seq_greater_than_or_equal_hard_to_model(
                    constraint, cstr_vars
                )
            elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                self._add_constraint_seq_greater_than_or_equal_hard_to_model(
                    constraint, cstr_vars
                )
            else:
                raise NotImplementedError(
                    f"Sequence constraint operator {constraint.operator} "
                    + "not implemented"
                )
        # pylint: disable=R0801
        else:
            penalty = (
                self.model_config.penalties.user_constraint.seq.hard
                if constraint.hard
                else self.model_config.penalties.user_constraint.seq.soft
            )
            if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                self._add_constraint_seq_less_than_or_equal_soft_to_model(
                    constraint, cstr_vars, penalty
                )
            elif constraint.operator == ConstraintOperator.EQUAL:
                self._add_constraint_seq_less_than_or_equal_soft_to_model(
                    constraint, cstr_vars, penalty
                )
                self._add_constraint_seq_greater_than_or_equal_soft_to_model(
                    constraint, cstr_vars, penalty
                )
            elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                self._add_constraint_seq_greater_than_or_equal_soft_to_model(
                    constraint, cstr_vars, penalty
                )

    def _add_constraint_seq_less_than_or_equal_hard_to_model(
        self, constraint: ConstraintSeq, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for start in range(len(cstr_vars) - constraint.target_value):
            self.model.AddBoolOr(
                [
                    cstr_vars[i].Not()
                    for i in range(start, start + constraint.target_value + 1)
                ]
            )

    def _add_constraint_seq_greater_than_or_equal_hard_to_model(
        self, constraint: ConstraintSeq, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        for length in range(1, constraint.target_value):
            for start in range(len(cstr_vars) - length + 1):
                self.model.AddBoolOr(
                    AddConstraintSeq._negated_bounded_span(cstr_vars, start, length)
                )

    def _add_constraint_seq_less_than_or_equal_soft_to_model(
        self,
        constraint: ConstraintSeq,
        cstr_vars: List[cp_model.IntVar],
        penalty: int,
    ) -> None:
        # i = 0
        # for length in range(constraint.target_value + 1, len(cstr_vars) + 1):
        #     for start in range(len(cstr_vars) - length + 1):
        #         span = AddConstraintSeq._negated_bounded_span(
        #             cstr_vars, start, length
        #         )
        #         # pylint: disable=protected-access
        #         var_name = build_var_name_seq(constraint, span)
        #         lit = self.model.NewBoolVar(var_name)
        #         span.append(lit)
        #         self.model.AddBoolOr(span)
        #         self.obj.bool_vars.append(lit)
        #         self.obj.bool_coeffs.append(
        #             constraint.penalty * (length - constraint.target_value)
        #         )
        #         i += 1
        # print("num iter less than", i)
        # i = 0
        for i in range(len(cstr_vars) - constraint.target_value):
            span = [cstr_vars[i + j] for j in range(constraint.target_value + 1)]
            # pylint: disable=protected-access
            var_name = build_var_name_constraint(
                constraint, span, ObjectiveCategory.CONSTRAINT
            )
            lit = self.model.NewBoolVar(var_name)
            self.model.Add(sum(span) <= constraint.target_value).OnlyEnforceIf(
                lit.Not()
            )
            self.obj.bool_vars.append(lit)
            self.obj.bool_coeffs.append(penalty)
        #     i += 1
        # print("num iter less than", i)

    def _add_constraint_seq_greater_than_or_equal_soft_to_model(
        self,
        constraint: ConstraintSeq,
        cstr_vars: List[cp_model.IntVar],
        penalty: int,
    ) -> None:
        # i = 0
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
                    penalty * (constraint.target_value - length)
                )
        #         i += 1
        # print("num iter greater than", i)
        # for length in range(1, constraint.target_value):
        #     for start in range(len(cstr_vars) - length + 1):
        #         span = AddConstraintSeq._negated_bounded_span(
        #             cstr_vars, start, length
        #         )
        #         # pylint: disable=protected-access
        #         var_name = build_var_name_seq(constraint, span)
        #         lit = self.model.NewBoolVar(var_name)
        #         self.model.AddBoolOr(span).OnlyEnforceIf(lit.Not())
        #         self.obj.bool_vars.append(lit)
        #         self.obj.bool_coeffs.append(
        #             constraint.penalty * (constraint.target_value - length)
        #         )

    @staticmethod
    def _negated_bounded_span(
        cstr_vars: List[cp_model.IntVar], start: int, length: int
    ) -> List[cp_model.IntVar]:
        sequence = []
        if start > 0:
            sequence.append(cstr_vars[start - 1])
        for i in range(length):
            sequence.append(cstr_vars[start + i].Not())  # type: ignore # [CHECK IF OK]
        if start + length < len(cstr_vars):
            sequence.append(cstr_vars[start + length])
        return sequence
