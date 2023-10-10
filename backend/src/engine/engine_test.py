import random
from datetime import date, timedelta
from typing import Callable, List

import pytest

from engine.engine import Engine
from engine.inputs_outputs import (
    Assignment,
    ConstraintOrd,
    ConstraintSeq,
    ConstraintSum,
    Coverage,
    Custom,
    Inputs,
    Outputs,
    Request,
    ShiftDemand,
    VariableSpace,
    VarOrdShift,
    VarOrdWorker,
    VarSeqShift,
    VarSeqWorker,
    VarSumDay,
    VarSumShift,
    VarSumWorker,
)


class TestEngine:
    @pytest.fixture
    def inputs(self) -> Inputs:
        variable_space = VariableSpace(
            workers=["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"],
            start_date=date.fromisoformat("2023-10-02"),
            end_date=date.fromisoformat("2023-10-15"),
            shifts=["s0", "s1", "s2", "s3"],
        )
        coverage = Coverage([])
        requests: List[Request] = []
        fix_assignments: List[Assignment] = []
        custom = Custom(constraints_sum=[], constraints_seq=[], constraints_ord=[])
        inputs = Inputs(
            variable_space=variable_space,
            coverage=coverage,
            requests=requests,
            fixed_assignments=fix_assignments,
            custom=custom,
        )
        return inputs

    @pytest.fixture
    def engine_solve(self, inputs: Inputs) -> Callable[[Inputs], Outputs]:
        engine = Engine()
        return lambda inputs=inputs: engine.solve(inputs)  # type: ignore


class TestCoverage(TestEngine):
    def test_expected_assigment_coverage(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        target_coverage = random.randint(1, 8)
        coverage = Coverage(
            coverage=[
                ShiftDemand(
                    date="2023-10-02",
                    shift_id="s0",
                    quantity=target_coverage,
                ),
            ]
        )
        inputs.coverage = coverage
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        count = sum(
            1
            for a in assignments
            if a.date == date.fromisoformat("2023-10-02") and a.shift_id == "s0"
        )

        assert count == target_coverage


class TestConstraintSum:
    @pytest.fixture
    def custom_hard(self) -> Custom:
        return Custom(
            constraints_sum=[
                ConstraintSum(
                    id="constraint_sum_hard",
                    operator="less_than_or_equal",
                    worker_var=VarSumWorker(selector="all"),
                    day_var=VarSumDay(selector="week"),
                    shift_var=VarSumShift(selector="equal", target="s0"),
                    target_value=4,
                    hard=True,
                    penalty=0,
                )
            ],
            constraints_seq=[],
            constraints_ord=[],
        )

    @pytest.fixture
    def custom_soft(self) -> Custom:
        return Custom(
            constraints_sum=[
                ConstraintSum(
                    id="constraint_sum_soft",
                    operator="less_than_or_equal",
                    worker_var=VarSumWorker(selector="all"),
                    day_var=VarSumDay(selector="week"),
                    shift_var=VarSumShift(selector="equal", target="s0"),
                    target_value=2,
                    hard=False,
                    penalty=20,
                )
            ],
            constraints_seq=[],
            constraints_ord=[],
        )

    @pytest.fixture
    def custom_hard_soft_conflict(self) -> Custom:
        return Custom(
            constraints_sum=[
                ConstraintSum(
                    id="constraint_sum_hard",
                    operator="equal",
                    worker_var=VarSumWorker(selector="all"),
                    day_var=VarSumDay(selector="week"),
                    shift_var=VarSumShift(selector="equal", target="s0"),
                    target_value=4,
                    hard=True,
                    penalty=0,
                ),
                ConstraintSum(
                    id="constraint_sum_soft",
                    operator="less_than_or_equal",
                    worker_var=VarSumWorker(selector="all"),
                    day_var=VarSumDay(selector="week"),
                    shift_var=VarSumShift(selector="equal", target="s0"),
                    target_value=2,
                    hard=False,
                    penalty=20,
                ),
            ],
            constraints_seq=[],
            constraints_ord=[],
        )


class TestConstraintSumHard(TestEngine, TestConstraintSum):
    def test_expected_assignment_for_less_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # At most 4 shift off per week
        inputs.custom = custom_hard
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum = custom_hard.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert max(counts) <= constraint_sum.target_value

    def test_expected_assignment_for_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # Exactly 4 shift off per week
        inputs.custom = custom_hard
        inputs.custom.constraints_sum[0].operator = "equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum = inputs.custom.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert all(count == constraint_sum.target_value for count in counts)

    def test_expected_assignment_for_greater_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # At least 4 shift off per week
        inputs.custom = custom_hard
        inputs.custom.constraints_sum[0].operator = "greater_than_or_equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum = inputs.custom.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert min(counts) >= constraint_sum.target_value


class TestConstraintSumSoft(TestEngine, TestConstraintSum):
    def test_expected_assignment_for_less_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_soft: Custom,
    ) -> None:
        # At most 4 shift off per week
        inputs.custom = custom_soft
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum = custom_soft.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert max(counts) <= constraint_sum.target_value

    def test_expected_assignment_for_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_soft: Custom,
    ) -> None:
        # Exactly 4 shift off per week
        inputs.custom = custom_soft
        inputs.custom.constraints_sum[0].operator = "equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum = inputs.custom.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert all(count == constraint_sum.target_value for count in counts)

    def test_expected_assignment_for_greater_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_soft: Custom,
    ) -> None:
        # At least 4 shift off per week
        inputs.custom = custom_soft
        inputs.custom.constraints_sum[0].operator = "greater_than_or_equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum = inputs.custom.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert min(counts) >= constraint_sum.target_value

    def test_expected_assignment_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        inputs.custom = custom_hard_soft_conflict
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum_hard = inputs.custom.constraints_sum[0]

        counts = [
            sum(
                1
                for a in assignments
                if a.worker_id == w
                and a.date in week
                and a.shift_id == constraint_sum_hard.shift_var.target
            )
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        assert all(count == constraint_sum_hard.target_value for count in counts)

    def test_expected_objective_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        inputs.custom = custom_hard_soft_conflict
        outputs = engine_solve(inputs)

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum_hard = inputs.custom.constraints_sum[0]
        constraint_sum_soft = inputs.custom.constraints_sum[1]

        assert outputs.objective_value == constraint_sum_soft.penalty * len(
            inputs.variable_space.workers
        ) * len(dates_weeks) * abs(
            constraint_sum_hard.target_value - constraint_sum_soft.target_value
        )

    def test_expected_constraint_breaches_variables_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        inputs.custom = custom_hard_soft_conflict
        outputs = engine_solve(inputs)

        dates_weeks = get_dates_weeks(
            inputs.variable_space.start_date, inputs.variable_space.end_date
        )
        constraint_sum_hard = inputs.custom.constraints_sum[0]

        expected_variables = [
            [[w, d, constraint_sum_hard.shift_var.target] for d in week]
            for week in dates_weeks
            for w in inputs.variable_space.workers
        ]

        # all constraint_breaches' variables are in expected_variables
        assert all(
            any(cb_variable in exp_variables for exp_variables in expected_variables)
            for cb in outputs.constraint_breaches
            for cb_variable in cb.variables
        )
        # all expected_variables are in constraint_breaches' variables
        assert all(
            any(exp_variable in cb.variables for cb in outputs.constraint_breaches)
            for exp_variables in expected_variables
            for exp_variable in exp_variables
        )

    def test_expected_constraint_breaches_value_diff_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        inputs.custom = custom_hard_soft_conflict
        outputs = engine_solve(inputs)

        constraint_sum_hard = inputs.custom.constraints_sum[0]
        constraint_sum_soft = inputs.custom.constraints_sum[1]

        expected_value_diff = (
            constraint_sum_hard.target_value - constraint_sum_soft.target_value
        )

        assert all(
            cb.value_diff == expected_value_diff for cb in outputs.constraint_breaches
        )


class TestConstraintSeq:
    @pytest.fixture
    def custom_hard(self) -> Custom:
        return Custom(
            constraints_sum=[],
            constraints_seq=[
                ConstraintSeq(
                    id="constraint_seq_hard",
                    operator="less_than_or_equal",
                    worker_var=VarSeqWorker(selector="all"),
                    shift_var=VarSeqShift(selector="equal", target="s0"),
                    target_value=4,
                    hard=True,
                    penalty=0,
                )
            ],
            constraints_ord=[],
        )

    @pytest.fixture
    def custom_soft(self) -> Custom:
        return Custom(
            constraints_sum=[],
            constraints_seq=[
                ConstraintSeq(
                    id="constraint_seq_soft",
                    operator="less_than_or_equal",
                    worker_var=VarSeqWorker(selector="all"),
                    shift_var=VarSeqShift(selector="equal", target="s0"),
                    target_value=2,
                    hard=False,
                    penalty=20,
                )
            ],
            constraints_ord=[],
        )

    @pytest.fixture
    def custom_hard_soft_conflict(self) -> Custom:
        return Custom(
            constraints_sum=[],
            constraints_seq=[
                ConstraintSeq(
                    id="constraint_seq_hard",
                    operator="equal",
                    worker_var=VarSeqWorker(selector="all"),
                    shift_var=VarSeqShift(selector="equal", target="s0"),
                    target_value=4,
                    hard=True,
                    penalty=0,
                ),
                ConstraintSeq(
                    id="constraint_seq_soft",
                    operator="less_than_or_equal",
                    worker_var=VarSeqWorker(selector="all"),
                    shift_var=VarSeqShift(selector="equal", target="s0"),
                    target_value=2,
                    hard=False,
                    penalty=20,
                ),
            ],
            constraints_ord=[],
        )


class TestConstraintSeqHard(TestEngine, TestConstraintSeq):
    def test_expected_assignment_for_less_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # At most 4 shift off in a row
        inputs.custom = custom_hard
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_seq = inputs.custom.constraints_seq[0]
        counts = [
            max_consecutive_shift_count(assignments, w, constraint_seq.shift_var.target)
            for w in inputs.variable_space.workers
        ]

        assert max(counts) <= constraint_seq.target_value

    def test_expected_assignment_for_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # Exactly 4 shift off per week
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w1",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w2",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w3",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w4",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w5",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w6",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w7",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        inputs.custom = custom_hard
        inputs.custom.constraints_seq[0].operator = "equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_seq = inputs.custom.constraints_seq[0]

        counts_max = [
            max_consecutive_shift_count(assignments, w, constraint_seq.shift_var.target)
            for w in inputs.variable_space.workers
        ]
        counts_min = [
            min_consecutive_shift_count(assignments, w, constraint_seq.shift_var.target)
            for w in inputs.variable_space.workers
        ]

        assert all(
            count_min == constraint_seq.target_value
            and count_max == constraint_seq.target_value
            for count_min, count_max in zip(counts_min, counts_max)
        )

    def test_expected_assignment_for_greater_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # At least 4 shift off per week
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w1",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w2",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w3",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w4",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w5",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w6",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w7",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        inputs.custom = custom_hard
        inputs.custom.constraints_seq[0].operator = "greater_than_or_equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_seq = inputs.custom.constraints_seq[0]
        counts = [
            min_consecutive_shift_count(assignments, w, constraint_seq.shift_var.target)
            for w in inputs.variable_space.workers
        ]

        assert min(counts) >= constraint_seq.target_value

    def test_less_than_or_equal_with_fixed_assignments(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-05"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-06"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-07"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-08"),
                shift_id="s1",
            ),
        ]

        inputs.fixed_assignments = fixed_assignments
        inputs.custom = custom_hard
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assert all(a in assignments for a in fixed_assignments)

    def test_greater_than_or_equal_with_fixed_assignments(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-05"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-06"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-07"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-08"),
                shift_id="s1",
            ),
        ]

        inputs.fixed_assignments = fixed_assignments
        inputs.custom = custom_hard
        inputs.custom.constraints_seq[0].operator = "greater_than_or_equal"
        inputs.custom.constraints_seq[0].shift_var.target = "s1"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assert all(a in assignments for a in fixed_assignments)

    def test_less_than_or_equal_with_requests_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # At most 4 shift off in a row, with request for 5
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s0",
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-05"),
                shift_id="s0",
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-06"),
                shift_id="s0",
                penalty=1,
            ),
        ]
        inputs.requests = requests

        inputs.custom = custom_hard
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_seq = inputs.custom.constraints_seq[0]
        counts = [
            max_consecutive_shift_count(assignments, w, constraint_seq.shift_var.target)
            for w in inputs.variable_space.workers
        ]

        assert max(counts) <= constraint_seq.target_value
        assert outputs.objective_value == 1

    def test_equal_with_requests_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # Exaclty 4 shift off in a row, with request for 3 and 5
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s0",
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-05"),
                shift_id="s0",
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-06"),
                shift_id="s0",
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w1",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s0",
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w1",
                date=date.fromisoformat("2023-10-05"),
                shift_id="s0",
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w1",
                date=date.fromisoformat("2023-10-06"),
                shift_id="s0",
                penalty=1,
            ),
        ]
        inputs.requests = requests
        inputs.custom = custom_hard
        inputs.custom.constraints_seq[0].operator = "equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_seq = inputs.custom.constraints_seq[0]
        counts_min = [
            min_consecutive_shift_count(assignments, w, constraint_seq.shift_var.target)
            for w in ["w0", "w1"]
        ]
        counts_max = [
            max_consecutive_shift_count(assignments, w, constraint_seq.shift_var.target)
            for w in ["w0", "w1"]
        ]

        assert all(
            count_min == constraint_seq.target_value
            and count_max == constraint_seq.target_value
            for count_min, count_max in zip(counts_min, counts_max)
        )
        assert outputs.objective_value == 1

    def test_greater_than_or_equal_with_requests_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # At lest 4 shift off in a row, with request for 3
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
                penalty=1,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s0",
                penalty=1,
            ),
        ]
        inputs.requests = requests

        inputs.custom = custom_hard
        inputs.custom.constraints_seq[0].operator = "greater_than_or_equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_seq = inputs.custom.constraints_seq[0]
        count = min_consecutive_shift_count(
            assignments, "w0", constraint_seq.shift_var.target
        )

        assert count <= constraint_seq.target_value
        assert outputs.objective_value == 0


class TestConstraintSeqSoft(TestEngine, TestConstraintSeq):
    def test_expected_assignment_for_less_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_soft: Custom,
    ) -> None:
        # At most 4 shift off in a row
        inputs.custom = custom_soft
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_seq = inputs.custom.constraints_seq[0]
        counts = [
            max_consecutive_shift_count(assignments, w, constraint_seq.shift_var.target)
            for w in inputs.variable_space.workers
        ]

        assert max(counts) <= constraint_seq.target_value

    def test_expected_assignment_for_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_soft: Custom,
    ) -> None:
        # Exactly 4 shift off per week
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w1",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w2",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w3",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w4",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w5",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w6",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w7",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        inputs.custom = custom_soft
        inputs.custom.constraints_seq[0].operator = "equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_seq = inputs.custom.constraints_seq[0]

        counts_max = [
            max_consecutive_shift_count(assignments, w, constraint_seq.shift_var.target)
            for w in inputs.variable_space.workers
        ]
        counts_min = [
            min_consecutive_shift_count(assignments, w, constraint_seq.shift_var.target)
            for w in inputs.variable_space.workers
        ]

        assert all(
            count_min == constraint_seq.target_value
            and count_max == constraint_seq.target_value
            for count_min, count_max in zip(counts_min, counts_max)
        )

    def test_expected_assignment_for_greater_than_or_equal(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_soft: Custom,
    ) -> None:
        # At least 4 shift off per week
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w1",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w2",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w3",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w4",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w5",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w6",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w7",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        inputs.custom = custom_soft
        inputs.custom.constraints_seq[0].operator = "greater_than_or_equal"
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_seq = inputs.custom.constraints_seq[0]
        counts = [
            min_consecutive_shift_count(assignments, w, constraint_seq.shift_var.target)
            for w in inputs.variable_space.workers
        ]

        assert min(counts) >= constraint_seq.target_value

    def test_expected_assignment_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        inputs.custom = custom_hard_soft_conflict
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        constraint_seq_hard = inputs.custom.constraints_seq[0]

        count_min = min_consecutive_shift_count(
            assignments,
            fixed_assignments[0].worker_id,
            constraint_seq_hard.shift_var.target,
        )
        count_max = max_consecutive_shift_count(
            assignments,
            fixed_assignments[0].worker_id,
            constraint_seq_hard.shift_var.target,
        )

        assert (
            count_min == constraint_seq_hard.target_value
            and count_max == constraint_seq_hard.target_value
        )

    def test_expected_objective_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-10"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        inputs.custom = custom_hard_soft_conflict
        outputs = engine_solve(inputs)

        constraint_seq_hard = inputs.custom.constraints_seq[0]
        constraint_seq_soft = inputs.custom.constraints_seq[1]

        assert outputs.objective_value == constraint_seq_soft.penalty * (
            constraint_seq_hard.target_value - constraint_seq_soft.target_value
        )

    def test_expected_constraint_breaches_variables_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        inputs.custom = custom_hard_soft_conflict
        outputs = engine_solve(inputs)

        expected_variables = [
            [
                fixed_assignments[0].worker_id,
                fixed_assignments[0].date,
                fixed_assignments[0].shift_id,
            ],
            [
                fixed_assignments[0].worker_id,
                fixed_assignments[0].date + timedelta(days=1),
                fixed_assignments[0].shift_id,
            ],
            [
                fixed_assignments[0].worker_id,
                fixed_assignments[0].date + timedelta(days=2),
                fixed_assignments[0].shift_id,
            ],
            [
                fixed_assignments[0].worker_id,
                fixed_assignments[0].date + timedelta(days=3),
                fixed_assignments[0].shift_id,
            ],
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
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # Excalty 4 shifts off per week hard, at most 2 shifts off per week soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        inputs.custom = custom_hard_soft_conflict
        outputs = engine_solve(inputs)

        for cb in outputs.constraint_breaches:
            assert cb.value_diff == 1


class TestConstraintOrd:
    @pytest.fixture
    def custom_hard(self) -> Custom:
        return Custom(
            constraints_sum=[],
            constraints_seq=[],
            constraints_ord=[
                ConstraintOrd(
                    id="constraint_ord_hard",
                    operator="no",
                    worker_var=VarOrdWorker(selector="all"),
                    shift_var=VarOrdShift(previous="s1", next="s0"),
                    hard=True,
                    penalty=0,
                )
            ],
        )

    @pytest.fixture
    def custom_soft(self) -> Custom:
        return Custom(
            constraints_sum=[],
            constraints_seq=[],
            constraints_ord=[
                ConstraintOrd(
                    id="constraint_ord_soft",
                    operator="no",
                    worker_var=VarOrdWorker(selector="all"),
                    shift_var=VarOrdShift(previous="s1", next="s0"),
                    hard=False,
                    penalty=20,
                )
            ],
        )

    @pytest.fixture
    def custom_hard_soft_conflict(self) -> Custom:
        return Custom(
            constraints_sum=[],
            constraints_seq=[],
            constraints_ord=[
                ConstraintOrd(
                    id="constraint_ord_hard",
                    operator="no",
                    worker_var=VarOrdWorker(selector="all"),
                    shift_var=VarOrdShift(previous="s1", next="s0"),
                    hard=True,
                    penalty=0,
                ),
                ConstraintOrd(
                    id="constraint_seq_soft",
                    operator="yes",
                    worker_var=VarOrdWorker(selector="all"),
                    shift_var=VarOrdShift(previous="s1", next="s0"),
                    hard=False,
                    penalty=20,
                ),
            ],
        )


class TestConstraintOrdHard(TestEngine, TestConstraintOrd):
    def test_expected_assignment_for_no(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id
            and a.date == fixed_assignments[0].date + timedelta(days=1)
        ][0]
        assert next_assignment.shift_id != custom_hard.constraints_ord[0].shift_var.next

    def test_expected_assignment_for_yes(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard
        inputs.custom.constraints_ord[0].operator = "yes"
        inputs.custom.constraints_ord[0].shift_var.next = "s3"
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id
            and a.date == fixed_assignments[0].date + timedelta(days=1)
        ][0]
        assert next_assignment.shift_id == custom_hard.constraints_ord[0].shift_var.next

    def test_no_solution_for_no_if_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
            ),
        ]
        inputs.custom = custom_hard
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        assert not outputs.solution_exist and len(outputs.assignments) == 0

    def test_no_solution_for_yes_if_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard: Custom,
    ) -> None:
        # No shift s0 after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard
        inputs.custom.constraints_ord[0].operator = "yes"
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        assert not outputs.solution_exist and len(outputs.assignments) == 0


class TestConstraintOrdSoft(TestEngine, TestConstraintOrd):
    def test_expected_assignment_for_no(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_soft: Custom,
    ) -> None:
        # No shift s0 after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
                penalty=1,
            ),
        ]
        inputs.custom = custom_soft
        inputs.fixed_assignments = fixed_assignments
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id
            and a.date == fixed_assignments[0].date + timedelta(days=1)
        ][0]
        assert next_assignment.shift_id != custom_soft.constraints_ord[0].shift_var.next
        assert outputs.objective_value == 1

    def test_expected_assignment_for_yes(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_soft: Custom,
    ) -> None:
        # Shift s3 after shift s1
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s0",
                penalty=1,
            ),
        ]
        inputs.custom = custom_soft
        inputs.custom.constraints_ord[0].operator = "yes"
        inputs.custom.constraints_ord[0].shift_var.next = "s3"
        inputs.fixed_assignments = fixed_assignments
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id
            and a.date == fixed_assignments[0].date + timedelta(days=1)
        ][0]
        assert next_assignment.shift_id == custom_soft.constraints_ord[0].shift_var.next
        assert outputs.objective_value == 1

    def test_expected_assignment_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # No shift s0 after shift s1 hard, shift s0 after shift s1 soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard_soft_conflict
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        next_assignment = [
            a
            for a in assignments
            if a.worker_id == fixed_assignments[0].worker_id
            and a.date == fixed_assignments[0].date + timedelta(days=1)
        ][0]
        assert (
            next_assignment.shift_id
            != custom_hard_soft_conflict.constraints_ord[0].shift_var.next
        )

    def test_expected_objective_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # No shift s0 after shift s1 hard, shift s0 after shift s1 soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard_soft_conflict
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        assert (
            outputs.objective_value
            == custom_hard_soft_conflict.constraints_ord[1].penalty
        )

    def test_expected_constraint_breaches_variables_for_hard_soft_conflict(
        self,
        inputs: Inputs,
        engine_solve: Callable[[Inputs], Outputs],
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # No shift s0 after shift s1 hard, shift s0 after shift s1 soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard_soft_conflict
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        constraint_ord_soft = custom_hard_soft_conflict.constraints_ord[1]

        expected_variables = [
            [
                fixed_assignments[0].worker_id,
                fixed_assignments[0].date,
                constraint_ord_soft.shift_var.previous,
            ],
            [
                fixed_assignments[0].worker_id,
                fixed_assignments[0].date + timedelta(days=1),
                constraint_ord_soft.shift_var.next,
            ],
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
        custom_hard_soft_conflict: Custom,
    ) -> None:
        # No shift s0 after shift s1 hard, shift s0 after shift s1 soft
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.custom = custom_hard_soft_conflict
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        constraint_ord_soft = custom_hard_soft_conflict.constraints_ord[1]

        assert outputs.objective_value == constraint_ord_soft.penalty


class TestFixedAssignments(TestEngine):
    def test_expected_assignment_for_fixed_assignments(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s2",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        assert all(a in assignments for a in fixed_assignments)

    def test_no_solution_if_fixed_assignment_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        assert not outputs.solution_exist and len(outputs.assignments) == 0


class TestRequest(TestEngine):
    def test_expected_assignment_for_request(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s2",
                penalty=2,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)
        assignments = outputs.assignments

        target_assignments = [
            Assignment(
                worker_id=r.worker_id,
                date=r.date,
                shift_id=r.shift_id,
            )
            for r in requests
        ]

        assert all(a in assignments for a in target_assignments)

    def test_objective_if_requests_fullfilled(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
                penalty=3,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s2",
                penalty=4,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert outputs.objective_value == 0

    def test_objective_if_requests_not_fullfilled(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s2",
            ),
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s3",
            ),
        ]
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-03"),
                shift_id="s1",
                penalty=3,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-04"),
                shift_id="s2",
                penalty=4,
            ),
        ]
        inputs.fixed_assignments = fixed_assignments
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert outputs.objective_value == sum(r.penalty for r in requests)

    def test_expected_assignment_for_request_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                penalty=4,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        target_assignment = Assignment(
            worker_id=requests[1].worker_id,
            date=requests[1].date,
            shift_id=requests[1].shift_id,
        )

        assert target_assignment in outputs.assignments

    def test_objective_for_request_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=2,
            ),
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
                penalty=4,
            ),
        ]
        inputs.requests = requests
        outputs = engine_solve(inputs)

        assert outputs.objective_value == requests[0].penalty

    def test_constraint_breaches_variables_for_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=2,
            ),
        ]
        inputs.requests = requests
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        expected_variables = [
            [
                requests[0].worker_id,
                requests[0].date,
                requests[0].shift_id,
            ],
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

    def test_constraint_breaches_value_diff_for_conflict(
        self, inputs: Inputs, engine_solve: Callable[[Inputs], Outputs]
    ) -> None:
        fixed_assignments = [
            Assignment(
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s1",
            ),
        ]
        requests = [
            Request(
                id="request",
                worker_id="w0",
                date=date.fromisoformat("2023-10-02"),
                shift_id="s0",
                penalty=2,
            ),
        ]
        inputs.requests = requests
        inputs.fixed_assignments = fixed_assignments
        outputs = engine_solve(inputs)

        for cb in outputs.constraint_breaches:
            assert cb.value_diff == 1


# pylint: disable=R0801
def get_dates_weeks(start_date: date, end_date: date) -> List[List[date]]:
    delta = end_date - start_date
    dates = [start_date + timedelta(days=i) for i in range(delta.days + 1)]
    week_length = 7
    d_indexes = [
        list(range(i, i + 7))
        for i in range(
            0,
            len(dates),
            week_length,
        )
    ]
    dates_weeks = [[dates[i] for i in d_index] for d_index in d_indexes]
    return dates_weeks


def max_consecutive_shift_count(
    assignments: List[Assignment], worker_id: str, shift_id: str
) -> int:
    max_count = 0
    count = 0
    target_assignments = [a for a in assignments if a.worker_id == worker_id]
    sorted_assignments = sorted(target_assignments, key=lambda a: a.date)
    for a in sorted_assignments:
        if a.shift_id == shift_id:
            count += 1
            max_count = max(max_count, count)
        else:
            count = 0
    return max_count


def min_consecutive_shift_count(
    assignments: List[Assignment], worker_id: str, shift_id: str
) -> int:
    min_count = float("inf")
    count = 0
    target_assignments = [a for a in assignments if a.worker_id == worker_id]
    sorted_assignments = sorted(target_assignments, key=lambda a: a.date)
    for i, a in enumerate(sorted_assignments):
        if a.shift_id == shift_id:
            count += 1
            if i == len(sorted_assignments) - 1:
                min_count = min(min_count, count)
        else:
            if count != 0:
                min_count = min(min_count, count)
            count = 0
    return min_count if min_count != float("inf") else 0
