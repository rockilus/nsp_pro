from ortools.sat.python import cp_model  # type: ignore
from shared.schemas.core import ConstraintOperator, ConstraintSum

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name_constraint
from engine.types import ObjectiveCategory
from utils.constants import Constants


# pylint: disable=too-few-public-methods
class AddConstraintSum(AddConstraint):
    def add_constraint(self, constraint: ConstraintSum, hard_to_soft: bool) -> None:
        for period_idx, coords in enumerate(constraint.constraint_variables):
            constraint_vars = [self.variables[coord] for coord in coords]
            target_for_period = constraint.target_values[period_idx]
            self._add_constraint_sum_other(
                constraint, constraint_vars, target_for_period, hard_to_soft
            )
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

    # pylint: disable=too-many-arguments
    def _add_constraint_sum_hour(
        self,
        constraint: ConstraintSum,
        cstr_vars: list[cp_model.IntVar],
        cstr_durs: list[int],
        target_for_period: int,
        hard_to_soft: bool,
    ) -> None:
        if constraint.hard and not hard_to_soft:
            if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                sum_var = self.model.NewIntVar(
                    0, target_for_period * Constants.NUM_MINUTES_HOUR, ""
                )
            elif constraint.operator == ConstraintOperator.EQUAL:
                sum_var = self.model.NewIntVar(
                    target_for_period * Constants.NUM_MINUTES_HOUR,
                    target_for_period * Constants.NUM_MINUTES_HOUR,
                    "",
                )
            elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                sum_var = self.model.NewIntVar(
                    target_for_period * Constants.NUM_MINUTES_HOUR,
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
            var_name = build_var_name_constraint(
                constraint, cstr_vars, ObjectiveCategory.CONSTRAINT
            )
            if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                delta = self.model.NewIntVar(
                    -target_for_period * Constants.NUM_MINUTES_HOUR,
                    len(cstr_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    "",
                )
                self.model.Add(
                    delta
                    == sum(v * d for v, d in zip(cstr_vars, cstr_durs))
                    - target_for_period * Constants.NUM_MINUTES_HOUR
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
                self.obj.int_coeffs.append(constraint.penalty)
            elif constraint.operator == ConstraintOperator.EQUAL:
                delta = self.model.NewIntVar(
                    -target_for_period * Constants.NUM_MINUTES_HOUR,
                    len(cstr_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    "",
                )
                self.model.Add(
                    delta
                    == sum(v * d for v, d in zip(cstr_vars, cstr_durs))
                    - target_for_period * Constants.NUM_MINUTES_HOUR
                )
                excess = self.model.NewIntVar(
                    -target_for_period * Constants.NUM_MINUTES_HOUR,
                    len(cstr_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    var_name,
                )
                self.model.AddAbsEquality(excess, delta)
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(constraint.penalty)
            elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                delta = self.model.NewIntVar(
                    -len(cstr_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    target_for_period * Constants.NUM_MINUTES_HOUR,
                    "",
                )
                self.model.Add(
                    delta
                    == target_for_period * Constants.NUM_MINUTES_HOUR
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
                self.obj.int_coeffs.append(constraint.penalty)

    def _add_constraint_sum_other(
        self,
        constraint: ConstraintSum,
        cstr_vars: list[cp_model.IntVar],
        target_for_period: int,
        hard_to_soft: bool,
    ) -> None:
        if constraint.hard and not hard_to_soft:
            if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                sum_var = self.model.NewIntVar(0, target_for_period, "")
            elif constraint.operator == ConstraintOperator.EQUAL:
                sum_var = self.model.NewIntVar(
                    target_for_period,
                    target_for_period,
                    "",
                )
            elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                sum_var = self.model.NewIntVar(target_for_period, len(cstr_vars), "")
            else:
                raise NotImplementedError(
                    f"Sum constraint operator {constraint.operator} "
                    + "not implemented"
                )
            self.model.Add(sum_var == sum(cstr_vars))
        else:
            var_name = build_var_name_constraint(
                constraint, cstr_vars, ObjectiveCategory.CONSTRAINT
            )
            if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                self.model.Add(delta == sum(cstr_vars) - target_for_period)
                excess = self.model.NewIntVar(
                    0,
                    len(cstr_vars),
                    var_name,
                )
                self.model.AddMaxEquality(excess, [delta, 0])
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(constraint.penalty)
            elif constraint.operator == ConstraintOperator.EQUAL:
                delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                self.model.Add(delta == sum(cstr_vars) - target_for_period)
                excess = self.model.NewIntVar(
                    -len(cstr_vars),
                    len(cstr_vars),
                    var_name,
                )
                self.model.AddAbsEquality(excess, delta)
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(constraint.penalty)
            elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                delta = self.model.NewIntVar(-len(cstr_vars), len(cstr_vars), "")
                self.model.Add(delta == target_for_period - sum(cstr_vars))
                excess = self.model.NewIntVar(
                    0,
                    len(cstr_vars),
                    var_name,
                )
                self.model.AddMaxEquality(excess, [delta, 0])
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(constraint.penalty)
