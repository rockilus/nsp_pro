from datetime import date, timedelta
from typing import Callable, List

import pytest

from engine.engine_test import TestEngine
from engine.inputs_outputs import (
    Inputs,
    Outputs,
    ConstraintFai,
    VarFaiDay,
    VarFaiShift,
    VarFaiWorker,
    Coverage,
    ShiftDemand,
)


# pylint: disable=R0801
class TestConstraintFai:
    @pytest.fixture
    def constraint_fai_soft(self) -> ConstraintFai:
        return ConstraintFai(
            id="constraint_fai_soft",
            worker_var=VarFaiWorker(selector="all", target=[]),
            day_var=VarFaiDay(selector="all", target=0),
            shift_var=VarFaiShift(selector="all", target=[]),
            penalty=2,
        )


class TestConstraintFaiSoft(TestEngine, TestConstraintFai):
    def test_expected_assignment_worker_all_day_all_shift_all_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 56 shifts across 8 workers, i.e. 7 shifts per worker
        target_shifts = ["s0", "s1"]
        quantity = 2
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            target_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_count = (
            quantity
            * (
                (
                    inputs.variable_space.end_date
                    - inputs.variable_space.start_date
                ).days
                + 1
            )
            * len(target_shifts)
            // len(inputs.variable_space.workers)
        )
        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w and a.shift_id in target_shifts
            )
            for w in inputs.variable_space.workers
        ]

        assert all(count == target_count for count in counts)

    def test_expected_assignment_worker_all_day_all_shift_all_non_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 28 shifts across 8 workers, i.e. 3.5 shifts per
        # worker. Objective is therefore to have 3 or 4 shifts per worker.
        target_shifts = ["s0", "s1"]
        quantity = 1
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            target_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_count = (
            quantity
            * (
                (
                    inputs.variable_space.end_date
                    - inputs.variable_space.start_date
                ).days
                + 1
            )
            * len(target_shifts)
            // len(inputs.variable_space.workers)
        )
        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w and a.shift_id in target_shifts
            )
            for w in inputs.variable_space.workers
        ]

        assert all(
            count <= target_count + 1 and count >= target_count - 1
            for count in counts
        )

    def test_expected_objective_worker_all_day_all_shift_all_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 56 shifts across 8 workers, i.e. 7 shifts per worker
        target_shifts = ["s0", "s1"]
        quantity = 2
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            target_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)

        assert outputs.objective_value == 0

    def test_expected_objective_worker_all_day_all_shift_all_non_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        target_shifts = ["s0", "s1"]
        quantity = 1
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            target_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_count = (
            quantity
            * (
                (
                    inputs.variable_space.end_date
                    - inputs.variable_space.start_date
                ).days
                + 1
            )
            * len(target_shifts)
            // len(inputs.variable_space.workers)
        )
        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w and a.shift_id in target_shifts
            )
            for w in inputs.variable_space.workers
        ]
        expected_objective = sum(
            (abs(count - target_count) + abs(count - target_count - 1))
            * constraint_fai_soft.penalty
            for count in counts
        )

        assert outputs.objective_value == expected_objective

    def test_expected_constraint_breaches_worker_all_day_all_shift_all_non_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        target_shifts = ["s0", "s1"]
        quantity = 1
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            target_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)

        expected_variables = [
            [w, d, s]
            for w in inputs.variable_space.workers
            for d in build_day_list(
                inputs.variable_space.start_date,
                inputs.variable_space.end_date,
            )
            for s in target_shifts
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

    def test_expected_assignment_worker_all_day_all_shift_list_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 56 shifts across 8 workers, i.e. 7 shifts per worker
        coverage_shifts = ["s0", "s1", "s2"]
        quantity = 2
        constraint_fai_soft.shift_var.selector = "list"
        constraint_fai_soft.shift_var.target = ["s0", "s1"]
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_count = (
            quantity
            * (
                (
                    inputs.variable_space.end_date
                    - inputs.variable_space.start_date
                ).days
                + 1
            )
            * len(constraint_fai_soft.shift_var.target)
            // len(inputs.variable_space.workers)
        )
        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.shift_id in constraint_fai_soft.shift_var.target
            )
            for w in inputs.variable_space.workers
        ]

        assert all(count == target_count for count in counts)

    def test_expected_assignment_worker_all_day_all_shift_list_non_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 28 shifts across 8 workers, i.e. 3.5 shifts per
        # worker. Objective is therefore to have 3 or 4 shifts per worker.
        coverage_shifts = ["s0", "s1", "s2"]
        quantity = 1
        constraint_fai_soft.shift_var.selector = "list"
        constraint_fai_soft.shift_var.target = ["s0", "s1"]
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_count = (
            quantity
            * (
                (
                    inputs.variable_space.end_date
                    - inputs.variable_space.start_date
                ).days
                + 1
            )
            * len(constraint_fai_soft.shift_var.target)
            // len(inputs.variable_space.workers)
        )
        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.shift_id in constraint_fai_soft.shift_var.target
            )
            for w in inputs.variable_space.workers
        ]

        assert all(
            count <= target_count + 1 and count >= target_count - 1
            for count in counts
        )

    def test_expected_objective_worker_all_day_all_shift_list_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 56 shifts across 8 workers, i.e. 7 shifts per worker
        coverage_shifts = ["s0", "s1", "s2"]
        quantity = 2
        constraint_fai_soft.shift_var.selector = "list"
        constraint_fai_soft.shift_var.target = ["s0", "s1"]
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)

        assert outputs.objective_value == 0

    def test_expected_objective_worker_all_day_all_shift_list_non_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        coverage_shifts = ["s0", "s1", "s2"]
        quantity = 1
        constraint_fai_soft.shift_var.selector = "list"
        constraint_fai_soft.shift_var.target = ["s0", "s1"]
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_count = (
            quantity
            * (
                (
                    inputs.variable_space.end_date
                    - inputs.variable_space.start_date
                ).days
                + 1
            )
            * len(constraint_fai_soft.shift_var.target)
            // len(inputs.variable_space.workers)
        )
        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.shift_id in constraint_fai_soft.shift_var.target
            )
            for w in inputs.variable_space.workers
        ]
        expected_objective = sum(
            (abs(count - target_count) + abs(count - target_count - 1))
            * constraint_fai_soft.penalty
            for count in counts
        )

        assert outputs.objective_value == expected_objective

    def test_expected_constraint_breaches_worker_all_day_all_shift_list_non_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        coverage_shifts = ["s0", "s1", "s2"]
        quantity = 1
        constraint_fai_soft.shift_var.selector = "list"
        constraint_fai_soft.shift_var.target = ["s0", "s1"]
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)

        expected_variables = [
            [w, d, s]
            for w in inputs.variable_space.workers
            for d in build_day_list(
                inputs.variable_space.start_date,
                inputs.variable_space.end_date,
            )
            for s in constraint_fai_soft.shift_var.target
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

    def test_expected_assignment_worker_list_day_all_shift_all_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 28 shifts across 4 workers, i.e. 7 shifts per worker
        coverage_shifts = ["s0", "s1"]
        quantity = 1
        constraint_fai_soft.worker_var.selector = "list"
        constraint_fai_soft.worker_var.target = ["w0", "w1", "w2", "w3"]
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_count = (
            quantity
            * (
                (
                    inputs.variable_space.end_date
                    - inputs.variable_space.start_date
                ).days
                + 1
            )
            * len(coverage_shifts)
            // len(constraint_fai_soft.worker_var.target)
        )
        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w and a.shift_id in coverage_shifts
            )
            for w in constraint_fai_soft.worker_var.target
        ]

        assert all(count == target_count for count in counts)

    def test_expected_assignment_worker_list_day_all_shift_all_non_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 28 shifts across 5 workers, i.e. 5.6 shifts per
        # worker. Objective is therefore to have 5 or 6 shifts per worker.
        coverage_shifts = ["s0", "s1"]
        quantity = 1
        constraint_fai_soft.worker_var.selector = "list"
        constraint_fai_soft.worker_var.target = ["w0", "w1", "w2", "w3", "w4"]
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_count = (
            quantity
            * (
                (
                    inputs.variable_space.end_date
                    - inputs.variable_space.start_date
                ).days
                + 1
            )
            * len(coverage_shifts)
            // len(constraint_fai_soft.worker_var.target)
        )
        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w and a.shift_id in coverage_shifts
            )
            for w in constraint_fai_soft.worker_var.target
        ]

        assert all(
            count <= target_count + 1 and count >= target_count - 1
            for count in counts
        )

    def test_expected_objective_worker_list_day_all_shift_all_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 28 shifts across 4 workers, i.e. 7 shifts per worker
        coverage_shifts = ["s0", "s1"]
        quantity = 1
        constraint_fai_soft.worker_var.selector = "list"
        constraint_fai_soft.worker_var.target = ["w0", "w1", "w2", "w3"]
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)

        assert outputs.objective_value == 0

    def test_expected_objective_worker_list_day_all_shift_all_non_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 28 shifts across 5 workers, i.e. 5.6 shifts per
        # worker. Objective is therefore to have 5 or 6 shifts per worker.
        coverage_shifts = ["s0", "s1"]
        quantity = 1
        constraint_fai_soft.worker_var.selector = "list"
        constraint_fai_soft.worker_var.target = ["w0", "w1", "w2", "w3", "w4"]
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_count = (
            quantity
            * (
                (
                    inputs.variable_space.end_date
                    - inputs.variable_space.start_date
                ).days
                + 1
            )
            * len(coverage_shifts)
            // len(constraint_fai_soft.worker_var.target)
        )
        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w and a.shift_id in coverage_shifts
            )
            for w in constraint_fai_soft.worker_var.target
        ]
        expected_objective = sum(
            (abs(count - target_count) + abs(count - target_count - 1))
            * constraint_fai_soft.penalty
            for count in counts
        )

        assert outputs.objective_value == expected_objective

    def test_expected_constraint_breaches_worker_all_day_all_shift_all_non_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 28 shifts across 5 workers, i.e. 5.6 shifts per
        # worker. Objective is therefore to have 5 or 6 shifts per worker.
        coverage_shifts = ["s0", "s1"]
        quantity = 1
        constraint_fai_soft.worker_var.selector = "list"
        constraint_fai_soft.worker_var.target = ["w0", "w1", "w2", "w3", "w4"]
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)

        expected_variables = [
            [w, d, s]
            for w in constraint_fai_soft.worker_var.target
            for d in build_day_list(
                inputs.variable_space.start_date,
                inputs.variable_space.end_date,
            )
            for s in coverage_shifts
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

    def test_expected_assignment_worker_all_day_modulo_shift_all_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 8 shifts on Mondays across 8 workers, i.e. 1 shifts
        # per worker
        coverage_shifts = ["s0", "s1"]
        quantity = 2
        constraint_fai_soft.day_var.selector = "week_day_index"
        constraint_fai_soft.day_var.target = 0
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_count = (
            quantity
            * count_days_with_index(
                inputs.variable_space.start_date,
                inputs.variable_space.end_date,
                constraint_fai_soft.day_var.target,
            )
            * len(coverage_shifts)
            // len(inputs.variable_space.workers)
        )
        target_days = [
            day
            for day in build_day_list(
                inputs.variable_space.start_date,
                inputs.variable_space.end_date,
            )
            if day.weekday() == constraint_fai_soft.day_var.target
        ]
        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in target_days
                and a.shift_id in coverage_shifts
            )
            for w in inputs.variable_space.workers
        ]

        assert all(count == target_count for count in counts)

    def test_expected_assignment_worker_all_day_modulo_shift_all_non_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 12 shifts on Mondays across 8 workers, i.e. 1.5 shifts
        # per worker
        coverage_shifts = ["s0", "s1", "s2"]
        quantity = 2
        constraint_fai_soft.day_var.selector = "week_day_index"
        constraint_fai_soft.day_var.target = 0
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_count = (
            quantity
            * count_days_with_index(
                inputs.variable_space.start_date,
                inputs.variable_space.end_date,
                constraint_fai_soft.day_var.target,
            )
            * len(coverage_shifts)
            // len(inputs.variable_space.workers)
        )
        target_days = [
            day
            for day in build_day_list(
                inputs.variable_space.start_date,
                inputs.variable_space.end_date,
            )
            if day.weekday() == constraint_fai_soft.day_var.target
        ]
        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in target_days
                and a.shift_id in coverage_shifts
            )
            for w in inputs.variable_space.workers
        ]

        assert all(
            count <= target_count + 1 and count >= target_count - 1
            for count in counts
        )

    def test_expected_objective_worker_all_day_modulo_shift_all_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 8 shifts on Mondays across 8 workers, i.e. 1 shifts
        # per worker
        coverage_shifts = ["s0", "s1"]
        quantity = 2
        constraint_fai_soft.day_var.selector = "week_day_index"
        constraint_fai_soft.day_var.target = 0
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)

        assert outputs.objective_value == 0

    def test_expected_objective_worker_all_day_modulo_shift_all_non_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 12 shifts on Mondays across 8 workers, i.e. 1.5 shifts
        # per worker
        coverage_shifts = ["s0", "s1", "s2"]
        quantity = 2
        constraint_fai_soft.day_var.selector = "week_day_index"
        constraint_fai_soft.day_var.target = 0
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_count = (
            quantity
            * count_days_with_index(
                inputs.variable_space.start_date,
                inputs.variable_space.end_date,
                constraint_fai_soft.day_var.target,
            )
            * len(coverage_shifts)
            // len(inputs.variable_space.workers)
        )
        target_days = [
            day
            for day in build_day_list(
                inputs.variable_space.start_date,
                inputs.variable_space.end_date,
            )
            if day.weekday() == constraint_fai_soft.day_var.target
        ]
        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in target_days
                and a.shift_id in coverage_shifts
            )
            for w in inputs.variable_space.workers
        ]
        expected_objective = sum(
            (abs(count - target_count) + abs(count - target_count - 1))
            * constraint_fai_soft.penalty
            for count in counts
        )

        assert outputs.objective_value == expected_objective

    def test_expected_constraint_breaches_worker_all_day_modulo_shift_all_non_perfect(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        constraint_fai_soft: ConstraintFai,
    ) -> None:
        # Total demand of 12 shifts on Mondays across 8 workers, i.e. 1.5 shifts
        # per worker
        coverage_shifts = ["s0", "s1", "s2"]
        quantity = 2
        constraint_fai_soft.day_var.selector = "week_day_index"
        constraint_fai_soft.day_var.target = 0
        inputs.custom.constraints_fai = [constraint_fai_soft]
        inputs.coverage = build_coverage(
            inputs.variable_space.start_date,
            inputs.variable_space.end_date,
            coverage_shifts,
            quantity,
        )
        outputs = engine_solve(inputs)

        target_days = [
            day
            for day in build_day_list(
                inputs.variable_space.start_date,
                inputs.variable_space.end_date,
            )
            if day.weekday() == constraint_fai_soft.day_var.target
        ]

        expected_variables = [
            [w, d, s]
            for w in inputs.variable_space.workers
            for d in target_days
            for s in coverage_shifts
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


def build_coverage(
    start_date: date, end_date: date, target_shifts: List[str], quantity: int
) -> Coverage:
    coverage = []
    for i in range((end_date - start_date).days + 1):
        cur_date = start_date + timedelta(days=i)
        for s in target_shifts:
            coverage.append(
                ShiftDemand(
                    date=cur_date,
                    shift_id=s,
                    quantity=quantity,
                )
            )

    return Coverage(coverage=coverage)


def build_day_list(start_date: date, end_date: date) -> List[date]:
    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]


def count_days_with_index(
    start_date: date, end_date: date, day_index: int
) -> int:
    count = 0
    current_date = start_date
    while current_date <= end_date:
        if current_date.weekday() == day_index:
            count += 1
        current_date += timedelta(days=1)
    return count
