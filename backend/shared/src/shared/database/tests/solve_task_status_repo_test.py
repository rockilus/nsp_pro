from datetime import datetime, timezone

import pytest

from shared.database.database import MongoDB
from shared.database.repositories.solve_task_status import (
    SolveTaskStatusRepository,
)
from shared.schemas.core.solve_task_status import (
    ScheduleSolveStatus,
    SolveRequestStatus,
    SolveTaskStatus,
)


def make_test_status(
    solve_id: str = "solve1",
    schedule_id: str = "sched1",
    team_id: str = "team1",
    user_id: str = "user1",
) -> SolveTaskStatus:
    return SolveTaskStatus(
        solve_id=solve_id,
        schedule_id=schedule_id,
        team_id=team_id,
        user_id=user_id,
        request_status=SolveRequestStatus.PENDING,
        solve_status=ScheduleSolveStatus.NOT_SOLVED,
        started_at=datetime.now(timezone.utc),
        completed_at=None,
        error_message=None,
        result=None,
        solver_output_metadata=None,
        id=None,
    )


class TestSolveTaskStatusRepository:
    """Test suite for SolveTaskStatusRepository CRUD operations."""

    repo: SolveTaskStatusRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()
        self.repo = SolveTaskStatusRepository()
        yield
        db.drop_collection(self.repo.collection)

    def test_repository_initialization(self):
        assert self.repo is not None
        assert self.repo.collection.name == "solve_task_status"

    def test_database_connection(self):
        db = MongoDB.get_database()
        assert db is not None
        collection = db.solve_task_status
        assert collection is not None

    def test_create_and_get_by_id(self):
        status = make_test_status()
        created = self.repo.create_solve_task_status(status)
        assert created.solve_id == status.solve_id
        # Use solve_id as the unique business key, not id
        found = self.repo.get_solve_task_status_by_solve_id(created.solve_id)
        assert found is not None
        assert found.solve_id == status.solve_id

    def test_get_by_schedule_id(self):
        status1 = make_test_status(solve_id="solveA", schedule_id="schedX")
        status2 = make_test_status(solve_id="solveB", schedule_id="schedX")
        status3 = make_test_status(solve_id="solveC", schedule_id="schedY")
        self.repo.create_solve_task_status(status1)
        self.repo.create_solve_task_status(status2)
        self.repo.create_solve_task_status(status3)
        results = self.repo.get_solve_task_status_by_schedule_id("schedX")
        assert len(results) == 2
        assert all(s.schedule_id == "schedX" for s in results)

    def test_get_by_solve_id(self):
        status = make_test_status(solve_id="special_solve_id")
        self.repo.create_solve_task_status(status)
        found = self.repo.get_solve_task_status_by_solve_id("special_solve_id")
        assert found is not None
        assert found.solve_id == "special_solve_id"

    def test_update(self):
        status = make_test_status()
        created = self.repo.create_solve_task_status(status)
        created.request_status = SolveRequestStatus.COMPLETED
        updated = self.repo.update_solve_task_status(created)
        assert updated is not None
        assert updated.request_status == SolveRequestStatus.COMPLETED

    def test_multiple_statuses_isolation(self):
        status1 = make_test_status(solve_id="solve1", team_id="teamA")
        status2 = make_test_status(solve_id="solve2", team_id="teamB")
        self.repo.create_solve_task_status(status1)
        self.repo.create_solve_task_status(status2)
        # Use get_by_schedule_id to fetch all for a team (simulate isolation)
        teamA_statuses = [
            s
            for s in self.repo.get_solve_task_status_by_schedule_id(status1.schedule_id)
            if s.team_id == "teamA"
        ]
        teamB_statuses = [
            s
            for s in self.repo.get_solve_task_status_by_schedule_id(status2.schedule_id)
            if s.team_id == "teamB"
        ]
        assert len(teamA_statuses) == 1
        assert teamA_statuses[0].team_id == "teamA"
        assert len(teamB_statuses) == 1
        assert teamB_statuses[0].team_id == "teamB"

    def test_get_pending_or_in_progress_by_schedule_id(self):
        # Create statuses with different request_status for the same schedule
        status_pending = make_test_status(solve_id="solveP", schedule_id="schedZ")
        status_in_progress = make_test_status(solve_id="solveI", schedule_id="schedZ")
        status_completed = make_test_status(solve_id="solveC", schedule_id="schedZ")
        status_in_progress.request_status = SolveRequestStatus.IN_PROGRESS
        status_completed.request_status = SolveRequestStatus.COMPLETED
        self.repo.create_solve_task_status(status_pending)
        self.repo.create_solve_task_status(status_in_progress)
        self.repo.create_solve_task_status(status_completed)
        results = self.repo.get_pending_or_in_progress_by_schedule_id("schedZ")
        # Should only return the PENDING and IN_PROGRESS statuses
        assert len(results) == 2
        returned_statuses = {s.request_status for s in results}
        assert SolveRequestStatus.PENDING in returned_statuses
        assert SolveRequestStatus.IN_PROGRESS in returned_statuses
        assert SolveRequestStatus.COMPLETED not in returned_statuses
