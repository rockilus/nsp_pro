from datetime import timedelta

import pytest
from shared.schemas.core import EngineInputsAugmented, ShiftRestType, ShiftType

from tests.engine_tests.engine_solve import engine_solve_engine_inputs
from tests.sample_data import test_data_set_1


# pylint: disable=R0801
class TestDutyRecupConstraint:
    # pylint: disable=too-many-locals
    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_duty_recup_duty_no_specialty(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        shifts = sample_data.shifts
        shifts_duty = [shift for shift in shifts if shift.shift_type == ShiftType.DUTY]
        shifts_recup = [s for s in shifts if s.rest_type == ShiftRestType.RECUPERATION]
        shift_ids_duty = [shift.id for shift in shifts_duty]
        shift_ids_recup = [shift.id for shift in shifts_recup]
        sample_data.shifts = shifts_duty + shifts_recup

        dsds = sample_data.shift_demands
        dsds_duty = [dsd for dsd in dsds if dsd.shift_id in shift_ids_duty]
        sample_data.shift_demands = dsds_duty

        outputs = engine_solve_engine_inputs(sample_data)

        schedule = sample_data.schedule
        dates = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        shift_ids_assigned = [a.shift_id for a in outputs.assignments]
        assert sorted(set(shift_ids_assigned)) == sorted(
            set(shift_ids_duty + shift_ids_recup)
        )

        # Check duty shift assigned
        for d in dates:
            for shift in shifts:
                if shift.id in shift_ids_duty:
                    shift_staffing = sum(s.staffing for s in shift.staffing)
                    count_target = sum(
                        dsd.count * shift_staffing
                        for dsd in dsds_duty
                        if dsd.date == d and dsd.shift_id == shift.id
                    )
                    count_actual = sum(
                        1
                        for a in outputs.assignments
                        if a.date == d and a.shift_id == shift.id
                    )

                    assert count_actual == count_target

        # Check recup shift assigned
        assignments_duty = [
            a for a in outputs.assignments if a.shift_id in shift_ids_duty
        ]
        for a in assignments_duty:
            shift_recup = next(
                (s for s in shifts if s.recuperation_duty_id == a.shift_id),
                None,
            )
            assert shift_recup is not None
            assignment_recup = next(
                (
                    a_recup
                    for a_recup in outputs.assignments
                    if a_recup.worker_id == a.worker_id
                    and a_recup.shift_id == shift_recup.id
                    and a_recup.date == a.date
                ),
                None,
            )
            assert assignment_recup is not None

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_duty_recup_two_duty_no_specialty(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        shifts = sample_data.shifts
        shifts_duty = [shift for shift in shifts if shift.shift_type == ShiftType.DUTY]
        shift_ids_target = [shift.id for shift in shifts_duty]
        shifts_recup = [s for s in shifts if s.recuperation_duty_id in shift_ids_target]
        assert len(shifts_duty) == len(shifts_recup)
        shift_ids_recup = [shift.id for shift in shifts_recup]
        sample_data.shifts = shifts_duty + shifts_recup

        dsds = sample_data.shift_demands
        dsds_duty = [dsd for dsd in dsds if dsd.shift_id in shift_ids_target]
        sample_data.shift_demands = dsds_duty

        outputs = engine_solve_engine_inputs(sample_data)

        schedule = sample_data.schedule
        dates = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        shift_ids_assigned = [a.shift_id for a in outputs.assignments]
        assert sorted(set(shift_ids_assigned)) == sorted(
            set(shift_ids_target + shift_ids_recup)
        )

        # Check duty shift assigned
        for d in dates:
            for shift in shifts:
                if shift.id in shift_ids_target:
                    shift_staffing = sum(s.staffing for s in shift.staffing)
                    count_target = sum(
                        dsd.count * shift_staffing
                        for dsd in dsds_duty
                        if dsd.date == d and dsd.shift_id == shift.id
                    )
                    count_actual = sum(
                        1
                        for a in outputs.assignments
                        if a.date == d and a.shift_id == shift.id
                    )

                    assert count_actual == count_target

        # Check recup shift assigned
        assignments_duty = [
            a for a in outputs.assignments if a.shift_id in shift_ids_target
        ]
        for a in assignments_duty:
            assignment_recup = next(
                (
                    a_recup
                    for a_recup in outputs.assignments
                    if a_recup.worker_id == a.worker_id
                    and a_recup.shift_id in shift_ids_recup
                    and a_recup.date == a.date
                ),
                None,
            )
            assert assignment_recup is not None
