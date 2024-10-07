from datetime import date, datetime, timedelta
from typing import Callable, List

import pytest

from engine.engine import Engine

# pylint: disable=unused-import
from engine.tests.test_mode_fixture_test import set_test_mode  # noqa: F401
from engine.types.input_output_types import (
    Constraint,
    Coverage,
    Inputs,
    Outputs,
    Request,
    VariableSpace,
)
from utils.constants import Constants


class TestEngine:
    @pytest.fixture
    def inputs(self) -> Inputs:
        start_date = date.fromisoformat("2023-10-02")
        end_date = date.fromisoformat("2023-10-15")
        shift_names = ["s0", "s1", "s2", "s3", "s4"]
        shift_start_times = [
            datetime.fromisoformat("2023-10-02 08:00:00"),
            datetime.fromisoformat("2023-10-02 12:00:00"),
            datetime.fromisoformat("2023-10-02 12:00:00"),
            datetime.fromisoformat("2023-10-02 16:00:00"),
            datetime.fromisoformat("2023-10-02 16:00:00"),
        ]
        shift_end_times = [
            datetime.fromisoformat("2023-10-02 12:00:00"),  # 4 hours
            datetime.fromisoformat("2023-10-02 12:00:00"),  # 0 hours
            datetime.fromisoformat("2023-10-02 16:00:00"),  # 4 hours
            datetime.fromisoformat("2023-10-02 20:00:00"),  # 4 hours
            datetime.fromisoformat("2023-10-02 17:00:00"),  # 1 hours, conflict with s3
        ]
        variable_space = VariableSpace(
            all_workers=["w0", "w1", "w2", "w3", "w4", "w5", "w6", "w7"],
            workers_not_deleted=[
                "w0",
                "w1",
                "w2",
                "w3",
                "w4",
                "w5",
                "w6",
                "w7",
            ],
            all_days=[
                d.strftime(Constants.ENGINE_STRING_DATE_FORMAT)
                for d in [
                    start_date + timedelta(days=i)
                    for i in range((end_date - start_date).days + 1)
                ]
            ],
            days_solving=[
                d.strftime(Constants.ENGINE_STRING_DATE_FORMAT)
                for d in [
                    start_date + timedelta(days=i)
                    for i in range((end_date - start_date).days + 1)
                ]
            ],
            all_shifts=shift_names,
            shifts_not_deleted=shift_names,
            duty_recup_pairs=[],
        )
        coverage = Coverage([])
        requests: List[Request] = []
        constraints: List[Constraint] = []
        inputs = Inputs(
            variable_space=variable_space,
            coverage=coverage,
            requests=requests,
            constraints=constraints,
            fixed_values={},
            sol_hint={},
            shift_durations={
                s_id: int((s_et - s_st).total_seconds() // Constants.NUM_SECONDS_MINUTE)
                for s_id, s_st, s_et in zip(
                    shift_names, shift_start_times, shift_end_times
                )
            },
            shift_start_times={
                (d.strftime(Constants.ENGINE_STRING_DATE_FORMAT), s_id): int(
                    s_st.replace(year=d.year, month=d.month, day=d.day).timestamp()
                    // Constants.NUM_SECONDS_MINUTE
                )
                for s_id, s_st in zip(shift_names, shift_start_times)
                for d in [
                    start_date + timedelta(days=i)
                    for i in range((end_date - start_date).days + 1)
                ]
            },
            shift_end_times={
                (d.strftime(Constants.ENGINE_STRING_DATE_FORMAT), s_id): int(
                    s_et.replace(year=d.year, month=d.month, day=d.day).timestamp()
                    // Constants.NUM_SECONDS_MINUTE
                )
                for s_id, s_et in zip(shift_names, shift_end_times)
                for d in [
                    start_date + timedelta(days=i)
                    for i in range((end_date - start_date).days + 1)
                ]
            },
        )
        return inputs

    @pytest.fixture
    def engine_solve(self, inputs: Inputs) -> Callable[[Inputs], Outputs]:
        engine = Engine()
        return lambda inputs=inputs: engine.solve(inputs)  # type: ignore
