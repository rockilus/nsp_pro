from datetime import date, datetime, timezone

import pytest_asyncio

from shared.database.interface import DatabaseInterface
from shared.database.repositories.worker import WorkerRepository
from shared.database.schemas.worker import WorkerSchema
from shared.schemas.core.worker import Worker


class TestWorkerRepository:
    repo: WorkerRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = WorkerRepository(database_interface=mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("workers")  # type: ignore
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_worker(self):
        """Test creating a worker."""
        worker = Worker(
            id=None,
            team_id="team1",
            name="John Doe",
            acronym="JD",
            acronym_custom=False,
            employment_start_date=date(2023, 1, 1),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=5,
            annual_leave=20,
            specialty_ids=["spec1"],
            deleted=False,
        )

        result = self.repo.create_worker(worker)

        assert result.id is not None
        assert result.name == "John Doe"
        assert result.team_id == "team1"
        assert result.acronym == "JD"
        assert result.acronym_custom is False
        assert result.employment_start_date == date(2023, 1, 1)
        assert result.employment_end_date is None
        assert result.weekly_hours == 40
        assert result.weekly_hours_desired == 40
        assert result.duties_per_month == 5
        assert result.annual_leave == 20
        assert result.specialty_ids == ["spec1"]
        assert result.deleted is False

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["name"] == "John Doe"
        assert saved_doc["team"] == "team1"
        assert saved_doc["acronym"] == "JD"
        assert saved_doc["acronym_custom"] is False
        assert (
            saved_doc["employment_start_date"]
            == datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp()
        )
        assert saved_doc["employment_end_date"] is None
        assert saved_doc["weekly_hours"] == 40
        assert saved_doc["weekly_hours_desired"] == 40
        assert saved_doc["duties_per_month"] == 5
        assert saved_doc["annual_leave"] == 20
        assert saved_doc["specialties"] == ["spec1"]
        assert saved_doc["deleted"] is False

    def test_create_workers(self):
        """Test creating multiple workers."""
        workers = [
            Worker(
                id=None,
                team_id="team1",
                name="John Doe",
                acronym="JD",
                acronym_custom=False,
                employment_start_date=date(2023, 1, 1),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialty_ids=["spec1"],
                deleted=False,
            ),
            Worker(
                id=None,
                team_id="team1",
                name="Jane Smith",
                acronym="JS",
                acronym_custom=False,
                employment_start_date=date(2023, 1, 1),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialty_ids=["spec2"],
                deleted=False,
            ),
        ]

        results = self.repo.create_workers(workers)

        assert len(results) == 2
        for result in results:
            assert result.id is not None

        saved_docs = list(self.repo.collection.find({"team": "team1"}))
        assert len(saved_docs) == 2

    def test_get_worker_by_id(self):
        """Test getting a worker by ID."""
        worker = WorkerSchema(
            name="John Doe",
            team="team1",
            acronym="JD",
            acronym_custom=False,
            employment_start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=5,
            annual_leave=20,
            specialties=["spec1"],
            deleted=False,
        )
        created = self.repo.create(worker)

        found = self.repo.get_worker_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.name == "John Doe"

    def test_update_worker(self):
        """Test updating a worker."""
        worker = WorkerSchema(
            name="John Doe",
            team="team1",
            acronym="JD",
            acronym_custom=False,
            employment_start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=5,
            annual_leave=20,
            specialties=["spec1"],
            deleted=False,
        )
        created = self.repo.create(worker)

        updated_worker = Worker(
            id=created.id,
            team_id="team1",
            name="John Updated",
            acronym="JU",
            acronym_custom=True,
            employment_start_date=date(2023, 1, 1),
            employment_end_date=date(2023, 12, 31),
            weekly_hours=35,
            weekly_hours_desired=30,
            duties_per_month=6,
            annual_leave=25,
            specialty_ids=["spec1", "spec2"],
            deleted=False,
        )

        result = self.repo.update_worker(updated_worker)

        assert result.name == "John Updated"
        assert result.acronym == "JU"
        assert result.acronym_custom is True
        assert result.employment_start_date == date(2023, 1, 1)
        assert result.employment_end_date == date(2023, 12, 31)
        assert result.weekly_hours == 35
        assert result.weekly_hours_desired == 30
        assert result.duties_per_month == 6
        assert result.annual_leave == 25
        assert "spec2" in result.specialty_ids

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["name"] == "John Updated"
        assert from_db["acronym"] == "JU"
        assert from_db["acronym_custom"] is True
        assert (
            from_db["employment_start_date"]
            == datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp()
        )
        assert (
            from_db["employment_end_date"]
            == datetime(2023, 12, 31, tzinfo=timezone.utc).timestamp()
        )
        assert from_db["weekly_hours"] == 35
        assert from_db["weekly_hours_desired"] == 30
        assert from_db["duties_per_month"] == 6
        assert from_db["annual_leave"] == 25
        assert "spec2" in from_db["specialties"]

    def test_update_workers(self):
        """Test updating multiple workers."""
        workers = [
            WorkerSchema(
                name="John Doe",
                team="team1",
                acronym="JD",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec1"],
                deleted=False,
            ),
            WorkerSchema(
                name="Jane Smith",
                team="team1",
                acronym="JS",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec2"],
                deleted=False,
            ),
        ]
        created_workers = self.repo.create_many(workers)

        updated_workers = [
            Worker(
                id=created_workers[0].id,
                team_id="team1",
                name="John Updated",
                acronym="JU",
                acronym_custom=True,
                employment_start_date=date(2023, 1, 1),
                employment_end_date=date(2023, 12, 31),
                weekly_hours=35,
                weekly_hours_desired=30,
                duties_per_month=6,
                annual_leave=25,
                specialty_ids=["spec1", "spec3"],
                deleted=False,
            ),
            Worker(
                id=created_workers[1].id,
                team_id="team1",
                name="Jane Updated",
                acronym="JSU",
                acronym_custom=True,
                employment_start_date=date(2023, 1, 1),
                employment_end_date=date(2023, 12, 31),
                weekly_hours=35,
                weekly_hours_desired=30,
                duties_per_month=6,
                annual_leave=25,
                specialty_ids=["spec2", "spec4"],
                deleted=False,
            ),
        ]

        results = self.repo.update_workers(updated_workers)

        assert len(results) == 2
        assert results[0].name == "John Updated"
        assert results[1].name == "Jane Updated"

        from_db = list(self.repo.collection.find({"team": "team1"}))
        assert len(from_db) == 2
        assert from_db[0]["name"] == "John Updated"
        assert from_db[1]["name"] == "Jane Updated"

    def test_delete_worker(self):
        """Test deleting a worker."""
        worker = WorkerSchema(
            name="John Doe",
            team="team1",
            acronym="JD",
            acronym_custom=False,
            employment_start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=5,
            annual_leave=20,
            specialties=["spec1"],
            deleted=False,
        )
        created = self.repo.create(worker)

        self.repo.delete_worker(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_logical_delete_worker(self):
        """Test logically deleting a worker."""
        worker = WorkerSchema(
            name="John Doe",
            team="team1",
            acronym="JD",
            acronym_custom=False,
            employment_start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=5,
            annual_leave=20,
            specialties=["spec1"],
            deleted=False,
        )
        created = self.repo.create(worker)

        result = self.repo.logical_delete_worker(created.id)

        assert result.deleted is True

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["deleted"] is True

    def test_get_workers(self):
        """Test getting all workers for a team."""
        workers = [
            WorkerSchema(
                name="John Doe",
                team="team1",
                acronym="JD",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec1"],
                deleted=False,
            ),
            WorkerSchema(
                name="Jane Smith",
                team="team1",
                acronym="JS",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec2"],
                deleted=False,
            ),
            WorkerSchema(
                name="Bob Johnson",
                team="team2",
                acronym="BJ",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec1"],
                deleted=False,
            ),
        ]
        self.repo.create_many(workers)

        team1_workers = self.repo.get_workers("team1")
        assert len(team1_workers) == 2

        team2_workers = self.repo.get_workers("team2")
        assert len(team2_workers) == 1

    def test_get_workers_not_deleted(self):
        """Test getting all non-deleted workers for a team."""
        workers = [
            WorkerSchema(
                name="John Doe",
                team="team1",
                acronym="JD",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec1"],
                deleted=False,
            ),
            WorkerSchema(
                name="Jane Smith",
                team="team1",
                acronym="JS",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec2"],
                deleted=True,
            ),
            WorkerSchema(
                name="Bob Johnson",
                team="team2",
                acronym="BJ",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec1"],
                deleted=False,
            ),
        ]
        self.repo.create_many(workers)

        team1_workers = self.repo.get_workers_not_deleted("team1")
        assert len(team1_workers) == 1

        team2_workers = self.repo.get_workers_not_deleted("team2")
        assert len(team2_workers) == 1

    def test_get_workers_by_specialty_id(self):
        """Test getting workers by specialty ID."""
        workers = [
            WorkerSchema(
                name="John Doe",
                team="team1",
                acronym="JD",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec1"],
                deleted=False,
            ),
            WorkerSchema(
                name="Jane Smith",
                team="team1",
                acronym="JS",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec2"],
                deleted=False,
            ),
            WorkerSchema(
                name="Bob Johnson",
                team="team2",
                acronym="BJ",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec1"],
                deleted=False,
            ),
        ]
        self.repo.create_many(workers)

        spec1_workers = self.repo.get_workers_by_specialty_id("spec1")
        assert len(spec1_workers) == 2

        spec2_workers = self.repo.get_workers_by_specialty_id("spec2")
        assert len(spec2_workers) == 1

    def test_get_workers_by_team_and_user(self):
        """Test getting workers by team and user ID."""
        workers = [
            WorkerSchema(
                name="John Doe",
                team="team1",
                acronym="JD",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec1"],
                deleted=False,
                user_id="user1",
            ),
            WorkerSchema(
                name="Jane Smith",
                team="team1",
                acronym="JS",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec2"],
                deleted=False,
                user_id="user2",
            ),
            WorkerSchema(
                name="Bob Johnson",
                team="team2",
                acronym="BJ",
                acronym_custom=False,
                employment_start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialties=["spec1"],
                deleted=False,
                user_id="user1",
            ),
        ]
        self.repo.create_many(workers)

        team1_user1_workers = self.repo.get_workers_by_team_and_user("team1", "user1")
        assert len(team1_user1_workers) == 1
        assert team1_user1_workers[0].name == "John Doe"

        team1_user2_workers = self.repo.get_workers_by_team_and_user("team1", "user2")
        assert len(team1_user2_workers) == 1
        assert team1_user2_workers[0].name == "Jane Smith"

        team2_user1_workers = self.repo.get_workers_by_team_and_user("team2", "user1")
        assert len(team2_user1_workers) == 1
        assert team2_user1_workers[0].name == "Bob Johnson"
