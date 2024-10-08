import json
import os
from datetime import date, datetime, timedelta
from typing import Callable, List

import pytest

from engine.model.utils.model_utils import get_nested_value
from engine.tests.engine_test import TestEngine

# pylint: disable=unused-import
from engine.tests.test_mode_fixture_test import set_test_mode  # noqa: F401
from engine.types.input_output_types import (
    Constraint,
    Inputs,
    Outputs,
    Request,
    ShiftDemand,
    VarDay,
    VarShift,
    VarWorker,
)
from utils.constants import Constants


# pylint: disable=R0801
class TestConstraint:
    @pytest.fixture
    def constraint_fil_hard(self) -> Constraint:
        return Constraint(
            id="constraint_fil_hard",
            constraint_type="fil",
            operator="no",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(
                selector="equal", target=["w0", "w1"], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                selector="equal",
                target=["s0", "s1"],
                reference=[],
                relative=[],
            ),
            hard=True,
            hard_to_soft=False,
            penalty=0,
        )

    @pytest.fixture
    def constraint_fil_soft(self) -> Constraint:
        return Constraint(
            id="constraint_fil_soft",
            constraint_type="fil",
            operator="no",
            target_value=0,
            target_unit="",
            worker_var=VarWorker(
                selector="equal", target=["w0", "w1"], num_eligible_workers=0
            ),
            day_var=VarDay(
                selector="all",
                target=0,
                start_date=date.today(),
                end_date=date.today(),
                interval=0,
            ),
            shift_var=VarShift(
                selector="equal",
                target=["s0", "s1"],
                reference=[],
                relative=[],
            ),
            hard=False,
            hard_to_soft=False,
            penalty=20,
        )

    @pytest.fixture
    def penalty(self) -> int:
        current_path = os.path.dirname(os.path.realpath(__file__))
        parent_path = os.path.dirname(current_path)
        model_config_file_path = os.path.join(parent_path, "model_config.json")
        with open(model_config_file_path, "r", encoding="utf-8") as penalties_file:
            model_config = json.load(penalties_file)
        return get_nested_value(
            model_config,
            [
                "penalties",
                "user_constraint",
                "fil",
                "soft",
            ],
        )


class TestConstraintHard(TestEngine, TestConstraint):
    def test_expected_assignment_worker_in_target_shift_in_target(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_hard: Constraint,
    ) -> None:
        # No worker w0 or w1 should be assigned to shift s0 or s1
        # = Worker w0 and w1 should not be assigned to shift s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w0",
                shift_id="s0",
                date=date.fromisoformat("2023-10-02"),
                hard=False,
                hard_to_soft=False,
                penalty=1,
            )
        ]

        inputs.requests = requests
        inputs.constraints = [constraint_fil_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assignments_target_w = [
            assignment
            for assignment in assignments
            if assignment.worker_id in constraint_fil_hard.worker_var.target
        ]

        assert all(
            assignment.shift_id not in constraint_fil_hard.shift_var.target
            for assignment in assignments_target_w
        )
        assert outputs.objective_value == 1

    def test_expected_assignment_worker_in_target_shift_out_target(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_hard: Constraint,
    ) -> None:
        # No worker w0 or w1 should be assigned to shift other than s0 or s1
        # = Worker w0 and w1 should be assigned to shift s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w0",
                shift_id="s2",
                date=date.fromisoformat("2023-10-02"),
                hard=False,
                hard_to_soft=False,
                penalty=1,
            )
        ]

        inputs.requests = requests
        constraint_fil_hard.operator = "yes"
        inputs.constraints = [constraint_fil_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assignments_target_w = [
            assignment
            for assignment in assignments
            if assignment.worker_id in constraint_fil_hard.worker_var.target
        ]

        assert all(
            assignment.shift_id in constraint_fil_hard.shift_var.target
            for assignment in assignments_target_w
        )
        assert outputs.objective_value == 1

    def test_expected_assignment_worker_out_target_shift_in_target(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_hard: Constraint,
    ) -> None:
        # Worker other than w0 and w1 should be assigned to shift other than s0 or s1
        # = Workers w2, w3, w4, w5, w6, w7 should not work s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w2",
                shift_id="s0",
                date=date.fromisoformat("2023-10-02"),
                hard=False,
                hard_to_soft=False,
                penalty=1,
            )
        ]

        inputs.requests = requests
        constraint_fil_hard.worker_var.target = [
            "w2",
            "w3",
            "w4",
            "w5",
            "w6",
            "w7",
        ]
        inputs.constraints = [constraint_fil_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assignments_target_w = [
            assignment
            for assignment in assignments
            if assignment.worker_id in constraint_fil_hard.worker_var.target
        ]

        assert all(
            assignment.shift_id not in constraint_fil_hard.shift_var.target
            for assignment in assignments_target_w
        )
        assert outputs.objective_value == 1

    def test_expected_assignment_worker_out_target_shift_out_target(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_hard: Constraint,
    ) -> None:
        # Worker other than w0 and w1 should be assigned to shift s0 or s1
        # = Workers w2, w3, w4, w5, w6, w7 should only work s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w2",
                shift_id="s2",
                date=date.fromisoformat("2023-10-02"),
                hard=False,
                hard_to_soft=False,
                penalty=1,
            )
        ]

        inputs.requests = requests
        constraint_fil_hard.operator = "yes"
        constraint_fil_hard.worker_var.target = [
            "w2",
            "w3",
            "w4",
            "w5",
            "w6",
            "w7",
        ]
        inputs.constraints = [constraint_fil_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assignments_target_w = [
            assignment
            for assignment in assignments
            if assignment.worker_id in constraint_fil_hard.worker_var.target
        ]

        assert all(
            assignment.shift_id in constraint_fil_hard.shift_var.target
            for assignment in assignments_target_w
        )
        assert outputs.objective_value == 1


class TestConstraintSoft(TestEngine, TestConstraint):
    def test_expected_assignment_worker_in_target_shift_in_target(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_soft: Constraint,
    ) -> None:
        # No worker w0 or w1 should work shift s0 or s1
        # = Worker w0 and w1 should not work shift s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w0",
                shift_id="s0",
                date=date.fromisoformat("2023-10-02"),
                hard=False,
                hard_to_soft=False,
                penalty=1,
            )
        ]

        inputs.requests = requests
        inputs.constraints = [constraint_fil_soft]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assignments_target_w = [
            assignment
            for assignment in assignments
            if assignment.worker_id in constraint_fil_soft.worker_var.target
        ]

        assert all(
            assignment.shift_id not in constraint_fil_soft.shift_var.target
            for assignment in assignments_target_w
        )
        assert outputs.objective_value == 1

    def test_expected_assignment_worker_in_target_shift_out_target(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_soft: Constraint,
    ) -> None:
        # No worker w0 or w1 should be assigned to shift other than s0 or s1
        # = Worker w0 and w1 should only work shift s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w0",
                shift_id="s2",
                date=date.fromisoformat("2023-10-02"),
                hard=False,
                hard_to_soft=False,
                penalty=1,
            )
        ]

        inputs.requests = requests
        constraint_fil_soft.operator = "yes"
        inputs.constraints = [constraint_fil_soft]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assignments_target_w = [
            assignment
            for assignment in assignments
            if assignment.worker_id in constraint_fil_soft.worker_var.target
        ]

        assert all(
            assignment.shift_id in constraint_fil_soft.shift_var.target
            for assignment in assignments_target_w
        )
        assert outputs.objective_value == 1

    def test_expected_assignment_worker_out_target_shift_in_target(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_soft: Constraint,
    ) -> None:
        # Worker other than w0 and w1 should be assigned to shift other than s0 or s1
        # = Workers w2, w3, w4, w5, w6, w7 should not work s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w2",
                shift_id="s0",
                date=date.fromisoformat("2023-10-02"),
                hard=False,
                hard_to_soft=False,
                penalty=1,
            )
        ]

        inputs.requests = requests
        constraint_fil_soft.worker_var.target = [
            "w2",
            "w3",
            "w4",
            "w5",
            "w6",
            "w7",
        ]
        inputs.constraints = [constraint_fil_soft]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assignments_target_w = [
            assignment
            for assignment in assignments
            if assignment.worker_id in constraint_fil_soft.worker_var.target
        ]

        assert all(
            assignment.shift_id not in constraint_fil_soft.shift_var.target
            for assignment in assignments_target_w
        )
        assert outputs.objective_value == 1

    def test_expected_assignment_worker_out_target_shift_out_target(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_soft: Constraint,
    ) -> None:
        # Worker other than w0 and w1 should be assigned to shift s0 or s1
        # = Workers w2, w3, w4, w5, w6, w7 should only work s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w2",
                shift_id="s2",
                date=date.fromisoformat("2023-10-02"),
                hard=False,
                hard_to_soft=False,
                penalty=1,
            )
        ]

        inputs.requests = requests
        constraint_fil_soft.worker_var.target = [
            "w2",
            "w3",
            "w4",
            "w5",
            "w6",
            "w7",
        ]
        constraint_fil_soft.operator = "yes"
        inputs.constraints = [constraint_fil_soft]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assignments_target_w = [
            assignment
            for assignment in assignments
            if assignment.worker_id in constraint_fil_soft.worker_var.target
        ]

        assert all(
            assignment.shift_id in constraint_fil_soft.shift_var.target
            for assignment in assignments_target_w
        )
        assert outputs.objective_value == 1

    def test_expected_assignment_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_hard: Constraint,
        constraint_fil_soft: Constraint,
    ) -> None:
        # Worker w0 and w1 should only work shift s0 or s1 (hard)
        # Worker w0 and w1 should not work shift s0 or s1 (soft)
        constraint_fil_hard.operator = "yes"
        inputs.constraints = [
            constraint_fil_hard,
            constraint_fil_soft,
        ]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assignments_target_w = [
            assignment
            for assignment in assignments
            if assignment.worker_id in constraint_fil_hard.worker_var.target
        ]

        assert all(
            assignment.shift_id in constraint_fil_hard.shift_var.target
            for assignment in assignments_target_w
        )

    # pylint: disable=too-many-arguments
    def test_expected_objective_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_hard: Constraint,
        constraint_fil_soft: Constraint,
        penalty: int,
    ) -> None:
        # Worker w0 and w1 should not work shift s0 or s1 (hard)
        # Worker w0 and w1 should only work shift s0 or s1 (soft)
        constraint_fil_hard.operator = "yes"
        inputs.constraints = [
            constraint_fil_hard,
            constraint_fil_soft,
        ]
        inputs.coverage.coverage = [
            ShiftDemand(
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                staffing=len(
                    [w for w in inputs.variable_space.workers if not w.deleted]
                ),
            )
        ]
        outputs = engine_solve(inputs)

        assert outputs.objective_value == penalty * len(
            constraint_fil_soft.worker_var.target
        )

    def test_expected_constraint_breaches_variables_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_hard: Constraint,
        constraint_fil_soft: Constraint,
    ) -> None:
        # Worker w0 and w1 should not work shift s0 or s1 (hard)
        # Worker w0 and w1 should only work shift s0 or s1 (soft)
        constraint_fil_soft.operator = "yes"
        inputs.constraints = [
            constraint_fil_hard,
            constraint_fil_soft,
        ]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        expected_variables = [
            (w, d, a.shift_id)
            for a in assignments
            for w in constraint_fil_soft.worker_var.target
            for d in [
                datetime.strptime(d, Constants.ENGINE_STRING_DATE_FORMAT).date()
                for d in inputs.variable_space.all_days
            ]
            if a.worker_id == w and a.date == d
        ]

        # all constraint_breaches' variables are in expected_variables
        assert all(
            cb_variable in expected_variables
            for cb in outputs.constraint_breaches
            for cb_variable in cb.variables
        )
        # all expected_variables are in constraint_breaches' variables
        assert all(
            any(exp_variable in cb.variables for cb in outputs.constraint_breaches)
            for exp_variable in expected_variables
        )

    def test_expected_constraint_breaches_value_diff_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_hard: Constraint,
        constraint_fil_soft: Constraint,
    ) -> None:
        # Worker w0 and w1 should not work shift s0 or s1 (hard)
        # Worker w0 and w1 should only work shift s0 or s1 (soft)
        constraint_fil_soft.operator = "yes"
        inputs.constraints = [
            constraint_fil_hard,
            constraint_fil_soft,
        ]
        outputs = engine_solve(inputs)

        assert all(cb.value_diff == 1 for cb in outputs.constraint_breaches)


def build_day_list(start_date: date, end_date: date) -> List[date]:
    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]
