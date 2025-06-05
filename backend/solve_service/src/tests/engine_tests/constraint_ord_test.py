from copy import deepcopy
from datetime import date, datetime, timezone
from typing import Callable, Tuple

from shared.augment import requests_to_requests_augmented
from shared.schemas.core import (
    ConstraintBuildAugmented,
    ConstraintFai,
    ConstraintFil,
    ConstraintOperator,
    ConstraintOrd,
    ConstraintSeq,
    ConstraintSum,
    EngineInputsAugmented,
    Request,
    RequestStatus,
    ShiftWorkerOption,
    SWOIdTypes,
)
from shared.schemas.core.request import FulfillmentStatus, RequestType

from engine import Inputs as InputsEngine
from engine import Outputs, ProcessingCache
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)


# pylint: disable=R0801
class TestConstraintOrd:
    def test_constraint_ord_hard(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_ord_with_expected_output: Tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_engine_solve_from_engine_inputs: Callable[[EngineInputsAugmented], Outputs],
    ) -> None:
        cba, constraint = constraint_ord_with_expected_output
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
            status=RequestStatus.PENDING,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
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

        if isinstance(constraint, ConstraintOrd):
            for var_ref, var_rel in constraint.constraint_variables:
                coord_ref = (
                    var_ref[0],
                    date.fromisoformat(var_ref[1]),
                    var_ref[2],
                )
                coord_rel = (
                    var_rel[0],
                    date.fromisoformat(var_rel[1]),
                    var_rel[2],
                )
                a_ref = next(
                    (
                        a
                        for a in out.assignments
                        if (
                            a.worker_id,
                            a.date,
                            a.shift_id,
                        )
                        == coord_ref
                    ),
                    None,
                )
                if a_ref is not None:
                    a_rel = next(
                        (
                            a
                            for a in out.assignments
                            if (
                                a.worker_id,
                                a.date,
                                a.shift_id,
                            )
                            == coord_rel
                        ),
                        None,
                    )
                    if constraint.operator == ConstraintOperator.YES:
                        assert a_rel is not None
                    elif constraint.operator == ConstraintOperator.NO:
                        assert a_rel is None

        else:
            assert False

    # pylint: disable=too-many-locals
    def test_constraint_ord_soft(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_ord_with_expected_output: Tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_engine_solve_from_engine_inputs: Callable[[EngineInputsAugmented], Outputs],
    ) -> None:
        cba, constraint = constraint_ord_with_expected_output
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
            status=RequestStatus.PENDING,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
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

        if isinstance(constraint, ConstraintOrd):
            for var_ref, var_rel in constraint.constraint_variables:
                coord_ref = (
                    var_ref[0],
                    date.fromisoformat(var_ref[1]),
                    var_ref[2],
                )
                coord_rel = (
                    var_rel[0],
                    date.fromisoformat(var_rel[1]),
                    var_rel[2],
                )
                a_ref = next(
                    (
                        a
                        for a in out.assignments
                        if (
                            a.worker_id,
                            a.date,
                            a.shift_id,
                        )
                        == coord_ref
                    ),
                    None,
                )
                if a_ref is not None:
                    a_rel = next(
                        (
                            a
                            for a in out.assignments
                            if (
                                a.worker_id,
                                a.date,
                                a.shift_id,
                            )
                            == coord_rel
                        ),
                        None,
                    )
                    if constraint.operator == ConstraintOperator.YES:
                        assert a_rel is not None
                    elif constraint.operator == ConstraintOperator.NO:
                        assert a_rel is None

        else:
            assert False

    # pylint: disable=too-many-locals, too-many-arguments
    def test_constraint_ord_hard_soft_conflict(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_ord_with_expected_output: Tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        cba, c_fixture = constraint_ord_with_expected_output
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
            status=RequestStatus.PENDING,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
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

        assert len(inputs.user_constraints.ord) == 1
        assert isinstance(inputs.user_constraints.ord[0], ConstraintOrd)

        constraint: ConstraintOrd = inputs.user_constraints.ord[0]
        constraint_soft = deepcopy(constraint)
        constraint_soft.id += "_soft"
        constraint_soft.hard = False
        constraint_soft.penalty = engine_inputs.penalties.user_constraint.ord.soft

        if constraint.operator == ConstraintOperator.YES:
            constraint_soft.operator = ConstraintOperator.NO
        elif constraint.operator == ConstraintOperator.NO:
            constraint_soft.operator = ConstraintOperator.YES

        inputs.user_constraints.ord.append(constraint_soft)

        out = run_engine_solve(inputs)

        # Check assignments hard constraint
        if isinstance(constraint, ConstraintOrd):
            for var_ref, var_rel in constraint.constraint_variables:
                coord_ref = (
                    var_ref[0],
                    date.fromisoformat(var_ref[1]),
                    var_ref[2],
                )
                coord_rel = (
                    var_rel[0],
                    date.fromisoformat(var_rel[1]),
                    var_rel[2],
                )
                a_ref = next(
                    (
                        a
                        for a in out.assignments
                        if (
                            a.worker_id,
                            a.date,
                            a.shift_id,
                        )
                        == coord_ref
                    ),
                    None,
                )
                if a_ref is not None:
                    a_rel = next(
                        (
                            a
                            for a in out.assignments
                            if (
                                a.worker_id,
                                a.date,
                                a.shift_id,
                            )
                            == coord_rel
                        ),
                        None,
                    )
                    if constraint.operator == ConstraintOperator.YES:
                        assert a_rel is not None
                    elif constraint.operator == ConstraintOperator.NO:
                        assert a_rel is None

        else:
            assert False

        # Check breach soft constraint
        breaches = _parse_breaches_engine(engine_inputs.schedule, out.breaches)
        assert len(breaches) == 1
        for breach in breaches:
            assert breach.objective_id == constraint_soft.id
            b_vars = tuple(
                (var.worker_id, var.date.isoformat(), var.shift_id)
                for var in breach.variables
            )
            assert b_vars in constraint_soft.constraint_variables

        # # Check objective value
        penalty = engine_inputs.penalties.user_constraint.ord.soft
        assert out.objective_value == penalty * len(breaches)

    # pylint: disable=too-many-arguments
    def test_constraint_ord_hard_hard_conflic_obj_value(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_ord_with_expected_output: Tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_core_to_engine_inputs: Callable[
            [EngineInputsAugmented], Tuple[InputsEngine, ProcessingCache]
        ],
        run_engine_solve: Callable[[InputsEngine], Outputs],
    ) -> None:
        cba, c_fixture = constraint_ord_with_expected_output
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
            status=RequestStatus.PENDING,
            request_type=RequestType.WORK_DEMAND,
            fulfillment=FulfillmentStatus.NOT_PROCESSED,
            comment="",
            created_at=datetime.now(tz=timezone.utc),
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

        assert len(inputs.user_constraints.ord) == 1
        assert isinstance(inputs.user_constraints.ord[0], ConstraintOrd)

        constraint: ConstraintOrd = inputs.user_constraints.ord[0]
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

        inputs.user_constraints.ord.append(constraint_hard_copy)

        out = run_engine_solve(inputs)

        # Check objective value
        breaches = _parse_breaches_engine(engine_inputs.schedule, out.breaches)
        penalty = engine_inputs.penalties.user_constraint.ord.hard
        assert out.objective_value == penalty * len(breaches)
