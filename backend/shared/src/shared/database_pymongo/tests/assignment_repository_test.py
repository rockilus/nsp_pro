from datetime import date, datetime, timezone

import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.assignment import (
    AssignmentRepository,
)
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
            team_id=str(ObjectId()),
            worker_id=str(ObjectId()),
            schedule_id=str(ObjectId()),
            date=date(2023, 1, 1),
            shift_id=str(ObjectId()),
            fixed=False,
        )

        result = self.repo.create_assignment(assignment)

        assert result.id is not None
        assert result.team_id == assignment.team_id
        assert result.worker_id == assignment.worker_id

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["team"] == ObjectId(assignment.team_id)
        assert saved_doc["worker"] == ObjectId(assignment.worker_id)

    def test_get_assignment_by_id(self):
        """Test getting an assignment by ID."""
        assignment = AssignmentSchema(
            team=ObjectId(),
            worker=ObjectId(),
            schedule=ObjectId(),
            date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            shift=ObjectId(),
            fixed=False,
        )
        created = self.repo.create(assignment)

        found = self.repo.get_assignment_by_id(created.id)

        assert found is not None
        assert found.id == str(created.id)
        assert found.team_id == str(assignment.team)

    def test_update_assignment(self):
        """Test updating an assignment."""
        assignment = AssignmentSchema(
            team=ObjectId(),
            worker=ObjectId(),
            schedule=ObjectId(),
            date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            shift=ObjectId(),
            fixed=False,
        )
        created = self.repo.create(assignment)

        updated_assignment = Assignment(
            id=str(created.id),
            team_id=str(ObjectId()),
            worker_id=str(ObjectId()),
            schedule_id=str(ObjectId()),
            date=date(2023, 1, 2),
            shift_id=str(ObjectId()),
            fixed=True,
        )

        result = self.repo.update_assignment(updated_assignment)

        assert result.worker_id == updated_assignment.worker_id
        assert result.date == date(2023, 1, 2)
        assert result.fixed is True

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["worker"] == ObjectId(updated_assignment.worker_id)
        assert from_db["date"] == datetime(2023, 1, 2, 0, 0)

    def test_delete_assignment(self):
        """Test deleting an assignment."""
        assignment = AssignmentSchema(
            team=ObjectId(),
            worker=ObjectId(),
            schedule=ObjectId(),
            date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            shift=ObjectId(),
            fixed=False,
        )
        created = self.repo.create(assignment)

        self.repo.delete_assignment(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_assignments(self):
        """Test getting all assignments for a team."""
        team_oid = ObjectId()
        assignments = [
            AssignmentSchema(
                team=team_oid,
                worker=ObjectId(),
                schedule=ObjectId(),
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift=ObjectId(),
                fixed=False,
            ),
            AssignmentSchema(
                team=team_oid,
                worker=ObjectId(),
                schedule=ObjectId(),
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift=ObjectId(),
                fixed=True,
            ),
        ]
        self.repo.create_many(assignments)

        results = self.repo.get_assignments(str(team_oid))

        assert len(results) == 2
        assert results[0].team_id == str(team_oid)
        assert results[1].team_id == str(team_oid)

    def test_get_assignments_by_schedule_ids(self):
        """Test getting assignments by schedules."""
        schedule_1_oid = ObjectId()
        schedule_2_oid = ObjectId()
        schedule_ids = [str(schedule_1_oid), str(schedule_2_oid)]
        assignments = [
            AssignmentSchema(
                team=ObjectId(),
                worker=ObjectId(),
                schedule=schedule_1_oid,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift=ObjectId(),
                fixed=False,
            ),
            AssignmentSchema(
                team=ObjectId(),
                worker=ObjectId(),
                schedule=schedule_2_oid,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift=ObjectId(),
                fixed=True,
            ),
        ]
        self.repo.create_many(assignments)

        results = self.repo.get_assignments_by_schedule_ids(schedule_ids)

        assert len(results) == 2
        assert results[0].schedule_id in schedule_ids
        assert results[1].schedule_id in schedule_ids

    def test_get_assignment_by_worker_id_date_schedule_id(self):
        """Test getting an assignment by worker, date, and schedule."""
        schedule_oid = ObjectId()
        worker_oid = ObjectId()
        assignment = AssignmentSchema(
            team=ObjectId(),
            worker=worker_oid,
            schedule=schedule_oid,
            date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            shift=ObjectId(),
            fixed=False,
        )
        self.repo.create(assignment)

        result = self.repo.get_assignment_by_worker_id_date_schedule_id(
            str(worker_oid), date(2023, 1, 1), str(schedule_oid)
        )

        assert result is not None
        assert result.worker_id == str(worker_oid)
        assert result.schedule_id == str(schedule_oid)

    def test_get_assignments_by_dates(self):
        """Test getting assignments by date range."""
        team_oid = ObjectId()
        assignments = [
            AssignmentSchema(
                team=team_oid,
                worker=ObjectId(),
                schedule=ObjectId(),
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift=ObjectId(),
                fixed=False,
            ),
            AssignmentSchema(
                team=team_oid,
                worker=ObjectId(),
                schedule=ObjectId(),
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift=ObjectId(),
                fixed=True,
            ),
        ]
        self.repo.create_many(assignments)

        results = self.repo.get_assignments_by_dates(
            str(team_oid), date(2023, 1, 1), date(2023, 1, 2)
        )

        assert len(results) == 2
        assert results[0].date in [date(2023, 1, 1), date(2023, 1, 2)]
        assert results[1].date in [date(2023, 1, 1), date(2023, 1, 2)]

    def test_delete_assignments_by_schedule_id(self):
        """Test deleting assignments by schedule ID."""
        schedule_oid = ObjectId()
        assignments = [
            AssignmentSchema(
                team=ObjectId(),
                worker=ObjectId(),
                schedule=schedule_oid,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift=ObjectId(),
                fixed=False,
            ),
            AssignmentSchema(
                team=ObjectId(),
                worker=ObjectId(),
                schedule=schedule_oid,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift=ObjectId(),
                fixed=True,
            ),
        ]
        self.repo.create_many(assignments)

        self.repo.delete_assignments_by_schedule_id(str(schedule_oid))

        remaining = self.repo.collection.find({"schedule": schedule_oid})
        assert remaining.retrieved == 0
