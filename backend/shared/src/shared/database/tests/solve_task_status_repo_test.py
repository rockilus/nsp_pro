from datetime import datetime, timezone

import pytest
import pytest_asyncio

from shared.database.interface import DatabaseInterface
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

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = SolveTaskStatusRepository(database_interface=mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("solve_task_status")
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_repository_initialization(self):
        assert self.repo is not None
        assert self.repo.collection.name == "solve_task_status"

    def test_database_connection(self, mongodb_container: DatabaseInterface):
        db = mongodb_container.get_database()
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

    def test_delete_solve_task_status(self):
        # Create and insert a status
        status = make_test_status(solve_id="delete_me", schedule_id="schedD")
        created = self.repo.create_solve_task_status(status)
        # Ensure it exists
        found = self.repo.get_solve_task_status_by_solve_id("delete_me")
        assert found is not None
        assert created.id is not None
        # Delete by MongoDB _id
        self.repo.delete_solve_task_status(created.id)
        # Should not be found anymore
        found_after = self.repo.get_solve_task_status_by_id(created.id)
        assert found_after is None

    def test_delete_solve_task_status_not_found(self):
        # Try deleting a non-existent id, should raise ValueError
        with pytest.raises(ValueError):
            self.repo.delete_solve_task_status("nonexistentid1234567890")

    def test_get_latest_solve_task_status_by_schedule_id(self):
        # Create multiple statuses for the same schedule with different completed_at
        now = datetime.now(timezone.utc)
        status1 = make_test_status(solve_id="solve1", schedule_id="schedL")
        status2 = make_test_status(solve_id="solve2", schedule_id="schedL")
        status3 = make_test_status(solve_id="solve3", schedule_id="schedL")
        # Only status2 and status3 are completed
        status2.request_status = SolveRequestStatus.COMPLETED
        status2.completed_at = now
        status3.request_status = SolveRequestStatus.COMPLETED
        status3.completed_at = now.replace(microsecond=0)  # slightly earlier
        self.repo.create_solve_task_status(status1)
        self.repo.create_solve_task_status(status2)
        self.repo.create_solve_task_status(status3)
        # status2 is the latest completed
        latest = self.repo.get_latest_solve_task_status_by_schedule_id("schedL")
        assert latest is not None
        assert latest.solve_id == "solve2"
        assert latest.completed_at == status2.completed_at

    def test_get_latest_solve_task_status_by_schedule_id_none(self):
        # No completed solves for this schedule
        status1 = make_test_status(solve_id="solveA", schedule_id="schedM")
        status2 = make_test_status(solve_id="solveB", schedule_id="schedM")
        # Both are not completed
        self.repo.create_solve_task_status(status1)
        self.repo.create_solve_task_status(status2)
        latest = self.repo.get_latest_solve_task_status_by_schedule_id("schedM")
        assert latest is None
