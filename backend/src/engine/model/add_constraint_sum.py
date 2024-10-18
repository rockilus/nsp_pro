from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name, get_nested_value
from engine.types.input_output_types import ConstraintOperator, ConstraintSum
from utils.constants import Constants


# pylint: disable=too-few-public-methods
class AddConstraintSum(AddConstraint):
    def add_constraint(self, constraint: ConstraintSum, hard_to_soft: bool) -> None:
        for coords in constraint.constraint_variables:
            constraint_vars = [self.variables[coord] for coord in coords]
            self._add_constraint_sum_other(constraint, constraint_vars, hard_to_soft)
        # w_vars, d_vars, s_vars = self.get_vars_coordinates(constraint)
        # if not all(isinstance(item, str) for item in s_vars):
        #     raise TypeError(
        #         "Expected a list of strings, "
        #         + f"but got {format(type(s_vars))} instead."
        #     )
        # if constraint.target_unit == "hour":
        #     for w in w_vars:
        #         for period in d_vars:
        #             constraint_vars = []
        #             constraint_durs = []
        #             for s in s_vars:
        #                 constraint_vars.extend(
        #                     [self.variables[w, d, s] for d in period]  # type: ignore
        #                 )
        #                 constraint_durs.extend(
        #                     [self.durations[s] for _ in period]  # type: ignore
        #                 )
        #             self._add_constraint_sum_hour(
        #                 constraint,
        #                 constraint_vars,
        #                 constraint_durs,
        #                 hard_to_soft,
        #             )
        # else:

    def _add_constraint_sum_hour(
        self,
        constraint: ConstraintSum,
        cstr_vars: List[cp_model.IntVar],
        cstr_durs: List[int],
        hard_to_soft: bool,
    ) -> None:
        if constraint.hard and not hard_to_soft:
            if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                sum_var = self.model.NewIntVar(
                    0, constraint.target_value * Constants.NUM_MINUTES_HOUR, ""
                )
            elif constraint.operator == ConstraintOperator.EQUAL:
                sum_var = self.model.NewIntVar(
                    constraint.target_value * Constants.NUM_MINUTES_HOUR,
                    constraint.target_value * Constants.NUM_MINUTES_HOUR,
                    "",
                )
            elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                sum_var = self.model.NewIntVar(
                    constraint.target_value * Constants.NUM_MINUTES_HOUR,
                    len(cstr_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    "",
                )
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
            self.model.Add(sum_var == sum(v * d for v, d in zip(cstr_vars, cstr_durs)))
        # pylint: disable=R0801
        else:
            penalty = get_nested_value(
                self.model_config,
                [
                    "penalties",
                    "user_constraint",
                    "sum",
                    "hard" if constraint.hard else "soft",
                ],
            )
            var_name = build_var_name(constraint, cstr_vars, "constraint")
            if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                delta = self.model.NewIntVar(
                    -constraint.target_value * Constants.NUM_MINUTES_HOUR,
                    len(cstr_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    "",
                )
                self.model.Add(
                    delta
                    == sum(v * d for v, d in zip(cstr_vars, cstr_durs))
                    - constraint.target_value * Constants.NUM_MINUTES_HOUR
                )
                excess = self.model.NewIntVar(
                    0,
                    len(cstr_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    var_name,
                )
                self.model.AddMaxEquality(excess, [delta, 0])
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(penalty)
            elif constraint.operator == ConstraintOperator.EQUAL:
                delta = self.model.NewIntVar(
                    -constraint.target_value * Constants.NUM_MINUTES_HOUR,
                    len(cstr_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    "",
                )
                self.model.Add(
                    delta
                    == sum(v * d for v, d in zip(cstr_vars, cstr_durs))
                    - constraint.target_value * Constants.NUM_MINUTES_HOUR
                )
                excess = self.model.NewIntVar(
                    -constraint.target_value * Constants.NUM_MINUTES_HOUR,
                    len(cstr_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    var_name,
                )
                self.model.AddAbsEquality(excess, delta)
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(penalty)
            elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                delta = self.model.NewIntVar(
                    -len(cstr_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    constraint.target_value * Constants.NUM_MINUTES_HOUR,
                    "",
                )
                self.model.Add(
                    delta
                    == constraint.target_value * Constants.NUM_MINUTES_HOUR
                    - sum(v * d for v, d in zip(cstr_vars, cstr_durs))
                )
                excess = self.model.NewIntVar(
                    0,
                    len(cstr_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    var_name,
                )
                self.model.AddMaxEquality(excess, [delta, 0])
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(penalty)

    def _add_constraint_sum_other(
        self,
        constraint: ConstraintSum,
        cstr_vars: List[cp_model.IntVar],
        hard_to_soft: bool,
    ) -> None:
        if constraint.hard and not hard_to_soft:
            if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                sum_var = self.model.NewIntVar(0, constraint.target_value, "")
            elif constraint.operator == ConstraintOperator.EQUAL:
                sum_var = self.model.NewIntVar(
                    constraint.target_value,
                    constraint.target_value,
                    "",
                )
            elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                sum_var = self.model.NewIntVar(
                    constraint.target_value, len(cstr_vars), ""
                )
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
            self.model.Add(sum_var == sum(cstr_vars))
        else:
            penalty = get_nested_value(
                self.model_config,
                [
                    "penalties",
                    "user_constraint",
                    "sum",
                    "hard" if constraint.hard else "soft",
                ],
            )
            var_name = build_var_name(constraint, cstr_vars, "constraint")
            if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                self.model.Add(delta == sum(cstr_vars) - constraint.target_value)
                excess = self.model.NewIntVar(
                    0,
                    len(cstr_vars),
                    var_name,
                )
                self.model.AddMaxEquality(excess, [delta, 0])
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(penalty)
            elif constraint.operator == ConstraintOperator.EQUAL:
                delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                self.model.Add(delta == sum(cstr_vars) - constraint.target_value)
                excess = self.model.NewIntVar(
                    -len(cstr_vars),
                    len(cstr_vars),
                    var_name,
                )
                self.model.AddAbsEquality(excess, delta)
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(penalty)
            elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                self.model.Add(delta == constraint.target_value - sum(cstr_vars))
                excess = self.model.NewIntVar(
                    0,
                    len(cstr_vars),
                    var_name,
                )
                self.model.AddMaxEquality(excess, [delta, 0])
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(penalty)
