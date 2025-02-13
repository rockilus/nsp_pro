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

from core_to_engine_service.penalties import penalties
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

    # pylint: disable=too-many-locals, too-many-branches
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

        assert len(inputs.user_constraints.sum) == 1
        assert isinstance(inputs.user_constraints.sum[0], ConstraintSum)

        constraint: ConstraintSum = inputs.user_constraints.sum[0]
        constraint_soft = deepcopy(constraint)
        constraint_soft.id += "_soft"
        constraint_soft.hard = False
        constraint_soft.penalty = penalties.user_constraint.sum.soft

        if constraint.operator in [
            ConstraintOperator.LESS_THAN_OR_EQUAL,
            ConstraintOperator.EQUAL,
        ]:
            constraint_soft.target_value = constraint.target_value + 1
            constraint_soft.operator = ConstraintOperator.EQUAL
        elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
            constraint_soft.target_value = constraint.target_value - 1
            constraint_soft.operator = ConstraintOperator.EQUAL

        inputs.user_constraints.sum.append(constraint_soft)

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
        obj_value = 0
        penalty = penalties.user_constraint.sum.soft
        for breach in breaches:
            nb_a_period = sum(
                1
                for assignment in out.assignments
                if (
                    assignment.worker_id,
                    assignment.date,
                    assignment.shift_id,
                )
                in [(var.worker_id, var.date, var.shift_id) for var in breach.variables]
            )
            if constraint_soft.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                obj_value += penalty * max(
                    nb_a_period - constraint_soft.target_value, 0
                )
            elif constraint_soft.operator == ConstraintOperator.EQUAL:
                obj_value += penalty * abs(constraint_soft.target_value - nb_a_period)
            elif constraint_soft.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                obj_value += penalty * max(
                    constraint_soft.target_value - nb_a_period, 0
                )
        assert out.objective_value == obj_value

    def test_constraint_sum_hard_hard_conflic_obj_value(
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
        cba, _ = constraint_sum_with_expected_output
        engine_inputs.cbs_augmented = [cba]
        inputs, _ = run_core_to_engine_inputs(engine_inputs)

        assert len(inputs.user_constraints.sum) == 1
        assert isinstance(inputs.user_constraints.sum[0], ConstraintSum)

        constraint: ConstraintSum = inputs.user_constraints.sum[0]
        constraint_hard_copy = deepcopy(constraint)
        constraint_hard_copy.id += "_copy"
        constraint_hard_copy.hard = True

        if constraint.operator in [
            ConstraintOperator.LESS_THAN_OR_EQUAL,
            ConstraintOperator.EQUAL,
        ]:
            constraint_hard_copy.target_value = constraint.target_value + 1
            constraint_hard_copy.operator = ConstraintOperator.EQUAL
        elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
            constraint_hard_copy.target_value = constraint.target_value - 1
            constraint_hard_copy.operator = ConstraintOperator.EQUAL

        inputs.user_constraints.sum.append(constraint_hard_copy)

        out = run_engine_solve(inputs)

        # Check objective value
        breaches = _parse_breaches_engine(engine_inputs.schedule, out.breaches)
        obj_value = 0
        penalty = penalties.user_constraint.sum.hard
        for breach in breaches:
            nb_a_period = sum(
                1
                for assignment in out.assignments
                if (
                    assignment.worker_id,
                    assignment.date,
                    assignment.shift_id,
                )
                in [(var.worker_id, var.date, var.shift_id) for var in breach.variables]
            )
            if constraint_hard_copy.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                obj_value += penalty * max(
                    nb_a_period - constraint_hard_copy.target_value, 0
                )
            elif constraint_hard_copy.operator == ConstraintOperator.EQUAL:
                obj_value += penalty * abs(
                    constraint_hard_copy.target_value - nb_a_period
                )
            elif (
                constraint_hard_copy.operator
                == ConstraintOperator.GREATER_THAN_OR_EQUAL
            ):
                obj_value += penalty * max(
                    constraint_hard_copy.target_value - nb_a_period, 0
                )
