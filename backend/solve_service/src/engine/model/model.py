#!/usr/bin/env python3
from typing import Dict, List, Optional, Tuple

# from google.protobuf import text_format  # type: ignore
from google.protobuf import text_format  # type: ignore
from ortools.sat.python import cp_model  # type: ignore

# pylint: disable=no-name-in-module
from ortools.sat.sat_parameters_pb2 import SatParameters  # type: ignore
from shared.schemas.core import SolverParams, SolveStrategy

from engine.model.add_constraint_factory import AddConstraintFactory
from engine.model.solver_solution_callback import SolverSolutionCallback
from engine.model.utils.model_utils import (
    build_var_name_duty_recup,
    build_var_name_generic,
    build_var_name_groups_assignments,
    build_var_name_link_shift,
    build_var_name_work_time,
)
from engine.types import (
    BenchmarkTimes,
    Constraints,
    GroupsAssignmentsDurationsTargetConstraint,
    GroupsAssignmentsTargetConstraint,
    Inputs,
    ModelConfig,
    NbDuties,
    Objective,
    ObjectiveCategory,
    Variables,
    WorkTime,
)
from utils.constants import Constants


# pylint: disable=too-many-public-methods, too-many-lines
class Model:
    # pylint: disable=too-many-instance-attributes, too-many-arguments
    def __init__(self, model_config: ModelConfig) -> None:
        self.model = cp_model.CpModel()
        self.variables: Dict[Tuple[str, str, str], cp_model.IntVar] = {}
        self.intervals: Dict[Tuple[str, str, str], cp_model.IntervalVar] = {}
        self.assignment_wdss: Dict[Tuple[str, str, str, str], cp_model.IntVar] = (
            {}
        )  # worker, day, shift, specialty
        self.model_config = model_config

        self.obj = Objective()
        # self.solution_callback: cp_model.CpSolverSolutionCallback | None = None
        self.solver = cp_model.CpSolver()
        self.status = 0
        self.log_output = ""
        self.bt = BenchmarkTimes()

        self.add_constraint_factory = AddConstraintFactory(
            self.model,
            self.variables,
            self.assignment_wdss,
            self.obj,
        )

    def solve_campaign(self, inputs: Inputs) -> None:
        if (
            self.model_config.custom_solver_params.solve_strategy
            == SolveStrategy.SEQUENTIAL
        ):
            self.sequential_solve(inputs)
        elif (
            self.model_config.custom_solver_params.solve_strategy
            == SolveStrategy.HARD_TO_SOFT
        ):
            self.solve_hard_to_soft(inputs)

    def solve_hard_to_soft(self, inputs: Inputs) -> None:
        self.solve_model_hts_custom(
            inputs,
            coverage_hts=True,
            worker_shift_filter_hts=False,
            duty_recup_hts=False,
            nb_duty_hts=True,
            work_time_desired_hts=True,
            constraint_hts=True,
            request_hts=True,
            work_time_hts=True,
        )

    # pylint: disable=too-many-return-statements
    def sequential_solve(self, inputs: Inputs) -> None:
        # hts stand for high to soft
        self.solve_model_hts_custom(
            inputs,
            coverage_hts=False,
            worker_shift_filter_hts=False,
            duty_recup_hts=False,
            nb_duty_hts=False,
            work_time_desired_hts=False,
            constraint_hts=False,
            request_hts=False,
            work_time_hts=False,
        )
        if self.status != cp_model.INFEASIBLE:
            return
        self.reset_model()
        self.solve_model_hts_custom(
            inputs,
            coverage_hts=False,
            worker_shift_filter_hts=False,
            duty_recup_hts=False,
            nb_duty_hts=False,
            work_time_desired_hts=False,
            constraint_hts=False,
            request_hts=False,
            work_time_hts=True,
        )
        if self.status != cp_model.INFEASIBLE:
            return
        self.reset_model()
        self.solve_model_hts_custom(
            inputs,
            coverage_hts=False,
            worker_shift_filter_hts=False,
            duty_recup_hts=False,
            nb_duty_hts=False,
            work_time_desired_hts=False,
            constraint_hts=False,
            request_hts=True,
            work_time_hts=True,
        )
        if self.status != cp_model.INFEASIBLE:
            return
        self.reset_model()
        self.solve_model_hts_custom(
            inputs,
            coverage_hts=False,
            worker_shift_filter_hts=False,
            duty_recup_hts=False,
            nb_duty_hts=False,
            work_time_desired_hts=False,
            constraint_hts=True,
            request_hts=True,
            work_time_hts=True,
        )
        if self.status != cp_model.INFEASIBLE:
            return
        self.reset_model()
        self.solve_model_hts_custom(
            inputs,
            coverage_hts=False,
            worker_shift_filter_hts=False,
            duty_recup_hts=False,
            nb_duty_hts=False,
            work_time_desired_hts=True,
            constraint_hts=True,
            request_hts=True,
            work_time_hts=True,
        )
        if self.status != cp_model.INFEASIBLE:
            return
        self.reset_model()
        self.solve_model_hts_custom(
            inputs,
            coverage_hts=False,
            worker_shift_filter_hts=False,
            duty_recup_hts=False,
            nb_duty_hts=True,
            work_time_desired_hts=True,
            constraint_hts=True,
            request_hts=True,
            work_time_hts=True,
        )
        if self.status != cp_model.INFEASIBLE:
            return
        self.reset_model()
        self.solve_model_hts_custom(
            inputs,
            coverage_hts=False,
            worker_shift_filter_hts=False,
            duty_recup_hts=True,
            nb_duty_hts=True,
            work_time_desired_hts=True,
            constraint_hts=True,
            request_hts=True,
            work_time_hts=True,
        )
        if self.status != cp_model.INFEASIBLE:
            return
        self.reset_model()
        self.solve_model_hts_custom(
            inputs,
            coverage_hts=False,
            worker_shift_filter_hts=True,
            duty_recup_hts=True,
            nb_duty_hts=True,
            work_time_desired_hts=True,
            constraint_hts=True,
            request_hts=True,
            work_time_hts=True,
        )
        if self.status != cp_model.INFEASIBLE:
            return
        self.reset_model()
        self.solve_model_hts_custom(
            inputs,
            coverage_hts=True,
            worker_shift_filter_hts=True,
            duty_recup_hts=True,
            nb_duty_hts=True,
            work_time_desired_hts=True,
            constraint_hts=True,
            request_hts=True,
            work_time_hts=True,
        )

    def solve_model_hts_custom(
        self,
        inputs: Inputs,
        coverage_hts: bool,
        duty_recup_hts: bool,
        worker_shift_filter_hts: bool,
        work_time_hts: bool,
        work_time_desired_hts: bool,
        nb_duty_hts: bool,
        request_hts: bool,
        constraint_hts: bool,
    ) -> None:
        self.build_variables(inputs.model_setup.variables)

        # Starting point:
        self.add_solution_hint(
            inputs.model_setup.sol_hint.var_sol,
            inputs.model_setup.sol_hint.var_spe_sol,
        )

        # Hard constraints:
        self.set_fixed_variables(inputs.model_setup.fixed_values)
        self.no_interval_overlap(inputs.model_setup.no_overlap_shift_intervals)

        # Hard to soft constraints:
        # Configuration constraints:
        self.add_worker_shift_filter_constraints(
            inputs.configuration_constraints.worker_shift_filters,
            worker_shift_filter_hts,
        )
        self.add_duty_recup_constraints(
            inputs.configuration_constraints.duty_recup_pairs, duty_recup_hts
        )
        self.add_constraint_factory.add_coverage.add_coverage(
            inputs.configuration_constraints.shift_demands, coverage_hts
        )
        self.add_constraint_factory.add_request.add_requests(
            inputs.configuration_constraints.requests, request_hts
        )
        self.add_link_shift_constraints(
            inputs.configuration_constraints.link_shifts_pairs
        )
        if inputs.configuration_constraints.work_loads is not None:
            self.add_work_time_constraints(
                inputs.configuration_constraints.work_loads.weekly_work_time_max,
                False,
            )
            self.add_nb_duties_constraints(
                inputs.configuration_constraints.work_loads.monthly_nb_duties_max
            )
            self.add_work_time_constraints(
                # fmt: off
                inputs.configuration_constraints.work_loads
                .weekly_work_time_contractual,
                # fmt: on
                True,
                work_time_hts,
            )
            self.add_work_time_constraints(
                inputs.configuration_constraints.work_loads.weekly_work_time_desired,
                False,
                work_time_desired_hts,
            )
            self.add_nb_duties_constraints(
                inputs.configuration_constraints.work_loads.monthly_nb_duties_desired,
                nb_duty_hts,
            )

        # User constraints:
        self.add_custom_constraints(inputs.user_constraints, constraint_hts)

        # System constraints:
        self.add_target_work_time_constraints(
            inputs.system_constraints.weekly_target_work_time
        )
        self.add_target_nb_duties_constraints(
            inputs.system_constraints.monthly_target_nb_duties
        )
        self.add_special_days_constraints(
            inputs.system_constraints.special_days_target_nb_duties
        )

        # System constraint: max weekly number of duties across workers/weeks
        # Format: (weeks x workers x assignments, penalty)
        try:
            self.add_max_weekly_nb_duties_constraints(
                constraint=inputs.system_constraints.max_weekly_nb_duties,
                obj_category=ObjectiveCategory.MAX_WEEKLY_NB_DUTIES,
            )
            self.add_max_weekly_nb_duties_constraints(
                constraint=inputs.system_constraints.max_week_day_nb_duties,
                obj_category=ObjectiveCategory.MAX_WEEK_DAY_NB_DUTIES,
            )
            self.add_total_variation_duty_constraints(
                constraint=inputs.system_constraints.duty_total_variation,
                # obj_category=ObjectiveCategory.DUTY_TOTAL_VARIATION,
            )
            self.add_consecutive_duty_gap_constraints(
                constraint=inputs.system_constraints.duty_consecutive_gap,
                # obj_category=ObjectiveCategory.DUTY_CONSECUTIVE_GAP,
            )
        except Exception:
            # be defensive: if structure is missing or empty, skip
            pass

        self.add_objective()
        self.solve()
        self.print_model_metadata(
            coverage_hts,
            worker_shift_filter_hts,
            duty_recup_hts,
            work_time_hts,
            work_time_desired_hts,
            nb_duty_hts,
            request_hts,
            constraint_hts,
        )

    def reset_model(self) -> None:
        self.model = cp_model.CpModel()
        self.variables = {}
        self.intervals = {}
        self.assignment_wdss = {}
        self.obj = Objective()
        self.status = 0
        self.bt = BenchmarkTimes()

        self.add_constraint_factory = AddConstraintFactory(
            self.model,
            self.variables,
            self.assignment_wdss,
            self.obj,
        )

    def build_variables(self, variables: Variables) -> None:
        for a in variables.assignments:
            self.variables[a] = self.model.NewBoolVar(f"{a[0]}_{a[1]}_{a[2]}")
        for si in variables.shift_intervals:
            self.intervals[si[3]] = self.model.NewOptionalIntervalVar(
                si[0],
                si[1],
                si[2],
                self.variables[si[3]],
                f"inter_{si[3][0]}_{si[3][1]}_{si[3][2]}",
            )

    def set_fixed_variables(
        self, fixed_values: Dict[Tuple[str, str, str], int]
    ) -> None:
        for k, v in fixed_values.items():
            self.model.Add(self.variables[k] == v)

    def add_solution_hint(
        self,
        var_sol: Dict[Tuple[str, str, str], int],
        var_spe_sol: Dict[Tuple[str, str, str, str], int],
    ) -> None:
        for k, v in var_sol.items():
            if k in self.variables:
                self.model.AddHint(self.variables[k], v)
        self.add_constraint_factory.var_spe_sol = var_spe_sol

    def no_interval_overlap(
        self, no_overlap_shift_intervals: List[List[Tuple[str, str, str]]]
    ) -> None:
        for w_assignments in no_overlap_shift_intervals:
            self.model.AddNoOverlap([self.intervals[a] for a in w_assignments])

    def add_duty_recup_constraints(
        self,
        duty_recup_pairs: List[Tuple[Tuple[str, str, str], Tuple[str, str, str], int]],
        hard_to_soft: bool,
    ) -> None:
        for duty, recup, penalty in duty_recup_pairs:
            duty_var = self.variables[duty]
            recup_var = self.variables[recup]
            if not hard_to_soft:
                self.model.Add(duty_var == recup_var)
            else:
                var_name = build_var_name_duty_recup(
                    [duty_var, recup_var], ObjectiveCategory.DUTY_RECUP
                )
                delta = self.model.NewIntVar(-1, 1, "")
                self.model.Add(delta == duty_var - recup_var)
                excess = self.model.NewIntVar(0, 1, var_name)
                self.model.AddAbsEquality(excess, delta)
                self.obj.int_vars.append(excess)
                self.obj.int_coeffs.append(penalty)

    def add_link_shift_constraints(
        self,
        ls_pairs: List[Tuple[Tuple[str, str, str], Tuple[str, str, str], str, int]],
    ) -> None:
        for s1, s2, ls_id, penalty in ls_pairs:
            s1_var = self.variables[s1]
            s2_var = self.variables[s2]
            var_name = build_var_name_link_shift(
                [s1_var, s2_var], ObjectiveCategory.LINK_SHIFT, ls_id
            )
            delta = self.model.NewIntVar(-1, 1, "")
            self.model.Add(delta == s1_var - s2_var)
            excess = self.model.NewIntVar(0, 1, var_name)
            self.model.AddAbsEquality(excess, delta)
            self.obj.int_vars.append(excess)
            self.obj.int_coeffs.append(penalty)

    # pylint: disable=too-many-locals
    def add_work_time_constraints(
        self, work_time: WorkTime, contract: bool, hard_to_soft: bool = False
    ) -> None:
        for w_assignments, w_targets, w_durations in zip(
            work_time.assignments,
            work_time.targets,
            work_time.durations,
        ):
            for p_assignments, p_target, p_durations in zip(
                w_assignments, w_targets, w_durations
            ):
                constraint_vars = [self.variables[a] for a in p_assignments]
                if not hard_to_soft:
                    self.model.Add(
                        sum(v * dur for v, dur in zip(constraint_vars, p_durations))
                        <= p_target
                    )
                else:
                    var_name = build_var_name_work_time(
                        constraint_vars,
                        (
                            ObjectiveCategory.WORK_TIME_WEEK_CONTRACT
                            if contract
                            else ObjectiveCategory.WORK_TIME_WEEK_DESIRED
                        ),
                    )

                    weighted_sum = self.model.NewIntVar(
                        0,
                        len(constraint_vars)
                        * Constants.NUM_HOURS_DAY
                        * Constants.NUM_MINUTES_HOUR,
                        "",
                    )
                    self.model.Add(
                        weighted_sum
                        == sum(v * d for v, d in zip(constraint_vars, p_durations))
                    )
                    weighted_sum_x100 = self.model.NewIntVar(
                        0,
                        len(constraint_vars)
                        * Constants.NUM_HOURS_DAY
                        * Constants.NUM_MINUTES_HOUR
                        * 100,
                        "",
                    )
                    self.model.AddMultiplicationEquality(
                        weighted_sum_x100, [weighted_sum, 100]
                    )
                    division_result = self.model.NewIntVar(
                        0,
                        len(constraint_vars)
                        * Constants.NUM_HOURS_DAY
                        * Constants.NUM_MINUTES_HOUR,
                        "",
                    )
                    if p_target == 0:
                        self.model.Add(division_result == weighted_sum_x100)
                    else:
                        self.model.AddDivisionEquality(
                            division_result,
                            weighted_sum_x100,
                            p_target,
                        )
                    excess = self.model.NewIntVar(
                        0,
                        len(constraint_vars)
                        * Constants.NUM_HOURS_DAY
                        * Constants.NUM_MINUTES_HOUR,
                        var_name,
                    )
                    self.model.AddMaxEquality(
                        excess,
                        [division_result - 100, 0],
                    )
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(work_time.penalty)

    def add_target_work_time_constraints(
        self, constraints: List[GroupsAssignmentsDurationsTargetConstraint]
    ) -> None:
        for constraint in constraints:
            excesses = []
            cstr_vars = []
            for assignments, durations, target in zip(
                constraint.assignments,
                constraint.durations,
                constraint.targets,
            ):
                constraint_vars = [self.variables[a] for a in assignments]
                cstr_vars.extend(constraint_vars)
                tolerance_x100 = round(target * constraint.tolerance * 100)
                weighted_sum = self.model.NewIntVar(
                    0,
                    len(constraint_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    "",
                )
                self.model.Add(
                    weighted_sum
                    == sum(v * d for v, d in zip(constraint_vars, durations))
                )
                weighted_sum_x100 = self.model.NewIntVar(
                    0,
                    len(constraint_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR
                    * 100,
                    "",
                )
                self.model.AddMultiplicationEquality(
                    weighted_sum_x100, [weighted_sum, 100]
                )
                division_result = self.model.NewIntVar(
                    -tolerance_x100,
                    len(constraint_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    "",
                )
                if target == 0:
                    self.model.Add(
                        division_result == weighted_sum_x100 - tolerance_x100
                    )
                else:
                    self.model.AddDivisionEquality(
                        division_result,
                        weighted_sum_x100 - tolerance_x100,
                        target,
                    )
                excess = self.model.NewIntVar(
                    -target,
                    len(constraint_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    "",
                )
                self.model.AddMaxEquality(
                    excess,
                    [division_result - 100, 0],
                )
                excesses.append(excess)
            # var_name = "target_work_time"
            var_name = build_var_name_groups_assignments(
                cstr_vars=cstr_vars,
                category=ObjectiveCategory.WORK_TIME_WEEK_TARGET,
            )
            max_excess = self.model.NewIntVar(
                0,
                len(cstr_vars) * Constants.NUM_HOURS_DAY * Constants.NUM_MINUTES_HOUR,
                var_name,
            )
            self.model.AddMaxEquality(max_excess, excesses)
            self.obj.int_vars.append(max_excess)
            self.obj.int_coeffs.append(constraint.penalty)

    def add_nb_duties_constraints(
        self, nb_duties: NbDuties, hard_to_soft: bool = False
    ) -> None:
        for w_assignments, w_targets in zip(
            nb_duties.assignments,
            nb_duties.targets,
        ):
            for p_assignments, p_target in zip(w_assignments, w_targets):
                constraint_vars = [self.variables[a] for a in p_assignments]
                if not hard_to_soft:
                    self.model.Add(sum(v for v in constraint_vars) <= p_target)
                else:
                    var_name = build_var_name_work_time(
                        constraint_vars, ObjectiveCategory.DUTIES_PER_MONTH
                    )
                    delta = self.model.NewIntVar(
                        -p_target,
                        len(constraint_vars)
                        * Constants.NUM_HOURS_DAY
                        * Constants.NUM_MINUTES_HOUR,
                        "",
                    )
                    self.model.Add(delta == sum(v for v in constraint_vars) - p_target)
                    excess = self.model.NewIntVar(
                        0,
                        len(constraint_vars)
                        * Constants.NUM_HOURS_DAY
                        * Constants.NUM_MINUTES_HOUR,
                        var_name,
                    )
                    self.model.AddMaxEquality(excess, [delta, 0])
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(nb_duties.penalty)

    def add_target_nb_duties_constraints(
        self, constraints: List[GroupsAssignmentsTargetConstraint]
    ) -> None:
        for constraint in constraints:
            excesses = []
            cstr_vars = []
            for assignments, target in zip(constraint.assignments, constraint.targets):
                constraint_vars = [self.variables[a] for a in assignments]
                cstr_vars.extend(constraint_vars)
                excess = self.model.NewIntVar(
                    -target,
                    len(constraint_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    "",
                )
                tolerance = round(target * constraint.tolerance)
                self.model.AddMaxEquality(
                    excess,
                    [
                        sum(v for v in constraint_vars) - target - tolerance,
                        0,
                    ],
                )
                excesses.append(excess)
            # var_name = "target_nb_duties"
            var_name = build_var_name_groups_assignments(
                cstr_vars=cstr_vars,
                category=ObjectiveCategory.DUTIES_PER_MONTH_TARGET,
            )
            max_excess = self.model.NewIntVar(
                0,
                len(constraint_vars)
                * Constants.NUM_HOURS_DAY
                * Constants.NUM_MINUTES_HOUR,
                var_name,
            )
            self.model.AddMaxEquality(max_excess, excesses)
            self.obj.int_vars.append(max_excess)
            self.obj.int_coeffs.append(constraint.penalty)

    # pylint: disable=too-many-branches
    def add_max_weekly_nb_duties_constraints(
        self,
        constraint: Tuple[List[List[List[Tuple[str, str, str]]]], int],
        obj_category: ObjectiveCategory,
    ) -> None:
        """Add penalties for weekly duty concentration.

        The input is a tuple: (weeks_vars, penalty) where `weeks_vars` is
        a list per week; each week is a list per worker; each worker is a
        list of assignment tuples `(worker_id, date_iso, shift_id)`.

        We use a two-part penalty strategy:
        1. Primary: penalize the global max weekly duties (avoid extremes)
        2. Secondary: stepped penalties for each worker-week to encourage
           spreading duties across weeks (quadratic-like approximation)
        """
        if not constraint:
            return
        weeks_vars, penalty = constraint
        if not weeks_vars:
            return

        # Determine upper bound (max assignments any worker-week)
        max_assignments = 0
        for week in weeks_vars:
            for worker_assignments in week:
                if worker_assignments:
                    max_assignments = max(max_assignments, len(worker_assignments))
        if max_assignments == 0:
            return

        week_max_vars: List[cp_model.IntVar] = []
        all_worker_week_sum_vars: List[cp_model.IntVar] = []
        all_worker_week_assignment_lists: List[List[cp_model.IntVar]] = []

        for week in weeks_vars:
            if not week:
                continue
            worker_sum_vars = []
            for worker_assignments in week:
                if not worker_assignments:
                    continue
                # Collect boolean vars for this worker-week
                constraint_vars = [
                    self.variables[a] for a in worker_assignments if a in self.variables
                ]
                if not constraint_vars:
                    continue
                sum_var = self.model.NewIntVar(0, len(constraint_vars), "")
                self.model.Add(sum_var == sum(constraint_vars))
                worker_sum_vars.append(sum_var)
                all_worker_week_sum_vars.append(sum_var)
                # store the original assignment tuples for this worker-week
                all_worker_week_assignment_lists.append(constraint_vars)
            if not worker_sum_vars:
                continue
            week_max = self.model.NewIntVar(0, max_assignments, "")
            self.model.AddMaxEquality(week_max, worker_sum_vars)
            week_max_vars.append(week_max)

        if not week_max_vars:
            return

        # Name the primary global max with VarName JSON including meta
        global_varname_json = build_var_name_generic(
            objective_id=None,
            cstr_vars=[],
            category=obj_category,
            hard_to_soft=None,
            meta={"type": "primary"},
        )
        global_max = self.model.NewIntVar(0, max_assignments, global_varname_json)
        self.model.AddMaxEquality(global_max, week_max_vars)
        self.obj.int_vars.append(global_max)
        self.obj.int_coeffs.append(penalty)

        # Secondary penalty: stepped penalties for each worker-week
        # Approximates quadratic penalty to encourage spreading
        # Thresholds: [2, 3, 4, 5, ...] with penalties [4, 9, 16, 25, ...]
        stepped_penalty_weight = max(1, penalty // 20)
        # Create stepped bool vars per worker-week and name them with VarName JSON
        for sum_var, assignment_list in zip(
            all_worker_week_sum_vars, all_worker_week_assignment_lists
        ):
            for threshold in range(2, max_assignments + 1):
                step_varname_json = build_var_name_generic(
                    objective_id=None,
                    cstr_vars=assignment_list,
                    category=obj_category,
                    hard_to_soft=None,
                    meta={
                        "type": "step",
                        "threshold": threshold,
                    },
                )
                exceeds = self.model.NewBoolVar(step_varname_json)
                self.model.Add(sum_var >= threshold).OnlyEnforceIf(exceeds)
                self.model.Add(sum_var < threshold).OnlyEnforceIf(exceeds.Not())
                # Quadratic-like penalty: threshold^2
                self.obj.bool_vars.append(exceeds)
                self.obj.bool_coeffs.append(
                    threshold * threshold * stepped_penalty_weight
                )

    def add_special_days_constraints(
        self, constraints: List[GroupsAssignmentsTargetConstraint]
    ) -> None:
        for constraint in constraints:
            excesses = []
            cstr_vars = []
            for assignments, target in zip(constraint.assignments, constraint.targets):
                constraint_vars = [self.variables[a] for a in assignments]
                cstr_vars.extend(constraint_vars)
                excess = self.model.NewIntVar(
                    -target,
                    len(constraint_vars)
                    * Constants.NUM_HOURS_DAY
                    * Constants.NUM_MINUTES_HOUR,
                    "",
                )
                self.model.AddMaxEquality(
                    excess, [sum(v for v in constraint_vars) - target, 0]
                )
                excesses.append(excess)
            # var_name = "special_days"
            var_name = build_var_name_groups_assignments(
                cstr_vars=cstr_vars,
                category=ObjectiveCategory.SPECIAL_DAYS_TARGET,
            )
            max_excess = self.model.NewIntVar(
                0,
                len(constraint_vars)
                * Constants.NUM_HOURS_DAY
                * Constants.NUM_MINUTES_HOUR,
                var_name,
            )
            self.model.AddMaxEquality(max_excess, excesses)
            self.obj.int_vars.append(max_excess)
            self.obj.int_coeffs.append(constraint.penalty)

    def add_total_variation_duty_constraints(
        self,
        constraint: Tuple[List[List[List[Tuple[str, str, str]]]], int],
    ) -> None:
        """Add total-variation penalties across consecutive weeks per worker.

        Input: (workers_weeks_vars, penalty) where workers_weeks_vars is a list
        per worker; each worker entry is a list per week; each week entry is a
        list of assignment tuples. For each consecutive week pair (t, t+1) the
        absolute difference |sum_t+1 - sum_t| is penalised.
        """
        if not constraint:
            return
        workers_weeks_vars, penalty = constraint
        if not workers_weeks_vars or penalty == 0:
            return

        for worker_weeks in workers_weeks_vars:
            # Build one sum_var per week (0 for empty weeks)
            week_sum_vars: List[cp_model.IntVar] = []
            for week_assignments in worker_weeks:
                if not week_assignments:
                    zero_var = self.model.NewIntVar(0, 0, "")
                    week_sum_vars.append(zero_var)
                    continue
                wvars = [
                    self.variables[a] for a in week_assignments if a in self.variables
                ]
                if not wvars:
                    zero_var = self.model.NewIntVar(0, 0, "")
                    week_sum_vars.append(zero_var)
                    continue
                sum_var = self.model.NewIntVar(0, len(wvars), "")
                self.model.Add(sum_var == sum(wvars))
                week_sum_vars.append(sum_var)

            # Penalise |sum_t+1 - sum_t| for each consecutive pair
            max_n = max(
                (
                    len([a for a in wk if a in self.variables])
                    for wk in worker_weeks
                    if wk
                ),
                default=1,
            )
            for i in range(len(week_sum_vars) - 1):
                delta = self.model.NewIntVar(-max_n, max_n, "")
                abs_delta = self.model.NewIntVar(0, max_n, "")
                self.model.Add(delta == week_sum_vars[i + 1] - week_sum_vars[i])
                self.model.AddAbsEquality(abs_delta, delta)
                self.obj.int_vars.append(abs_delta)
                self.obj.int_coeffs.append(penalty)

    def add_consecutive_duty_gap_constraints(
        self,
        constraint: Tuple[
            List[Tuple[List[Tuple[str, str, str]], List[Tuple[str, str, str]]]],
            int,
        ],
    ) -> None:
        """Add penalties for duties assigned on consecutive days (or within gap).

        Input: (pairs, penalty) where pairs is a list of (vars_d, vars_next).
        For each pair we penalise the case where both days contain a duty.
        """
        if not constraint:
            return
        pairs, penalty = constraint
        if not pairs or penalty == 0:
            return

        for vars_d, vars_next in pairs:
            model_vars_d = [self.variables[a] for a in vars_d if a in self.variables]
            model_vars_next = [
                self.variables[a] for a in vars_next if a in self.variables
            ]
            if not model_vars_d or not model_vars_next:
                continue

            has_duty_d = self.model.NewBoolVar("")
            self.model.AddMaxEquality(has_duty_d, model_vars_d)

            has_duty_next = self.model.NewBoolVar("")
            self.model.AddMaxEquality(has_duty_next, model_vars_next)

            # excess is 1 iff both days have a duty
            excess = self.model.NewBoolVar("")
            self.model.Add(has_duty_d + has_duty_next >= 2).OnlyEnforceIf(excess)
            self.model.Add(has_duty_d + has_duty_next < 2).OnlyEnforceIf(excess.Not())
            self.obj.bool_vars.append(excess)
            self.obj.bool_coeffs.append(penalty)

    def add_worker_shift_filter_constraints(
        self,
        worker_shift_filters: Tuple[List[Tuple[str, str, str]], int],
        hard_to_soft: bool,
    ) -> None:
        wsf_filter, penalty = worker_shift_filters
        for a in wsf_filter:
            cstr_var = self.variables[a]
            if not hard_to_soft:
                self.model.Add(cstr_var == 0)
            else:
                # var_name = build_var_name_constraint(
                #     None, [cstr_var], "worker_shift_filter"
                # )
                var_name = ""
                cstr_vars: List[cp_model.IntVar | cp_model.NotBooleanVariable] = [
                    cstr_var.Not()  # type: ignore
                ]
                lit = self.model.NewBoolVar(var_name)
                cstr_vars.append(lit)
                self.model.AddBoolOr(cstr_vars)
                self.obj.bool_vars.append(lit)
                self.obj.bool_coeffs.append(penalty)

    def add_custom_constraints(
        self, constraints: Constraints, hard_to_soft: bool
    ) -> None:
        for c_sum in constraints.sum:
            self.add_constraint_factory.add_constraint_sum.add_constraint(
                c_sum, hard_to_soft
            )
        for c_seq in constraints.seq:
            self.add_constraint_factory.add_constraint_seq.add_constraint(
                c_seq, hard_to_soft
            )
        for c_ord in constraints.ord:
            self.add_constraint_factory.add_constraint_ord.add_constraint(
                c_ord, hard_to_soft
            )
        for c_fil in constraints.fil:
            self.add_constraint_factory.add_constraint_fil.add_constraint(
                c_fil, hard_to_soft
            )
        for c_fai in constraints.fai:
            self.add_constraint_factory.add_constraint_fai.add_constraint(c_fai)

    def add_objective(self) -> None:
        self.model.Minimize(
            sum(
                self.obj.bool_vars[i]  # type: ignore # [CHECK IF OK]
                * self.obj.bool_coeffs[i]
                for i in range(len(self.obj.bool_vars))
            )
            + sum(
                self.obj.int_vars[i] * self.obj.int_coeffs[i]
                for i in range(len(self.obj.int_vars))
            )
        )

    def build_solver_params(self, params: SolverParams) -> SatParameters:
        out = SatParameters()

        out.max_time_in_seconds = params.max_time_in_seconds
        out.num_search_workers = params.num_search_workers
        out.log_search_progress = params.log_search_progress
        out.log_subsolver_statistics = params.log_subsolver_statistics
        if params.subsolvers:
            for subsolver in params.subsolvers:
                out.subsolvers.append(subsolver)
        if params.ignore_subsolvers:
            for subsolver in params.ignore_subsolvers:
                out.ignore_subsolvers.append(subsolver)
        if params.restart_algorithms:
            out.restart_algorithms.extend(params.restart_algorithms)
        # out.restart_algorithms.extend(["LUBY_RESTART"])
        out.restart_period = params.restart_period
        out.linearization_level = params.linearization_level
        out.cut_level = params.cut_level
        out.lns_initial_difficulty = params.lns_initial_difficulty
        out.lns_initial_deterministic_limit = params.lns_initial_deterministic_limit
        out.instantiate_all_variables = params.instantiate_all_variables
        out.use_lns_only = params.use_lns_only
        out.use_combined_no_overlap = params.use_combined_no_overlap
        out.symmetry_level = params.symmetry_level
        out.symmetry_detection_deterministic_time_limit = (
            params.symmetry_detection_deterministic_time_limit
        )
        out.use_symmetry_in_lp = params.use_symmetry_in_lp
        out.use_strong_propagation_in_disjunctive = (
            params.use_strong_propagation_in_disjunctive
        )
        out.violation_ls_compound_move_probability = (
            params.violation_ls_compound_move_probability
        )
        out.feasibility_jump_var_perburbation_range_ratio = (
            params.feasibility_jump_var_perburbation_range_ratio
        )
        out.interleave_search = params.interleave_search
        out.optimize_with_core = params.optimize_with_core
        out.core_minimization_level = params.core_minimization_level
        if params.random_seed is not None:
            out.random_seed = params.random_seed
        out.probing_deterministic_time_limit = params.probing_deterministic_time_limit
        out.max_presolve_iterations = params.max_presolve_iterations
        out.cp_model_probing_level = params.cp_model_probing_level
        out.detect_table_with_cost = params.detect_table_with_cost
        out.diversify_lns_params = params.diversify_lns_params

        return out

    def estimate_time_limit(
        self, min_seconds: int = 1, max_seconds: Optional[int] = None
    ) -> int:
        """Estimate a reasonable time budget for the current model.

        The estimator is a lightweight heuristic based on:
        - number of boolean/integer decision variables (`self.variables`)
        - number of optional intervals (`self.intervals`)
        - number of objective terms (bool + int vars collected in `self.obj`)

        The returned value is clamped to `hard_cap_seconds` when provided
        and is always at least 1 second.
        """
        proto = self.model.Proto()  # CpModelProto

        # Basic size metrics
        num_vars = len(proto.variables)
        num_constraints = len(proto.constraints)
        num_obj_vars = len(proto.objective.vars)

        # Tunable coefficients (conservative defaults)
        t0 = 1.0  # base seconds
        # alpha = 4.5e-05  # seconds per variable
        # beta = 9.0e-05  # seconds per constraint
        # gamma = 5.0e-05  # seconds per objective var
        alpha = 10.8e-05  # seconds per variable
        beta = 21.6e-05  # seconds per constraint
        gamma = 12.0e-05  # seconds per objective var

        estimate = t0 + alpha * num_vars + beta * num_constraints + gamma * num_obj_vars

        print(
            f"[Model] time_limit_estimate: {estimate:.2f} s - "
            f"min {min_seconds}s - max {max_seconds}s "
            f"(vars={num_vars}, cstrs={num_constraints}, obj_vars={num_obj_vars})"
        )

        # Convert to integer seconds and clamp
        budget = max(1, int(round(estimate)))
        if max_seconds is not None:
            try:
                min_budget = int(min_seconds)
                max_budget = int(max_seconds)
                budget = max(min_budget, min(budget, max_budget))
            except Exception:
                # ignore malformed cap and return budget
                pass
        return budget

    def save_cp_model_proto(self, path_txt: str) -> None:
        """Write a human-readable text proto of the current CpModel to `path_txt`.

        This only writes the text (pbtxt) representation using
        google.protobuf.text_format.MessageToString(proto). Useful for
        inspection and debugging.
        """
        try:
            proto = self.model.Proto()
        except Exception as exc:  # pragma: no cover - defensive
            print(f"[Model] could not obtain model proto: {exc}")
            return

        try:
            text = text_format.MessageToString(proto)
        except Exception as exc:  # pragma: no cover - defensive
            print(f"[Model] could not convert proto to text: {exc}")
            return

        try:
            with open(path_txt, "w", encoding="utf-8") as f:
                f.write(text)
        except Exception as exc:  # pragma: no cover - defensive
            print(f"[Model] could not write proto text to {path_txt}: {exc}")

    def solve(self) -> None:
        # Print a light-weight estimate of how much time this problem likely needs
        # and clamp it to the configured hard cap. This is informational for now.
        estimated_budget = self.estimate_time_limit(
            min_seconds=self.model_config.model_setup.min_solve_time_seconds,
            max_seconds=self.model_config.model_setup.max_solve_time_seconds,
        )
        self.model_config.solver_params.max_time_in_seconds = estimated_budget
        # self.model_config.solver_params.max_time_in_seconds = 90

        # Save human-readable proto for inspection/debugging (timestamped)
        # try:
        #     ts = int(time.time())
        #     out_dir = (
        #         Path.cwd() / "backend/solve_service/src/engine/model_proto"
        #     )
        #     out_dir.mkdir(parents=True, exist_ok=True)
        #     path = out_dir / f"cp_model_{ts}.pbtxt"
        #     self.save_cp_model_proto(str(path))
        #     print(f"[Model] saved model proto to {path}")
        # except Exception as exc:  # pragma: no cover - best-effort
        #     print(f"[Model] failed to save model proto: {exc}")

        # solution_printer = cp_model.ObjectiveSolutionPrinter()
        solution_callback = SolverSolutionCallback(
            limit=self.model_config.custom_solver_params.limit_number_solution
        )
        solver_params = self.build_solver_params(self.model_config.solver_params)
        self.solver.parameters = solver_params

        def log_callback(string: str) -> None:
            self.log_output += string
            self.log_output += "\n"

        self.solver.log_callback = log_callback

        self.status = self.solver.Solve(  # type: ignore # [CHECK IF OK]
            self.model, solution_callback
        )

        # self.bt.total_end = time.time()

    def print_model_metadata(
        self,
        coverage_hts: bool,
        worker_shift_filter_hts: bool,
        duty_recup_hts: bool,
        work_time_hts: bool,
        work_time_desired_hts: bool,
        nb_duty_hts: bool,
        request_hts: bool,
        constraint_hts: bool,
    ) -> None:
        print("----------- HARD TO SOFT -----------")
        print(f"COVERAGE:            {coverage_hts}")
        print(f"WORKER_SHIFT_FILTER: {worker_shift_filter_hts}")
        print(f"DUTY_RECUP:          {duty_recup_hts}")
        print(f"NB_DUTY:             {nb_duty_hts}")
        print(f"WORK_TIME_DESIRED:   {work_time_desired_hts}")
        print(f"CONSTRAINT:          {constraint_hts}")
        print(f"REQUEST:             {request_hts}")
        print(f"WORK_TIME:           {work_time_hts}")
        print("\n")

        print("----------- STATS -----------")
        print(f"Branches:        {self.solver.NumBranches()}")
        print(f"Wall time:       {self.solver.WallTime()} s")
        print(f"Objective value: {self.solver.ObjectiveValue()}")
        print(f"Status:          {self.solver.StatusName()}")
        print("\n")

    # def set_up_model(self, inputs: Inputs) -> None:
    #     self.bt.total_start = time.time()
    #     self.bt.full_setup_start = time.time()
    #     self.bt.variables_start = time.time()
    #     self.build_variables()
    #     self.set_fixed_variables(inputs.fixed_values)
    #     self.add_solution_hint(inputs.sol_hint)
    #     self.bt.variables_end = time.time()
    #     self.bt.constraints_start = time.time()
    #     self.no_interval_overlap()
    #     self.add_at_least_one_shift_per_day_constraint()
    #     if not inputs.sol_hint:
    #         solving_dates = [
    #             d
    #             for d in self.days
    #             if d not in [fvd for _, fvd, _ in inputs.fixed_values]
    #         ]
    #         cov_shifts = list(
    #             set(
    #                 sd.shift_id
    #                 for sd in inputs.coverage.coverage
    #                 if sd.staffing > 0
    #             )
    #         )
    #         self.spread_through_time(solving_dates, cov_shifts)
    #         self.spread_across_workers(solving_dates, cov_shifts)
    #     self.add_coverage.add_coverage(inputs.coverage.coverage)
    #     self.add_custom_constraints(
    #         inputs.constraints, inputs.coverage.coverage
    #     )
    #     self.add_far.add_requests(inputs.requests)
    #     self.bt.constraints_end = time.time()
    #     self.bt.objective_start = time.time()
    #     self.add_objective()
    #     self.bt.objective_end = time.time()
    #     self.bt.full_setup_end = time.time()

    # def spread_through_time(
    #     self, solving_dates: List[str], cov_shifts: List[str]
    # ) -> None:
    #     interval = 7
    #     for w in self.all_workers:
    #         for s in cov_shifts:
    #             weekly_staffings = []
    #             # per week, with final week potentially shorter
    #             # for start_d in range(0, len(solving_dates), interval):
    #             #     weekly_staffing = self.model.NewIntVar(
    #             #         0, 100, f"{solving_dates[start_d]}"
    #             #     )
    #             #     weekly_staffing_vars = [
    #             #         self.variables[w, solving_dates[d], s]  # type: ignore
    #             #         for d in range(
    #             #             start_d,
    #             #             min(start_d + interval, len(solving_dates)),
    #             #         )
    #             #     ]
    #             #     self.model.Add(
    #             #         weekly_staffing == sum(weekly_staffing_vars)
    #             #     )
    #             #     weekly_staffings.append(weekly_staffing)
    #             # per entire weeks only
    #             # for start_d in range(0, len(solving_dates), interval):
    #             #     if start_d + interval > len(solving_dates):
    #             #         break
    #             #     weekly_staffing = self.model.NewIntVar(
    #             #         0, 100, f"{solving_dates[start_d]}"
    #             #     )
    #             #     weekly_staffing_vars = [
    #             #         self.variables[w, solving_dates[d], s]  # type: ignore
    #             #         for d in range(
    #             #             start_d,
    #             #             min(start_d + interval, len(solving_dates)),
    #             #         )
    #             #     ]
    #             #     self.model.Add(
    #             #         weekly_staffing == sum(weekly_staffing_vars)
    #             #     )
    #             #     weekly_staffings.append(weekly_staffing)
    #             # per rolling weeks
    #             for start_d in range(len(solving_dates) - interval):
    #                 weekly_staffing = self.model.NewIntVar(
    #                     0, 100, f"{solving_dates[start_d]}"
    #                 )
    #                 weekly_staffing_vars = [
    #                     self.variables[w, solving_dates[start_d + d], s]
    #                     for d in range(interval)
    #                 ]
    #                 self.model.Add(weekly_staffing == sum(weekly_staffing_vars))
    #                 weekly_staffings.append(weekly_staffing)

    #             min_weekly_staffing = self.model.NewIntVar(0, 100, "")
    #             self.model.AddMinEquality(min_weekly_staffing, weekly_staffings)
    #             for ws in weekly_staffings:
    #                 # var_name = build_var_name(
    #                 #     Constraint(
    #                 #         id=f"spread_{w}_{ws.Name()}_{s}",
    #                 #         constraint_type="sum",
    #                 #         operator="equal",
    #                 #         target_value=0,
    #                 #         target_unit="shift",
    #                 #         worker_var=VarWorker(
    #                 #             selector="equal",
    #                 #             target=[],
    #                 #             num_eligible_workers=0,
    #                 #         ),
    #                 #         day_var=VarDay(
    #                 #             selector="all",
    #                 #             target=0,
    #                 #             start_date=date.today(),
    #                 #             end_date=date.today(),
    #                 #             interval=0,
    #                 #         ),
    #                 #         shift_var=VarShift(
    #                 #             selector="equal",
    #                 #             target=[],
    #                 #             reference=[],
    #                 #             relative=[],
    #                 #         ),
    #                 #         hard=False,
    #                 #         hard_to_soft=False,
    #                 #         penalty=0,
    #                 #     ),
    #                 #     [],
    #                 #     "constraint",
    #                 # )
    #                 delta = self.model.NewIntVar(0, 100, "")
    #                 self.model.Add(delta == ws - min_weekly_staffing)
    #                 excess = self.model.NewIntVar(
    #                     0,
    #                     100,
    #                     # var_name,
    #                     "",
    #                 )
    #                 self.model.AddAbsEquality(excess, delta)
    #                 self.obj.int_vars.append(excess)
    #                 self.obj.int_coeffs.append(1)
