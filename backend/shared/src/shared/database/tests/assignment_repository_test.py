from datetime import date, datetime, time, timedelta, timezone

import pytest
import pytest_asyncio

from shared.database.interface import DatabaseInterface
from shared.database.repositories.assignment import AssignmentRepository
from shared.database.schemas.assignment import AssignmentSchema
from shared.schemas.core.assignment import Assignment, AssignmentSource


# pylint: disable=too-many-public-methods, too-many-lines
class TestAssignmentRepository:
    repo: AssignmentRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = AssignmentRepository(database_interface=mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("assignments")  # type: ignore
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_assignment(self):
        """Test creating an assignment."""
        assignment = Assignment(
            id="",  # Will be set by repository
            team_id="team1",
            worker_id="worker1",
            schedule_id="schedule1",
            date=date(2023, 1, 1),
            shift_id="shift1",
            fixed=False,
            source=AssignmentSource.MANUAL,
        )

        result = self.repo.create_assignment(assignment)

        assert result.id is not None
        assert result.team_id == "team1"
        assert result.worker_id == "worker1"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
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
            source=AssignmentSource.MANUAL.value,
        )
        created = self.repo.create(assignment)

        assert created.id is not None
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
            source=AssignmentSource.MANUAL.value,
        )
        created = self.repo.create(assignment)

        assert created.id is not None
        updated_assignment = Assignment(
            id=created.id,
            team_id="team1",
            worker_id="worker2",
            schedule_id="schedule1",
            date=date(2023, 1, 2),
            shift_id="shift2",
            fixed=True,
            source=AssignmentSource.MANUAL,
        )

        result = self.repo.update_assignment(updated_assignment)

        assert result.worker_id == "worker2"
        assert result.date == date(2023, 1, 2)
        assert result.fixed is True

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db is not None
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
            source=AssignmentSource.MANUAL.value,
        )
        created = self.repo.create(assignment)

        assert created.id is not None
        self.repo.delete_assignment(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

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
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        results = self.repo.get_assignments("team1")

        assert len(results) == 2
        assert results[0].team_id == "team1"
        assert results[1].team_id == "team1"

    def test_get_assignments_by_schedule_ids(self):
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
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        results = self.repo.get_assignments_by_schedule_ids(schedule_ids)

        assert len(results) == 2
        assert results[0].schedule_id in ["schedule1", "schedule2"]
        assert results[1].schedule_id in ["schedule1", "schedule2"]

    def test_get_assignment_by_worker_id_date_schedule_id(self):
        """Test getting an assignment by worker, date, and schedule."""
        assignment = AssignmentSchema(
            team="team1",
            worker="worker1",
            schedule="schedule1",
            date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            shift="shift1",
            fixed=False,
            source=AssignmentSource.MANUAL.value,
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
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        results = self.repo.get_assignments_by_dates(
            "team1", date(2023, 1, 1), date(2023, 1, 2)
        )

        assert len(results) == 2
        assert results[0].date in [date(2023, 1, 1), date(2023, 1, 2)]
        assert results[1].date in [date(2023, 1, 1), date(2023, 1, 2)]

    def test_get_assignments_by_dates_with_fixed_true(self):
        """Test filtering assignments by date range and fixed=True."""
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker3",
                schedule="schedule3",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift3",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        results = self.repo.get_assignments_by_dates(
            "team1", date(2023, 1, 1), date(2023, 1, 2), True
        )

        assert len(results) == 2
        assert all(r.fixed is True for r in results)

    def test_get_assignments_by_dates_with_fixed_false(self):
        """Test filtering assignments by date range and fixed=False."""
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker3",
                schedule="schedule3",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift3",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        results = self.repo.get_assignments_by_dates(
            "team1", date(2023, 1, 1), date(2023, 1, 2), False
        )

        assert len(results) == 2
        assert all(r.fixed is False for r in results)

    def test_get_assignments_by_dates_with_only_start(self):
        """Test getting assignments when only start date is provided."""
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker3",
                schedule="schedule3",
                date=datetime(2023, 1, 3, tzinfo=timezone.utc),
                shift="shift3",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        # Only start date provided -> should return assignments on/after 2023-01-02
        results = self.repo.get_assignments_by_dates("team1", date(2023, 1, 2), None)

        assert len(results) == 2
        assert all(r.date >= date(2023, 1, 2) for r in results)

    def test_get_assignments_by_dates_with_only_end(self):
        """Test getting assignments when only end date is provided."""
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker3",
                schedule="schedule3",
                date=datetime(2023, 1, 3, tzinfo=timezone.utc),
                shift="shift3",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        # Only end date provided -> should return assignments on/before 2023-01-02
        results = self.repo.get_assignments_by_dates("team1", None, date(2023, 1, 2))

        assert len(results) == 2
        assert all(r.date <= date(2023, 1, 2) for r in results)

    def test_delete_assignments_by_dates_delete_fixed_true(self):
        """When delete_fixed=True, delete both fixed and non-fixed assignments."""
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        deleted_ids = self.repo.delete_assignments_by_dates(
            "team1", date(2023, 1, 1), date(2023, 1, 2), delete_fixed=True
        )

        # Both assignments should be deleted
        assert len(deleted_ids) == 2
        remaining = list(self.repo.collection.find({"team": "team1"}))
        assert len(remaining) == 0

    def test_delete_assignments_by_dates_delete_fixed_false(self):
        """When delete_fixed=False, delete only non-fixed assignments."""
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker3",
                schedule="schedule3",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift3",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        deleted_ids = self.repo.delete_assignments_by_dates(
            "team1", date(2023, 1, 1), date(2023, 1, 2), delete_fixed=False
        )

        # Only the non-fixed assignments should be deleted (2 of them)
        assert len(deleted_ids) == 2

        # The fixed assignment should remain
        remaining = list(self.repo.collection.find({"team": "team1"}))
        assert len(remaining) == 1
        assert remaining[0]["fixed"] is True

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
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        self.repo.delete_assignments_by_schedule_id("schedule1")

        remaining = self.repo.collection.find({"schedule": "schedule1"})
        assert remaining.retrieved == 0

    def test_get_assignments_by_team_and_shifts_today_onward(self):
        """Test getting assignments by team and shifts from today onward."""
        today = date.today()
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(today.year, today.month, today.day, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
                + timedelta(days=1),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
                + timedelta(days=-1),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team2",
                worker="worker3",
                schedule="schedule3",
                date=datetime(today.year, today.month, today.day, tzinfo=timezone.utc),
                shift="shift3",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        shift_ids = ["shift1", "shift2"]
        results = self.repo.get_assignments_by_team_and_shifts_today_onward(
            "team1", shift_ids
        )

        assert len(results) == 2
        assert all(result.team_id == "team1" for result in results)
        assert all(result.shift_id in shift_ids for result in results)
        assert all(result.date >= today for result in results)

    def test_delete_assignments_by_team_and_shift_today_onward(self):
        """Test deleting assignments by team and shift from today onward."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=today,
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=today + timedelta(days=1),
                shift="shift1",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker3",
                schedule="schedule3",
                date=today - timedelta(days=1),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team2",
                worker="worker4",
                schedule="schedule4",
                date=today,
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        self.repo.delete_assignments_by_team_and_shift_today_onward("team1", "shift1")

        remaining = list(
            self.repo.collection.find({"team": "team1", "shift": "shift1"})
        )
        assert len(remaining) == 1
        for a_doc in remaining:
            assert a_doc["date"] < today

    def test_delete_assignments_by_team_worker_shift_and_date(self):
        """Test deleting assignments by team, worker, shift, and date."""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=today,
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule2",
                date=today + timedelta(days=1),
                shift="shift1",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule3",
                date=today,
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team2",
                worker="worker1",
                schedule="schedule4",
                date=today,
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        a_created = self.repo.create_many(assignments)

        a_deleted_ids = self.repo.delete_assignments_by_team_worker_shift_and_date(
            "team1", "worker1", "shift1", today.date()
        )

        assert len(a_deleted_ids) == 1
        assert a_deleted_ids == [a_created[0].id]

        remaining = list(
            self.repo.collection.find(
                {
                    "team": "team1",
                    "worker": "worker1",
                    "shift": "shift1",
                    "date": {
                        "$gte": datetime.combine(
                            today.date(), time.min, tzinfo=timezone.utc
                        ),
                        "$lte": datetime.combine(
                            today.date(), time.max, tzinfo=timezone.utc
                        ),
                    },
                }
            )
        )

        assert len(remaining) == 0

        # Ensure other assignments are not deleted
        other_assignments = list(
            self.repo.collection.find(
                {
                    "team": "team1",
                    "worker": "worker1",
                    "shift": "shift1",
                    "date": {
                        "$gte": datetime.combine(
                            (today + timedelta(days=1)).date(),
                            time.min,
                            tzinfo=timezone.utc,
                        ),
                        "$lte": datetime.combine(
                            (today + timedelta(days=1)).date(),
                            time.max,
                            tzinfo=timezone.utc,
                        ),
                    },
                }
            )
        )
        assert len(other_assignments) == 1

        unrelated_assignments = list(
            self.repo.collection.find(
                {
                    "team": "team1",
                    "worker": "worker2",
                    "shift": "shift1",
                    "date": {
                        "$gte": datetime.combine(
                            today.date(), time.min, tzinfo=timezone.utc
                        ),
                        "$lte": datetime.combine(
                            today.date(), time.max, tzinfo=timezone.utc
                        ),
                    },
                }
            )
        )
        assert len(unrelated_assignments) == 1

        other_team_assignments = list(
            self.repo.collection.find(
                {
                    "team": "team2",
                    "worker": "worker1",
                    "shift": "shift1",
                    "date": {
                        "$gte": datetime.combine(
                            today.date(), time.min, tzinfo=timezone.utc
                        ),
                        "$lte": datetime.combine(
                            today.date(), time.max, tzinfo=timezone.utc
                        ),
                    },
                }
            )
        )
        assert len(other_team_assignments) == 1

    def test_get_assignment_by_worker_shift_team_and_date(self):
        """Test getting an assignment by worker ID, shift ID, team ID,
        and date."""
        assignment = AssignmentSchema(
            team="team1",
            worker="worker1",
            schedule="schedule1",
            date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            shift="shift1",
            fixed=False,
            source=AssignmentSource.MANUAL.value,
        )
        self.repo.create(assignment)

        worker_id = "worker1"
        shift_id = "shift1"
        team_id = "team1"
        a_date = date(2023, 1, 1)

        result = self.repo.get_assignment_by_worker_shift_team_and_date(
            worker_id, shift_id, team_id, a_date
        )

        assert result is not None
        assert result.worker_id == worker_id
        assert result.shift_id == shift_id
        assert result.team_id == team_id
        assert result.date == a_date

        # Test for non-existing assignment
        non_existing_result = self.repo.get_assignment_by_worker_shift_team_and_date(
            "worker2", "shift2", "team2", date(2023, 1, 2)
        )
        assert non_existing_result is None

    def test_get_assignments_by_reference_id(self):
        """Test getting assignments by reference ID."""
        reference_id = "ref123"
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
                reference_assignment_id=reference_id,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
                reference_assignment_id=reference_id,
            ),
        ]
        self.repo.create_many(assignments)

        results = self.repo.get_assignments_by_reference_id(reference_id)

        assert len(results) == 2
        assert all(a.reference_assignment_id == reference_id for a in results)

    def test_delete_assignments_by_reference_id(self):
        """Test deleting assignments by reference ID."""
        reference_id = "ref123"
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
                reference_assignment_id=reference_id,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
                reference_assignment_id=reference_id,
            ),
        ]
        self.repo.create_many(assignments)

        deleted_ids = self.repo.delete_assignments_by_reference_id(reference_id)

        assert len(deleted_ids) == 2
        assert all(isinstance(id, str) for id in deleted_ids)

        remaining = list(
            self.repo.collection.find({"reference_assignment_id": reference_id})
        )
        assert len(remaining) == 0

    def test_delete_assignments_by_source_id_from_date(self):
        """Test deleting assignments by recurrence rule ID from a
        specific date."""
        source_id = "rule123"
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=today,
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
                source_id=source_id,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=today + timedelta(days=1),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
                source_id=source_id,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker3",
                schedule="schedule3",
                date=today - timedelta(days=1),
                shift="shift3",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
                source_id=source_id,
            ),
            AssignmentSchema(
                team="team2",
                worker="worker4",
                schedule="schedule4",
                date=today,
                shift="shift4",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
                source_id="rule456",
            ),
        ]
        self.repo.create_many(assignments)

        deleted_ids = self.repo.delete_assignments_by_source_id_from_date(
            source_id, today.date()
        )

        assert len(deleted_ids) == 2
        assert all(isinstance(id, str) for id in deleted_ids)

        remaining = list(self.repo.collection.find({"source_id": source_id}))
        assert len(remaining) == 1
        assert remaining[0]["date"] < today

    def test_delete_assignments_by_source_id(self):
        """Test deleting assignments by recurrence rule ID."""
        source_id = "rule123"
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
                source_id=source_id,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
                source_id=source_id,
            ),
            AssignmentSchema(
                team="team2",
                worker="worker3",
                schedule="schedule3",
                date=datetime(2023, 1, 3, tzinfo=timezone.utc),
                shift="shift3",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
                source_id="rule456",
            ),
        ]
        self.repo.create_many(assignments)

        deleted_ids = self.repo.delete_assignments_by_source_id(source_id)

        assert len(deleted_ids) == 2
        assert all(isinstance(id, str) for id in deleted_ids)

        remaining = list(self.repo.collection.find({"source_id": source_id}))
        assert len(remaining) == 0

        unrelated = list(self.repo.collection.find({"source_id": "rule456"}))
        assert len(unrelated) == 1

    def test_delete_assignments_by_schedule_id_and_dates(self):
        """Test deleting assignments by schedule ID and dates."""
        schedule_id = "schedule1"
        dates = [
            datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            datetime(2023, 1, 2, tzinfo=timezone.utc).date(),
        ]
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule1",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker3",
                schedule="schedule1",
                date=datetime(2023, 1, 3, tzinfo=timezone.utc),
                shift="shift3",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        self.repo.delete_assignments_by_schedule_id_and_dates(schedule_id, dates)

        remaining = list(self.repo.collection.find({"schedule": schedule_id}))

        assert len(remaining) == 1
        assert remaining[0]["date"] == datetime(2023, 1, 3, 0, 0)

    def test_delete_assignments(self):
        """Test deleting multiple assignments by their IDs."""
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        created_assignments = self.repo.create_many(assignments)

        assignment_ids = [
            assignment.id
            for assignment in created_assignments
            if assignment.id is not None
        ]

        deleted_ids = self.repo.delete_assignments(assignment_ids)

        assert len(deleted_ids) == len(assignment_ids)
        assert all(isinstance(id, str) for id in deleted_ids)

        remaining = list(self.repo.collection.find({"_id": {"$in": assignment_ids}}))
        assert len(remaining) == 0

    def test_get_assignments_by_schedule_ids_and_date_range(self):
        """Test getting assignments by schedule IDs and a date range."""
        schedule_ids = ["schedule1", "schedule2"]
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker3",
                schedule="schedule1",
                date=datetime(2023, 1, 3, tzinfo=timezone.utc),
                shift="shift3",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
        ]
        self.repo.create_many(assignments)

        start_date = date(2023, 1, 1)
        end_date = date(2023, 1, 2)

        results = self.repo.get_assignments_by_schedule_ids_and_date_range(
            schedule_ids, start_date, end_date
        )

        assert len(results) == 2
        assert all(result.schedule_id in schedule_ids for result in results)
        assert all(start_date <= result.date <= end_date for result in results)

    def test_get_assignments_by_ids_returns_matching_assignments(self):
        """Test getting assignments by a list of assignment IDs."""
        assignments = [
            AssignmentSchema(
                team="team1",
                worker="worker1",
                schedule="schedule1",
                date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                shift="shift1",
                fixed=False,
                source=AssignmentSource.MANUAL.value,
            ),
            AssignmentSchema(
                team="team1",
                worker="worker2",
                schedule="schedule2",
                date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                shift="shift2",
                fixed=True,
                source=AssignmentSource.MANUAL.value,
            ),
        ]

        created = self.repo.create_many(assignments)
        assignment_ids = [a.id for a in created if a.id is not None]

        results = self.repo.get_assignments_by_ids(assignment_ids)

        assert len(results) == 2
        assert set(r.id for r in results) == set(assignment_ids)

    def test_get_assignments_by_ids_with_empty_input_returns_empty(self):
        """Calling with empty list returns empty list."""
        results = self.repo.get_assignments_by_ids([])
        assert results == []

    def test_get_assignments_by_ids_ignores_missing_ids(self):
        """Missing IDs are ignored; existing assignments are returned."""
        assignment = AssignmentSchema(
            team="team1",
            worker="worker1",
            schedule="schedule1",
            date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            shift="shift1",
            fixed=False,
            source=AssignmentSource.MANUAL.value,
        )
        created = self.repo.create(assignment)

        assert created.id is not None
        results = self.repo.get_assignments_by_ids([created.id, "missing_id"])

        assert len(results) == 1
        assert results[0].id == created.id

    def test_get_assignments_by_ids_strict_raises_on_missing(self):
        """When raise_on_missing=True, a missing id raises ValueError."""
        assignment = AssignmentSchema(
            team="team1",
            worker="worker1",
            schedule="schedule1",
            date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            shift="shift1",
            fixed=False,
            source=AssignmentSource.MANUAL.value,
        )
        created = self.repo.create(assignment)

        assert created.id is not None
        with pytest.raises(ValueError):
            self.repo.get_assignments_by_ids(
                [created.id, "missing_id"], raise_on_missing=True
            )
