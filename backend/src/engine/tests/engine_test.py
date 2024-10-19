from datetime import date, datetime, timedelta
from typing import Callable, List

import pytest

from engine.engine import Engine

# pylint: disable=unused-import
from engine.tests.test_mode_fixture_test import set_test_mode  # noqa: F401
from engine.types.input_output_types import (
    Constraints,
    Coverage,
    FixedConfig,
    Inputs,
    NbDuties,
    Outputs,
    Request,
    Shift,
    Staffing,
    Variables,
    VariableSpace,
    Worker,
    WorkLoads,
    WorkTime,
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
            workers=[
                Worker(
                    id="w0",
                    work_hours=[],
                    work_hours_desired=[],
                    duties_per_month=[],
                    specialty_ids=[],
                    deleted=False,
                ),
                Worker(
                    id="w1",
                    work_hours=[],
                    work_hours_desired=[],
                    duties_per_month=[],
                    specialty_ids=[],
                    deleted=False,
                ),
                Worker(
                    id="w2",
                    work_hours=[],
                    work_hours_desired=[],
                    duties_per_month=[],
                    specialty_ids=[],
                    deleted=False,
                ),
                Worker(
                    id="w3",
                    work_hours=[],
                    work_hours_desired=[],
                    duties_per_month=[],
                    specialty_ids=[],
                    deleted=False,
                ),
                Worker(
                    id="w4",
                    work_hours=[],
                    work_hours_desired=[],
                    duties_per_month=[],
                    specialty_ids=[],
                    deleted=False,
                ),
                Worker(
                    id="w5",
                    work_hours=[],
                    work_hours_desired=[],
                    duties_per_month=[],
                    specialty_ids=[],
                    deleted=False,
                ),
                Worker(
                    id="w6",
                    work_hours=[],
                    work_hours_desired=[],
                    duties_per_month=[],
                    specialty_ids=[],
                    deleted=False,
                ),
                Worker(
                    id="w7",
                    work_hours=[],
                    work_hours_desired=[],
                    duties_per_month=[],
                    specialty_ids=[],
                    deleted=False,
                ),
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
            shifts=[
                Shift(
                    id=s_id,
                    staffing=[Staffing(specialty_id=None, staffing=1)],
                    work_shift=True,
                    deleted=False,
                )
                for s_id in shift_names
            ],
            duty_recup_pairs=[],
        )
        coverage = Coverage([])
        requests: List[Request] = []
        constraints: Constraints = Constraints(sum=[], seq=[], ord=[], fil=[], fai=[])
        inputs = Inputs(
            variables=Variables([], []),
            no_overlap_shift_intervals=[[]],
            work_loads=WorkLoads(
                weekly_work_time_contractual=WorkTime(
                    assignments=[],
                    targets=[],
                    durations=[],
                    penalty=50,
                ),
                weekly_work_time_desired=WorkTime(
                    assignments=[],
                    targets=[],
                    durations=[],
                    penalty=50,
                ),
                weekly_work_time_max=WorkTime(
                    assignments=[],
                    targets=[],
                    durations=[],
                    penalty=0,
                ),
                monthly_nb_duties_desired=NbDuties(
                    assignments=[],
                    targets=[],
                    penalty=100,
                ),
                monthly_nb_duties_max=NbDuties(
                    assignments=[],
                    targets=[],
                    penalty=0,
                ),
            ),
            variable_space=variable_space,
            coverage=coverage,
            new_shift_demands=[],
            requests=requests,
            constraints=constraints,
            duty_recup_pairs=[],
            worker_shift_filters=[],
            fixed_values={},
            sol_hint={},
            shift_durations={
                s_id: int((s_et - s_st).total_seconds() // Constants.NUM_SECONDS_MINUTE)
                for s_id, s_st, s_et in zip(
                    shift_names, shift_start_times, shift_end_times
                )
            },
            fixed_config=FixedConfig([], []),
        )
        return inputs

    @pytest.fixture
    def engine_solve(self, inputs: Inputs) -> Callable[[Inputs], Outputs]:
        engine = Engine()
        return lambda inputs=inputs: engine.solve(inputs)  # type: ignore
