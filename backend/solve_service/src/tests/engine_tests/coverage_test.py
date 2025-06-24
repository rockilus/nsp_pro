import random
from datetime import timedelta

import pytest
from shared.schemas.core import (
    EngineInputsAugmented,
    ShiftType,
    Specialty,
    Staffing,
)

from tests.engine_tests.engine_solve import engine_solve_engine_inputs
from tests.sample_data import test_data_set_1

# constraints = self.model.Proto().constraints
# variables = self.model.Proto().variables
# test = constraint.linear.vars


class TestCoverage:
    # pylint: disable=too-many-locals
    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_expected_assignments_normal(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        target_random = random.randint(1, 5)

        shifts = sample_data.shifts
        shifts_normal = [
            shift for shift in shifts if shift.shift_type == ShiftType.NORMAL
        ]
        shift_ids_normal = [shift.id for shift in shifts_normal]
        sample_data.shifts = shifts_normal

        dsds = sample_data.shift_demands
        dsds_normal = [dsd for dsd in dsds if dsd.shift_id in shift_ids_normal]
        if not dsds_normal:
            return
        dsds_normal[0].count = target_random
        sample_data.shift_demands = dsds_normal

        outputs = engine_solve_engine_inputs(sample_data)

        schedule = sample_data.schedule
        dates = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        shift_ids_assigned = [a.shift_id for a in outputs.assignments]
        assert sorted(set(shift_ids_assigned)) == sorted(set(shift_ids_normal))

        for d in dates:
            for shift in shifts:
                shift_staffing = sum(s.staffing for s in shift.staffing)
                count_target = sum(
                    dsd.count * shift_staffing
                    for dsd in dsds_normal
                    if dsd.date == d and dsd.shift_id == shift.id
                )
                count_actual = sum(
                    1
                    for a in outputs.assignments
                    if a.date == d and a.shift_id == shift.id
                )

                assert count_actual == count_target

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_expected_assignments_normal_with_specialty(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        # target_random = random.randint(1, 5)
        target_random = 3
        specialty = Specialty(
            id="spe_1", team_id="t0", name="Specialty 1", deleted=False
        )

        shifts = sample_data.shifts
        shifts_normal = [
            shift for shift in shifts if shift.shift_type == ShiftType.NORMAL
        ]
        if not shifts_normal:
            return
        shift_id_target = shifts_normal[0].id
        for shift in shifts_normal:
            if shift.id == shift_id_target:
                shift.staffing = [
                    Staffing(specialty_id=specialty.id, staffing=target_random)
                ]
        shift_ids_normal = [shift.id for shift in shifts_normal]
        sample_data.shifts = shifts_normal

        dsds = sample_data.shift_demands
        dsds_normal = [dsd for dsd in dsds if dsd.shift_id in shift_ids_normal]
        sample_data.shift_demands = dsds_normal

        workers = sample_data.workers
        target_num_specialists = 5
        for worker in workers[0:target_num_specialists]:
            worker.specialty_ids = [specialty.id]
        worker_ids_specialists = [
            worker.id for worker in workers[0:target_num_specialists]
        ]
        sample_data.workers = workers

        outputs = engine_solve_engine_inputs(sample_data)

        schedule = sample_data.schedule
        dates = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        shift_ids_assigned = [a.shift_id for a in outputs.assignments]
        assert sorted(set(shift_ids_assigned)) == sorted(set(shift_ids_normal))

        worker_ids_assigned_specialists = [
            a.worker_id for a in outputs.assignments if a.shift_id == shift_id_target
        ]
        assert set(worker_ids_assigned_specialists).issubset(
            set(worker_ids_specialists)
        )

        for d in dates:
            for shift in shifts:
                shift_staffing = sum(s.staffing for s in shift.staffing)
                count_target = sum(
                    dsd.count * shift_staffing
                    for dsd in dsds_normal
                    if dsd.date == d and dsd.shift_id == shift.id
                )
                count_actual = sum(
                    1
                    for a in outputs.assignments
                    if a.date == d and a.shift_id == shift.id
                )
                assert count_actual == count_target

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_expected_assignments_specialty_only(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        target_random = random.randint(1, 5)
        specialty = Specialty(
            id="spe_1", team_id="t0", name="Specialty 1", deleted=False
        )

        shifts = sample_data.shifts
        shifts_normal = [
            shift for shift in shifts if shift.shift_type == ShiftType.NORMAL
        ]
        if not shifts_normal:
            return
        shift_target = shifts_normal[0]
        shift_target.staffing = [
            Staffing(specialty_id=specialty.id, staffing=target_random)
        ]
        sample_data.shifts = [shift_target]

        dsds = sample_data.shift_demands
        dsds_shift_target = [dsd for dsd in dsds if dsd.shift_id == shift_target.id]
        sample_data.shift_demands = dsds_shift_target

        workers = sample_data.workers
        target_num_specialists = 5
        for worker in workers[0:target_num_specialists]:
            worker.specialty_ids = [specialty.id]
        worker_ids_specialists = [
            worker.id for worker in workers[0:target_num_specialists]
        ]
        sample_data.workers = workers

        outputs = engine_solve_engine_inputs(sample_data)

        shift_ids_assigned = [a.shift_id for a in outputs.assignments]
        assert sorted(set(shift_ids_assigned)) == sorted(set([shift_target.id]))

        worker_ids_assigned_specialists = [
            a.worker_id for a in outputs.assignments if a.shift_id == shift_target.id
        ]
        assert set(worker_ids_assigned_specialists).issubset(
            set(worker_ids_specialists)
        )

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_expected_assignments_with_specialty_q1_diff_q2(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        target_random_spe_1 = random.randint(1, 3)
        target_random_spe_2 = random.randint(1, 3)
        specialty_1 = Specialty(
            id="spe_1", team_id="t0", name="Specialty 1", deleted=False
        )
        specialty_2 = Specialty(
            id="spe_2", team_id="t0", name="Specialty 2", deleted=False
        )

        shifts = sample_data.shifts
        shifts_normal = [
            shift for shift in shifts if shift.shift_type == ShiftType.NORMAL
        ]
        if len(shifts_normal) < 2:
            return
        shift_id_target_1 = shifts_normal[0].id
        shift_id_target_2 = shifts_normal[1].id
        for shift in shifts_normal:
            if shift.id == shift_id_target_1:
                shift.staffing = [
                    Staffing(
                        specialty_id=specialty_1.id,
                        staffing=target_random_spe_1,
                    )
                ]
            if shift.id == shift_id_target_2:
                shift.staffing = [
                    Staffing(
                        specialty_id=specialty_2.id,
                        staffing=target_random_spe_2,
                    )
                ]
        shift_ids_normal = [shift.id for shift in shifts_normal]
        sample_data.shifts = shifts_normal

        dsds = sample_data.shift_demands
        dsds_normal = [dsd for dsd in dsds if dsd.shift_id in shift_ids_normal]
        sample_data.shift_demands = dsds_normal

        workers = sample_data.workers
        target_num_specialists_spe_1 = 3
        target_num_specialists_spe_2 = 3
        for worker in workers[0:target_num_specialists_spe_1]:
            worker.specialty_ids = [specialty_1.id]
        for worker in workers[
            target_num_specialists_spe_1 : target_num_specialists_spe_1
            + target_num_specialists_spe_2
        ]:
            worker.specialty_ids = [specialty_2.id]
        worker_ids_specialists_spe_1 = [
            worker.id for worker in workers[0:target_num_specialists_spe_1]
        ]
        worker_ids_specialists_spe_2 = [
            worker.id
            for worker in workers[
                target_num_specialists_spe_1 : target_num_specialists_spe_1
                + target_num_specialists_spe_2
            ]
        ]
        sample_data.workers = workers

        outputs = engine_solve_engine_inputs(sample_data)

        schedule = sample_data.schedule
        dates = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        shift_ids_assigned = [a.shift_id for a in outputs.assignments]
        assert sorted(set(shift_ids_assigned)) == sorted(set(shift_ids_normal))

        worker_ids_assigned_specialists_1 = [
            a.worker_id for a in outputs.assignments if a.shift_id == shift_id_target_1
        ]
        assert set(worker_ids_assigned_specialists_1).issubset(
            set(worker_ids_specialists_spe_1)
        )

        worker_ids_assigned_specialists_2 = [
            a.worker_id for a in outputs.assignments if a.shift_id == shift_id_target_2
        ]
        assert set(worker_ids_assigned_specialists_2).issubset(
            set(worker_ids_specialists_spe_2)
        )

        for d in dates:
            for shift in shifts:
                shift_staffing = sum(s.staffing for s in shift.staffing)
                count_target = sum(
                    dsd.count * shift_staffing
                    for dsd in dsds_normal
                    if dsd.date == d and dsd.shift_id == shift.id
                )
                count_actual = sum(
                    1
                    for a in outputs.assignments
                    if a.date == d and a.shift_id == shift.id
                )
                assert count_actual == count_target

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_expected_assignments_with_specialty_q1_overlap_q2(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        target_random_spe_1 = random.randint(1, 3)
        target_random_spe_2 = random.randint(1, 3)
        specialty_1 = Specialty(
            id="spe_1", team_id="t0", name="Specialty 1", deleted=False
        )
        specialty_2 = Specialty(
            id="spe_2", team_id="t0", name="Specialty 2", deleted=False
        )

        shifts = sample_data.shifts
        shifts_normal = [
            shift for shift in shifts if shift.shift_type == ShiftType.NORMAL
        ]
        if len(shifts_normal) < 2:
            return
        shift_id_target_1 = shifts_normal[0].id
        shift_id_target_2 = shifts_normal[1].id
        for shift in shifts_normal:
            if shift.id == shift_id_target_1:
                shift.staffing = [
                    Staffing(
                        specialty_id=specialty_1.id,
                        staffing=target_random_spe_1,
                    )
                ]
            if shift.id == shift_id_target_2:
                shift.staffing = [
                    Staffing(
                        specialty_id=specialty_2.id,
                        staffing=target_random_spe_2,
                    ),
                ]
        shift_ids_normal = [shift.id for shift in shifts_normal]
        sample_data.shifts = shifts_normal

        dsds = sample_data.shift_demands
        dsds_normal = [dsd for dsd in dsds if dsd.shift_id in shift_ids_normal]
        sample_data.shift_demands = dsds_normal

        workers = sample_data.workers
        target_num_qualified_spe_1 = target_random_spe_1 - 1
        target_num_qualified_spe_2 = target_random_spe_2 - 1
        target_num_qualified_spe_1_2 = 2
        for worker in workers[0:target_num_qualified_spe_1]:
            worker.specialty_ids = [specialty_1.id]
        for worker in workers[
            target_num_qualified_spe_1 : target_num_qualified_spe_1
            + target_num_qualified_spe_2
        ]:
            worker.specialty_ids = [specialty_2.id]
        for worker in workers[
            target_num_qualified_spe_1
            + target_num_qualified_spe_2 : target_num_qualified_spe_1
            + target_num_qualified_spe_2
            + target_num_qualified_spe_1_2
        ]:
            worker.specialty_ids = [specialty_1.id, specialty_2.id]
        worker_ids_qualified_spe_1 = [
            worker.id for worker in workers[0:target_num_qualified_spe_1]
        ]
        worker_ids_qualified_spe_2 = [
            worker.id
            for worker in workers[
                target_num_qualified_spe_1 : target_num_qualified_spe_1
                + target_num_qualified_spe_2
            ]
        ]
        worker_ids_qualified_spe_1_2 = [
            worker.id
            for worker in workers[
                target_num_qualified_spe_1
                + target_num_qualified_spe_2 : target_num_qualified_spe_1
                + target_num_qualified_spe_2
                + target_num_qualified_spe_1_2
            ]
        ]
        sample_data.workers = workers

        outputs = engine_solve_engine_inputs(sample_data)

        schedule = sample_data.schedule
        dates = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        shift_ids_assigned = [a.shift_id for a in outputs.assignments]
        assert sorted(set(shift_ids_assigned)) == sorted(set(shift_ids_normal))

        worker_ids_assigned_qualified_1 = [
            a.worker_id for a in outputs.assignments if a.shift_id == shift_id_target_1
        ]
        assert set(worker_ids_assigned_qualified_1).issubset(
            set(worker_ids_qualified_spe_1 + worker_ids_qualified_spe_1_2)
        )

        worker_ids_assigned_qualified_2 = [
            a.worker_id for a in outputs.assignments if a.shift_id == shift_id_target_2
        ]
        assert set(worker_ids_assigned_qualified_2).issubset(
            set(worker_ids_qualified_spe_2 + worker_ids_qualified_spe_1_2)
        )

        for d in dates:
            for shift in shifts:
                shift_staffing = sum(s.staffing for s in shift.staffing)
                count_target = sum(
                    dsd.count * shift_staffing
                    for dsd in dsds_normal
                    if dsd.date == d and dsd.shift_id == shift.id
                )
                count_actual = sum(
                    1
                    for a in outputs.assignments
                    if a.date == d and a.shift_id == shift.id
                )
                assert count_actual == count_target

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_expected_assignments_with_specialty_q2_in_q1(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        target_random_spe_1 = random.randint(1, 3)
        target_random_spe_2 = random.randint(1, 3)
        specialty_1 = Specialty(
            id="spe_1", team_id="t0", name="Specialty 1", deleted=False
        )
        specialty_2 = Specialty(
            id="spe_2", team_id="t0", name="Specialty 2", deleted=False
        )

        shifts = sample_data.shifts
        shifts_normal = [
            shift for shift in shifts if shift.shift_type == ShiftType.NORMAL
        ]
        if len(shifts_normal) < 2:
            return
        shift_id_target_1 = shifts_normal[0].id
        shift_id_target_2 = shifts_normal[1].id
        for shift in shifts_normal:
            if shift.id == shift_id_target_1:
                shift.staffing = [
                    Staffing(
                        specialty_id=specialty_1.id,
                        staffing=target_random_spe_1,
                    )
                ]
            if shift.id == shift_id_target_2:
                shift.staffing = [
                    Staffing(
                        specialty_id=specialty_2.id,
                        staffing=target_random_spe_2,
                    ),
                ]
        shift_ids_normal = [shift.id for shift in shifts_normal]
        sample_data.shifts = shifts_normal

        dsds = sample_data.shift_demands
        dsds_normal = [dsd for dsd in dsds if dsd.shift_id in shift_ids_normal]
        sample_data.shift_demands = dsds_normal

        workers = sample_data.workers
        target_num_specialists_spe_1 = 3
        target_num_specialists_spe_1_2 = 3
        for worker in workers[0:target_num_specialists_spe_1]:
            worker.specialty_ids = [specialty_1.id]
        for worker in workers[
            target_num_specialists_spe_1 : target_num_specialists_spe_1
            + target_num_specialists_spe_1_2
        ]:
            worker.specialty_ids = [specialty_1.id, specialty_2.id]
        worker_ids_specialists_spe_1 = [
            worker.id for worker in workers[0:target_num_specialists_spe_1]
        ]
        worker_ids_specialists_spe_1_2 = [
            worker.id
            for worker in workers[
                target_num_specialists_spe_1 : target_num_specialists_spe_1
                + target_num_specialists_spe_1_2
            ]
        ]
        sample_data.workers = workers

        outputs = engine_solve_engine_inputs(sample_data)

        schedule = sample_data.schedule
        dates = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        shift_ids_assigned = [a.shift_id for a in outputs.assignments]
        assert sorted(set(shift_ids_assigned)) == sorted(set(shift_ids_normal))

        worker_ids_assigned_specialists_1 = [
            a.worker_id for a in outputs.assignments if a.shift_id == shift_id_target_1
        ]
        assert set(worker_ids_assigned_specialists_1).issubset(
            set(worker_ids_specialists_spe_1 + worker_ids_specialists_spe_1_2)
        )

        worker_ids_assigned_specialists_1_2 = [
            a.worker_id for a in outputs.assignments if a.shift_id == shift_id_target_2
        ]
        assert set(worker_ids_assigned_specialists_1_2).issubset(
            set(worker_ids_specialists_spe_1_2)
        )

        for d in dates:
            for shift in shifts:
                shift_staffing = sum(s.staffing for s in shift.staffing)
                count_target = sum(
                    dsd.count * shift_staffing
                    for dsd in dsds_normal
                    if dsd.date == d and dsd.shift_id == shift.id
                )
                count_actual = sum(
                    1
                    for a in outputs.assignments
                    if a.date == d and a.shift_id == shift.id
                )
                assert count_actual == count_target

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_expected_assignments_staffing_multiple_specialties(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        target_random_spe_1 = random.randint(1, 3)
        target_random_spe_2 = random.randint(1, 3)
        # target_random_spe_1 = 2
        # target_random_spe_2 = 2
        specialty_1 = Specialty(
            id="spe_1", team_id="t0", name="Specialty 1", deleted=False
        )
        specialty_2 = Specialty(
            id="spe_2", team_id="t0", name="Specialty 2", deleted=False
        )

        shifts = sample_data.shifts
        shifts_normal = [
            shift for shift in shifts if shift.shift_type == ShiftType.NORMAL
        ]
        if not shifts_normal:
            return
        shift_id_target = shifts_normal[0].id
        for shift in shifts_normal:
            if shift.id == shift_id_target:
                shift.staffing = [
                    Staffing(
                        specialty_id=specialty_1.id,
                        staffing=target_random_spe_1,
                    ),
                    Staffing(
                        specialty_id=specialty_2.id,
                        staffing=target_random_spe_2,
                    ),
                ]
        shift_ids_normal = [shift.id for shift in shifts_normal]
        sample_data.shifts = shifts_normal

        dsds = sample_data.shift_demands
        dsds_normal = [dsd for dsd in dsds if dsd.shift_id in shift_ids_normal]
        sample_data.shift_demands = dsds_normal

        workers = sample_data.workers
        target_num_qualified_spe_1 = target_random_spe_1
        target_num_qualified_spe_2 = target_random_spe_2
        for worker in workers[0:target_num_qualified_spe_1]:
            worker.specialty_ids = [specialty_1.id]
        for worker in workers[
            target_num_qualified_spe_1 : target_num_qualified_spe_1
            + target_num_qualified_spe_2
        ]:
            worker.specialty_ids = [specialty_2.id]
        worker_ids_qualified_spe_1 = [
            worker.id for worker in workers[0:target_num_qualified_spe_1]
        ]
        worker_ids_qualified_spe_2 = [
            worker.id
            for worker in workers[
                target_num_qualified_spe_1 : target_num_qualified_spe_1
                + target_num_qualified_spe_2
            ]
        ]
        sample_data.workers = workers

        outputs = engine_solve_engine_inputs(sample_data)

        schedule = sample_data.schedule
        dates = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        shift_ids_assigned = [a.shift_id for a in outputs.assignments]
        assert sorted(set(shift_ids_assigned)) == sorted(set(shift_ids_normal))

        worker_ids_assigned_target_shift = [
            a.worker_id for a in outputs.assignments if a.shift_id == shift_id_target
        ]
        assert set(worker_ids_assigned_target_shift).issubset(
            set(worker_ids_qualified_spe_1 + worker_ids_qualified_spe_2)
        )

        for d in dates:
            for shift in shifts:
                if shift.id == shift_id_target:
                    shift_staffing_spe_1 = sum(
                        s.staffing
                        for s in shift.staffing
                        if s.specialty_id == specialty_1.id
                    )
                    shift_staffing_spe_2 = sum(
                        s.staffing
                        for s in shift.staffing
                        if s.specialty_id == specialty_2.id
                    )
                    count_target_spe_1 = sum(
                        dsd.count * shift_staffing_spe_1
                        for dsd in dsds_normal
                        if dsd.date == d and dsd.shift_id == shift.id
                    )
                    count_target_spe_2 = sum(
                        dsd.count * shift_staffing_spe_2
                        for dsd in dsds_normal
                        if dsd.date == d and dsd.shift_id == shift.id
                    )
                    count_actual_spe_1 = sum(
                        1
                        for a in outputs.assignments
                        if a.date == d
                        and a.shift_id == shift.id
                        and a.worker_id in worker_ids_qualified_spe_1
                    )
                    count_actual_spe_2 = sum(
                        1
                        for a in outputs.assignments
                        if a.date == d
                        and a.shift_id == shift.id
                        and a.worker_id in worker_ids_qualified_spe_2
                    )
                    assert count_actual_spe_1 == count_target_spe_1
                    assert count_actual_spe_2 == count_target_spe_2
                else:
                    shift_staffing = sum(s.staffing for s in shift.staffing)
                    count_target = sum(
                        dsd.count * shift_staffing
                        for dsd in dsds_normal
                        if dsd.date == d and dsd.shift_id == shift.id
                    )
                    count_actual = sum(
                        1
                        for a in outputs.assignments
                        if a.date == d and a.shift_id == shift.id
                    )
                    assert count_actual == count_target

    # pylint: disable=too-many-statements
    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_expected_assignments_staffing_q1_q2_overlap_and_multiple_spe(
        self, sample_data: EngineInputsAugmented
    ) -> None:
        target_random_spe_1 = random.randint(1, 3)
        target_random_spe_2 = random.randint(1, 3)
        target_random_spe_1_2 = random.randint(1, 3)
        specialty_1 = Specialty(
            id="spe_1", team_id="t0", name="Specialty 1", deleted=False
        )
        specialty_2 = Specialty(
            id="spe_2", team_id="t0", name="Specialty 2", deleted=False
        )

        shifts = sample_data.shifts
        shifts_normal = [
            shift for shift in shifts if shift.shift_type == ShiftType.NORMAL
        ]
        if len(shifts_normal) < 3:
            return
        shift_id_target_1 = shifts_normal[0].id
        shift_id_target_2 = shifts_normal[1].id
        shift_id_target_1_2 = shifts_normal[2].id
        for shift in shifts_normal:
            if shift.id == shift_id_target_1:
                shift.staffing = [
                    Staffing(
                        specialty_id=specialty_1.id,
                        staffing=target_random_spe_1,
                    ),
                ]
            if shift.id == shift_id_target_2:
                shift.staffing = [
                    Staffing(
                        specialty_id=specialty_2.id,
                        staffing=target_random_spe_2,
                    ),
                ]
            if shift.id == shift_id_target_1_2:
                shift.staffing = [
                    Staffing(
                        specialty_id=specialty_1.id,
                        staffing=target_random_spe_1_2 - 1,
                    ),
                    Staffing(
                        specialty_id=specialty_2.id,
                        staffing=1,
                    ),
                ]
        shift_ids_normal = [shift.id for shift in shifts_normal]
        sample_data.shifts = shifts_normal

        dsds = sample_data.shift_demands
        dsds_normal = [dsd for dsd in dsds if dsd.shift_id in shift_ids_normal]
        sample_data.shift_demands = dsds_normal

        workers = sample_data.workers
        target_num_qualified_spe_1 = target_random_spe_1
        target_num_qualified_spe_2 = target_random_spe_2
        target_num_qualified_spe_1_2 = target_random_spe_1_2
        for worker in workers[0:target_num_qualified_spe_1]:
            worker.specialty_ids = [specialty_1.id]
        for worker in workers[
            target_num_qualified_spe_1 : target_num_qualified_spe_1
            + target_num_qualified_spe_2
        ]:
            worker.specialty_ids = [specialty_2.id]
        for worker in workers[
            target_num_qualified_spe_1
            + target_num_qualified_spe_2 : target_num_qualified_spe_1
            + target_num_qualified_spe_2
            + target_num_qualified_spe_1_2
        ]:
            worker.specialty_ids = [specialty_1.id, specialty_2.id]
        worker_ids_qualified_spe_1 = [
            worker.id for worker in workers[0:target_num_qualified_spe_1]
        ]
        worker_ids_qualified_spe_2 = [
            worker.id
            for worker in workers[
                target_num_qualified_spe_1 : target_num_qualified_spe_1
                + target_num_qualified_spe_2
            ]
        ]
        worker_ids_qualified_spe_1_2 = [
            worker.id
            for worker in workers[
                target_num_qualified_spe_1
                + target_num_qualified_spe_2 : target_num_qualified_spe_1
                + target_num_qualified_spe_2
                + target_num_qualified_spe_1_2
            ]
        ]
        sample_data.workers = workers

        outputs = engine_solve_engine_inputs(sample_data)

        schedule = sample_data.schedule
        dates = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        shift_ids_assigned = [a.shift_id for a in outputs.assignments]
        assert sorted(set(shift_ids_assigned)) == sorted(set(shift_ids_normal))

        worker_ids_assigned_target_shift_1 = [
            a.worker_id for a in outputs.assignments if a.shift_id == shift_id_target_1
        ]
        assert set(worker_ids_assigned_target_shift_1).issubset(
            set(worker_ids_qualified_spe_1 + worker_ids_qualified_spe_1_2)
        )

        worker_ids_assigned_target_shift_2 = [
            a.worker_id for a in outputs.assignments if a.shift_id == shift_id_target_2
        ]
        assert set(worker_ids_assigned_target_shift_2).issubset(
            set(worker_ids_qualified_spe_2 + worker_ids_qualified_spe_1_2)
        )

        worker_ids_assigned_target_shift_1_2 = [
            a.worker_id
            for a in outputs.assignments
            if a.shift_id == shift_id_target_1_2
        ]

        assert set(worker_ids_assigned_target_shift_1_2).issubset(
            set(
                worker_ids_qualified_spe_1
                + worker_ids_qualified_spe_2
                + worker_ids_qualified_spe_1_2
            )
        )

        for d in dates:
            for shift in shifts:
                shift_staffing_spe_1 = sum(
                    s.staffing
                    for s in shift.staffing
                    if s.specialty_id == specialty_1.id
                )
                shift_staffing_spe_2 = sum(
                    s.staffing
                    for s in shift.staffing
                    if s.specialty_id == specialty_2.id
                )
                count_target_spe_1 = sum(
                    dsd.count * shift_staffing_spe_1
                    for dsd in dsds_normal
                    if dsd.date == d and dsd.shift_id == shift.id
                )
                count_target_spe_2 = sum(
                    dsd.count * shift_staffing_spe_2
                    for dsd in dsds_normal
                    if dsd.date == d and dsd.shift_id == shift.id
                )
                count_actual_spe_1 = sum(
                    1
                    for a in outputs.assignments
                    if a.date == d
                    and a.shift_id == shift.id
                    and a.worker_id in worker_ids_qualified_spe_1
                )
                count_actual_spe_2 = sum(
                    1
                    for a in outputs.assignments
                    if a.date == d
                    and a.shift_id == shift.id
                    and a.worker_id in worker_ids_qualified_spe_2
                )
                count_actual_spe_1_2 = sum(
                    1
                    for a in outputs.assignments
                    if a.date == d
                    and a.shift_id == shift.id
                    and a.worker_id in worker_ids_qualified_spe_1_2
                )
                nb_worker_q_1_2_for_spe_1 = (
                    count_actual_spe_1 + count_actual_spe_1_2 - count_target_spe_1
                )
                assert (
                    count_actual_spe_1 + count_actual_spe_2 + count_actual_spe_1_2
                    == count_target_spe_1 + count_target_spe_2
                )
                assert (
                    count_actual_spe_1
                    + count_actual_spe_1_2
                    - nb_worker_q_1_2_for_spe_1
                    == count_target_spe_1
                )
                assert (
                    count_actual_spe_2 + nb_worker_q_1_2_for_spe_1 == count_target_spe_2
                )

    @pytest.mark.parametrize("sample_data", test_data_set_1)
    def test_expected_assignments_all(self, sample_data: EngineInputsAugmented) -> None:
        shifts = sample_data.shifts
        dsds = sample_data.shift_demands

        outputs = engine_solve_engine_inputs(sample_data)

        schedule = sample_data.schedule
        dates = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        for d in dates:
            for shift in [
                s for s in shifts if s.shift_type in [ShiftType.NORMAL, ShiftType.DUTY]
            ]:
                shift_staffing = sum(s.staffing for s in shift.staffing)
                count_target = sum(
                    dsd.count * shift_staffing
                    for dsd in dsds
                    if dsd.date == d and dsd.shift_id == shift.id
                )
                count_actual = sum(
                    1
                    for a in outputs.assignments
                    if a.date == d and a.shift_id == shift.id
                )

                assert count_actual == count_target
