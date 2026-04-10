from datetime import date, timedelta
from typing import List

import pytest

from shared.schemas.core import (
    Assignment,
    AssignmentSource,
    Worker,
    WorkerDates,
)
from shared.utils.build_dates import build_worker_ids_to_worker_dates


# Fixture providing sample workers
@pytest.fixture
def workers() -> List[Worker]:
    return [
        Worker(
            id=f"w{i}",
            team_id="t0",
            name=f"Worker {i}",
            acronym=f"W{i}",
            acronym_custom=False,
            employment_start_date=date(2025, 1, 1),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=10,
            annual_leave=20,
            specialty_ids=[],
            deleted=False,
        )
        for i in range(10)
    ]


class TestBuildWorkerIdsToWorkerDates:
    # pylint: disable=redefined-outer-name
    def test_build_worker_ids_to_worker_dates(self, workers: List[Worker]) -> None:
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 31)
        assignments: List[Assignment] = []
        dates_campaign = [
            start_date + timedelta(days=i)
            for i in range((end_date - start_date).days + 1)
        ]

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            start_date=start_date,
            end_date=end_date,
            workers=workers,
            assignments=assignments,
        )

        # Verify the worker dates
        for worker in workers:
            worker_dates = worker_ids_to_worker_dates[worker.id]
            assert isinstance(worker_dates, WorkerDates)
            assert worker_dates.dates_hist == []
            assert worker_dates.dates_campaign == dates_campaign

    def test_worker_with_past_assignments(self, workers: List[Worker]) -> None:
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 31)
        assignments = [
            Assignment(
                id="a0",
                team_id="t0",
                schedule_id="sch0",
                worker_id="w0",
                shift_id="s0",
                date=date(2024, 12, 31),
                fixed=True,
                source=AssignmentSource.MANUAL,
            ),
            Assignment(
                id="a1",
                team_id="t0",
                schedule_id="sch0",
                worker_id="w0",
                shift_id="s0",
                date=date(2024, 12, 30),
                fixed=True,
                source=AssignmentSource.MANUAL,
            ),
        ]
        dates_campaign = [
            start_date + timedelta(days=i)
            for i in range((end_date - start_date).days + 1)
        ]

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            start_date=start_date,
            end_date=end_date,
            workers=workers,
            assignments=assignments,
        )

        # Verify the worker dates for worker with past assignments
        worker_dates = worker_ids_to_worker_dates["w0"]
        assert isinstance(worker_dates, WorkerDates)
        assert worker_dates.dates_hist == [
            date(2024, 12, 30),
            date(2024, 12, 31),
        ]
        assert worker_dates.dates_campaign == dates_campaign

    def test_worker_with_employment_end_date(self, workers: List[Worker]) -> None:
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 31)

        workers[0].employment_end_date = date(2025, 1, 15)
        assignments: List[Assignment] = []

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            start_date=start_date,
            end_date=end_date,
            workers=workers,
            assignments=assignments,
        )

        # Verify the worker dates for worker with employment end date
        worker_dates = worker_ids_to_worker_dates["w0"]
        assert isinstance(worker_dates, WorkerDates)
        assert worker_dates.dates_hist == []
        expected_dates_campaign = [
            start_date + timedelta(days=i)
            for i in range((date(2025, 1, 15) - start_date).days + 1)
        ]
        assert worker_dates.dates_campaign == expected_dates_campaign

    def test_deleted_worker(self, workers: List[Worker]) -> None:
        start_date = date(2025, 1, 1)
        end_date = date(2025, 1, 31)
        workers[0].deleted = True
        assignments: List[Assignment] = []

        worker_ids_to_worker_dates = build_worker_ids_to_worker_dates(
            start_date=start_date,
            end_date=end_date,
            workers=workers,
            assignments=assignments,
        )

        # Verify the worker dates for deleted worker
        worker_dates = worker_ids_to_worker_dates["w0"]
        assert isinstance(worker_dates, WorkerDates)
        assert worker_dates.dates_hist == []
        assert worker_dates.dates_campaign == []
