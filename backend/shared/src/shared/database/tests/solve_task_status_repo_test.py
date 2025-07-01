from datetime import datetime, timezone

import pytest

from shared.database.database import MongoDB
from shared.database.repositories.solve_task_status import (
    SolveTaskStatusRepository,
)
from shared.database.schemas.solve_task_status import (
    SolveTaskStatusSchema,
)


def make_test_status(
    solve_id: str = "solve1",
    schedule_id: str = "sched1",
    team_id: str = "team1",
    user_id: str = "user1",
) -> SolveTaskStatusSchema:
    return SolveTaskStatusSchema(
        solve_id=solve_id,
        schedule_id=schedule_id,
        team_id=team_id,
        user_id=user_id,
        request_status="PENDING",
        solve_status="NOT_SOLVED",
        started_at=datetime.now(timezone.utc).timestamp(),
        completed_at=None,
        error_message=None,
        result=None,
        solver_output_status=None,
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
        created = self.repo.create(status)
        assert created.solve_id == status.solve_id
        found = self.repo.get_by_id(created.id)
        assert found is not None
        assert found.solve_id == status.solve_id

    def test_get_by_schedule_id(self):
        status1 = make_test_status(solve_id="solveA", schedule_id="schedX")
        status2 = make_test_status(solve_id="solveB", schedule_id="schedX")
        status3 = make_test_status(solve_id="solveC", schedule_id="schedY")
        self.repo.create(status1)
        self.repo.create(status2)
        self.repo.create(status3)
        results = self.repo.get_by_schedule_id("schedX")
        assert len(results) == 2
        assert all(s.schedule_id == "schedX" for s in results)

    def test_get_by_solve_id(self):
        status = make_test_status(solve_id="special_solve_id")
        self.repo.create(status)
        found = self.repo.get_by_solve_id("special_solve_id")
        assert found is not None
        assert found.solve_id == "special_solve_id"

    def test_update(self):
        status = make_test_status()
        created = self.repo.create(status)
        created.request_status = "COMPLETED"
        updated = self.repo.update(created)
        assert updated is not None
        assert updated.request_status == "COMPLETED"

    def test_multiple_statuses_isolation(self):
        status1 = make_test_status(solve_id="solve1", team_id="teamA")
        status2 = make_test_status(solve_id="solve2", team_id="teamB")
        self.repo.create(status1)
        self.repo.create(status2)
        teamA_statuses = self.repo.find_all({"team_id": "teamA"})
        teamB_statuses = self.repo.find_all({"team_id": "teamB"})
        assert len(teamA_statuses) == 1
        assert teamA_statuses[0].team_id == "teamA"
        assert len(teamB_statuses) == 1
        assert teamB_statuses[0].team_id == "teamB"
