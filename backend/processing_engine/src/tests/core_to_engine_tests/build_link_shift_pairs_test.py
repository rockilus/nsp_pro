from datetime import date, timedelta
from typing import List

from shared.schemas import EngineInputs, LinkShift, Shift, Worker, WorkerDates

from core_to_engine_service.build_dates import build_worker_ids_to_worker_dates
from core_to_engine_service.build_link_shift_pairs import build_link_shift_pairs
from core_to_engine_service.penalties import penalties

# pylint: disable=unused-import
from tests.sample_data import sample_data_fixture  # noqa: F401


# pylint: disable=R0801
class TestBuildLinkShiftPairs:
    # pylint: disable=redefined-outer-name, too-many-locals
    def test_build_link_shift_pairs(
        self, sample_data_fixture: EngineInputs  # noqa: F811
    ) -> None:
        workers = sample_data_fixture.workers
        shifts = sample_data_fixture.shifts
        schedule = sample_data_fixture.schedule
        fixed_assignments = (
            sample_data_fixture.as_hist + sample_data_fixture.as_wip_fixed
        )

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

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]
        dsds = sample_data_fixture.daily_shift_demands

        # Call the method under test
        ls_pairs = build_link_shift_pairs(
            workers_not_deleted,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            link_shifts,
            dsds,
        )

        # Verify the output
        assert isinstance(ls_pairs, list)
        assert all(isinstance(pair, tuple) for pair in ls_pairs)
        assert all(
            isinstance(pair[0], tuple)
            and isinstance(pair[1], tuple)
            and isinstance(pair[2], str)
            for pair in ls_pairs
        )
        for a_1, a_2, ls_id, penalty in ls_pairs:
            w_s0_id, d_s0, s0_id = a_1
            w_s1_id, d_s1, s1_id = a_2
            assert w_s0_id == w_s1_id
            assert d_s0 == d_s1
            if s0_id == "s0":
                assert s1_id == "s1"
            assert ls_id == "ls_0"
            assert penalty == penalties.configuration_constraint.link_shift
        w_ids_in_pairs = sorted(
            set(w_id for a_1, a_2, _, _ in ls_pairs for w_id, _, _ in [a_1, a_2])
        )
        assert w_ids_in_pairs == sorted(set(w.id for w in workers_not_deleted))
        dates_in_pairs = sorted(
            set(
                date.fromisoformat(d)
                for a_1, a_2, _, _ in ls_pairs
                for _, d, _ in [a_1, a_2]
            )
        )
        dsds_dates = sorted(
            set(dsd.date for dsd in dsds if dsd.shift_id in ["s0", "s1"])
        )
        assert dates_in_pairs == dsds_dates

    # pylint: disable=redefined-outer-name
    def test_empty_workers(
        self, sample_data_fixture: EngineInputs  # noqa: F811
    ) -> None:
        workers: List[Worker] = []
        shifts = sample_data_fixture.shifts
        schedule = sample_data_fixture.schedule
        fixed_assignments = (
            sample_data_fixture.as_hist + sample_data_fixture.as_wip_fixed
        )

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

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        ls_pairs = build_link_shift_pairs(
            workers,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            link_shifts,
            sample_data_fixture.daily_shift_demands,
        )

        # Verify the output
        assert isinstance(ls_pairs, list)
        assert len(ls_pairs) == 0

    # pylint: disable=redefined-outer-name
    def test_empty_shifts(
        self, sample_data_fixture: EngineInputs  # noqa: F811
    ) -> None:
        workers = sample_data_fixture.workers
        shifts: List[Shift] = sample_data_fixture.shifts
        schedule = sample_data_fixture.schedule
        fixed_assignments = (
            sample_data_fixture.as_hist + sample_data_fixture.as_wip_fixed
        )
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

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )

        # Call the method under test
        ls_pairs = build_link_shift_pairs(
            workers_not_deleted,
            worker_ids_to_worker_dates,
            [],
            link_shifts,
            sample_data_fixture.daily_shift_demands,
        )

        # Verify the output
        assert isinstance(ls_pairs, list)
        assert len(ls_pairs) == 0

    # pylint: disable=redefined-outer-name
    def test_deleted_shift(
        self, sample_data_fixture: EngineInputs  # noqa: F811
    ) -> None:
        workers = sample_data_fixture.workers
        shifts = sample_data_fixture.shifts
        schedule = sample_data_fixture.schedule
        fixed_assignments = (
            sample_data_fixture.as_hist + sample_data_fixture.as_wip_fixed
        )

        shifts[0].deleted = True
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

        # Build necessary inputs
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, fixed_assignments, dates_campaign
        )
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]
        shift_target_1.deleted = True

        # Call the method under test
        ls_pairs = build_link_shift_pairs(
            workers_not_deleted,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            link_shifts,
            sample_data_fixture.daily_shift_demands,
        )

        # Verify the output
        assert isinstance(ls_pairs, list)
        assert len(ls_pairs) == 0

    # pylint: disable=redefined-outer-name
    def test_worker_with_no_dates(
        self, sample_data_fixture: EngineInputs  # noqa: F811
    ) -> None:
        workers = sample_data_fixture.workers
        shifts = sample_data_fixture.shifts

        shifts[0].deleted = True
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

        # Build necessary inputs
        workers_not_deleted = [worker for worker in workers if not worker.deleted]
        worker_ids_to_worker_dates = {
            worker.id: WorkerDates(dates_hist=[], dates_campaign=[])
            for worker in workers_not_deleted
        }
        shifts_not_deleted = [shift for shift in shifts if not shift.deleted]

        # Call the method under test
        ls_pairs = build_link_shift_pairs(
            workers_not_deleted,
            worker_ids_to_worker_dates,
            shifts_not_deleted,
            link_shifts,
            sample_data_fixture.daily_shift_demands,
        )

        # Verify the output
        assert isinstance(ls_pairs, list)
        assert len(ls_pairs) == 0
