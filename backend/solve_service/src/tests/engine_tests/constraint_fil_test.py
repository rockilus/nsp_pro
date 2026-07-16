from collections.abc import Callable
from copy import deepcopy
from datetime import date, datetime, timedelta

from shared.schemas.core import (
    Assignment,
    AssignmentSource,
    ConstraintBuildAugmented,
    ConstraintFai,
    ConstraintFil,
    ConstraintOperator,
    ConstraintOrd,
    ConstraintSeq,
    ConstraintSum,
    ConstraintType,
    EngineInputsAugmented,
    ModelConfig,
    Penalties,
    ShiftDemandNew,
    ShiftDemandSource,
    ShiftType,
)

from engine import Inputs as InputsEngine
from engine import Outputs, ProcessingCache
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from tests.engine_tests.constraint_fil_effective_period_fixture import (
    build_ei_fil_effective_period,
)


# pylint: disable=R0801
class TestConstraintFil:
    def test_constraint_fil_hard(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_fil_with_expected_output: tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_engine_solve_from_engine_inputs: Callable[[EngineInputsAugmented], Outputs],
    ) -> None:
        cba, constraint = constraint_fil_with_expected_output
        engine_inputs.cbs_augmented = [cba]

        out = run_engine_solve_from_engine_inputs(engine_inputs)

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
        engine_inputs: EngineInputsAugmented,
        constraint_fil_with_expected_output: tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_engine_solve_from_engine_inputs: Callable[[EngineInputsAugmented], Outputs],
    ) -> None:
        cba, constraint = constraint_fil_with_expected_output
        cba_soft = deepcopy(cba)
        cba_soft.hard = False
        engine_inputs.cbs_augmented = [cba_soft]

        out = run_engine_solve_from_engine_inputs(engine_inputs)

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

    # pylint: disable=too-many-locals, too-many-arguments
    def test_constraint_fil_hard_soft_conflict(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_fil_with_expected_output: tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        cba, _ = constraint_fil_with_expected_output
        engine_inputs.cbs_augmented = [cba]
        shift_work_ids = [
            s.id
            for s in engine_inputs.shifts
            if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]

        inputs, _ = run_core_to_engine_inputs(engine_inputs)

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
        constraint_soft.penalty = engine_inputs.penalties.user_constraint.fil.soft

        dates_campaign = [
            engine_inputs.schedule.start_date + timedelta(days=i)
            for i in range(
                (
                    engine_inputs.schedule.end_date - engine_inputs.schedule.start_date
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
                target_values=[1],
                active=True,
                hard=True,
                priority="medium",
                penalty=engine_inputs.penalties.user_constraint.sum.hard,
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
        breaches = _parse_breaches_engine(engine_inputs.schedule, out.breaches)
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
        penalty = engine_inputs.penalties.user_constraint.fil.soft
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

    # pylint: disable=too-many-arguments
    def test_constraint_fil_hard_hard_conflic_obj_value(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_fil_with_expected_output: tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        cba, _ = constraint_fil_with_expected_output
        engine_inputs.cbs_augmented = [cba]
        shift_work_ids = [
            s.id
            for s in engine_inputs.shifts
            if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
        ]

        inputs, _ = run_core_to_engine_inputs(engine_inputs)

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
            engine_inputs.schedule.start_date + timedelta(days=i)
            for i in range(
                (
                    engine_inputs.schedule.end_date - engine_inputs.schedule.start_date
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
                target_values=[1],
                active=True,
                hard=True,
                priority="medium",
                penalty=engine_inputs.penalties.user_constraint.sum.hard,
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
        breaches = _parse_breaches_engine(engine_inputs.schedule, out.breaches)
        obj_value = 0
        penalty = engine_inputs.penalties.user_constraint.fil.hard
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


def _fixed_assignment(
    ei: EngineInputsAugmented,
    worker_id: str,
    date_obj: date,
    shift_id: str,
) -> Assignment:
    return Assignment(
        id=f"a_{worker_id}_{date_obj}_{shift_id}",
        team_id=ei.schedule.team_id,
        schedule_id=ei.schedule.id,
        worker_id=worker_id,
        date=date_obj,
        shift_id=shift_id,
        fixed=True,
        source=AssignmentSource.MANUAL,
    )


def _ensure_shift_demand(
    ei: EngineInputsAugmented, shift_id: str, date_obj: date
) -> None:
    if not any(
        d.shift_id == shift_id and d.date == date_obj for d in ei.shift_demands
    ):
        ei.shift_demands.append(
            ShiftDemandNew(
                id=f"dsd_{shift_id}_{date_obj}",
                date=date_obj,
                shift_id=shift_id,
                team_id=ei.schedule.team_id,
                count=1,
                notes=None,
                source=ShiftDemandSource.MANUAL,
                source_id=None,
                created_at=datetime.now(),
                updated_at=datetime.now(),
            )
        )


def test_constraint_fil_effective_period(
    penalties_fix: Penalties,
    model_config_fix: ModelConfig,
    run_engine_solve_from_engine_inputs: Callable[
        [EngineInputsAugmented], Outputs
    ],
) -> None:
    ei = build_ei_fil_effective_period(penalties_fix, model_config_fix)

    ei.as_campaign_fixed.append(
        _fixed_assignment(ei, "w0", date(2026, 1, 2), "s_morning")
    )
    ei.as_campaign_fixed.append(
        _fixed_assignment(ei, "w0", date(2026, 1, 5), "s_morning")
    )

    out = run_engine_solve_from_engine_inputs(ei)
    assert out is not None

    breaches = _parse_breaches_engine(ei.schedule, out.breaches)
    assert len(breaches) == 1
    assert breaches[0].objective_id == "c_fil_period"

    breach_dates = {v.date for v in breaches[0].variables}
    breach_shift_ids = {v.shift_id for v in breaches[0].variables}
    # Inside-period fixed assignment (Jan 2) must be in the breach
    assert date(2026, 1, 2) in breach_dates
    # Outside-period fixed assignment (Jan 5) must NOT be in the breach
    assert date(2026, 1, 5) not in breach_dates
    assert "s_morning" in breach_shift_ids
