from typing import List

from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint import AddConstraint
from engine.model.utils.model_utils import build_var_name
from engine.types.input_output_types import Constraint
from utils.constants import Constants


class AddConstraintSum(AddConstraint):
    def add_constraint(self, constraint: Constraint) -> None:
        w_vars, d_vars, s_vars = self.get_vars_coordinates(constraint)
        if constraint.target_unit == "hour":
            for w in w_vars:
                for period in d_vars:
                    constraint_vars = []
                    constraint_durs = []
                    for s in s_vars:
                        constraint_vars.extend(
                            [self.variables[w, d, s] for d in period]
                        )
                        constraint_durs.extend(
                            [self.durations[s] for d in period]
                        )
                    self.add_constraint_sum_hour(
                        constraint, constraint_vars, constraint_durs
                    )
        else:
            for w in w_vars:
                for s in s_vars:
                    for period in d_vars:
                        constraint_vars = [
                            self.variables[w, d, s] for d in period
                        ]
                        self.add_constraint_sum_other(
                            constraint, constraint_vars
                        )

    def _add_constraint_sum_to_model(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        if constraint.target_unit == "hour":
            self.add_constraint_sum_hour(constraint, cstr_vars)
        else:
            self.add_constraint_sum_other(constraint, cstr_vars)
        # else:
        #     raise NotImplementedError(
        #         f"Sum constraint type {constraint.constraint_type} "
        #         + "not implemented"
        #     )

    # for worker in range(workers):
    #     model.Add(sum(variables[(worker, day, shift)] * shift_duration[(shift)] for day in range(days) for shift in range(shifts)) <= 40 * 60)

    # for worker in range(workers):
    #     total_hours_per_worker[worker] = model.NewIntVar(0, 24 * 40, f"total_hours_worker_{worker}")
    #     worker_shifts = [
    #         variables[(worker, day, shift)] for day in range(days) for shift in range(shifts)
    #     ]
    #     model.Add(sum(durations[(day, shift)] for day in range(days) for shift in range(shifts)
    #                  if variables[(worker, day, shift)] == 1) * 60 <= total_hours_per_worker[worker])

    # # Add constraint to limit total hours worked to 40
    # for worker in range(workers):
    #     model.Add(total_hours_per_worker[worker] <= 40 * 60)  # Convert hours to minutes

    def add_constraint_sum_hour(
        self,
        constraint: Constraint,
        cstr_vars: List[cp_model.IntVar],
        cstr_durs: List[int],
    ) -> None:
        if constraint.hard:
            if constraint.operator == "less_than_or_equal":
                sum_var = self.model.NewIntVar(
                    0, constraint.target_value * Constants.NUM_MINUTES_HOUR, ""
                )
            elif constraint.operator == "equal":
                sum_var = self.model.NewIntVar(
                    constraint.target_value * Constants.NUM_MINUTES_HOUR,
                    constraint.target_value * Constants.NUM_MINUTES_HOUR,
                    "",
                )
            elif constraint.operator == "greater_than_or_equal":
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
            for v, d in zip(cstr_vars, cstr_durs):
                print(v, d)
            self.model.Add(
                sum_var == sum(v * d for v, d in zip(cstr_vars, cstr_durs))
            )
        else:
            if constraint.penalty != 0:
                var_name = build_var_name(constraint, cstr_vars, "constraint")
                if constraint.operator == "less_than_or_equal":
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
                    self.obj.int_coeffs.append(constraint.penalty)
                elif constraint.operator == "equal":
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
                    self.obj.int_coeffs.append(constraint.penalty)
                elif constraint.operator == "greater_than_or_equal":
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
                    self.obj.int_coeffs.append(constraint.penalty)

    def add_constraint_sum_other(
        self, constraint: Constraint, cstr_vars: List[cp_model.IntVar]
    ) -> None:
        if constraint.hard:
            if constraint.operator == "less_than_or_equal":
                sum_var = self.model.NewIntVar(0, constraint.target_value, "")
            elif constraint.operator == "equal":
                sum_var = self.model.NewIntVar(
                    constraint.target_value,
                    constraint.target_value,
                    "",
                )
            elif constraint.operator == "greater_than_or_equal":
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
            if constraint.penalty != 0:
                var_name = build_var_name(constraint, cstr_vars, "constraint")
                if constraint.operator == "less_than_or_equal":
                    delta = self.model.NewIntVar(
                        -len(cstr_vars), len(cstr_vars), ""
                    )
                    self.model.Add(
                        delta == sum(cstr_vars) - constraint.target_value
                    )
                    excess = self.model.NewIntVar(
                        0,
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddMaxEquality(excess, [delta, 0])
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint.penalty)
                elif constraint.operator == "equal":
                    delta = self.model.NewIntVar(
                        -len(cstr_vars), len(cstr_vars), ""
                    )
                    self.model.Add(
                        delta == sum(cstr_vars) - constraint.target_value
                    )
                    excess = self.model.NewIntVar(
                        -len(cstr_vars),
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddAbsEquality(excess, delta)
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint.penalty)
                elif constraint.operator == "greater_than_or_equal":
                    delta = self.model.NewIntVar(
                        -len(cstr_vars), len(cstr_vars), ""
                    )
                    self.model.Add(
                        delta == constraint.target_value - sum(cstr_vars)
                    )
                    excess = self.model.NewIntVar(
                        0,
                        len(cstr_vars),
                        var_name,
                    )
                    self.model.AddMaxEquality(excess, [delta, 0])
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(constraint.penalty)
