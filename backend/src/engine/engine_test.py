import random
from datetime import date, timedelta
from typing import List

from engine.engine import Engine
from engine.inputs_outputs import (
    Coverage,
    Custom,
    Inputs,
    ShiftDemand,
    VariableSpace,
    ConstraintSum,
    VarSumWorker,
    VarSumDay,
    VarSumShift,
)


def test_engine_solve_return_expected_assigment_coverage():
    variable_space = VariableSpace(
        workers=["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"],
        start_date=date.fromisoformat("2023-10-02"),
        end_date=date.fromisoformat("2023-10-15"),
        shifts=["s0", "s1", "s2", "s3"],
    )
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
    requests = []
    fix_assignments = []
    custom = Custom(constraints_sum=[])

    inputs = Inputs(
        variable_space=variable_space,
        coverage=coverage,
        requests=requests,
        fixed_assignments=fix_assignments,
        custom=custom,
    )
    engine = Engine()
    outputs = engine.solve(inputs)
    assignments = outputs.assignments

    count = sum(
        1
        for a in assignments
        if a.date == date.fromisoformat("2023-10-02") and a.shift_id == "s0"
    )

    assert count == target_coverage


def test_engine_solve_return_expected_constraint_sum_for_less_than_or_equal_hard():
    start_date = date.fromisoformat("2023-10-02")
    end_date = date.fromisoformat("2023-10-15")
    workers = ["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"]
    variable_space = VariableSpace(
        workers=workers,
        start_date=start_date,
        end_date=end_date,
        shifts=["s0", "s1", "s2", "s3"],
    )
    coverage = Coverage(coverage=[])
    requests = []
    fix_assignments = []

    # At least one shift off per week
    target_off = random.randint(1, 5)
    var_um_worker = VarSumWorker(selector="all")
    var_sum_day = VarSumDay(selector="week")
    var_sum_shift = VarSumShift(selector="equal", target="s0")
    constraint_sum = ConstraintSum(
        id="at_least_one_shift_off_per_week",
        operator="less_than_or_equal",
        worker_var=var_um_worker,
        day_var=var_sum_day,
        shift_var=var_sum_shift,
        target_value=target_off,
        hard=True,
        penalty=None,
    )
    custom = Custom(
        constraints_sum=[
            constraint_sum,
        ]
    )

    inputs = Inputs(
        variable_space=variable_space,
        coverage=coverage,
        requests=requests,
        fixed_assignments=fix_assignments,
        custom=custom,
    )
    engine = Engine()
    outputs = engine.solve(inputs)
    assignments = outputs.assignments

    dates_weeks = get_dates_weeks(start_date, end_date)

    counts = [
        sum(
            1
            for a in assignments
            if a.worker_id == w and a.date in week and a.shift_id == "s0"
        )
        for week in dates_weeks
        for w in workers
    ]

    assert max(counts) <= target_off


def test_engine_solve_return_expected_constraint_sum_for_equal_hard():
    start_date = date.fromisoformat("2023-10-02")
    end_date = date.fromisoformat("2023-10-15")
    workers = ["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"]
    variable_space = VariableSpace(
        workers=workers,
        start_date=start_date,
        end_date=end_date,
        shifts=["s0", "s1", "s2", "s3"],
    )
    coverage = Coverage(coverage=[])
    requests = []
    fix_assignments = []

    # At least one shift off per week
    target_off = random.randint(1, 5)
    var_um_worker = VarSumWorker(selector="all")
    var_sum_day = VarSumDay(selector="week")
    var_sum_shift = VarSumShift(selector="equal", target="s0")
    constraint_sum = ConstraintSum(
        id="at_least_one_shift_off_per_week",
        operator="equal",
        worker_var=var_um_worker,
        day_var=var_sum_day,
        shift_var=var_sum_shift,
        target_value=target_off,
        hard=True,
        penalty=None,
    )
    custom = Custom(
        constraints_sum=[
            constraint_sum,
        ]
    )

    inputs = Inputs(
        variable_space=variable_space,
        coverage=coverage,
        requests=requests,
        fixed_assignments=fix_assignments,
        custom=custom,
    )
    engine = Engine()
    outputs = engine.solve(inputs)
    assignments = outputs.assignments

    dates_weeks = get_dates_weeks(start_date, end_date)

    counts = [
        sum(
            1
            for a in assignments
            if a.worker_id == w and a.date in week and a.shift_id == "s0"
        )
        for week in dates_weeks
        for w in workers
    ]

    assert all(count == target_off for count in counts)


def test_engine_solve_return_expected_constraint_sum_for_greater_than_or_equal_hard():
    start_date = date.fromisoformat("2023-10-02")
    end_date = date.fromisoformat("2023-10-15")
    workers = ["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"]
    variable_space = VariableSpace(
        workers=workers,
        start_date=start_date,
        end_date=end_date,
        shifts=["s0", "s1", "s2", "s3"],
    )
    coverage = Coverage(coverage=[])
    requests = []
    fix_assignments = []

    # At least one shift off per week
    target_off = random.randint(1, 5)
    var_um_worker = VarSumWorker(selector="all")
    var_sum_day = VarSumDay(selector="week")
    var_sum_shift = VarSumShift(selector="equal", target="s0")
    constraint_sum = ConstraintSum(
        id="at_least_one_shift_off_per_week",
        operator="greater_than_or_equal",
        worker_var=var_um_worker,
        day_var=var_sum_day,
        shift_var=var_sum_shift,
        target_value=target_off,
        hard=True,
        penalty=None,
    )
    custom = Custom(
        constraints_sum=[
            constraint_sum,
        ]
    )

    inputs = Inputs(
        variable_space=variable_space,
        coverage=coverage,
        requests=requests,
        fixed_assignments=fix_assignments,
        custom=custom,
    )
    engine = Engine()
    outputs = engine.solve(inputs)
    assignments = outputs.assignments

    dates_weeks = get_dates_weeks(start_date, end_date)

    counts = [
        sum(
            1
            for a in assignments
            if a.worker_id == w and a.date in week and a.shift_id == "s0"
        )
        for week in dates_weeks
        for w in workers
    ]

    assert min(counts) >= target_off


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


def test_engine_solve_return_expected_constraint_sum_for_less_than_or_equal_soft():
    start_date = date.fromisoformat("2023-10-02")
    end_date = date.fromisoformat("2023-10-15")
    workers = ["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"]
    variable_space = VariableSpace(
        workers=workers,
        start_date=start_date,
        end_date=end_date,
        shifts=["s0", "s1", "s2", "s3"],
    )
    coverage = Coverage(coverage=[])
    requests = []
    fix_assignments = []

    # At least one shift off per week
    target_hard = 4
    target_soft = 2
    penalty = 20
    var_um_worker = VarSumWorker(selector="all")
    var_sum_day = VarSumDay(selector="week")
    var_sum_shift = VarSumShift(selector="equal", target="s0")
    constraint_sum_hard = ConstraintSum(
        id="at_least_one_shift_off_per_week",
        operator="equal",
        worker_var=var_um_worker,
        day_var=var_sum_day,
        shift_var=var_sum_shift,
        target_value=target_hard,
        hard=True,
        penalty=None,
    )
    constraint_sum_soft = ConstraintSum(
        id="at_least_one_shift_off_per_week",
        operator="less_than_or_equal",
        worker_var=var_um_worker,
        day_var=var_sum_day,
        shift_var=var_sum_shift,
        target_value=target_soft,
        hard=False,
        penalty=penalty,
    )
    custom = Custom(
        constraints_sum=[
            constraint_sum_hard,
            constraint_sum_soft,
        ]
    )

    inputs = Inputs(
        variable_space=variable_space,
        coverage=coverage,
        requests=requests,
        fixed_assignments=fix_assignments,
        custom=custom,
    )
    engine = Engine()
    outputs = engine.solve(inputs)
    assignments = outputs.assignments

    dates_weeks = get_dates_weeks(start_date, end_date)

    counts = [
        sum(
            1
            for a in assignments
            if a.worker_id == w and a.date in week and a.shift_id == "s0"
        )
        for week in dates_weeks
        for w in workers
    ]

    assert all(count == target_hard for count in counts)
    assert outputs.objective_value == penalty * len(workers) * len(
        dates_weeks
    ) * abs(target_hard - target_soft)


def test_engine_solve_return_expected_constraint_breaches_variables_constraint_sum_for_less_than_or_equal_soft():
    start_date = date.fromisoformat("2023-10-02")
    end_date = date.fromisoformat("2023-10-15")
    workers = ["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"]
    variable_space = VariableSpace(
        workers=workers,
        start_date=start_date,
        end_date=end_date,
        shifts=["s0", "s1", "s2", "s3"],
    )
    coverage = Coverage(coverage=[])
    requests = []
    fix_assignments = []

    # At least one shift off per week
    target_hard = 4
    target_soft = 2
    penalty = 20
    target_shift = "s0"
    var_um_worker = VarSumWorker(selector="all")
    var_sum_day = VarSumDay(selector="week")
    var_sum_shift = VarSumShift(selector="equal", target=target_shift)
    constraint_sum_hard = ConstraintSum(
        id="at_least_one_shift_off_per_week",
        operator="equal",
        worker_var=var_um_worker,
        day_var=var_sum_day,
        shift_var=var_sum_shift,
        target_value=target_hard,
        hard=True,
        penalty=None,
    )
    constraint_sum_soft = ConstraintSum(
        id="at_least_one_shift_off_per_week",
        operator="less_than_or_equal",
        worker_var=var_um_worker,
        day_var=var_sum_day,
        shift_var=var_sum_shift,
        target_value=target_soft,
        hard=False,
        penalty=penalty,
    )
    custom = Custom(
        constraints_sum=[
            constraint_sum_hard,
            constraint_sum_soft,
        ]
    )

    inputs = Inputs(
        variable_space=variable_space,
        coverage=coverage,
        requests=requests,
        fixed_assignments=fix_assignments,
        custom=custom,
    )
    engine = Engine()
    outputs = engine.solve(inputs)

    dates_weeks = get_dates_weeks(start_date, end_date)

    expected_variables = [
        [[w, d, target_shift] for d in week]
        for week in dates_weeks
        for w in workers
    ]

    # all constraint_breaches' variables are in expected_variables
    assert all(
        [
            any(
                cb_variable in exp_variables
                for exp_variables in expected_variables
            )
            for cb in outputs.constraint_breaches
            for cb_variable in cb.variables
        ]
    )
    # all expected_variables are in constraint_breaches' variables
    assert all(
        [
            any(
                exp_variable in cb.variables
                for cb in outputs.constraint_breaches
            )
            for exp_variables in expected_variables
            for exp_variable in exp_variables
        ]
    )


def test_engine_solve_return_expected_constraint_breaches_value_diff_constraint_sum_for_less_than_or_equal_soft():
    start_date = date.fromisoformat("2023-10-02")
    end_date = date.fromisoformat("2023-10-15")
    workers = ["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"]
    variable_space = VariableSpace(
        workers=workers,
        start_date=start_date,
        end_date=end_date,
        shifts=["s0", "s1", "s2", "s3"],
    )
    coverage = Coverage(coverage=[])
    requests = []
    fix_assignments = []

    # At least one shift off per week
    target_hard = 4
    target_soft = 2
    penalty = 20
    target_shift = "s0"
    var_um_worker = VarSumWorker(selector="all")
    var_sum_day = VarSumDay(selector="week")
    var_sum_shift = VarSumShift(selector="equal", target=target_shift)
    constraint_sum_hard = ConstraintSum(
        id="at_least_one_shift_off_per_week",
        operator="equal",
        worker_var=var_um_worker,
        day_var=var_sum_day,
        shift_var=var_sum_shift,
        target_value=target_hard,
        hard=True,
        penalty=None,
    )
    constraint_sum_soft = ConstraintSum(
        id="at_least_one_shift_off_per_week",
        operator="less_than_or_equal",
        worker_var=var_um_worker,
        day_var=var_sum_day,
        shift_var=var_sum_shift,
        target_value=target_soft,
        hard=False,
        penalty=penalty,
    )
    custom = Custom(
        constraints_sum=[
            constraint_sum_hard,
            constraint_sum_soft,
        ]
    )

    inputs = Inputs(
        variable_space=variable_space,
        coverage=coverage,
        requests=requests,
        fixed_assignments=fix_assignments,
        custom=custom,
    )
    engine = Engine()
    outputs = engine.solve(inputs)

    expected_value_diff = target_hard - target_soft

    assert all(
        [
            cb.value_diff == expected_value_diff
            for cb in outputs.constraint_breaches
        ]
    )
