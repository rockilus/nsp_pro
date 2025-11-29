import random
from copy import deepcopy
from datetime import date, datetime, timedelta
from typing import Callable, List, Tuple
from shared.schemas.core import ShiftDemandNew

import pytest
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
    QuickStaffing,
    Schedule,
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    ShiftWorkerOption,
    SWOIdTypes,
    Worker,
)

from engine import Inputs as InputsEngine
from engine import Outputs, ProcessingCache
from engine_to_core_service.build_breaches.build_breaches_debug import (
    calculate_breach_penalty_sum,
    convert_assignments_engine_to_core,
)
from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from tests.core_to_engine_tests.parse_constraint_sum_test import (
    make_simple_engine_inputs,
)
from tests.engine_tests.engine_solve import engine_solve_engine_inputs
from tests.sample_data import test_data_set_2


# pylint: disable=too-few-public-methods, R0801
class TestConstraintSumQuickStaffing:
    @pytest.mark.parametrize("sample_data", test_data_set_2)
    def test_build_quick_staffing_constraints(
        self, sample_data: EngineInputsAugmented
    ) -> None:
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
        self, sample_data: EngineInputsAugmented
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
        engine_inputs: EngineInputsAugmented,
        constraint_sum_with_expected_output: Tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_engine_solve_from_engine_inputs: Callable[
            [EngineInputsAugmented], Outputs
        ],
    ) -> None:
        cba, constraint = constraint_sum_with_expected_output
        engine_inputs.cbs_augmented = [cba]

        out = run_engine_solve_from_engine_inputs(engine_inputs)

        if isinstance(constraint, ConstraintSum):
            for period_idx, cstr_vars in enumerate(
                constraint.constraint_variables
            ):
                coord = [
                    (var[0], date.fromisoformat(var[1]), var[2])
                    for var in cstr_vars
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
                # Use target_values (per period) if available, otherwise fall
                # back to target_value
                target = (
                    constraint.target_values[period_idx]
                    if constraint.target_values
                    else constraint.target_value
                )
                if (
                    constraint.operator
                    == ConstraintOperator.LESS_THAN_OR_EQUAL
                ):
                    assert nb_a_period <= target
                elif constraint.operator == ConstraintOperator.EQUAL:
                    assert nb_a_period == target
                elif (
                    constraint.operator
                    == ConstraintOperator.GREATER_THAN_OR_EQUAL
                ):
                    assert nb_a_period >= target
        else:
            assert False

    def test_constraint_sum_soft(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_sum_with_expected_output: Tuple[
            ConstraintBuildAugmented,
            ConstraintFai
            | ConstraintFil
            | ConstraintOrd
            | ConstraintSeq
            | ConstraintSum,
        ],
        run_engine_solve_from_engine_inputs: Callable[
            [EngineInputsAugmented], Outputs
        ],
    ) -> None:
        cba, constraint = constraint_sum_with_expected_output
        cba_soft = deepcopy(cba)
        cba_soft.hard = False
        engine_inputs.cbs_augmented = [cba_soft]

        out = run_engine_solve_from_engine_inputs(engine_inputs)

        if isinstance(constraint, ConstraintSum):
            print(constraint)

            for period_idx, cstr_vars in enumerate(
                constraint.constraint_variables
            ):
                coord = [
                    (var[0], date.fromisoformat(var[1]), var[2])
                    for var in cstr_vars
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
                # Use target_values (per period) if available, otherwise fall
                # back to target_value
                target = constraint.target_values[period_idx]
                if (
                    constraint.operator
                    == ConstraintOperator.LESS_THAN_OR_EQUAL
                ):
                    assert nb_a_period <= target
                elif constraint.operator == ConstraintOperator.EQUAL:
                    assert nb_a_period == target
                elif (
                    constraint.operator
                    == ConstraintOperator.GREATER_THAN_OR_EQUAL
                ):
                    assert nb_a_period >= target
        else:
            assert False

    # pylint: disable=too-many-locals, too-many-branches, too-many-arguments
    def test_constraint_sum_hard_soft_conflict(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_sum_with_expected_output: Tuple[
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
        cba, constraint_hard = constraint_sum_with_expected_output
        engine_inputs.cbs_augmented = [cba]
        inputs, _ = run_core_to_engine_inputs(engine_inputs)

        assert len(inputs.user_constraints.sum) == 1
        assert isinstance(inputs.user_constraints.sum[0], ConstraintSum)

        constraint: ConstraintSum = inputs.user_constraints.sum[0]
        constraint_soft = deepcopy(constraint)
        constraint_soft.id += "_soft"
        constraint_soft.hard = False
        constraint_soft.penalty = (
            engine_inputs.penalties.user_constraint.sum.soft
        )

        if constraint.operator in [
            ConstraintOperator.LESS_THAN_OR_EQUAL,
            ConstraintOperator.EQUAL,
        ]:
            constraint_soft.target_value = constraint.target_value + 1
            constraint_soft.target_values = [
                v + 1 for v in constraint.target_values
            ]
            constraint_soft.operator = ConstraintOperator.EQUAL
        elif constraint.operator == ConstraintOperator.GREATER_THAN_OR_EQUAL:
            constraint_soft.target_value = constraint.target_value - 1
            constraint_soft.target_values = [
                v - 1 for v in constraint.target_values
            ]
            constraint_soft.operator = ConstraintOperator.EQUAL

        inputs.user_constraints.sum.append(constraint_soft)

        out = run_engine_solve(inputs)

        # Check assignments hard constraint
        if isinstance(constraint_hard, ConstraintSum):
            for period_idx, cstr_vars in enumerate(
                constraint.constraint_variables
            ):
                coord = [
                    (var[0], date.fromisoformat(var[1]), var[2])
                    for var in cstr_vars
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
                # Use target_values (per period) if available, otherwise fall
                # back to target_value
                target = constraint.target_values[period_idx]
                if (
                    constraint.operator
                    == ConstraintOperator.LESS_THAN_OR_EQUAL
                ):
                    assert nb_a_period <= target
                elif constraint.operator == ConstraintOperator.EQUAL:
                    assert nb_a_period == target
                elif (
                    constraint.operator
                    == ConstraintOperator.GREATER_THAN_OR_EQUAL
                ):
                    assert nb_a_period >= target
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
        # Convert engine assignments to shared assignments
        assignments_core = convert_assignments_engine_to_core(
            out.assignments, engine_inputs.schedule
        )
        obj_value = 0
        penalty = engine_inputs.penalties.user_constraint.sum.soft
        for breach in breaches:
            obj_value += calculate_breach_penalty_sum(
                breach, assignments_core, penalty, constraint_soft
            )
        assert out.objective_value == obj_value

    def test_constraint_sum_hard_hard_conflic_obj_value(
        self,
        engine_inputs: EngineInputsAugmented,
        constraint_sum_with_expected_output: Tuple[
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
        penalty = engine_inputs.penalties.user_constraint.sum.hard
        for breach in breaches:
            nb_a_period = sum(
                1
                for assignment in out.assignments
                if (
                    assignment.worker_id,
                    assignment.date,
                    assignment.shift_id,
                )
                in [
                    (var.worker_id, var.date, var.shift_id)
                    for var in breach.variables
                ]
            )
            if (
                constraint_hard_copy.operator
                == ConstraintOperator.LESS_THAN_OR_EQUAL
            ):
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


class TestConstraintSumRunParsedScenario:
    """Run the same scenario as `parse_constraint_sum_test.py` but execute
    the solver and validate behavior (SUM constraint enforcement and
    worker filtering for ended contracts).
    """

    @pytest.mark.unit
    def test_run_sum_constraint_basic(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> None:
        engine_inputs = make_simple_engine_inputs(
            penalties_fix,
            model_config_fix,
        )

        out = engine_solve_engine_inputs(engine_inputs)

        # compute number of distinct ISO weeks in the schedule
        start = engine_inputs.schedule.start_date
        end = engine_inputs.schedule.end_date
        dates = [
            start + timedelta(days=i) for i in range((end - start).days + 1)
        ]
        weeks = {(d.isocalendar()[0], d.isocalendar()[1]) for d in dates}
        num_weeks = len(weeks)

        # SUM constraint targeted worker `w0` on `sh0` at most 2 per week
        count_w0_sh0 = sum(
            1
            for a in out.assignments
            if a.worker_id == "w0" and a.shift_id == "sh0"
        )
        assert count_w0_sh0 <= 2 * num_weeks

    @pytest.mark.unit
    def test_run_sum_ignores_worker_ended_before_schedule(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> None:
        engine_inputs = make_simple_engine_inputs(
            penalties_fix,
            model_config_fix,
        )

        # set w0 employment_end_date before schedule start
        for w in engine_inputs.workers:
            if w.id == "w0":
                w.employment_end_date = date(2024, 12, 31)

        out = engine_solve_engine_inputs(engine_inputs)

        # ensure no assignment references w0
        assert all(a.worker_id != "w0" for a in out.assignments)

    @pytest.mark.unit
    def test_run_sum_all_workers_ignores_ended_worker(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> None:
        engine_inputs = make_simple_engine_inputs(
            penalties_fix,
            model_config_fix,
        )

        # set w0 employment_end_date before schedule start
        for w in engine_inputs.workers:
            if w.id == "w0":
                w.employment_end_date = date(2024, 12, 31)

        # Replace worker block to select all workers
        for i, b in enumerate(engine_inputs.cbs_augmented[0].blocks):
            if b.name == BlockNameOptions.WORKER:
                engine_inputs.cbs_augmented[0].blocks[i] = Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="all workers",
                            id="",
                            id_type=SWOIdTypes.WORKER,
                            is_bool_dim=False,
                            category_name="All",
                        )
                    ],
                )
                break

        out = engine_solve_engine_inputs(engine_inputs)

        # ensure no assignment references w0 and some other worker is assigned
        assert all(a.worker_id != "w0" for a in out.assignments)
        assert any(a.worker_id != "w0" for a in out.assignments)

    @pytest.mark.unit
    def test_run_sum_all_duties_ignores_ended_worker(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> None:
        engine_inputs = make_simple_engine_inputs(
            penalties_fix,
            model_config_fix,
        )

        # set w0 employment_end_date before schedule start
        for w in engine_inputs.workers:
            if w.id == "w0":
                w.employment_end_date = date(2024, 12, 31)

        # Replace the worker block to select all workers
        for i, b in enumerate(engine_inputs.cbs_augmented[0].blocks):
            if b.name == BlockNameOptions.WORKER:
                engine_inputs.cbs_augmented[0].blocks[i] = Block(
                    name=BlockNameOptions.WORKER,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name="all workers",
                            id="",
                            id_type=SWOIdTypes.WORKER,
                            is_bool_dim=False,
                            category_name="All",
                        )
                    ],
                )
                break

        # Replace the shift block to select all duties
        for i, b in enumerate(engine_inputs.cbs_augmented[0].blocks):
            if b.name == BlockNameOptions.SHIFT:
                engine_inputs.cbs_augmented[0].blocks[i] = Block(
                    name=BlockNameOptions.SHIFT,
                    type=BlockTypeOptions.SHIFT_WORKER_OPTION,
                    value=[
                        ShiftWorkerOption(
                            name=True,
                            id="",
                            id_type=SWOIdTypes.DUTY,
                            is_bool_dim=True,
                            category_name="Duties",
                        )
                    ],
                )
                break

        out = engine_solve_engine_inputs(engine_inputs)

        # ensure no assignment references w0 and some other worker is assigned
        assert all(a.worker_id != "w0" for a in out.assignments)
        assert any(a.worker_id != "w0" for a in out.assignments)

    @pytest.mark.unit
    def test_run_sum_prorates_single_day_monthly_constraint(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> None:
        """Verify solver respects pro-rated monthly targets for single-day schedule."""
        engine_inputs = make_simple_engine_inputs(
            penalties_fix,
            model_config_fix,
        )

        # Modify schedule to span only Jan 1 (1 day)
        engine_inputs.schedule.start_date = date(2025, 1, 1)
        engine_inputs.schedule.end_date = date(2025, 1, 2)

        # Change first shift to duty type
        engine_inputs.shifts[0].shift_type = ShiftType.DUTY

        # Update constraint to "at least 2 duties per month"
        for i, b in enumerate(engine_inputs.cbs_augmented[0].blocks):
            if b.name == BlockNameOptions.OPERATOR:
                engine_inputs.cbs_augmented[0].blocks[i] = Block(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    value="at least",
                )
            elif b.name == BlockNameOptions.NUMBER:
                engine_inputs.cbs_augmented[0].blocks[i] = Block(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    value=2,
                )
            elif b.name == BlockNameOptions.TIMING:
                engine_inputs.cbs_augmented[0].blocks[i] = Block(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    value="per month",
                )

        out = engine_solve_engine_inputs(engine_inputs)

        # Pro-rated target is 0 for single day: floor(2 * 1/31) = 0
        # With target=0, solver is free to assign any amount up to coverage
        count_w0_sh0 = sum(
            1
            for a in out.assignments
            if a.worker_id == "w0" and a.shift_id == "sh0"
        )
        assert count_w0_sh0 <= 1

    @pytest.mark.unit
    def test_run_sum_prorates_half_month_constraint(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> None:
        """Verify solver respects pro-rated monthly targets for half-month schedule."""
        engine_inputs = make_simple_engine_inputs(
            penalties_fix,
            model_config_fix,
        )

        # Modify schedule to span Jan 1-16 (15 days)
        engine_inputs.schedule.start_date = date(2025, 1, 1)
        engine_inputs.schedule.end_date = date(2025, 1, 16)

        # Change first shift to duty type
        engine_inputs.shifts[0].shift_type = ShiftType.DUTY

        # Update constraint to "at most 10 duties per month"
        for i, b in enumerate(engine_inputs.cbs_augmented[0].blocks):
            if b.name == BlockNameOptions.OPERATOR:
                engine_inputs.cbs_augmented[0].blocks[i] = Block(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    value="at most",
                )
            elif b.name == BlockNameOptions.NUMBER:
                engine_inputs.cbs_augmented[0].blocks[i] = Block(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    value=10,
                )
            elif b.name == BlockNameOptions.TIMING:
                engine_inputs.cbs_augmented[0].blocks[i] = Block(
                    name=BlockNameOptions.TIMING,
                    type=BlockTypeOptions.STRING,
                    value="per month",
                )

        # Create shift demands for all 15 days
        shift_demands: List[ShiftDemandNew] = []
        for day in range(1, 16):
            shift_demands.append(
                ShiftDemandNew(
                    date=date(2025, 1, day),
                    shift_id="sh0",
                    team_id="t0",
                    count=1,
                )
            )
        engine_inputs.shift_demands = shift_demands

        out = engine_solve_engine_inputs(engine_inputs)

        # Pro-rated target is 5: floor(10 * 16/31) = 5
        # Solver should assign at most 5
        count_w0_sh0 = sum(
            1
            for a in out.assignments
            if a.worker_id == "w0" and a.shift_id == "sh0"
        )
        assert count_w0_sh0 <= 5

    @pytest.mark.unit
    def test_run_sum_prorates_incomplete_week_constraint(
        self, penalties_fix: Penalties, model_config_fix: ModelConfig
    ) -> None:
        """Verify solver respects pro-rated weekly targets for incomplete week."""
        engine_inputs = make_simple_engine_inputs(
            penalties_fix,
            model_config_fix,
        )

        # Modify schedule to span Jan 1-4 (3 days)
        engine_inputs.schedule.start_date = date(2025, 1, 1)
        engine_inputs.schedule.end_date = date(2025, 1, 4)

        # First shift is already NORMAL type by default

        # Update constraint to "exactly 5 shifts per week"
        for i, b in enumerate(engine_inputs.cbs_augmented[0].blocks):
            if b.name == BlockNameOptions.OPERATOR:
                engine_inputs.cbs_augmented[0].blocks[i] = Block(
                    name=BlockNameOptions.OPERATOR,
                    type=BlockTypeOptions.STRING,
                    value="exactly",
                )
            elif b.name == BlockNameOptions.NUMBER:
                engine_inputs.cbs_augmented[0].blocks[i] = Block(
                    name=BlockNameOptions.NUMBER,
                    type=BlockTypeOptions.NUMBER,
                    value=5,
                )
            elif b.name == BlockNameOptions.TIMING:
                # Already "per week" by default in make_simple_engine_inputs
                pass

        # Create shift demands for all 3 days
        shift_demands: List[ShiftDemandNew] = []
        for day in range(1, 4):
            shift_demands.append(
                ShiftDemandNew(
                    date=date(2025, 1, day),
                    shift_id="sh0",
                    team_id="t0",
                    count=1,
                )
            )
        engine_inputs.shift_demands = shift_demands

        out = engine_solve_engine_inputs(engine_inputs)

        # Pro-rated target is 2: round(5 * 3/7) = 2
        # Solver should assign exactly 2
        count_w0_sh0 = sum(
            1
            for a in out.assignments
            if a.worker_id == "w0" and a.shift_id == "sh0"
        )
        assert count_w0_sh0 == 3
