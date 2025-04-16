from datetime import timedelta
from typing import List

from shared.schemas.core import (
    Breach,
    EngineInputsAugmented,
    LinkShift,
    ObjectiveCategory,
    Request,
    RequestStatus,
    Variable,
)

from engine_to_core_service.build_breaches.build_breaches_model import (
    _parse_breaches_engine,
)
from tests.engine_tests.engine_solve import engine_solve_engine_inputs

# pylint: disable=unused-import
from tests.sample_data import sample_data_fixture  # noqa: F401


# pylint: disable=R0801
class TestDutyRecupConstraint:
    # pylint: disable=redefined-outer-name, too-many-locals
    def test_link_shift(
        self, sample_data_fixture: EngineInputsAugmented  # noqa: F811
    ) -> None:  # noqa: F811
        shifts = sample_data_fixture.shifts
        shift_target_1 = next((shift for shift in shifts if shift.id == "s0"), None)
        shift_target_2 = next((shift for shift in shifts if shift.id == "s1"), None)
        assert shift_target_1 is not None
        assert shift_target_2 is not None
        link_shifts = [
            LinkShift(
                id="ls_0",
                team_id="t0",
                shift_ids=[shift_target_1.id, shift_target_2.id],
            )
        ]
        sample_data_fixture.link_shifts = link_shifts

        outputs = engine_solve_engine_inputs(sample_data_fixture)

        schedule = sample_data_fixture.schedule
        dates = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dsds = sample_data_fixture.daily_shift_demands

        # Check target shifts assigned
        for d in dates:
            for shift in shifts:
                if shift.id in ["s0", "s1"]:
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

        # Check target shifts assigned to same worker
        as_s0 = [a for a in outputs.assignments if a.shift_id == "s0"]
        for a_s0 in as_s0:
            a_s1 = next(
                (
                    a
                    for a in outputs.assignments
                    if a.worker_id == a_s0.worker_id
                    and a.shift_id == shift_target_2.id
                    and a.date == a_s0.date
                ),
                None,
            )
            assert a_s1 is not None

    # pylint: disable=redefined-outer-name
    def test_link_shift_conflict(
        self, sample_data_fixture: EngineInputsAugmented  # noqa: F811
    ) -> None:
        workers = sample_data_fixture.workers
        shifts = sample_data_fixture.shifts
        schedule = sample_data_fixture.schedule
        worker_target_0 = workers[0]
        worker_target_1 = workers[1]
        date_target = schedule.start_date
        shift_target_0_id = "s0"
        shift_target_1_id = "s1"
        requests: List[Request] = [
            Request(
                id="r0",
                team_id="t0",
                worker_id=worker_target_0.id,
                start_date=date_target,
                end_date=date_target,
                shift_id=shift_target_0_id,
                negative=False,
                hard=True,
                status=RequestStatus.PENDING,
            ),
            Request(
                id="r0",
                team_id="t0",
                worker_id=worker_target_1.id,
                start_date=date_target,
                end_date=date_target,
                shift_id=shift_target_1_id,
                negative=False,
                hard=True,
                status=RequestStatus.PENDING,
            ),
        ]
        sample_data_fixture.requests = requests

        shift_target_0 = next(
            (shift for shift in shifts if shift.id == shift_target_0_id), None
        )
        shift_target_1 = next(
            (shift for shift in shifts if shift.id == shift_target_1_id), None
        )
        assert shift_target_0 is not None
        assert shift_target_1 is not None
        link_shifts = [
            LinkShift(
                id="ls_0",
                team_id="t0",
                shift_ids=[shift_target_0.id, shift_target_1.id],
            )
        ]
        sample_data_fixture.link_shifts = link_shifts

        outputs = engine_solve_engine_inputs(sample_data_fixture)

        schedule = sample_data_fixture.schedule
        dates = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        dsds = sample_data_fixture.daily_shift_demands

        # Check target shifts assigned
        for d in dates:
            for shift in shifts:
                if shift.id in [shift_target_0_id, shift_target_1_id]:
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

        # Check target shifts assigned to same worker for days without conflict
        as_s0 = [
            a
            for a in outputs.assignments
            if a.shift_id == shift_target_0_id and a.date != date_target
        ]
        for a_s0 in as_s0:
            a_s1 = next(
                (
                    a
                    for a in outputs.assignments
                    if a.worker_id == a_s0.worker_id
                    and a.shift_id == shift_target_1.id
                    and a.date == a_s0.date
                ),
                None,
            )
            assert a_s1 is not None

        # Check requests are complied with
        for r in requests:
            count_actual = sum(
                1
                for a in outputs.assignments
                if a.worker_id == r.worker_id
                and a.shift_id == r.shift_id
                and a.date == r.start_date
            )
            assert count_actual == 1

        # Check output contains expected breach
        breaches: List[Breach] = _parse_breaches_engine(schedule, outputs.breaches)
        assert len(breaches) == 1
        breaches_expected = [
            Breach(
                id="",
                schedule_id=schedule.id,
                objective_id="ls_0",
                objective_category=ObjectiveCategory.LINK_SHIFT,
                variables=[
                    Variable(
                        worker_id=worker_target_0.id,
                        date=date_target,
                        shift_id=shift_target_0_id,
                    ),
                    Variable(
                        worker_id=worker_target_0.id,
                        date=date_target,
                        shift_id=shift_target_1_id,
                    ),
                ],
                description="",
                hard_to_soft=None,
            ),
            # Breach(
            #     id="",
            #     schedule_id=schedule.id,
            #     objective_id="ls_0",
            #     objective_category=ObjectiveCategory.LINK_SHIFT,
            #     variables=[
            #         Variable(
            #             worker_id=worker_target_1.id,
            #             date=date_target,
            #             shift_id=shift_target_0_id,
            #         ),
            #         Variable(
            #             worker_id=worker_target_1.id,
            #             date=date_target,
            #             shift_id=shift_target_1_id,
            #         ),
            #     ],
            #     description="",
            #     hard_to_soft=None,
            # ),
        ]
        assert breaches == breaches_expected
