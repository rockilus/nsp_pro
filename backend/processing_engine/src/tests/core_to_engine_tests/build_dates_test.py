from datetime import date, timedelta
from typing import Dict

import pytest
from shared.schemas import (
    Assignment,
    Schedule,
    ScheduleSolveStatus,
    ScheduleStatus,
    WorkerDates,
)

from core_to_engine_service.build_dates import (
    build_dates,
    build_worker_ids_to_worker_dates,
)
from tests.test_data import test_data_set


class TestBuildDates:
    @pytest.mark.parametrize("sample_data", test_data_set)
    def test_build_dates(self, sample_data: Dict) -> None:
        schedule = sample_data["schedule"]
        fixed_assignments = sample_data["fixed_assignments"]

        dates_hist, dates_campaign = build_dates(schedule, fixed_assignments)

        # Verify the historical dates
        assert dates_hist == []

        # Verify the campaign dates
        expected_dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        assert dates_campaign == expected_dates_campaign

    @pytest.mark.parametrize("sample_data", test_data_set)
    def test_build_dates_with_fixed_assignments(self, sample_data: Dict) -> None:
        schedule = sample_data["schedule"]
        fixed_assignments = [
            Assignment(
                id="a0",
                team_id="t0",
                schedule_id="sch0",
                worker_id="w0",
                shift_id="s0",
                date=date(2024, 12, 31),
                fixed=True,
            ),
            Assignment(
                id="a1",
                team_id="t0",
                schedule_id="sch0",
                worker_id="w1",
                shift_id="s1",
                date=date(2024, 12, 30),
                fixed=True,
            ),
        ]

        dates_hist, dates_campaign = build_dates(schedule, fixed_assignments)

        # Verify the historical dates
        expected_dates_hist = [date(2024, 12, 30), date(2024, 12, 31)]
        assert dates_hist == expected_dates_hist

        # Verify the campaign dates
        expected_dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]
        assert dates_campaign == expected_dates_campaign

    @pytest.mark.parametrize("sample_data", test_data_set)
    def test_build_dates_with_empty_schedule(self, sample_data: Dict) -> None:
        # pylint: disable=R0801
        schedule = Schedule(
            id="sch2",
            team_id="t0",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 1),
            solve_details=None,
            solve_status=ScheduleSolveStatus.NOT_SOLVED,
            status=ScheduleStatus.CAMPAIGN,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
        )
        fixed_assignments = sample_data["fixed_assignments"]

        dates_hist, dates_campaign = build_dates(schedule, fixed_assignments)

        # Verify the historical dates
        assert dates_hist == []

        # Verify the campaign dates
        expected_dates_campaign = [schedule.start_date]
        assert dates_campaign == expected_dates_campaign


class TestBuildWorkerIdsToWorkerDates:
    @pytest.mark.parametrize("sample_data", test_data_set)
    def test_build_worker_ids_to_worker_dates(self, sample_data: Dict) -> None:
        schedule = sample_data["schedule"]
        workers = sample_data["workers"]
        assignments = sample_data["fixed_assignments"]
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, assignments, dates_campaign
        )

        # Verify the worker dates
        for worker in workers:
            worker_dates = worker_ids_to_worker_dates[worker.id]
            assert isinstance(worker_dates, WorkerDates)
            assert worker_dates.dates_hist == []
            assert worker_dates.dates_campaign == dates_campaign

    @pytest.mark.parametrize("sample_data", test_data_set)
    def test_worker_with_past_assignments(self, sample_data: Dict) -> None:
        schedule = sample_data["schedule"]
        workers = sample_data["workers"]
        assignments = [
            Assignment(
                id="a0",
                team_id="t0",
                schedule_id="sch0",
                worker_id="w0",
                shift_id="s0",
                date=date(2024, 12, 31),
                fixed=True,
            ),
            Assignment(
                id="a1",
                team_id="t0",
                schedule_id="sch0",
                worker_id="w0",
                shift_id="s0",
                date=date(2024, 12, 30),
                fixed=True,
            ),
        ]
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, assignments, dates_campaign
        )

        # Verify the worker dates for worker with past assignments
        worker_dates = worker_ids_to_worker_dates["w0"]
        assert isinstance(worker_dates, WorkerDates)
        assert worker_dates.dates_hist == [
            date(2024, 12, 30),
            date(2024, 12, 31),
        ]
        assert worker_dates.dates_campaign == dates_campaign

    @pytest.mark.parametrize("sample_data", test_data_set)
    def test_worker_with_employment_end_date(self, sample_data: Dict) -> None:
        schedule = sample_data["schedule"]
        workers = sample_data["workers"]
        workers[0].employment_end_date = date(2025, 1, 15)
        assignments = sample_data["fixed_assignments"]
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, assignments, dates_campaign
        )

        # Verify the worker dates for worker with employment end date
        worker_dates = worker_ids_to_worker_dates["w0"]
        assert isinstance(worker_dates, WorkerDates)
        assert worker_dates.dates_hist == []
        expected_dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((date(2025, 1, 15) - schedule.start_date).days + 1)
        ]
        assert worker_dates.dates_campaign == expected_dates_campaign

    @pytest.mark.parametrize("sample_data", test_data_set)
    def test_deleted_worker(self, sample_data: Dict) -> None:
        schedule = sample_data["schedule"]
        workers = sample_data["workers"]
        workers[0].deleted = True
        assignments = sample_data["fixed_assignments"]
        dates_campaign = [
            schedule.start_date + timedelta(days=i)
            for i in range((schedule.end_date - schedule.start_date).days + 1)
        ]

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            schedule, workers, assignments, dates_campaign
        )

        # Verify the worker dates for deleted worker
        worker_dates = worker_ids_to_worker_dates["w0"]
        assert isinstance(worker_dates, WorkerDates)
        assert worker_dates.dates_hist == []
        assert worker_dates.dates_campaign == []
