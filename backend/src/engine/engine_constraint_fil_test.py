from datetime import date, timedelta
from typing import Callable, List

import pytest

from engine.engine_test import TestEngine
from engine.inputs_outputs import (
    ConstraintFil,
    Inputs,
    Outputs,
    Request,
    VarFilDay,
    VarFilShift,
    VarFilWorker,
)


# pylint: disable=R0801
class TestConstraintFil:
    @pytest.fixture
    def constraint_fil_hard(self) -> ConstraintFil:
        return ConstraintFil(
            id="constraint_fil_hard",
            worker_var=VarFilWorker(
                operator="in_target", selector="list", target=["w0", "w1"]
            ),
            day_var=VarFilDay(selector="all"),
            shift_var=VarFilShift(
                operator="in_target", selector="list", target=["s0", "s1"]
            ),
            hard=True,
            penalty=0,
        )

    @pytest.fixture
    def constraint_fil_soft(self) -> ConstraintFil:
        return ConstraintFil(
            id="constraint_fil_soft",
            worker_var=VarFilWorker(
                operator="in_target", selector="list", target=["w0", "w1"]
            ),
            day_var=VarFilDay(selector="all"),
            shift_var=VarFilShift(
                operator="in_target", selector="list", target=["s0", "s1"]
            ),
            hard=False,
            penalty=20,
        )


class TestConstraintFilHard(TestEngine, TestConstraintFil):
    def test_expected_assignment_worker_in_target_shift_in_target(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_hard: ConstraintFil,
    ) -> None:
        # No worker w0 or w1 should be assigned to shift s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w0",
                shift_id="s0",
                date=date.fromisoformat("2023-10-02"),
                penalty=1,
            )
        ]

        inputs.requests = requests
        inputs.custom.constraints_fil = [constraint_fil_hard]
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
        constraint_fil_hard: ConstraintFil,
    ) -> None:
        # No worker w0 or w1 should be assigned to shift other than s0 or s1
        # = Worker w0 and w1 should be assigned to shift s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w0",
                shift_id="s2",
                date=date.fromisoformat("2023-10-02"),
                penalty=1,
            )
        ]

        inputs.requests = requests
        constraint_fil_hard.shift_var.operator = "out_target"
        inputs.custom.constraints_fil = [constraint_fil_hard]
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
        constraint_fil_hard: ConstraintFil,
    ) -> None:
        # Worker other than w0 and w1 should be assigned to shift other than s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w2",
                shift_id="s0",
                date=date.fromisoformat("2023-10-02"),
                penalty=1,
            )
        ]

        inputs.requests = requests
        constraint_fil_hard.worker_var.operator = "out_target"
        inputs.custom.constraints_fil = [constraint_fil_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assignments_target_w = [
            assignment
            for assignment in assignments
            if assignment.worker_id
            not in constraint_fil_hard.worker_var.target
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
        constraint_fil_hard: ConstraintFil,
    ) -> None:
        # Worker other than w0 and w1 should be assigned to shift s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w2",
                shift_id="s2",
                date=date.fromisoformat("2023-10-02"),
                penalty=1,
            )
        ]

        inputs.requests = requests
        constraint_fil_hard.worker_var.operator = "out_target"
        constraint_fil_hard.shift_var.operator = "out_target"
        inputs.custom.constraints_fil = [constraint_fil_hard]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assignments_target_w = [
            assignment
            for assignment in assignments
            if assignment.worker_id
            not in constraint_fil_hard.worker_var.target
        ]

        assert all(
            assignment.shift_id in constraint_fil_hard.shift_var.target
            for assignment in assignments_target_w
        )
        assert outputs.objective_value == 1


class TestConstraintFilSoft(TestEngine, TestConstraintFil):
    def test_expected_assignment_worker_in_target_shift_in_target(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_soft: ConstraintFil,
    ) -> None:
        # No worker w0 or w1 should be assigned to shift s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w0",
                shift_id="s0",
                date=date.fromisoformat("2023-10-02"),
                penalty=1,
            )
        ]

        inputs.requests = requests
        inputs.custom.constraints_fil = [constraint_fil_soft]
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
        constraint_fil_soft: ConstraintFil,
    ) -> None:
        # No worker w0 or w1 should be assigned to shift other than s0 or s1
        # = Worker w0 and w1 should be assigned to shift s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w0",
                shift_id="s2",
                date=date.fromisoformat("2023-10-02"),
                penalty=1,
            )
        ]

        inputs.requests = requests
        constraint_fil_soft.shift_var.operator = "out_target"
        inputs.custom.constraints_fil = [constraint_fil_soft]
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
        constraint_fil_soft: ConstraintFil,
    ) -> None:
        # Worker other than w0 and w1 should be assigned to shift other than s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w2",
                shift_id="s0",
                date=date.fromisoformat("2023-10-02"),
                penalty=1,
            )
        ]

        inputs.requests = requests
        constraint_fil_soft.worker_var.operator = "out_target"
        inputs.custom.constraints_fil = [constraint_fil_soft]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assignments_target_w = [
            assignment
            for assignment in assignments
            if assignment.worker_id
            not in constraint_fil_soft.worker_var.target
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
        constraint_fil_soft: ConstraintFil,
    ) -> None:
        # Worker other than w0 and w1 should be assigned to shift s0 or s1
        requests = [
            Request(
                id="r0",
                worker_id="w2",
                shift_id="s2",
                date=date.fromisoformat("2023-10-02"),
                penalty=1,
            )
        ]

        inputs.requests = requests
        constraint_fil_soft.worker_var.operator = "out_target"
        constraint_fil_soft.shift_var.operator = "out_target"
        inputs.custom.constraints_fil = [constraint_fil_soft]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assignments_target_w = [
            assignment
            for assignment in assignments
            if assignment.worker_id
            not in constraint_fil_soft.worker_var.target
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
        constraint_fil_hard: ConstraintFil,
        constraint_fil_soft: ConstraintFil,
    ) -> None:
        # No worker w0 or w1 should be assigned to shift s0 or s1 (hard)
        # Worker w0 and w1 should be assigned to shift s0 or s1 (soft)
        constraint_fil_hard.shift_var.operator = "out_target"
        inputs.custom.constraints_fil = [
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

    def test_expected_objective_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_hard: ConstraintFil,
        constraint_fil_soft: ConstraintFil,
    ) -> None:
        # No worker w0 or w1 should be assigned to shift s0 or s1 (hard)
        # Worker w0 and w1 should be assigned to shift s0 or s1 (soft)
        constraint_fil_hard.shift_var.operator = "out_target"
        inputs.custom.constraints_fil = [
            constraint_fil_hard,
            constraint_fil_soft,
        ]
        outputs = engine_solve(inputs)

        assert outputs.objective_value == constraint_fil_soft.penalty * len(
            constraint_fil_soft.worker_var.target
        ) * (
            (
                inputs.variable_space.end_date
                - inputs.variable_space.start_date
            ).days
            + 1
        )

    def test_expected_constraint_breaches_variables_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_hard: ConstraintFil,
        constraint_fil_soft: ConstraintFil,
    ) -> None:
        # No worker w0 or w1 should be assigned to shift s0 or s1 (hard)
        # Worker w0 and w1 should be assigned to shift s0 or s1 (soft)
        constraint_fil_hard.shift_var.operator = "out_target"
        inputs.custom.constraints_fil = [
            constraint_fil_hard,
            constraint_fil_soft,
        ]
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        expected_variables = [
            [w, d, a.shift_id]
            for a in assignments
            for w in constraint_fil_soft.worker_var.target
            for d in build_day_list(
                inputs.variable_space.start_date,
                inputs.variable_space.end_date,
            )
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
            any(
                exp_variable in cb.variables
                for cb in outputs.constraint_breaches
            )
            for exp_variable in expected_variables
        )

    def test_expected_constraint_breaches_value_diff_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fil_hard: ConstraintFil,
        constraint_fil_soft: ConstraintFil,
    ) -> None:
        # No worker w0 or w1 should be assigned to shift s0 or s1 (hard)
        # Worker w0 and w1 should be assigned to shift s0 or s1 (soft)
        constraint_fil_hard.shift_var.operator = "out_target"
        inputs.custom.constraints_fil = [
            constraint_fil_hard,
            constraint_fil_soft,
        ]
        outputs = engine_solve(inputs)

        assert all(cb.value_diff == 1 for cb in outputs.constraint_breaches)


def build_day_list(start_date: date, end_date: date) -> List[date]:
    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]
