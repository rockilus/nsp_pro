# from copy import deepcopy
# from datetime import date, datetime, timedelta

# import pytest
# from shared.schemas.core import (
#     ShiftDemandNew,
#     DSDSourceType,
#     EngineInputsAugmented,
#     ModelConfig,
#     Penalties,
#     Schedule,
#     ScheduleSolveStatus,
#     ScheduleStatus,
#     Shift,
#     ShiftLeaveType,
#     ShiftRestType,
#     ShiftType,
#     Staffing,
#     Worker,
# )
# from typing import Callable, Tuple
# from engine import Outputs, ProcessingCache, SolHint
# from engine import Inputs as InputsEngine


# # pylint: disable=R0801
# class TestTargetWorkTimeConstraints:
#     @pytest.fixture
#     def ei_work_times(
#         self, penalties_fix: Penalties, model_config_fix: ModelConfig
#     ) -> EngineInputsAugmented:
#         schedule = Schedule(
#             id="sch0",
#             team_id="t0",
#             start_date=date(2025, 2, 10),
#             end_date=date(2025, 2, 16),
#             solve_details=None,
#             solve_status=ScheduleSolveStatus.NOT_SOLVED,
#             status=ScheduleStatus.CAMPAIGN,
#             missing_coverage_dates=[],
#             constraint_build_ids=[],
#             quick_staffings=[],
#         )

#         # 4 workers
#         # Same desired time for all workers, so 25% of the total allocated to each
#         # 4 shifts of 5h each, or 140h per week
#         # 35h per worker per week, or 7 shifts per worker per week
#         workers = [
#             Worker(
#                 id=f"w{i}",
#                 team_id="t0",
#                 name=f"Worker {i}",
#                 acronym=f"W{i}",
#                 acronym_custom=False,
#                 employment_start_date=date(2025, 1, 1),
#                 employment_end_date=None,
#                 weekly_hours=50,
#                 weekly_hours_desired=50,
#                 duties_per_month=10,
#                 annual_leave=20,
#                 specialty_ids=[],
#                 deleted=False,
#             )
#             for i in range(4)
#         ]

#         shifts = [
#             Shift(
#                 id="s0",
#                 team_id="t0",
#                 name="Night Morning Shift",
#                 acronym="NMS",
#                 acronym_custom=False,
#                 start_time=datetime(2025, 1, 1, 1, 0),
#                 end_time=datetime(2025, 1, 1, 6, 0),  # 5 hours
#                 staffing=[Staffing(specialty_id=None, staffing=1)],
#                 color="purple",
#                 shift_type=ShiftType.NORMAL,
#                 rest_type=ShiftRestType.NONE,
#                 leave_type=ShiftLeaveType.NONE,
#                 recuperation_time=0,
#                 recuperation_duty_id=None,
#                 deleted=False,
#             ),
#             Shift(
#                 id="s1",
#                 team_id="t0",
#                 name="Morning Shift",
#                 acronym="MS",
#                 acronym_custom=False,
#                 start_time=datetime(2025, 1, 1, 8, 0),
#                 end_time=datetime(2025, 1, 1, 13, 0),  # 5 hours
#                 staffing=[Staffing(specialty_id=None, staffing=1)],
#                 color="blue",
#                 shift_type=ShiftType.NORMAL,
#                 rest_type=ShiftRestType.NONE,
#                 leave_type=ShiftLeaveType.NONE,
#                 recuperation_time=0,
#                 recuperation_duty_id=None,
#                 deleted=False,
#             ),
#             Shift(
#                 id="s2",
#                 team_id="t0",
#                 name="Afternoon Shift",
#                 acronym="AS",
#                 acronym_custom=False,
#                 start_time=datetime(2025, 1, 1, 13, 0),
#                 end_time=datetime(2025, 1, 1, 18, 0),  # 5 hours
#                 staffing=[Staffing(specialty_id=None, staffing=1)],
#                 color="green",
#                 shift_type=ShiftType.NORMAL,
#                 rest_type=ShiftRestType.NONE,
#                 leave_type=ShiftLeaveType.NONE,
#                 recuperation_time=0,
#                 recuperation_duty_id=None,
#                 deleted=False,
#             ),
#             Shift(
#                 id="s3",
#                 team_id="t0",
#                 name="Night Shift",
#                 acronym="NS",
#                 acronym_custom=False,
#                 start_time=datetime(2025, 1, 1, 18, 0),
#                 end_time=datetime(2025, 1, 1, 23, 0),  # 5 hours
#                 staffing=[Staffing(specialty_id=None, staffing=1)],
#                 color="purple",
#                 shift_type=ShiftType.NORMAL,
#                 rest_type=ShiftRestType.NONE,
#                 leave_type=ShiftLeaveType.NONE,
#                 recuperation_time=0,
#                 recuperation_duty_id=None,
#                 deleted=False,
#             ),
#         ]

#         daily_shift_demands = []
#         # Create daily shift demands for every day for all shifts
#         for shift in shifts:
#             current_date = schedule.start_date
#             while current_date <= schedule.end_date:
#                 daily_shift_demands.append(
#                     ShiftDemandNew(
#                         id=f"dsd_{shift.id}_{current_date}",
#                         team_id="t0",
#                         schedule_id=schedule.id,
#                         shift_demand_id=None,
#                         source_type=DSDSourceType.SHIFT_DEMAND,
#                         date=current_date,
#                         shift_id=shift.id,
#                         count=1,
#                     )
#                 )
#                 current_date += timedelta(days=1)

#         mc_copy = deepcopy(model_config_fix)
#         mc_copy.system_constraints.weekly_target_work_time = True

#         return EngineInputsAugmented(
#             schedule=schedule,
#             workers=workers,
#             shifts=shifts,
#             link_shifts=[],
#             dimensions=[],
#             dim_entries=[],
#             attributes=[],
#             as_hist=[],
#             as_wip_fixed=[],
#             cbs_augmented=[],
#             daily_shift_demands=daily_shift_demands,
#             requests=[],
#             model_output=None,
#             penalties=penalties_fix,
#             model_config=mc_copy,
#         )

# def test_solution_hint(
#     self,
#     ei_work_times: EngineInputsAugmented,
#     run_core_to_engine_inputs: Callable[
#         [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
#     ],
#     run_engine_solve: Callable[[InputsEngine], Outputs],
# ) -> None:
#     # Problem with no solution with objective value 0, and that requires
#     # some iterations to solve
#     ei_work_times.workers = ei_work_times.workers[:3]
#     inputs_1, _ = run_core_to_engine_inputs(ei_work_times)
#     out_1 = run_engine_solve(inputs_1)

#     # Use solution from first run as hint for second run, and stop after
#     # first solution
#     ei_work_times.model_config.custom_solver_params.limit_number_solution = (
#         1
#     )
#     inputs_2, _ = run_core_to_engine_inputs(ei_work_times)
#     inputs_2.model_setup.sol_hint = SolHint(
#         var_sol=out_1.var_sol, var_spe_sol=out_1.var_spe_sol
#     )
#     out_2 = run_engine_solve(inputs_2)

#     # Check that the second run has a solution with objective value lower than
#     # or equal to the first run
#     assert out_2.objective_value <= out_1.objective_value

# def test_solution_hint_benoit_case(
#     self,
#     benoit_case_250301: EngineInputsAugmented,
#     run_core_to_engine_inputs: Callable[
#         [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
#     ],
#     run_engine_solve: Callable[[InputsEngine], Outputs],
# ) -> None:
#     # Problem with no solution with objective value 0, and that requires
#     # some iterations to solve
#     inputs_1, _ = run_core_to_engine_inputs(benoit_case_250301)

#     inputs_1.model_setup.sol_hint = SolHint(var_sol={}, var_spe_sol={})
#     # inputs_1.sol_hint.var_spe_sol = {}

#     inputs_1.model_config.solver_params.max_time_in_seconds = 30

#     out_1 = run_engine_solve(inputs_1)

#     # Use solution from first run as hint for second run, and stop after
#     # first solution
#     benoit_case_250301.model_config.custom_solver_params.limit_number_solution = (
#         1
#     )
#     inputs_2, _ = run_core_to_engine_inputs(benoit_case_250301)

#     inputs_2.model_setup.sol_hint = SolHint(
#         var_sol=out_1.var_sol,
#         var_spe_sol=out_1.var_spe_sol,
#         # var_spe_sol={},
#     )

#     inputs_2.model_config.solver_params.max_time_in_seconds = 30

#     out_2 = run_engine_solve(inputs_2)

#     # Check that the second run has a solution with objective value lower than
#     # or equal to the first run
#     assert out_2.objective_value <= out_1.objective_value


# from ortools.sat.python import cp_model
# from engine.model.solver_solution_callback import SolverSolutionCallback
# import pytest


# def create_and_solve_model(hint=None, max_solutions=None):
#     """Creates a CP model with Boolean variables, adds an objective,
#     and solves it, optionally with a hint and a maximum number of solutions.
#     """

#     model = cp_model.CpModel()
#     solver = cp_model.CpSolver()
#     solution_callback = SolverSolutionCallback(limit=max_solutions)

#     # Create Boolean variables
#     num_workers = 30
#     num_days = 7 * 4 * 6
#     num_shifts = 10
#     variables = {
#         (w, d, s): model.NewBoolVar(f"x[{w}, {d}, {s}]")
#         for w in range(num_workers)
#         for d in range(num_days)
#         for s in range(num_shifts)
#     }

#     # At most one shift per day per worker
#     for w in range(num_workers):
#         for d in range(num_days):
#             model.Add(sum(variables[w, d, s] for s in range(num_shifts)) <= 1)

#     # 1 worker per shift per day
#     for d in range(num_days):
#         for s in range(num_shifts):
#             model.Add(sum(variables[w, d, s] for w in range(num_workers)) == 1)

#     # At most 5 days of work per worker per week
#     for w in range(num_workers):
#         for i in range(0, num_days, 7):
#             model.Add(
#                 sum(
#                     variables[w, d, s]
#                     for d in range(i, i + 7)
#                     for s in range(num_shifts)
#                 )
#                 <= 5
#             )

#     # All workers should work the same number of shifts in total, soft
#     # constraint (penalty)
#     total_num_shifts = num_shifts * num_days
#     target_num_shifts = total_num_shifts // num_workers
#     int_vars = []
#     int_coeffs = []

#     for w in range(num_workers):
#         constraint_vars = [
#             variables[w, d, s]
#             for d in range(num_days)
#             for s in range(num_shifts)
#         ]
#         excess = model.NewIntVar(-target_num_shifts, total_num_shifts, "")
#         model.AddMaxEquality(
#             excess, [sum(v for v in constraint_vars) - target_num_shifts, 0]
#         )
#         int_vars.append(excess)
#         int_coeffs.append(1)

#     # Add an objective (example: minimize the sum of variables)
#     model.Minimize(
#         sum(
#             int_var * int_coeff
#             for int_var, int_coeff in zip(int_vars, int_coeffs)
#         )
#     )

#     if hint:
#         # Add the hint
#         for i, var in enumerate(variables.values()):
#             model.AddHint(var, hint[i])

#     # Solve the model
#     solver.parameters.max_time_in_seconds = 5
#     status = solver.Solve(model, solution_callback)

#     if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
#         solution = [
#             1 if solver.BooleanValue(variables[w, d, s]) else 0
#             for w in range(num_workers)
#             for d in range(num_days)
#             for s in range(num_shifts)
#         ]
#         objective_value = solver.ObjectiveValue()
#         return solution, objective_value
#     return None, None


# def test_solution_hint_with_bool_vars():
#     """Tests that the solver takes solution hints into account
#     and improves or maintains solution quality with a limited number of solutions.
#     """

#     # Solve the model without a hint
#     solution_without_hint, objective_without_hint = create_and_solve_model()

#     # Use the solution from the first run as a hint for the second run
#     solution_with_hint, objective_with_hint = create_and_solve_model(
#         hint=solution_without_hint, max_solutions=1
#     )

#     # Assert that the solver found solutions in both runs
#     assert solution_without_hint is not None
#     assert solution_with_hint is not None

#     # Assert that the objective value with the hint is less than or equal to
#     # the objective value without the hint (for minimization)
#     assert objective_with_hint <= objective_without_hint
