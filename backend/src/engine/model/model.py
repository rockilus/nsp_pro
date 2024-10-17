#!/usr/bin/env python3
from typing import Dict, List, Tuple

# from google.protobuf import text_format  # type: ignore
from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint_factory import AddConstraintFactory
from engine.model.utils.model_utils import build_var_name, get_nested_value
from engine.types.input_output_types import (
    Constraints,
    FixedConfig,
    Inputs,
    Shift,
    ShiftDemand,
    Worker,
)
from engine.types.model_types import BenchmarkTimes, Objective
from utils.constants import Constants


# pylint: disable=too-many-public-methods
class Model:
    # pylint: disable=too-many-instance-attributes, too-many-arguments
    def __init__(
        self,
        workers: List[Worker],
        all_days: List[str],
        days_solving: List[str],
        shifts: List[Shift],
        duty_recup_pairs: List[Tuple[str, str]],
        shift_durations: Dict[str, int],
        shift_start_times: Dict[Tuple, int],
        shift_end_times: Dict[Tuple, int],
        fixed_config: FixedConfig,
        model_config: Dict,
    ) -> None:
        self.workers = workers
        self.all_workers = [w.id for w in workers]
        self.workers_not_deleted = [w.id for w in workers if not w.deleted]
        self.all_days = all_days
        self.days_solving = days_solving
        self.shifts = shifts
        self.shift_ids = [s.id for s in shifts]
        self.shifts_not_deleted = [s.id for s in shifts if not s.deleted]
        self.shifts_work = [s.id for s in shifts if s.work_shift]
        self.duty_recup_pairs = duty_recup_pairs
        self.fixed_config = fixed_config

        self.model = cp_model.CpModel()
        self.variables: Dict[Tuple[str, str, str], cp_model.IntVar] = {}
        self.intervals: Dict[Tuple[str, str, str], cp_model.IntervalVar] = {}
        self.assignment_wdss: Dict[
            Tuple[str, str, str, str], cp_model.IntVar
        ] = {}  # worker, day, shift, specialty
        self.durations: Dict[str, int] = shift_durations
        self.shift_start_times: Dict[Tuple, int] = shift_start_times
        self.shift_end_times: Dict[Tuple, int] = shift_end_times
        self.model_config = model_config

        self.obj = Objective()
        self.solver = cp_model.CpSolver()
        self.solution_printer = cp_model.ObjectiveSolutionPrinter()
        self.status = 0
        self.bt = BenchmarkTimes()

        self.add_constraint_factory = AddConstraintFactory(
            self.model,
            self.variables,
            self.assignment_wdss,
            self.durations,
            self.workers,
            self.all_workers,
            self.all_days,
            self.shifts,
            self.shift_ids,
            self.obj,
            self.model_config,
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
        self.build_variables()
        self.set_fixed_variables(inputs.fixed_values)
        self.add_solution_hint(inputs.sol_hint)
        self.no_interval_overlap()
        self.add_max_weekly_worktime_constraints()
        self.add_max_nb_duties_per_month_constraints()
        # self.add_at_least_one_shift_per_day_solving_constraint()
        # self.status = self.solver.Solve(  # type: ignore
        #     self.model, self.solution_printer
        # )
        # self.print_model_metadata("NAKED")

        self.add_constraint_factory.add_coverage.add_coverage(
            inputs.coverage.coverage, coverage_hts
        )
        self.add_duty_recup_constraints(duty_recup_hts)
        self.add_weekly_contractual_worktime_constraints(work_time_hts)
        self.add_weekly_desired_worktime_constraints(work_time_desired_hts)
        self.add_nb_duties_per_month_constraints(nb_duty_hts)
        self.add_worker_shift_filter_constraints(
            inputs.worker_shift_filters, worker_shift_filter_hts
        )
        self.add_constraint_factory.add_request.add_requests(
            inputs.requests, request_hts
        )
        self.add_custom_constraints(
            inputs.constraints, inputs.coverage.coverage, constraint_hts
        )
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
        self.obj = Objective()
        self.status = 0
        self.bt = BenchmarkTimes()

        self.add_constraint_factory = AddConstraintFactory(
            self.model,
            self.variables,
            self.assignment_wdss,
            self.durations,
            self.workers,
            self.all_workers,
            self.all_days,
            self.shifts,
            self.shift_ids,
            self.obj,
            self.model_config,
        )

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

    def build_variables(self) -> None:
        for worker in self.all_workers:
            for day in self.all_days:
                for shift in self.shift_ids:
                    self.variables[(worker, day, shift)] = self.model.NewBoolVar(
                        f"{worker}_{day}_{shift}"
                    )
                    self.intervals[
                        (worker, day, shift)
                    ] = self.model.NewOptionalIntervalVar(
                        self.shift_start_times[day, shift],
                        self.durations[shift],
                        self.shift_end_times[day, shift],
                        self.variables[worker, day, shift],
                        f"inter_{worker}_{day}_{shift}",
                    )
                    # if (
                    #     day == "2024-10-08"
                    #     and worker == "66b62b88cad3bb739b082f97"
                    #     and shift
                    #     in [
                    #         "66b63331cad3bb739b082fa2",
                    #         "670395a23251f75c012b61e2",
                    #     ]
                    # ):
                    #     print(
                    #         "DUTY:"
                    #         if shift == "66b63331cad3bb739b082fa2"
                    #         else "RECUP:"
                    #     )
                    #     print("variable: ", self.variables[worker, day, shift])
                    #     print("interval: ", self.intervals[worker, day, shift])
                    #     print(
                    #         "start time: ",
                    #         datetime.fromtimestamp(
                    #             self.shift_start_times[day, shift] * 60
                    #         ),
                    #     )
                    #     print(
                    #         "end time: ",
                    #         datetime.fromtimestamp(
                    #             self.shift_end_times[day, shift] * 60
                    #         ),
                    #     )
                    #     print(
                    #         "start time timestamp: ",
                    #         self.shift_start_times[day, shift],
                    #     )
                    #     print(
                    #         "end time timestamp: ",
                    #         self.shift_end_times[day, shift],
                    #     )
                    #     print("duration: ", self.durations[shift])
                    #     print(
                    #         "check: ",
                    #         self.shift_end_times[day, shift]
                    #         - self.shift_start_times[day, shift]
                    #         - self.durations[shift],
                    #     )

    def set_fixed_variables(
        self, fixed_values: Dict[Tuple[str, str, str], int]
    ) -> None:
        for k, v in fixed_values.items():
            self.model.Add(self.variables[k] == v)

    def add_solution_hint(self, solution_hint: Dict[Tuple[str, str, str], int]) -> None:
        for k, v in solution_hint.items():
            self.model.AddHint(self.variables[k], v)

    def add_at_least_one_shift_per_day_solving_constraint(self) -> None:
        for w in self.workers_not_deleted:
            for d in self.days_solving:
                self.model.Add(
                    sum(self.variables[w, d, s] for s in self.shifts_not_deleted) >= 1
                )

    def no_interval_overlap(self) -> None:
        for w in self.all_workers:
            self.model.AddNoOverlap(
                [self.intervals[w, d, s] for d in self.all_days for s in self.shift_ids]
            )

    def spread_through_time(
        self, solving_dates: List[str], cov_shifts: List[str]
    ) -> None:
        interval = 7
        for w in self.all_workers:
            for s in cov_shifts:
                weekly_staffings = []
                # per week, with final week potentially shorter
                # for start_d in range(0, len(solving_dates), interval):
                #     weekly_staffing = self.model.NewIntVar(
                #         0, 100, f"{solving_dates[start_d]}"
                #     )
                #     weekly_staffing_vars = [
                #         self.variables[w, solving_dates[d], s]  # type: ignore
                #         for d in range(
                #             start_d,
                #             min(start_d + interval, len(solving_dates)),
                #         )
                #     ]
                #     self.model.Add(
                #         weekly_staffing == sum(weekly_staffing_vars)
                #     )
                #     weekly_staffings.append(weekly_staffing)
                # per entire weeks only
                # for start_d in range(0, len(solving_dates), interval):
                #     if start_d + interval > len(solving_dates):
                #         break
                #     weekly_staffing = self.model.NewIntVar(
                #         0, 100, f"{solving_dates[start_d]}"
                #     )
                #     weekly_staffing_vars = [
                #         self.variables[w, solving_dates[d], s]  # type: ignore
                #         for d in range(
                #             start_d,
                #             min(start_d + interval, len(solving_dates)),
                #         )
                #     ]
                #     self.model.Add(
                #         weekly_staffing == sum(weekly_staffing_vars)
                #     )
                #     weekly_staffings.append(weekly_staffing)
                # per rolling weeks
                for start_d in range(len(solving_dates) - interval):
                    weekly_staffing = self.model.NewIntVar(
                        0, 100, f"{solving_dates[start_d]}"
                    )
                    weekly_staffing_vars = [
                        self.variables[w, solving_dates[start_d + d], s]
                        for d in range(interval)
                    ]
                    self.model.Add(weekly_staffing == sum(weekly_staffing_vars))
                    weekly_staffings.append(weekly_staffing)

                min_weekly_staffing = self.model.NewIntVar(0, 100, "")
                self.model.AddMinEquality(min_weekly_staffing, weekly_staffings)
                for ws in weekly_staffings:
                    # var_name = build_var_name(
                    #     Constraint(
                    #         id=f"spread_{w}_{ws.Name()}_{s}",
                    #         constraint_type="sum",
                    #         operator="equal",
                    #         target_value=0,
                    #         target_unit="shift",
                    #         worker_var=VarWorker(
                    #             selector="equal",
                    #             target=[],
                    #             num_eligible_workers=0,
                    #         ),
                    #         day_var=VarDay(
                    #             selector="all",
                    #             target=0,
                    #             start_date=date.today(),
                    #             end_date=date.today(),
                    #             interval=0,
                    #         ),
                    #         shift_var=VarShift(
                    #             selector="equal",
                    #             target=[],
                    #             reference=[],
                    #             relative=[],
                    #         ),
                    #         hard=False,
                    #         hard_to_soft=False,
                    #         penalty=0,
                    #     ),
                    #     [],
                    #     "constraint",
                    # )
                    delta = self.model.NewIntVar(0, 100, "")
                    self.model.Add(delta == ws - min_weekly_staffing)
                    excess = self.model.NewIntVar(
                        0,
                        100,
                        # var_name,
                        "",
                    )
                    self.model.AddAbsEquality(excess, delta)
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(1)

    def spread_across_workers(
        self, solving_dates: List[str], cov_shifts: List[str]
    ) -> None:
        staffings = []
        for w in self.all_workers:
            worker_staffing_vars = [
                self.variables[w, d, s] for d in solving_dates for s in cov_shifts
            ]
            worker_staffing = self.model.NewIntVar(
                0, len(self.shift_ids) * len(solving_dates), f"{w}"
            )
            self.model.Add(worker_staffing == sum(worker_staffing_vars))
            staffings.append(worker_staffing)
        min_staffing = self.model.NewIntVar(
            0, len(self.shift_ids) * len(solving_dates), ""
        )
        self.model.AddMinEquality(min_staffing, staffings)
        for stf in staffings:
            # var_name = build_var_name(
            #     Constraint(
            #         id=f"spread_{stf.Name()}",
            #         constraint_type="sum",
            #         operator="equal",
            #         target_value=0,
            #         target_unit="shift",
            #         worker_var=VarWorker(
            #             selector="equal",
            #             target=[],
            #             num_eligible_workers=0,
            #         ),
            #         day_var=VarDay(
            #             selector="all",
            #             target=0,
            #             start_date=date.today(),
            #             end_date=date.today(),
            #             interval=0,
            #         ),
            #         shift_var=VarShift(
            #             selector="equal",
            #             target=[],
            #             reference=[],
            #             relative=[],
            #         ),
            #         hard=False,
            #         hard_to_soft=False,
            #         penalty=0,
            #     ),
            #     [],
            #     "constraint",
            # )
            delta = self.model.NewIntVar(
                0, len(self.shift_ids) * len(solving_dates), ""
            )
            self.model.Add(delta == stf - min_staffing)
            excess = self.model.NewIntVar(
                0,
                len(self.shift_ids) * len(solving_dates),
                # var_name,
                "",
            )
            self.model.AddAbsEquality(excess, delta)
            self.obj.int_vars.append(excess)
            self.obj.int_coeffs.append(10)

    def add_duty_recup_constraints(self, hard_to_soft: bool) -> None:
        for duty, recup in self.duty_recup_pairs:
            for w in self.workers_not_deleted:
                for d in self.days_solving:
                    duty_var = self.variables[w, d, duty]
                    recup_var = self.variables[w, d, recup]
                    if not hard_to_soft:
                        self.model.Add(duty_var == recup_var)
                    else:
                        var_name = build_var_name(
                            None, [duty_var, recup_var], "recuperation"
                        )
                        delta = self.model.NewIntVar(-1, 1, "")
                        self.model.Add(delta == duty_var - recup_var)
                        excess = self.model.NewIntVar(0, 1, var_name)
                        self.model.AddAbsEquality(excess, delta)
                        self.obj.int_vars.append(excess)
                        self.obj.int_coeffs.append(100)

    def add_weekly_contractual_worktime_constraints(self, hard_to_soft: bool) -> None:
        for worker in [w for w in self.workers if not w.deleted]:
            for pt in worker.work_hours:
                constraint_vars = []
                constraint_durs = []
                for s in self.shifts_work:
                    constraint_vars.extend(
                        [self.variables[worker.id, d, s] for d in pt.period]
                    )
                    constraint_durs.extend([self.durations[s] for _ in pt.period])

                if not hard_to_soft:
                    self.model.Add(
                        sum(v * d for v, d in zip(constraint_vars, constraint_durs))
                        <= pt.target
                    )
                else:
                    var_name = build_var_name(None, constraint_vars, "work_time")
                    delta = self.model.NewIntVar(
                        -pt.target,
                        len(constraint_vars)
                        * Constants.NUM_HOURS_DAY
                        * Constants.NUM_MINUTES_HOUR,
                        "",
                    )
                    self.model.Add(
                        delta
                        == sum(v * d for v, d in zip(constraint_vars, constraint_durs))
                        - pt.target
                    )
                    excess = self.model.NewIntVar(
                        0,
                        len(constraint_vars)
                        * Constants.NUM_HOURS_DAY
                        * Constants.NUM_MINUTES_HOUR,
                        var_name,
                    )
                    self.model.AddMaxEquality(excess, [delta, 0])
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(50)

    def add_weekly_desired_worktime_constraints(self, hard_to_soft: bool) -> None:
        for worker in [w for w in self.workers if not w.deleted]:
            for pt in worker.work_hours_desired:
                constraint_vars = []
                constraint_durs = []
                for s in self.shifts_work:
                    constraint_vars.extend(
                        [self.variables[worker.id, d, s] for d in pt.period]
                    )
                    constraint_durs.extend([self.durations[s] for _ in pt.period])

                if not hard_to_soft:
                    self.model.Add(
                        sum(v * d for v, d in zip(constraint_vars, constraint_durs))
                        <= pt.target
                    )
                else:
                    var_name = build_var_name(None, constraint_vars, "work_time")
                    delta = self.model.NewIntVar(
                        -pt.target,
                        len(constraint_vars)
                        * Constants.NUM_HOURS_DAY
                        * Constants.NUM_MINUTES_HOUR,
                        "",
                    )
                    self.model.Add(
                        delta
                        == sum(v * d for v, d in zip(constraint_vars, constraint_durs))
                        - pt.target
                    )
                    excess = self.model.NewIntVar(
                        0,
                        len(constraint_vars)
                        * Constants.NUM_HOURS_DAY
                        * Constants.NUM_MINUTES_HOUR,
                        var_name,
                    )
                    self.model.AddMaxEquality(excess, [delta, 0])
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(100)

    def add_max_weekly_worktime_constraints(self) -> None:
        for w in self.workers_not_deleted:
            for pt in self.fixed_config.max_weekly_hours_worked:
                constraint_vars = []
                constraint_durs = []
                for s in self.shifts_work:
                    constraint_vars.extend([self.variables[w, d, s] for d in pt.period])
                    constraint_durs.extend([self.durations[s] for _ in pt.period])
                    self.model.Add(
                        sum(v * d for v, d in zip(constraint_vars, constraint_durs))
                        <= pt.target
                    )

    def add_nb_duties_per_month_constraints(self, hard_to_soft: bool) -> None:
        for worker in [w for w in self.workers if not w.deleted]:
            for pt in worker.duties_per_month:
                constraint_vars = []
                for duty, _ in self.duty_recup_pairs:
                    constraint_vars.extend(
                        [self.variables[worker.id, d, duty] for d in pt.period]
                    )
                if not hard_to_soft:
                    self.model.Add(sum(constraint_vars) <= pt.target)
                else:
                    var_name = build_var_name(None, constraint_vars, "duties_per_month")
                    delta = self.model.NewIntVar(
                        -pt.target,
                        len(constraint_vars),
                        "",
                    )
                    self.model.Add(delta == sum(constraint_vars) - pt.target)
                    excess = self.model.NewIntVar(0, len(constraint_vars), var_name)
                    self.model.AddMaxEquality(excess, [delta, 0])
                    self.obj.int_vars.append(excess)
                    self.obj.int_coeffs.append(100)

    def add_max_nb_duties_per_month_constraints(self) -> None:
        for w in self.workers_not_deleted:
            for pt in self.fixed_config.max_duties_per_month:
                constraint_vars = []
                for duty, _ in self.duty_recup_pairs:
                    constraint_vars.extend(
                        [self.variables[w, d, duty] for d in pt.period]
                    )
                self.model.Add(sum(constraint_vars) <= pt.target)

    def add_worker_shift_filter_constraints(
        self, worker_shift_filters: List[Tuple[str, str]], hard_to_soft: bool
    ) -> None:
        for w, s in worker_shift_filters:
            for d in self.days_solving:
                cstr_var = self.variables[w, d, s]
                if not hard_to_soft:
                    self.model.Add(cstr_var == 0)
                else:
                    var_name = build_var_name(None, [cstr_var], "worker_shift_filter")
                    cstr_vars: List[cp_model.IntVar | cp_model._NotBooleanVariable] = [
                        cstr_var.Not()
                    ]
                    lit = self.model.NewBoolVar(var_name)
                    cstr_vars.append(lit)
                    self.model.AddBoolOr(cstr_vars)
                    self.obj.bool_vars.append(lit)
                    self.obj.bool_coeffs.append(100)

    def add_custom_constraints(
        self,
        constraints: Constraints,
        coverage: List[ShiftDemand],
        hard_to_soft: bool,
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
            self.add_constraint_factory.add_constraint_fai.add_constraint(
                c_fai, coverage
            )

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

    def solve(self) -> None:
        # params = "max_time_in_seconds:20.0"
        # if params:
        #     text_format.Parse(params, self.solver.parameters)
        self.solver.parameters.max_time_in_seconds = get_nested_value(
            self.model_config, ["solver_params", "max_time_in_seconds"]
        )
        # self.solver.parameters.log_search_progress = True
        self.status = self.solver.Solve(  # type: ignore # [CHECK IF OK]
            self.model, self.solution_printer
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
