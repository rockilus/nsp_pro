from copy import deepcopy
from datetime import date, timedelta
from typing import Callable, Tuple

from shared.schemas import (
    ConstraintBuildAugmented,
    ConstraintFai,
    ConstraintFil,
    ConstraintOperator,
    ConstraintOrd,
    Constraints,
    ConstraintSeq,
    ConstraintSum,
    ConstraintType,
    EngineInputs,
    ShiftType,
)

from core_to_engine_service.penalties import penalties
from engine import Inputs as InputsEngine
from engine import Outputs
from engine_to_core_service.build_breaches import _parse_breaches_engine


# pylint: disable=R0801
class TestConstraintFil:
    def test_constraint_fil_hard(
        self,
        engine_inputs_special_days: EngineInputs,
        constraint_fil_with_expected_output: Tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_engine_solve_from_engine_inputs: Callable[[EngineInputs], Outputs],
    ) -> None:
        cba, constraint = constraint_fil_with_expected_output
        engine_inputs_special_days.cbs_augmented = [cba]

        out = run_engine_solve_from_engine_inputs(engine_inputs_special_days)

        assignments = out.assignments

        if isinstance(constraint, ConstraintFil):
            coord = [
                (var[0], date.fromisoformat(var[1]), var[2])
                for var in constraint.constraint_variables
            ]
            as_constraint = [
                a
                for a in assignments
                if (
                    a.worker_id,
                    a.date,
                    a.shift_id,
                )
                in coord
            ]
            assert len(as_constraint) == 0
        else:
            assert False

    def test_constraint_fil_soft(
        self,
        engine_inputs_special_days: EngineInputs,
        constraint_fil_with_expected_output: Tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_engine_solve_from_engine_inputs: Callable[[EngineInputs], Outputs],
    ) -> None:
        cba, constraint = constraint_fil_with_expected_output
        cba_soft = deepcopy(cba)
        cba_soft.hard = False
        engine_inputs_special_days.cbs_augmented = [cba_soft]

        out = run_engine_solve_from_engine_inputs(engine_inputs_special_days)

        assignments = out.assignments

        if isinstance(constraint, ConstraintFil):
            coord = [
                (var[0], date.fromisoformat(var[1]), var[2])
                for var in constraint.constraint_variables
            ]
            as_constraint = [
                a
                for a in assignments
                if (
                    a.worker_id,
                    a.date,
                    a.shift_id,
                )
                in coord
            ]
            assert len(as_constraint) == 0
        else:
            assert False

    # pylint: disable=too-many-locals
    def test_constraint_fil_hard_soft_conflict(
        self,
        engine_inputs_special_days: EngineInputs,
        constraint_fil_with_expected_output: Tuple[
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
        cba, _ = constraint_fil_with_expected_output
        engine_inputs_special_days.cbs_augmented = [cba]
        shift_work_ids = [
            s.id
            for s in engine_inputs_special_days.shifts
            if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]

        inputs, _ = run_core_to_engine_inputs(engine_inputs_special_days)

        assert len(inputs.user_constraints.fil) == 1
        assert isinstance(inputs.user_constraints.fil[0], ConstraintFil)

        constraint: ConstraintFil = inputs.user_constraints.fil[0]
        worker_ids_cstr = list(set(var[0] for var in constraint.constraint_variables))
        shift_ids_cstr = list(set(var[2] for var in constraint.constraint_variables))
        shift_ids_cstr_soft = [
            s_id for s_id in shift_work_ids if s_id not in shift_ids_cstr
        ]
        constraint_soft = deepcopy(constraint)
        constraint_soft.id += "_soft"
        constraint_soft.hard = False
        constraint_soft.penalty = penalties.user_constraint.fil.soft

        dates_campaign = [
            engine_inputs_special_days.schedule.start_date + timedelta(days=i)
            for i in range(
                (
                    engine_inputs_special_days.schedule.end_date
                    - engine_inputs_special_days.schedule.start_date
                ).days
                + 1
            )
        ]
        var_cstr_soft = [
            (w_id, d.isoformat(), s_id)
            for w_id in worker_ids_cstr
            for d in dates_campaign
            for s_id in shift_ids_cstr_soft
        ]

        if constraint.operator == ConstraintOperator.YES:
            constraint_soft.operator = ConstraintOperator.NO
            constraint_soft.constraint_variables = var_cstr_soft
        elif constraint.operator == ConstraintOperator.NO:
            constraint_soft.operator = ConstraintOperator.YES
            constraint_soft.constraint_variables = var_cstr_soft

        constraints_work = [
            ConstraintSum(
                id="c_sum_0",
                constraint_type=ConstraintType.SUM,
                operator=ConstraintOperator.GREATER_THAN_OR_EQUAL,
                target_value=1,
                target_unit="",
                constraint_variables=[
                    [
                        (w_id, d.isoformat(), s_id)
                        for d in dates_campaign
                        for s_id in shift_work_ids
                    ]
                ],
                active=True,
                hard=True,
                priority="medium",
                penalty=penalties.user_constraint.sum.hard,
                schedule_id="sch0",
                constraint_build_id="c_sum_0",
            )
            for w_id in worker_ids_cstr
        ]

        inputs.user_constraints.fil.append(constraint_soft)
        inputs.user_constraints.sum = constraints_work

        out = run_engine_solve(inputs)

        assignments = out.assignments

        # Check assignments hard constraint
        if isinstance(constraint, ConstraintFil):
            coord = [
                (var[0], date.fromisoformat(var[1]), var[2])
                for var in constraint.constraint_variables
            ]
            as_constraint = [
                a
                for a in assignments
                if (
                    a.worker_id,
                    a.date,
                    a.shift_id,
                )
                in coord
            ]
            assert len(as_constraint) == 0
        else:
            assert False

        # Check breach soft constraint
        breaches = _parse_breaches_engine(
            engine_inputs_special_days.schedule, out.breaches
        )
        assert len(breaches) == 1
        for breach in breaches:
            assert breach.objective_id == constraint_soft.id
            b_vars = [
                (var.worker_id, var.date.isoformat(), var.shift_id)
                for var in breach.variables
            ]
            assert b_vars == constraint_soft.constraint_variables

        # # Check objective value
        obj_value = 0
        penalty = penalties.user_constraint.fil.soft
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
            obj_value += penalty * nb_a_period
        assert out.objective_value == obj_value

    def test_constraint_fil_hard_hard_conflic_obj_value(
        self,
        engine_inputs_special_days: EngineInputs,
        constraint_fil_with_expected_output: Tuple[
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
        cba, _ = constraint_fil_with_expected_output
        engine_inputs_special_days.cbs_augmented = [cba]
        shift_work_ids = [
            s.id
            for s in engine_inputs_special_days.shifts
            if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]

        inputs, _ = run_core_to_engine_inputs(engine_inputs_special_days)

        assert len(inputs.user_constraints.fil) == 1
        assert isinstance(inputs.user_constraints.fil[0], ConstraintFil)

        constraint: ConstraintFil = inputs.user_constraints.fil[0]
        worker_ids_cstr = list(set(var[0] for var in constraint.constraint_variables))
        shift_ids_cstr = list(set(var[2] for var in constraint.constraint_variables))
        shift_ids_cstr_hard = [
            s_id for s_id in shift_work_ids if s_id not in shift_ids_cstr
        ]
        constraint_hard = deepcopy(constraint)
        constraint_hard.id += "_hard"
        constraint_hard.hard = True

        dates_campaign = [
            engine_inputs_special_days.schedule.start_date + timedelta(days=i)
            for i in range(
                (
                    engine_inputs_special_days.schedule.end_date
                    - engine_inputs_special_days.schedule.start_date
                ).days
                + 1
            )
        ]
        var_cstr_hard = [
            (w_id, d.isoformat(), s_id)
            for w_id in worker_ids_cstr
            for d in dates_campaign
            for s_id in shift_ids_cstr_hard
        ]

        if constraint.operator == ConstraintOperator.YES:
            constraint_hard.operator = ConstraintOperator.NO
            constraint_hard.constraint_variables = var_cstr_hard
        elif constraint.operator == ConstraintOperator.NO:
            constraint_hard.operator = ConstraintOperator.YES
            constraint_hard.constraint_variables = var_cstr_hard

        constraints_work = [
            ConstraintSum(
                id="c_sum_0",
                constraint_type=ConstraintType.SUM,
                operator=ConstraintOperator.GREATER_THAN_OR_EQUAL,
                target_value=1,
                target_unit="",
                constraint_variables=[
                    [
                        (w_id, d.isoformat(), s_id)
                        for d in dates_campaign
                        for s_id in shift_work_ids
                    ]
                ],
                active=True,
                hard=True,
                priority="medium",
                penalty=penalties.user_constraint.sum.hard,
                schedule_id="sch0",
                constraint_build_id="c_sum_0",
            )
            for w_id in worker_ids_cstr
            for i in range(2)
        ]

        inputs.user_constraints.fil.append(constraint_hard)
        inputs.user_constraints.sum = constraints_work

        out = run_engine_solve(inputs)

        # # Check objective value
        breaches = _parse_breaches_engine(
            engine_inputs_special_days.schedule, out.breaches
        )
        obj_value = 0
        penalty = penalties.user_constraint.fil.hard
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
            obj_value += penalty * nb_a_period
        assert out.objective_value == obj_value
