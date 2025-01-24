import random
from copy import deepcopy
from datetime import date
from typing import Callable, List, Tuple

import pytest
from shared.schemas import (
    ConstraintBuildAugmented,
    ConstraintFai,
    ConstraintFil,
    ConstraintOperator,
    ConstraintOrd,
    Constraints,
    ConstraintSeq,
    ConstraintSum,
    EngineInputs,
    QuickStaffing,
    Schedule,
    Shift,
    ShiftType,
    Worker,
)

from engine import Inputs as InputsEngine
from engine import Outputs
from engine_to_core_service.build_breaches import _parse_breaches_engine
from tests.engine_tests.engine_solve import engine_solve_engine_inputs
from tests.sample_data import test_data_set_2


# pylint: disable=too-few-public-methods, R0801
class TestConstraintSumQuickStaffing:
    @pytest.mark.parametrize("sample_data", test_data_set_2)
    def test_build_quick_staffing_constraints(self, sample_data: EngineInputs) -> None:
        target = random.randint(1, 3)

        shifts: List[Shift] = sample_data.shifts
        target_shift = shifts[0]

        workers: List[Worker] = sample_data.workers
        target_worker = workers[0]

        schedule: Schedule = sample_data.schedule
        target_qs = QuickStaffing(
            shift_id=target_shift.id,
            worker_id=target_worker.id,
            target=target,
        )
        schedule.quick_staffings.append(target_qs)
        sample_data.schedule = schedule

        output = engine_solve_engine_inputs(sample_data)

        assignments = output.assignments
        assert (
            sum(
                1
                for assignment in assignments
                if assignment.worker_id == target_worker.id
                and assignment.shift_id == target_shift.id
            )
            == target
        )

    @pytest.mark.parametrize("sample_data", test_data_set_2)
    def test_build_quick_staffing_constraints_no_staffing(
        self, sample_data: EngineInputs
    ) -> None:
        shifts: List[Shift] = sample_data.shifts
        workers: List[Worker] = sample_data.workers
        target_worker = workers[0]

        schedule: Schedule = sample_data.schedule
        target_qss = [
            QuickStaffing(
                shift_id=s.id,
                worker_id=target_worker.id,
                target=0,
            )
            for s in shifts
            if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]
        schedule.quick_staffings = target_qss
        sample_data.schedule = schedule

        output = engine_solve_engine_inputs(sample_data)

        assignments = output.assignments
        assert (
            sum(
                1
                for assignment in assignments
                if assignment.worker_id == target_worker.id
            )
            == 0
        )


class TestConstraintSum:
    def test_constraint_sum_hard(
        self,
        engine_inputs: EngineInputs,
        constraint_sum_with_expected_output: Tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_engine_solve_from_engine_inputs: Callable[[EngineInputs], Outputs],
    ) -> None:
        cba, constraint = constraint_sum_with_expected_output
        engine_inputs.cbs_augmented = [cba]

        out = run_engine_solve_from_engine_inputs(engine_inputs)

        if isinstance(constraint, ConstraintSum):
            for cstr_vars in constraint.constraint_variables:
                coord = [
                    (var[0], date.fromisoformat(var[1]), var[2]) for var in cstr_vars
                ]
                nb_a_period = sum(
                    1
                    for assignment in out.assignments
                    if (
                        assignment.worker_id,
                        assignment.date,
                        assignment.shift_id,
                    )
                    in coord
                )
                if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                    assert nb_a_period <= constraint.target_value
                elif constraint.operator == ConstraintOperator.EQUAL:
                    assert nb_a_period == constraint.target_value
                elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                    assert nb_a_period >= constraint.target_value
        else:
            assert False

    def test_constraint_sum_soft(
        self,
        engine_inputs: EngineInputs,
        constraint_sum_with_expected_output: Tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_engine_solve_from_engine_inputs: Callable[[EngineInputs], Outputs],
    ) -> None:
        cba, constraint = constraint_sum_with_expected_output
        cba_soft = deepcopy(cba)
        cba_soft.hard = False
        engine_inputs.cbs_augmented = [cba_soft]

        out = run_engine_solve_from_engine_inputs(engine_inputs)

        if isinstance(constraint, ConstraintSum):
            for cstr_vars in constraint.constraint_variables:
                coord = [
                    (var[0], date.fromisoformat(var[1]), var[2]) for var in cstr_vars
                ]
                nb_a_period = sum(
                    1
                    for assignment in out.assignments
                    if (
                        assignment.worker_id,
                        assignment.date,
                        assignment.shift_id,
                    )
                    in coord
                )
                if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                    assert nb_a_period <= constraint.target_value
                elif constraint.operator == ConstraintOperator.EQUAL:
                    assert nb_a_period == constraint.target_value
                elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                    assert nb_a_period >= constraint.target_value
        else:
            assert False

    # pylint: disable=too-many-locals
    def test_constraint_sum_hard_soft_conflict(
        self,
        engine_inputs: EngineInputs,
        constraint_sum_with_expected_output: Tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_core_to_engine_inputs: Callable[
            [EngineInputs], Tuple[InputsEngine, Constraints]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        cba, constraint_hard = constraint_sum_with_expected_output
        engine_inputs.cbs_augmented = [cba]
        inputs, _ = run_core_to_engine_inputs(engine_inputs)

        assert len(inputs.constraints.sum) == 1
        assert isinstance(inputs.constraints.sum[0], ConstraintSum)

        constraint: ConstraintSum = inputs.constraints.sum[0]
        constraint_soft = deepcopy(constraint)
        constraint_soft.id += "_soft"
        constraint_soft.hard = False

        if constraint.operator in [
            ConstraintOperator.LESS_THAN_OR_EQUAL,
            ConstraintOperator.EQUAL,
        ]:
            constraint_soft.target_value = constraint.target_value + 1
            constraint_soft.operator = ConstraintOperator.EQUAL
        elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
            constraint_soft.target_value = constraint.target_value - 1
            constraint_soft.operator = ConstraintOperator.EQUAL

        inputs.constraints.sum.append(constraint_soft)

        out = run_engine_solve(inputs)

        # Check assignments hard constraint
        if isinstance(constraint_hard, ConstraintSum):
            for cstr_vars in constraint.constraint_variables:
                coord = [
                    (var[0], date.fromisoformat(var[1]), var[2]) for var in cstr_vars
                ]
                nb_a_period = sum(
                    1
                    for assignment in out.assignments
                    if (
                        assignment.worker_id,
                        assignment.date,
                        assignment.shift_id,
                    )
                    in coord
                )
                if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                    assert nb_a_period <= constraint.target_value
                elif constraint.operator == ConstraintOperator.EQUAL:
                    assert nb_a_period == constraint.target_value
                elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                    assert nb_a_period >= constraint.target_value
        else:
            assert False

        # Check breach soft constraint
        breaches = _parse_breaches_engine(engine_inputs.schedule, out.breaches)
        assert len(breaches) == len(constraint_soft.constraint_variables)
        for breach in breaches:
            assert breach.objective_id == constraint_soft.id
            b_vars = [
                (var.worker_id, var.date.isoformat(), var.shift_id)
                for var in breach.variables
            ]
            assert b_vars in constraint_soft.constraint_variables

        # Check objective value


# import json
# import os
# from datetime import date, datetime, timedelta
# from typing import Callable, List

# import pytest

# from engine.model.utils.model_utils import get_nested_value
# from engine.tests.engine_test import TestEngine

# # pylint: disable=unused-import
# from engine.tests.test_mode_fixture_test import set_test_mode  # noqa: F401
# from engine.types.input_output_types import (
#     Constraint,
#     ConstraintOperator,
#     ConstraintType,
#     Inputs,
#     Outputs,
#     VarDay,
#     VarShift,
#     VarWorker,
# )
# from utils.constants import Constants


# # pylint: disable=R0801
# class TestConstraint:
#     @pytest.fixture
#     def constraint_sum_hard(self) -> Constraint:
#         return Constraint(
#             id="constraint_sum_hard",
#             constraint_type=ConstraintType.SUM,
#             operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
#             target_value=12,
#             target_unit="hour",
#             worker_var=VarWorker(
#                 selector="equal", target=["w0"], num_eligible_workers=0
#             ),
#             day_var=VarDay(
#                 selector="week",
#                 target=0,
#                 start_date=date.today(),
#                 end_date=date.today(),
#                 interval=0,
#             ),
#             shift_var=VarShift(selector="all", target=[], reference=[], relative=[]),
#             hard=True,
#             hard_to_soft=False,
#             penalty=0,
#         )

#     @pytest.fixture
#     def constraint_sum_soft(self) -> Constraint:
#         return Constraint(
#             id="constraint_sum_soft",
#             constraint_type=ConstraintType.SUM,
#             operator=ConstraintOperator.LESS_THAN_OR_EQUAL,
#             target_value=8,
#             target_unit="hour",
#             worker_var=VarWorker(
#                 selector="equal", target=["w0"], num_eligible_workers=0
#             ),
#             day_var=VarDay(
#                 selector="week",
#                 target=0,
#                 start_date=date.today(),
#                 end_date=date.today(),
#                 interval=0,
#             ),
#             shift_var=VarShift(selector="all", target=[], reference=[], relative=[]),
#             hard=False,
#             hard_to_soft=False,
#             penalty=20,
#         )

#     @pytest.fixture
#     def penalty(self) -> int:
#         current_path = os.path.dirname(os.path.realpath(__file__))
#         parent_path = os.path.dirname(current_path)
#         model_config_file_path = os.path.join(parent_path, "model_config.json")
#         with open(model_config_file_path, "r", encoding="utf-8") as penalties_file:
#             model_config = json.load(penalties_file)
#         return get_nested_value(
#             model_config,
#             [
#                 "penalties",
#                 "user_constraint",
#                 "sum",
#                 "soft",
#             ],
#         )


# class TestConstraintHard(TestEngine, TestConstraint):
#     def test_expected_assignment_for_less_than_or_equal(
#         self,
#         inputs: Inputs,
#         engine_solve: Callable[[Inputs], Outputs],
#         constraint_sum_hard: Constraint,
#     ) -> None:
#         # At most 12 hours per week for worker w0
#         inputs.constraints = [constraint_sum_hard]
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         dates_weeks = get_dates_weeks(inputs.variable_space.all_days)

#         worked_durations = [
#             sum(
#                 inputs.shift_durations[a.shift_id]
#                 for a in assignments
#                 if a.worker_id == w and a.date in week
#             )
#             for week in dates_weeks
#             for w in constraint_sum_hard.worker_var.target
#         ]

#         assert (
#             max(worked_durations)
#             <= constraint_sum_hard.target_value * Constants.NUM_MINUTES_HOUR
#         )

#     def test_expected_assignment_for_equal(
#         self,
#         inputs: Inputs,
#         engine_solve: Callable[[Inputs], Outputs],
#         constraint_sum_hard: Constraint,
#     ) -> None:
#         # 12 hours per week for worker w0
#         constraint_sum_hard.operator = ConstraintOperator.EQUAL
#         inputs.constraints = [constraint_sum_hard]
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         dates_weeks = get_dates_weeks(inputs.variable_space.all_days)

#         worked_durations = [
#             sum(
#                 inputs.shift_durations[a.shift_id]
#                 for a in assignments
#                 if a.worker_id == w and a.date in week
#             )
#             for week in dates_weeks
#             for w in constraint_sum_hard.worker_var.target
#         ]

#         assert all(
#             dur == constraint_sum_hard.target_value * Constants.NUM_MINUTES_HOUR
#             for dur in worked_durations
#         )

#     def test_expected_assignment_for_greater_than_or_equal(
#         self,
#         inputs: Inputs,
#         engine_solve: Callable[[Inputs], Outputs],
#         constraint_sum_hard: Constraint,
#     ) -> None:
#         # At least 12 hours per week for worker w0
#         constraint_sum_hard.operator = ConstraintOperator.GREATER_THAN_OR_EQUAL
#         inputs.constraints = [constraint_sum_hard]
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         dates_weeks = get_dates_weeks(inputs.variable_space.all_days)

#         worked_durations = [
#             sum(
#                 inputs.shift_durations[a.shift_id]
#                 for a in assignments
#                 if a.worker_id == w and a.date in week
#             )
#             for week in dates_weeks
#             for w in constraint_sum_hard.worker_var.target
#         ]

#         assert (
#             min(worked_durations)
#             >= constraint_sum_hard.target_value * Constants.NUM_MINUTES_HOUR
#         )

#     def test_expected_assignment_for_equal_worker_equal_day_all_shift_equal(
#         self,
#         inputs: Inputs,
#         engine_solve: Callable[[Inputs], Outputs],
#         constraint_sum_hard: Constraint,
#     ) -> None:
#         # Worker w0 works 12 hours total
#         constraint_sum_hard.operator = ConstraintOperator.EQUAL
#         constraint_sum_hard.day_var.selector = "all"
#         inputs.constraints = [constraint_sum_hard]
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         worked_duration = sum(
#             inputs.shift_durations[a.shift_id]
#             for a in assignments
#             if a.worker_id in constraint_sum_hard.worker_var.target
#         )

#         assert (
#             worked_duration
#             == constraint_sum_hard.target_value * Constants.NUM_MINUTES_HOUR
#         )

#     def test_expected_assignment_for_equal_worker_equal_day_period_shift_equal(
#         self,
#         inputs: Inputs,
#         engine_solve: Callable[[Inputs], Outputs],
#         constraint_sum_hard: Constraint,
#     ) -> None:
#         # Worker w0 works 12 hours during first week (between
#         # 2023-10-02 and 2023-10-08)
#         constraint_sum_hard.operator = ConstraintOperator.EQUAL
#         constraint_sum_hard.day_var.selector = "period"
#         constraint_sum_hard.day_var.start_date = date.fromisoformat("2023-10-02")
#         constraint_sum_hard.day_var.end_date = date.fromisoformat("2023-10-08")
#         inputs.constraints = [constraint_sum_hard]
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         worked_duration = sum(
#             inputs.shift_durations[a.shift_id]
#             for a in assignments
#             if a.worker_id in constraint_sum_hard.worker_var.target
#             and a.date
#             in build_day_list(
#                 constraint_sum_hard.day_var.start_date,
#                 constraint_sum_hard.day_var.end_date,
#             )
#         )

#         assert (
#             worked_duration
#             == constraint_sum_hard.target_value * Constants.NUM_MINUTES_HOUR
#         )


# class TestConstraintSoft(TestEngine, TestConstraint):
#     def test_expected_assignment_for_less_than_or_equal(
#         self,
#         inputs: Inputs,
#         engine_solve: Callable[[Inputs], Outputs],
#         constraint_sum_soft: Constraint,
#     ) -> None:
#         # At most 8 hours per week for worker w0
#         inputs.constraints = [constraint_sum_soft]
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         dates_weeks = get_dates_weeks(inputs.variable_space.all_days)

#         worked_durations = [
#             sum(
#                 inputs.shift_durations[a.shift_id]
#                 for a in assignments
#                 if a.worker_id == w and a.date in week
#             )
#             for week in dates_weeks
#             for w in constraint_sum_soft.worker_var.target
#         ]

#         assert (
#             max(worked_durations)
#             <= constraint_sum_soft.target_value * Constants.NUM_MINUTES_HOUR
#         )

#     def test_expected_assignment_for_equal(
#         self,
#         inputs: Inputs,
#         engine_solve: Callable[[Inputs], Outputs],
#         constraint_sum_soft: Constraint,
#     ) -> None:
#         # Exactly 4 shift off per week
#         constraint_sum_soft.operator = ConstraintOperator.EQUAL
#         inputs.constraints = [constraint_sum_soft]
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         dates_weeks = get_dates_weeks(inputs.variable_space.all_days)

#         worked_durations = [
#             sum(
#                 inputs.shift_durations[a.shift_id]
#                 for a in assignments
#                 if a.worker_id == w and a.date in week
#             )
#             for week in dates_weeks
#             for w in constraint_sum_soft.worker_var.target
#         ]
#         assert all(
#             dur == constraint_sum_soft.target_value * Constants.NUM_MINUTES_HOUR
#             for dur in worked_durations
#         )

#     def test_expected_assignment_for_greater_than_or_equal(
#         self,
#         inputs: Inputs,
#         engine_solve: Callable[[Inputs], Outputs],
#         constraint_sum_soft: Constraint,
#     ) -> None:
#         # At least 4 shift off per week
#         constraint_sum_soft.operator = ConstraintOperator.GREATER_THAN_OR_EQUAL
#         inputs.constraints = [constraint_sum_soft]
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         dates_weeks = get_dates_weeks(inputs.variable_space.all_days)

#         worked_durations = [
#             sum(
#                 inputs.shift_durations[a.shift_id]
#                 for a in assignments
#                 if a.worker_id == w and a.date in week
#             )
#             for week in dates_weeks
#             for w in constraint_sum_soft.worker_var.target
#         ]

#         assert (
#             min(worked_durations)
#             >= constraint_sum_soft.target_value * Constants.NUM_MINUTES_HOUR
#         )

#     def test_expected_assignment_for_hard_soft_conflict(
#         self,
#         inputs: Inputs,
#         engine_solve: Callable[[Inputs], Outputs],
#         constraint_sum_hard: Constraint,
#         constraint_sum_soft: Constraint,
#     ) -> None:
#         # Worker w0 works excalty 12 hours per week hard, at most 8 hours per
#         # week soft
#         constraint_sum_hard.operator = ConstraintOperator.EQUAL
#         inputs.constraints = [
#             constraint_sum_hard,
#             constraint_sum_soft,
#         ]
#         outputs = engine_solve(inputs)
#         assignments = outputs.assignments

#         dates_weeks = get_dates_weeks(inputs.variable_space.all_days)
#         constraint_sum_hard = inputs.constraints[0]

#         worked_durations = [
#             sum(
#                 inputs.shift_durations[a.shift_id]
#                 for a in assignments
#                 if a.worker_id == w and a.date in week
#             )
#             for week in dates_weeks
#             for w in constraint_sum_hard.worker_var.target
#         ]

#         assert all(
#             dur == constraint_sum_hard.target_value * Constants.NUM_MINUTES_HOUR
#             for dur in worked_durations
#         )

#     # pylint: disable=too-many-arguments
#     def test_expected_objective_for_hard_soft_conflict(
#         self,
#         inputs: Inputs,
#         engine_solve: Callable[[Inputs], Outputs],
#         constraint_sum_hard: Constraint,
#         constraint_sum_soft: Constraint,
#         penalty: int,
#     ) -> None:
#         # Worker w0 works excalty 12 hours per week hard, at most 8 hours per
#         # week soft
#         constraint_sum_hard.operator = ConstraintOperator.EQUAL
#         inputs.constraints = [
#             constraint_sum_hard,
#             constraint_sum_soft,
#         ]
#         outputs = engine_solve(inputs)

#         dates_weeks = get_dates_weeks(inputs.variable_space.all_days)

#         assert (
#             outputs.objective_value
#             == penalty
#             * len(constraint_sum_hard.worker_var.target)
#             * len(dates_weeks)
#             * abs(constraint_sum_hard.target_value - constraint_sum_soft.target_value)
#             * Constants.NUM_MINUTES_HOUR
#         )

#     def test_expected_constraint_breaches_variables_for_hard_soft_conflict(
#         self,
#         inputs: Inputs,
#         engine_solve: Callable[[Inputs], Outputs],
#         constraint_sum_hard: Constraint,
#         constraint_sum_soft: Constraint,
#     ) -> None:
#         # Worker w0 works excalty 12 hours per week hard, at most 8 hours per
#         # week soft
#         constraint_sum_hard.operator = ConstraintOperator.EQUAL
#         inputs.constraints = [
#             constraint_sum_hard,
#             constraint_sum_soft,
#         ]
#         outputs = engine_solve(inputs)

#         dates_weeks = get_dates_weeks(inputs.variable_space.all_days)

#         expected_variables = [
#             [(w, d, s.id) for d in week]
#             for w in constraint_sum_hard.worker_var.target
#             for week in dates_weeks
#             for s in inputs.variable_space.shifts
#         ]

#         # all constraint_breaches' variables are in expected_variables
#         assert all(
#             any(cb_variable in exp_variables for exp_variables in expected_variables)
#             for cb in outputs.constraint_breaches
#             for cb_variable in cb.variables
#         )
#         # all expected_variables are in constraint_breaches' variables
#         assert all(
#             any(exp_variable in cb.variables for cb in outputs.constraint_breaches)
#             for exp_variables in expected_variables
#             for exp_variable in exp_variables
#         )

#     def test_expected_constraint_breaches_value_diff_for_hard_soft_conflict(
#         self,
#         inputs: Inputs,
#         engine_solve: Callable[[Inputs], Outputs],
#         constraint_sum_hard: Constraint,
#         constraint_sum_soft: Constraint,
#     ) -> None:
#         # Worker w0 works excalty 12 hours per week hard, at most 8 hours per
#         # week soft
#         constraint_sum_hard.operator = ConstraintOperator.EQUAL
#         inputs.constraints = [
#             constraint_sum_hard,
#             constraint_sum_soft,
#         ]
#         outputs = engine_solve(inputs)

#         expected_value_diff = (
#             constraint_sum_hard.target_value - constraint_sum_soft.target_value
#         ) * Constants.NUM_MINUTES_HOUR

#         assert all(
#             cb.value_diff == expected_value_diff for cb in outputs.constraint_breaches
#         )


# # pylint: disable=R0801
# def get_dates_weeks(days: List[str]) -> List[List[date]]:
#     dates = [
#         datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT).date() for d in days
#     ]
#     week_length = 7
#     d_indexes = [
#         list(range(i, i + 7))
#         for i in range(
#             0,
#             len(dates),
#             week_length,
#         )
#     ]
#     dates_weeks = [[dates[i] for i in d_index] for d_index in d_indexes]
#     return dates_weeks


# def build_day_list(start_date: date, end_date: date) -> List[date]:
#     delta = end_date - start_date
#     return [start_date + timedelta(days=i) for i in range(delta.days + 1)]
