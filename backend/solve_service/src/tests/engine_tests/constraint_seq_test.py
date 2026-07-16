from collections.abc import Callable
from copy import deepcopy
from datetime import UTC, date, datetime

from shared.augment import requests_to_requests_augmented
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
    EngineInputsAugmented,
    FulfillmentStatus,
    ModelConfig,
    Penalties,
    Request,
    RequestStatus,
    RequestType,
    ShiftWorkerOption,
    SWOIdTypes,
)

from engine import Inputs as InputsEngine
from engine import Outputs, ProcessingCache
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from tests.engine_tests.constraint_seq_effective_period_fixture import (
    build_ei_seq_effective_period,
)


class TestConstraintSeq:
    # pylint: disable=too-many-branches, too-many-locals
    def test_constraint_seq_hard(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_seq_with_expected_output: tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_engine_solve_from_engine_inputs: Callable[[EngineInputsAugmented], Outputs],
    ) -> None:
        cba, constraint = constraint_seq_with_expected_output
        engine_inputs.cbs_augmented = [cba]
        shift_target_id = constraint.constraint_variables[0][0][2]

        request = Request(
            id="req_1",
            team_id="t0",
            shift_id=None,
            shift_options=[
                ShiftWorkerOption(
                    name=shift_target_id,
                    id=shift_target_id,
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name=shift_target_id,
                )
            ],
            worker_id=constraint.constraint_variables[0][0][0],
            start_date=date.fromisoformat(constraint.constraint_variables[0][0][1]),
            end_date=date.fromisoformat(constraint.constraint_variables[0][0][1]),
            negative=False,
            hard=True,
            status=RequestStatus.DEFERRED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=UTC),
        )
        engine_inputs.requests_work = requests_to_requests_augmented(
            requests=[request],
            workers=engine_inputs.workers,
            shifts=engine_inputs.shifts,
            dimensions=engine_inputs.dimensions,
            dim_entries=engine_inputs.dim_entries,
            attributes=engine_inputs.attributes,
        )

        out = run_engine_solve_from_engine_inputs(engine_inputs)

        # pylint: disable=too-many-nested-blocks
        if isinstance(constraint, ConstraintSeq):
            for cstr_vars in constraint.constraint_variables:
                coord = [
                    (var[0], date.fromisoformat(var[1]), var[2]) for var in cstr_vars
                ]
                if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                    for i in range(len(coord) - constraint.target_value):
                        coord_cstr = coord[i : i + constraint.target_value + 1]
                        nb_a_period = sum(
                            1
                            for assignment in out.assignments
                            if (
                                assignment.worker_id,
                                assignment.date,
                                assignment.shift_id,
                            )
                            in coord_cstr
                        )
                        assert nb_a_period <= constraint.target_value
                elif constraint.operator == ConstraintOperator.EQUAL:
                    i = 0
                    while i < len(coord) - constraint.target_value:
                        a = next(
                            (
                                a
                                for a in out.assignments
                                if (a.worker_id, a.date, a.shift_id) == coord[i]
                            ),
                            None,
                        )
                        if a is not None:
                            nb_a_period = 1
                            for j in range(1, len(coord) - i):
                                a = next(
                                    (
                                        a
                                        for a in out.assignments
                                        if (a.worker_id, a.date, a.shift_id)
                                        == coord[i + j]
                                    ),
                                    None,
                                )
                                if a is not None:
                                    nb_a_period += 1
                                else:
                                    break
                            assert nb_a_period == constraint.target_value
                            i += nb_a_period
                        else:
                            i += 1
                elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                    i = 0
                    while i < len(coord) - constraint.target_value:
                        a = next(
                            (
                                a
                                for a in out.assignments
                                if (a.worker_id, a.date, a.shift_id) == coord[i]
                            ),
                            None,
                        )
                        if a is not None:
                            nb_a_period = 1
                            for j in range(1, len(coord) - i):
                                a = next(
                                    (
                                        a
                                        for a in out.assignments
                                        if (a.worker_id, a.date, a.shift_id)
                                        == coord[i + j]
                                    ),
                                    None,
                                )
                                if a is not None:
                                    nb_a_period += 1
                                else:
                                    break
                            assert nb_a_period >= constraint.target_value
                            i += nb_a_period
                        else:
                            i += 1
        else:
            assert False

    # pylint: disable=too-many-locals, too-many-branches
    def test_constraint_seq_soft(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_seq_with_expected_output: tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_engine_solve_from_engine_inputs: Callable[[EngineInputsAugmented], Outputs],
    ) -> None:
        cba, constraint = constraint_seq_with_expected_output
        cba_soft = deepcopy(cba)
        cba_soft.hard = False
        engine_inputs.cbs_augmented = [cba_soft]
        shift_target_id = constraint.constraint_variables[0][0][2]

        request = Request(
            id="req_1",
            team_id="t0",
            shift_id=None,
            shift_options=[
                ShiftWorkerOption(
                    name=shift_target_id,
                    id=shift_target_id,
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name=shift_target_id,
                )
            ],
            worker_id=constraint.constraint_variables[0][0][0],
            start_date=date.fromisoformat(constraint.constraint_variables[0][0][1]),
            end_date=date.fromisoformat(constraint.constraint_variables[0][0][1]),
            negative=False,
            hard=True,
            status=RequestStatus.DEFERRED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=UTC),
        )
        engine_inputs.requests_work = requests_to_requests_augmented(
            requests=[request],
            workers=engine_inputs.workers,
            shifts=engine_inputs.shifts,
            dimensions=engine_inputs.dimensions,
            dim_entries=engine_inputs.dim_entries,
            attributes=engine_inputs.attributes,
        )

        out = run_engine_solve_from_engine_inputs(engine_inputs)

        # pylint: disable=too-many-nested-blocks
        if isinstance(constraint, ConstraintSeq):
            for cstr_vars in constraint.constraint_variables:
                coord = [
                    (var[0], date.fromisoformat(var[1]), var[2]) for var in cstr_vars
                ]
                if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                    for i in range(len(coord) - constraint.target_value):
                        coord_cstr = coord[i : i + constraint.target_value + 1]
                        nb_a_period = sum(
                            1
                            for assignment in out.assignments
                            if (
                                assignment.worker_id,
                                assignment.date,
                                assignment.shift_id,
                            )
                            in coord_cstr
                        )
                        assert nb_a_period <= constraint.target_value
                elif constraint.operator == ConstraintOperator.EQUAL:
                    i = 0
                    while i < len(coord) - constraint.target_value:
                        a = next(
                            (
                                a
                                for a in out.assignments
                                if (a.worker_id, a.date, a.shift_id) == coord[i]
                            ),
                            None,
                        )
                        if a is not None:
                            nb_a_period = 1
                            for j in range(1, len(coord) - i):
                                a = next(
                                    (
                                        a
                                        for a in out.assignments
                                        if (a.worker_id, a.date, a.shift_id)
                                        == coord[i + j]
                                    ),
                                    None,
                                )
                                if a is not None:
                                    nb_a_period += 1
                                else:
                                    break
                            assert nb_a_period == constraint.target_value
                            i += nb_a_period
                        else:
                            i += 1
                elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                    i = 0
                    while i < len(coord) - constraint.target_value:
                        a = next(
                            (
                                a
                                for a in out.assignments
                                if (a.worker_id, a.date, a.shift_id) == coord[i]
                            ),
                            None,
                        )
                        if a is not None:
                            nb_a_period = 1
                            for j in range(1, len(coord) - i):
                                a = next(
                                    (
                                        a
                                        for a in out.assignments
                                        if (a.worker_id, a.date, a.shift_id)
                                        == coord[i + j]
                                    ),
                                    None,
                                )
                                if a is not None:
                                    nb_a_period += 1
                                else:
                                    break
                            assert nb_a_period >= constraint.target_value
                            i += nb_a_period
                        else:
                            i += 1
        else:
            assert False

    # pylint: disable=too-many-locals, too-many-branches, too-many-statements,
    # pylint: disable=too-many-arguments
    def test_constraint_seq_hard_soft_conflict(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_seq_with_expected_output: tuple[
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
        cba, c_fixture = constraint_seq_with_expected_output
        engine_inputs.cbs_augmented = [cba]
        shift_target_id = c_fixture.constraint_variables[0][0][2]

        request = Request(
            id="req_1",
            team_id="t0",
            shift_id=None,
            shift_options=[
                ShiftWorkerOption(
                    name=shift_target_id,
                    id=shift_target_id,
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name=shift_target_id,
                )
            ],
            worker_id=c_fixture.constraint_variables[0][0][0],
            start_date=date.fromisoformat(c_fixture.constraint_variables[0][0][1]),
            end_date=date.fromisoformat(c_fixture.constraint_variables[0][0][1]),
            negative=False,
            hard=True,
            status=RequestStatus.DEFERRED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=UTC),
        )
        engine_inputs.requests_work = requests_to_requests_augmented(
            requests=[request],
            workers=engine_inputs.workers,
            shifts=engine_inputs.shifts,
            dimensions=engine_inputs.dimensions,
            dim_entries=engine_inputs.dim_entries,
            attributes=engine_inputs.attributes,
        )

        for w in engine_inputs.workers:
            w.weekly_hours = 80
            w.weekly_hours_desired = 80

        inputs, _ = run_core_to_engine_inputs(engine_inputs)

        assert len(inputs.user_constraints.seq) == 1
        assert isinstance(inputs.user_constraints.seq[0], ConstraintSeq)

        constraint: ConstraintSeq = inputs.user_constraints.seq[0]
        constraint_soft = deepcopy(constraint)
        constraint_soft.id += "_soft"
        constraint_soft.hard = False
        constraint_soft.penalty = engine_inputs.penalties.user_constraint.seq.soft

        if constraint.operator in [
            ConstraintOperator.LESS_THAN_OR_EQUAL,
            ConstraintOperator.EQUAL,
        ]:
            constraint_soft.target_value = constraint.target_value + 1
            constraint_soft.operator = ConstraintOperator.EQUAL
        elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
            constraint_soft.target_value = constraint.target_value - 1
            constraint_soft.operator = ConstraintOperator.EQUAL

        inputs.user_constraints.seq.append(constraint_soft)

        inputs.model_config.solver_params.max_time_in_seconds = 40

        out = run_engine_solve(inputs)

        # Check assignments hard constraint
        # pylint: disable=too-many-nested-blocks
        if isinstance(constraint, ConstraintSeq):
            for cstr_vars in constraint.constraint_variables:
                coord = [
                    (var[0], date.fromisoformat(var[1]), var[2]) for var in cstr_vars
                ]
                if constraint.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
                    for i in range(len(coord) - constraint.target_value):
                        coord_cstr = coord[i : i + constraint.target_value + 1]
                        nb_a_period = sum(
                            1
                            for assignment in out.assignments
                            if (
                                assignment.worker_id,
                                assignment.date,
                                assignment.shift_id,
                            )
                            in coord_cstr
                        )
                        assert nb_a_period <= constraint.target_value
                elif constraint.operator == ConstraintOperator.EQUAL:
                    i = 0
                    while i < len(coord) - constraint.target_value:
                        a = next(
                            (
                                a
                                for a in out.assignments
                                if (a.worker_id, a.date, a.shift_id) == coord[i]
                            ),
                            None,
                        )
                        if a is not None:
                            nb_a_period = 1
                            for j in range(1, len(coord) - i):
                                a = next(
                                    (
                                        a
                                        for a in out.assignments
                                        if (a.worker_id, a.date, a.shift_id)
                                        == coord[i + j]
                                    ),
                                    None,
                                )
                                if a is not None:
                                    nb_a_period += 1
                                else:
                                    break
                            assert nb_a_period == constraint.target_value
                            i += nb_a_period
                        else:
                            i += 1
                elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
                    i = 0
                    while i < len(coord) - constraint.target_value:
                        a = next(
                            (
                                a
                                for a in out.assignments
                                if (a.worker_id, a.date, a.shift_id) == coord[i]
                            ),
                            None,
                        )
                        if a is not None:
                            nb_a_period = 1
                            for j in range(1, len(coord) - i):
                                a = next(
                                    (
                                        a
                                        for a in out.assignments
                                        if (a.worker_id, a.date, a.shift_id)
                                        == coord[i + j]
                                    ),
                                    None,
                                )
                                if a is not None:
                                    nb_a_period += 1
                                else:
                                    break
                            assert nb_a_period >= constraint.target_value
                            i += nb_a_period
                        else:
                            i += 1
        else:
            assert False

        # Check breach soft constraint
        breaches = _parse_breaches_engine(engine_inputs.schedule, out.breaches)
        if constraint_soft.operator == ConstraintOperator.LESS_THAN_OR_EQUAL:
            assert len(breaches) == 1
        for breach in breaches:
            assert breach.objective_id == constraint_soft.id
            b_vars = [
                (var.worker_id, var.date.isoformat(), var.shift_id)
                for var in breach.variables
            ]
            assert any(
                all(v in c_vars for v in b_vars)
                for c_vars in constraint.constraint_variables
            )

        # # Check objective value
        obj_value = 0
        penalty = engine_inputs.penalties.user_constraint.seq.soft
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

    # pylint: disable=too-many-arguments
    def test_constraint_seq_hard_hard_conflic_obj_value(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_seq_with_expected_output: tuple[
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
        cba, c_fixture = constraint_seq_with_expected_output
        engine_inputs.cbs_augmented = [cba]
        shift_target_id = c_fixture.constraint_variables[0][0][2]

        request = Request(
            id="req_1",
            team_id="t0",
            shift_id=None,
            shift_options=[
                ShiftWorkerOption(
                    name=shift_target_id,
                    id=shift_target_id,
                    id_type=SWOIdTypes.SHIFT,
                    is_bool_dim=False,
                    category_name=shift_target_id,
                )
            ],
            worker_id=c_fixture.constraint_variables[0][0][0],
            start_date=date.fromisoformat(c_fixture.constraint_variables[0][0][1]),
            end_date=date.fromisoformat(c_fixture.constraint_variables[0][0][1]),
            negative=False,
            hard=True,
            status=RequestStatus.DEFERRED,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=UTC),
        )
        engine_inputs.requests_work = requests_to_requests_augmented(
            requests=[request],
            workers=engine_inputs.workers,
            shifts=engine_inputs.shifts,
            dimensions=engine_inputs.dimensions,
            dim_entries=engine_inputs.dim_entries,
            attributes=engine_inputs.attributes,
        )

        inputs, _ = run_core_to_engine_inputs(engine_inputs)

        assert len(inputs.user_constraints.seq) == 1
        assert isinstance(inputs.user_constraints.seq[0], ConstraintSeq)

        constraint: ConstraintSeq = inputs.user_constraints.seq[0]
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

        inputs.user_constraints.seq.append(constraint_hard_copy)
        inputs.model_config.solver_params.max_time_in_seconds = 10

        out = run_engine_solve(inputs)

        # Check objective value
        breaches = _parse_breaches_engine(engine_inputs.schedule, out.breaches)
        obj_value = 0
        penalty = engine_inputs.penalties.user_constraint.seq.hard
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


def test_constraint_seq_effective_period(
    penalties_fix: Penalties,
    model_config_fix: ModelConfig,
    run_engine_solve_from_engine_inputs: Callable[
        [EngineInputsAugmented], Outputs
    ],
) -> None:
    ei = build_ei_seq_effective_period(penalties_fix, model_config_fix)

    ei.as_campaign_fixed.append(
        _fixed_assignment(ei, "w0", date(2026, 1, 1), "s_morning")
    )
    ei.as_campaign_fixed.append(
        _fixed_assignment(ei, "w0", date(2026, 1, 2), "s_morning")
    )
    ei.as_campaign_fixed.append(
        _fixed_assignment(ei, "w0", date(2026, 1, 5), "s_morning")
    )

    out = run_engine_solve_from_engine_inputs(ei)
    assert out is not None

    breaches = _parse_breaches_engine(ei.schedule, out.breaches)
    assert len(breaches) >= 1
    assert any(b.objective_id == "c_seq_period" for b in breaches)

    all_breach_dates = {v.date for b in breaches for v in b.variables}
    assert date(2026, 1, 2) in all_breach_dates
    assert date(2026, 1, 5) not in all_breach_dates
