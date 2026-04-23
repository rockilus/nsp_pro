from collections.abc import Callable
from copy import deepcopy
from datetime import UTC, date, datetime, timedelta

import pytest
from shared.augment import requests_to_requests_augmented
from shared.schemas.core import (
    Block,
    BlockNameOptions,
    BlockTypeOptions,
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
    Request,
    RequestStatus,
    ShiftWorkerOption,
    SolveScope,
    SolveScopeType,
    SWOIdTypes,
)
from shared.schemas.core.request import FulfillmentStatus, RequestType

from core_to_engine_service import core_to_engine_inputs
from engine import Inputs as InputsEngine
from engine import Outputs, ProcessingCache
from engine.engine import Engine
from engine_to_core_service.build_breaches.build_breaches import build_breaches
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from engine_to_core_service.build_campaign_assignments import (
    build_campaign_assignments,
)
from tests.engine_tests.constraint_ord_fixture import build_ei_scoped


class TestConstraintOrd:
    def test_constraint_ord_hard(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_ord_with_expected_output: tuple[
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
        constraint_ord_with_expected_output: tuple[
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
        constraint_ord_with_expected_output: tuple[
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
        constraint_ord_with_expected_output: tuple[
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


class TestConstraintOrdWithFixture:
    @pytest.fixture
    def ei_scoped(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> EngineInputsAugmented:
        return build_ei_scoped(penalties_fix, model_config_fix)

    def test_constraint_ord_duty_then_off_1_day_before(
        self, ei_scoped: EngineInputsAugmented
    ) -> None:
        test_cba = ConstraintBuildAugmented(
            id="c_ord_0",
            team_id="t0",
            constraint_type=ConstraintType.ORD,
            template_id="4",
            language="fr",
            blocks=[
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="Si",
                ),
                Block(
                    name=BlockNameOptions.SHIFT_REFERENCE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name=True,
                            id="",
                            id_type=SWOIdTypes.DUTY,
                            is_bool_dim=True,
                            category_name="Duties",
                        ),
                    ],
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="le",
                ),
                Block(
                    name=BlockNameOptions.WEEKDAY,
                    type=BlockTypeOptions.STRING,
                    value="friday",
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="alors",
                ),
                Block(
                    name=BlockNameOptions.SHIFT_RELATIVE,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="Off",
                            id="s_off",
                            id_type=SWOIdTypes.SHIFT,
                            is_bool_dim=False,
                            category_name="Shifts",
                        ),
                    ],
                ),
                Block(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    value=1,
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="jour",
                ),
                Block(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    value="before",
                ),
                Block(
                    name=BlockNameOptions.TEXT,
                    type=BlockTypeOptions.STRING,
                    value="pour",
                ),
                Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="all workers",
                            id="",
                            id_type=SWOIdTypes.NONE,
                            is_bool_dim=False,
                            category_name="All",
                        ),
                    ],
                ),
            ],
            text="",
            hard=True,
            priority="medium",
            active=True,
            missing_attributes=[],
        )
        ei_scoped.cbs_augmented = [test_cba]
        scope = SolveScope(scope_type=SolveScopeType.DUTIES)

        inputs, processing_cache = core_to_engine_inputs(
            engine_inputs=ei_scoped, solve_scope=scope
        )
        engine = Engine()
        outputs = engine.solve(inputs)
        # outputs = engine_solve_engine_inputs(ei_scoped, solve_scope=scope)

        assert outputs.is_solution is True

        assignments = build_campaign_assignments(
            schedule=ei_scoped.schedule, as_engine=outputs.assignments
        )
        build_breaches(
            schedule=ei_scoped.schedule,
            workers=ei_scoped.workers,
            shifts=ei_scoped.shifts,
            link_shifts=ei_scoped.link_shifts,
            daily_shift_demand=ei_scoped.shift_demands,
            assignments=assignments,
            requests=ei_scoped.requests_work,
            breaches_engine=outputs.breaches,
            processing_cache=processing_cache,
            outputs=outputs,
            engine_inputs=ei_scoped,
            inputs=inputs,
        )

        # Find all duty demands that fall on a Friday inside the campaign
        friday_demands = [
            d
            for d in ei_scoped.shift_demands
            if d.shift_id == "s_duty"
            and d.date.weekday() == 4
            and ei_scoped.schedule.start_date <= d.date <= ei_scoped.schedule.end_date
            and ei_scoped.schedule.start_date
            <= d.date - timedelta(days=1)
            <= ei_scoped.schedule.end_date
        ]

        # Ensure our test campaign contains at least one such demand
        assert len(friday_demands) > 0, (
            "Test campaign contains no Friday duty demands with the previous day also in the campaign"
        )

        # Check that the Friday demand and the previous day are inside the campaign
        for demand in friday_demands:
            prev_day = demand.date - timedelta(days=1)
            # For each validated demand: a duty should be assigned and the same worker
            # should have an off shift the day before
            a_duty = next(
                (
                    a
                    for a in outputs.assignments
                    if a.date == demand.date and a.shift_id == "s_duty"
                ),
                None,
            )
            assert a_duty is not None

            a_off = next(
                (
                    a
                    for a in outputs.assignments
                    if a.worker_id == a_duty.worker_id
                    and a.date == prev_day
                    and a.shift_id == "s_off"
                ),
                None,
            )
            assert a_off is not None
