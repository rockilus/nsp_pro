from datetime import date, datetime, timezone

import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.assignment import AssignmentRepository
from shared.database_pymongo.schemas.assignment import AssignmentSchema
from shared.schemas.schemas.schedule import Assignment


class TestAssignmentRepository:
    repo: AssignmentRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = AssignmentRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_assignment(self):
        """Test creating an assignment."""
        assignment = Assignment(
            id=None,
            team_id="team1",
            worker_id="worker1",
            schedule_id="schedule1",
            date=date(2023, 1, 1),
            shift_id="shift1",
            fixed=False,
        )

        result = self.repo.create_assignment(assignment)

        assert result.id is not None
        assert result.team_id == "team1"
        assert result.worker_id == "worker1"

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["team"] == "team1"
        assert saved_doc["worker"] == "worker1"

    def test_get_assignment_by_id(self):
        """Test getting an assignment by ID."""
        assignment = AssignmentSchema(
            team="team1",
            worker="worker1",
            schedule="schedule1",
            date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            shift="shift1",
            fixed=False,
        )
        created = self.repo.create(assignment)

        found = self.repo.get_assignment_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.team_id == "team1"

    def test_update_assignment(self):
        """Test updating an assignment."""
        assignment = AssignmentSchema(
            team="team1",
            worker="worker1",
            schedule="schedule1",
            date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            shift="shift1",
            fixed=False,
        )
        created = self.repo.create(assignment)

        updated_assignment = Assignment(
            id=created.id,
            team_id="team1",
            worker_id="worker2",
            schedule_id="schedule1",
            date=date(2023, 1, 2),
            shift_id="shift2",
            fixed=True,
        )

        result = self.repo.update_assignment(updated_assignment)

        assert result.worker_id == "worker2"
        assert result.date == date(2023, 1, 2)
        assert result.fixed is True

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
        assert from_db["worker"] == "worker2"
        assert from_db["date"] == datetime(2023, 1, 2, 0, 0)

    def test_delete_assignment(self):
        """Test deleting an assignment."""
        assignment = AssignmentSchema(
            team="team1",
            worker="worker1",
            schedule="schedule1",
            date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            shift="shift1",
            fixed=False,
        )
        created = self.repo.create(assignment)

        self.repo.delete_assignment(created.id)

        assert self.repo.collection.find_one({"_id": ObjectId(created.id)}) is None

    def test_get_assignments(self):
        """Test getting all assignments for a team."""
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
            ),
        ]
        self.repo.create_many(assignments)

        results = self.repo.get_assignments("team1")

        assert len(results) == 2
        assert results[0].team_id == "team1"
        assert results[1].team_id == "team1"

    def test_get_assignments_by_schedules(self):
        """Test getting assignments by schedules."""
        schedule_ids = ["schedule1", "schedule2"]
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
            ),
        ]
        self.repo.create_many(assignments)

        results = self.repo.get_assignments_by_schedule_ids(schedule_ids)

        assert len(results) == 2
        assert results[0].schedule_id in ["schedule1", "schedule2"]
        assert results[1].schedule_id in ["schedule1", "schedule2"]

    def test_get_assignment_by_worker_date_schedule(self):
        """Test getting an assignment by worker, date, and schedule."""
        assignment = AssignmentSchema(
            team="team1",
            worker="worker1",
            schedule="schedule1",
            date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            shift="shift1",
            fixed=False,
        )
        self.repo.create(assignment)

        worker_id = "worker1"
        schedule_id = "schedule1"
        result = self.repo.get_assignment_by_worker_id_date_schedule_id(
            worker_id, date(2023, 1, 1), schedule_id
        )

        assert result is not None
        assert result.worker_id == "worker1"
        assert result.schedule_id == "schedule1"

    def test_get_assignments_by_dates(self):
        """Test getting assignments by date range."""
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
            ),
        ]
        self.repo.create_many(assignments)

        results = self.repo.get_assignments_by_dates(
            "team1", date(2023, 1, 1), date(2023, 1, 2)
        )

        assert len(results) == 2
        assert results[0].date in [date(2023, 1, 1), date(2023, 1, 2)]
        assert results[1].date in [date(2023, 1, 1), date(2023, 1, 2)]

    def test_delete_assignments_by_schedule_id(self):
        """Test deleting assignments by schedule ID."""
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
            ),
        ]
        self.repo.create_many(assignments)

        self.repo.delete_assignments_by_schedule_id("schedule1")

        remaining = self.repo.collection.find({"schedule": "schedule1"})
        assert remaining.retrieved == 0
