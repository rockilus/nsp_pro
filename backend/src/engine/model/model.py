#!/usr/bin/env python3
import time
from typing import Dict, List, Tuple

# from google.protobuf import text_format  # type: ignore
from ortools.sat.python import cp_model  # type: ignore

from engine.model.add_constraint_eve import AddConstraintEve
from engine.model.add_constraint_fai import AddConstraintFai
from engine.model.add_constraint_fil import AddConstraintFil
from engine.model.add_constraint_ord import AddConstraintOrd
from engine.model.add_constraint_seq import AddConstraintSeq
from engine.model.add_constraint_sum import AddConstraintSum
from engine.model.add_coverage import AddCoverage
from engine.model.add_request import AddRequest
from engine.model.solver_solution_callback import SolverSolutionCallback
from engine.types.input_output_types import Constraint, Inputs, ShiftDemand
from engine.types.model_types import BenchmarkTimes, Objective


class Model:
    # pylint: disable=too-many-instance-attributes, too-many-arguments
    def __init__(
        self,
        workers: List[str],
        days: List[str],
        shifts: List[str],
        shift_durations: Dict[str, int],
        shift_start_times: Dict[Tuple, int],
        shift_end_times: Dict[Tuple, int],
    ) -> None:
        self.workers = workers
        self.days = days
        self.shifts = shifts

        self.model = cp_model.CpModel()
        self.variables: Dict[Tuple, cp_model.IntVar] = {}
        self.intervals: Dict[Tuple, cp_model.IntervalVar] = {}
        self.durations: Dict[str, int] = shift_durations
        self.shift_start_times: Dict[Tuple, int] = shift_start_times
        self.shift_end_times: Dict[Tuple, int] = shift_end_times

        self.obj = Objective()
        self.solver = cp_model.CpSolver()
        self.solution_printer = cp_model.ObjectiveSolutionPrinter()
        self.status = 0
        self.bt = BenchmarkTimes()

        self.add_constraint_sum = AddConstraintSum(
            self.model,
            self.variables,
            self.durations,
            self.workers,
            self.days,
            self.shifts,
            self.obj,
        )
        self.add_constraint_seq = AddConstraintSeq(
            self.model,
            self.variables,
            self.durations,
            self.workers,
            self.days,
            self.shifts,
            self.obj,
        )
        self.add_constraint_ord = AddConstraintOrd(
            self.model,
            self.variables,
            self.durations,
            self.workers,
            self.days,
            self.shifts,
            self.obj,
        )
        self.add_constraint_fil = AddConstraintFil(
            self.model,
            self.variables,
            self.durations,
            self.workers,
            self.days,
            self.shifts,
            self.obj,
        )
        self.add_constraint_fai = AddConstraintFai(
            self.model,
            self.variables,
            self.durations,
            self.workers,
            self.days,
            self.shifts,
            self.obj,
        )
        self.add_constraint_eve = AddConstraintEve(
            self.model,
            self.variables,
            self.durations,
            self.workers,
            self.days,
            self.shifts,
            self.obj,
        )
        self.add_coverage = AddCoverage(
            self.model,
            self.variables,
            self.durations,
            self.workers,
            self.days,
            self.shifts,
            self.obj,
        )
        self.add_far = AddRequest(self.model, self.variables, self.workers, self.obj)

    # pylint: disable=too-many-statements
    def sequential_solve(self, inputs: Inputs) -> None:
        self.solver.parameters.max_time_in_seconds = 20.0

        self.build_variables()
        self.set_fixed_variables(inputs.fixed_values)
        self.add_solution_hint(inputs.sol_hint)
        self.no_interval_overlap()
        self.add_at_least_one_shift_per_day_constraint()
        self.status = self.solver.Solve(  # type: ignore
            self.model, self.solution_printer
        )
        self.print_model_metadata("NAKED")

        if self.status == cp_model.INFEASIBLE:
            return
        temp_model = self.model

        if len(inputs.coverage.coverage) > 0:
            self.add_coverage.add_coverage(inputs.coverage.coverage)
            self.add_objective()
            self.status = self.solver.Solve(  # type: ignore
                self.model, self.solution_printer
            )
            self.print_model_metadata("COVERAGE")
            if self.status == cp_model.INFEASIBLE:
                self.model = temp_model
                return
            temp_model = self.model

        if len(inputs.requests) > 0:
            self.add_far.add_requests(inputs.requests)
            self.add_objective()
            self.status = self.solver.Solve(  # type: ignore
                self.model, self.solution_printer
            )
            self.print_model_metadata("REQUESTS")
            if self.status == cp_model.INFEASIBLE:
                self.model = temp_model
                return
            temp_model = self.model

        if len(inputs.constraints) > 0:
            self.add_custom_constraints(inputs.constraints, inputs.coverage.coverage)
            self.add_objective()
            self.status = self.solver.Solve(  # type: ignore
                self.model, self.solution_printer
            )
            self.print_model_metadata("CONSTRAINTS")
            if self.status == cp_model.INFEASIBLE:
                self.model = temp_model
                return
            temp_model = self.model

        # if not inputs.sol_hint:
        # if False:
        solving_dates = [
            d for d in self.days if d not in [fvd for _, fvd, _ in inputs.fixed_values]
        ]
        cov_shifts = list(
            set(sd.shift_id for sd in inputs.coverage.coverage if sd.staffing > 0)
        )

        self.spread_through_time(solving_dates, cov_shifts)
        self.add_objective()
        self.status = self.solver.Solve(  # type: ignore
            self.model, self.solution_printer
        )
        self.print_model_metadata("EVENNESS")
        if self.status == cp_model.INFEASIBLE:
            self.model = temp_model
            return
        temp_model = self.model

        self.spread_across_workers(solving_dates, cov_shifts)
        self.add_objective()
        solution_callback = SolverSolutionCallback(0)
        self.status = self.solver.Solve(self.model, solution_callback)  # type: ignore
        self.print_model_metadata("FAIRNESS")
        if self.status == cp_model.INFEASIBLE:
            self.model = temp_model
            return
        temp_model = self.model

    def set_up_model(self, inputs: Inputs) -> None:
        self.bt.total_start = time.time()
        self.bt.full_setup_start = time.time()
        self.bt.variables_start = time.time()
        self.build_variables()
        self.set_fixed_variables(inputs.fixed_values)
        self.add_solution_hint(inputs.sol_hint)
        self.bt.variables_end = time.time()
        self.bt.constraints_start = time.time()
        self.no_interval_overlap()
        self.add_at_least_one_shift_per_day_constraint()
        if not inputs.sol_hint:
            solving_dates = [
                d
                for d in self.days
                if d not in [fvd for _, fvd, _ in inputs.fixed_values]
            ]
            cov_shifts = list(
                set(sd.shift_id for sd in inputs.coverage.coverage if sd.staffing > 0)
            )
            self.spread_through_time(solving_dates, cov_shifts)
            self.spread_across_workers(solving_dates, cov_shifts)
        self.add_coverage.add_coverage(inputs.coverage.coverage)
        self.add_custom_constraints(inputs.constraints, inputs.coverage.coverage)
        self.add_far.add_requests(inputs.requests)
        self.bt.constraints_end = time.time()
        self.bt.objective_start = time.time()
        self.add_objective()
        self.bt.objective_end = time.time()
        self.bt.full_setup_end = time.time()

    def build_variables(self) -> None:
        for worker in self.workers:
            for day in self.days:
                for shift in self.shifts:
                    # print(
                    #     "start time: ",
                    #     datetime.fromtimestamp(
                    #       self.shift_start_times[day, shift] * 60),
                    # )
                    # print(
                    #     "end time: ",
                    #     datetime.fromtimestamp(self.shift_end_times[day, shift] * 60),
                    # )
                    # print("duration: ", self.durations[shift])
                    # print(
                    #     "check: ",
                    #     self.shift_end_times[day, shift]
                    #     - self.shift_start_times[day, shift]
                    #     - self.durations[shift],
                    # )
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

    def set_fixed_variables(
        self, fixed_values: Dict[Tuple[str, str, str], int]
    ) -> None:
        for k, v in fixed_values.items():
            self.model.Add(self.variables[k] == v)

    def add_solution_hint(self, solution_hint: Dict[Tuple[str, str, str], int]) -> None:
        for k, v in solution_hint.items():
            self.model.AddHint(self.variables[k], v)

    def add_at_least_one_shift_per_day_constraint(self) -> None:
        for w in self.workers:
            for d in self.days:
                self.model.Add(
                    sum(self.variables[w, d, s] for s in self.shifts)  # type: ignore
                    >= 1
                )

    def no_interval_overlap(self) -> None:
        for w in self.workers:
            self.model.AddNoOverlap(
                [self.intervals[w, d, s] for d in self.days for s in self.shifts]
            )

    def spread_through_time(
        self, solving_dates: List[str], cov_shifts: List[str]
    ) -> None:
        interval = 7
        for w in self.workers:
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
        for w in self.workers:
            worker_staffing_vars = [
                self.variables[w, d, s] for d in solving_dates for s in cov_shifts
            ]
            worker_staffing = self.model.NewIntVar(
                0, len(self.shifts) * len(solving_dates), f"{w}"
            )
            self.model.Add(worker_staffing == sum(worker_staffing_vars))
            staffings.append(worker_staffing)
        min_staffing = self.model.NewIntVar(
            0, len(self.shifts) * len(solving_dates), ""
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
            delta = self.model.NewIntVar(0, len(self.shifts) * len(solving_dates), "")
            self.model.Add(delta == stf - min_staffing)
            excess = self.model.NewIntVar(
                0,
                len(self.shifts) * len(solving_dates),
                # var_name,
                "",
            )
            self.model.AddAbsEquality(excess, delta)
            self.obj.int_vars.append(excess)
            self.obj.int_coeffs.append(10)

    def add_custom_constraints(
        self, constraints: List[Constraint], coverage: List[ShiftDemand]
    ) -> None:
        for constraint in constraints:
            if constraint.constraint_type == "sum":
                self.add_constraint_sum.add_constraint(constraint)
            elif constraint.constraint_type == "seq":
                self.add_constraint_seq.add_constraint(constraint)
            elif constraint.constraint_type == "ord":
                self.add_constraint_ord.add_constraint(constraint)
            elif constraint.constraint_type == "fil":
                self.add_constraint_fil.add_constraint(constraint)
            elif constraint.constraint_type == "fai":
                self.add_constraint_fai.add_constraint(constraint, coverage)
            elif constraint.constraint_type == "eve":
                self.add_constraint_eve.add_constraint(constraint, coverage)

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
        self.solver.parameters.max_time_in_seconds = 20.0
        # self.solver.parameters.log_search_progress = True
        self.status = self.solver.Solve(  # type: ignore # [CHECK IF OK]
            self.model, self.solution_printer
        )
        self.bt.total_end = time.time()

    def print_model_metadata(self, model_description: str) -> None:
        print(f"----------- {model_description} -----------")
        print(f"Branches:        {self.solver.NumBranches()}")
        print(f"Wall time:       {self.solver.WallTime()} s")
        print(f"Objective value: {self.solver.ObjectiveValue()}")
        print(f"Status:          {self.solver.StatusName()}")
