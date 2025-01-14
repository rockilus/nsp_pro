import random
from datetime import timedelta
from typing import Dict

from shared.schemas import ShiftRestType, ShiftType

from tests.engine_tests.engine_solve import engine_solve

# pylint: disable=unused-import
from tests.test_data import sample_data  # noqa: F401


# pylint: disable=R0801
class TestDutyRecupConstraint:
    # pylint: disable=redefined-outer-name, too-many-locals
    def test_duty_recup_one_duty_no_specialty(
        self, sample_data: Dict  # noqa: F811
    ) -> None:
        target_random = random.randint(1, 5)

        shifts = sample_data["shifts"]
        shifts_duty = [shift for shift in shifts if shift.shift_type == ShiftType.DUTY]
        shift_target = shifts_duty[0]
        shift_id_target = shift_target.id
        shift_recup = next(
            (
                shift
                for shift in shifts
                if shift.rest_type == ShiftRestType.RECUPERATION
                and shift.recuperation_duty_id == shift_id_target
            ),
            None,
        )
        assert shift_recup is not None
        shift_id_recup = shift_recup.id
        sample_data["shifts"] = [shift_target, shift_recup]

        dsds = sample_data["daily_shift_demands"]
        dsds_duty = [dsd for dsd in dsds if dsd.shift_id == shift_id_target]
        dsds_duty[0].count = target_random
        sample_data["daily_shift_demands"] = dsds_duty

        outputs = engine_solve(sample_data)

        schedule = sample_data["schedule"]
        dates = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        shift_ids_assigned = [a.shift_id for a in outputs.assignments]
        assert sorted(set(shift_ids_assigned)) == sorted(
            set([shift_id_target, shift_id_recup])
        )

        # Check duty shift assigned
        for d in dates:
            for shift in shifts:
                if shift.id == shift_id_target:
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
            a for a in outputs.assignments if a.shift_id == shift_id_target
        ]
        for a in assignments_duty:
            assignment_recup = next(
                (
                    a_recup
                    for a_recup in outputs.assignments
                    if a_recup.worker_id == a.worker_id
                    and a_recup.shift_id == shift_id_recup
                    and a_recup.date == a.date
                ),
                None,
            )
            assert assignment_recup is not None

    # pylint: disable=redefined-outer-name
    def test_duty_recup_two_duty_no_specialty(
        self, sample_data: Dict  # noqa: F811
    ) -> None:
        shifts = sample_data["shifts"]
        shifts_duty = [shift for shift in shifts if shift.shift_type == ShiftType.DUTY]
        shift_ids_target = [shift.id for shift in shifts_duty]
        shifts_recup = [s for s in shifts if s.recuperation_duty_id in shift_ids_target]
        assert len(shifts_duty) == len(shifts_recup)
        shift_ids_recup = [shift.id for shift in shifts_recup]
        sample_data["shifts"] = shifts_duty + shifts_recup

        dsds = sample_data["daily_shift_demands"]
        dsds_duty = [dsd for dsd in dsds if dsd.shift_id in shift_ids_target]
        sample_data["daily_shift_demands"] = dsds_duty

        outputs = engine_solve(sample_data)

        schedule = sample_data["schedule"]
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
