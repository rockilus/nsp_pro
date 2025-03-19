from datetime import date, datetime, time, timezone

import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.worker import WorkerRepository
from shared.database_pymongo.schemas.worker import WorkerSchema
from shared.schemas.schemas.worker import Worker


class TestWorkerRepository:
    repo: WorkerRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = WorkerRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_worker(self):
        """Test creating a worker."""
        worker = Worker(
            id=None,
            team_id=str(ObjectId()),
            name="John Doe",
            acronym="JD",
            acronym_custom=False,
            employment_start_date=date(2023, 1, 1),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=5,
            annual_leave=20,
            specialty_ids=[str(ObjectId())],
            deleted=False,
        )

        result = self.repo.create_worker(worker)

        assert result.id is not None
        assert result.name == worker.name
        assert result.team_id == worker.team_id
        assert result.acronym == worker.acronym
        assert result.acronym_custom == worker.acronym_custom
        assert result.employment_start_date == worker.employment_start_date
        assert result.employment_end_date == worker.employment_end_date
        assert result.weekly_hours == worker.weekly_hours
        assert result.weekly_hours_desired == worker.weekly_hours_desired
        assert result.duties_per_month == worker.duties_per_month
        assert result.annual_leave == worker.annual_leave
        assert result.specialty_ids == worker.specialty_ids
        assert result.deleted == worker.deleted

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["name"] == worker.name
        assert saved_doc["team"] == ObjectId(worker.team_id)
        assert saved_doc["acronym"] == worker.acronym
        assert saved_doc["acronym_custom"] == worker.acronym_custom
        assert (
            saved_doc["employment_start_date"]
            == datetime.combine(
                worker.employment_start_date, time.min, timezone.utc
            ).timestamp()
        )
        assert saved_doc["employment_end_date"] == worker.employment_end_date
        assert saved_doc["weekly_hours"] == worker.weekly_hours
        assert saved_doc["weekly_hours_desired"] == worker.weekly_hours_desired
        assert saved_doc["duties_per_month"] == worker.duties_per_month
        assert saved_doc["annual_leave"] == worker.annual_leave
        assert saved_doc["specialties"] == [
            ObjectId(s_id) for s_id in worker.specialty_ids
        ]
        assert saved_doc["deleted"] == worker.deleted

    def test_create_workers(self):
        """Test creating multiple workers."""
        team_id = str(ObjectId())
        workers = [
            Worker(
                id=None,
                team_id=team_id,
                name="John Doe",
                acronym="JD",
                acronym_custom=False,
                employment_start_date=date(2023, 1, 1),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialty_ids=[str(ObjectId())],
                deleted=False,
            ),
            Worker(
                id=None,
                team_id=team_id,
                name="Jane Smith",
                acronym="JS",
                acronym_custom=False,
                employment_start_date=date(2023, 1, 1),
                employment_end_date=None,
                weekly_hours=40,
                weekly_hours_desired=40,
                duties_per_month=5,
                annual_leave=20,
                specialty_ids=[str(ObjectId())],
                deleted=False,
            ),
        ]

        results = self.repo.create_workers(workers)

        assert len(results) == 2
        for result in results:
            assert result.id is not None

        saved_docs = list(self.repo.collection.find({"team": ObjectId(team_id)}))
        assert len(saved_docs) == 2

    def test_get_worker_by_id(self):
        """Test getting a worker by ID."""
        worker = WorkerSchema(
            name="John Doe",
            team=ObjectId(),
            acronym="JD",
            acronym_custom=False,
            employment_start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=5,
            annual_leave=20,
            specialties=[ObjectId()],
            deleted=False,
        )
        created = self.repo.create(worker)

        found = self.repo.get_worker_by_id(str(created.id))

        assert found is not None
        assert found.id == str(created.id)
        assert found.name == "John Doe"

    def test_update_worker(self):
        """Test updating a worker."""
        spe_1_oid = ObjectId()
        spe_2_oid = ObjectId()
        worker = WorkerSchema(
            name="John Doe",
            team=ObjectId(),
            acronym="JD",
            acronym_custom=False,
            employment_start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=5,
            annual_leave=20,
            specialties=[spe_1_oid],
            deleted=False,
        )
        created = self.repo.create(worker)

        updated_worker = Worker(
            id=created.id,
            team_id=str(ObjectId()),
            name="John Updated",
            acronym="JU",
            acronym_custom=True,
            employment_start_date=date(2023, 1, 1),
            employment_end_date=date(2023, 12, 31),
            weekly_hours=35,
            weekly_hours_desired=30,
            duties_per_month=6,
            annual_leave=25,
            specialty_ids=[str(spe_1_oid), str(spe_2_oid)],
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
        assert str(spe_2_oid) in result.specialty_ids

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
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
        assert spe_2_oid in from_db["specialties"]

    def test_update_workers(self):
        """Test updating multiple workers."""
        team_id = str(ObjectId())
        workers = [
            WorkerSchema(
                name="John Doe",
                team=ObjectId(team_id),
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
                specialties=[ObjectId()],
                deleted=False,
            ),
            WorkerSchema(
                name="Jane Smith",
                team=ObjectId(team_id),
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
                specialties=[ObjectId()],
                deleted=False,
            ),
        ]
        created_workers = self.repo.create_many(workers)

        updated_workers = [
            Worker(
                id=str(created_workers[0].id),
                team_id=team_id,
                name="John Updated",
                acronym="JU",
                acronym_custom=True,
                employment_start_date=date(2023, 1, 1),
                employment_end_date=date(2023, 12, 31),
                weekly_hours=35,
                weekly_hours_desired=30,
                duties_per_month=6,
                annual_leave=25,
                specialty_ids=[str(ObjectId())],
                deleted=False,
            ),
            Worker(
                id=str(created_workers[1].id),
                team_id=team_id,
                name="Jane Updated",
                acronym="JSU",
                acronym_custom=True,
                employment_start_date=date(2023, 1, 1),
                employment_end_date=date(2023, 12, 31),
                weekly_hours=35,
                weekly_hours_desired=30,
                duties_per_month=6,
                annual_leave=25,
                specialty_ids=[str(ObjectId())],
                deleted=False,
            ),
        ]

        results = self.repo.update_workers(updated_workers)

        assert len(results) == 2
        assert results[0].name == "John Updated"
        assert results[1].name == "Jane Updated"

        from_db = list(self.repo.collection.find({"team": ObjectId(team_id)}))
        assert len(from_db) == 2
        assert from_db[0]["name"] == "John Updated"
        assert from_db[1]["name"] == "Jane Updated"

    def test_delete_worker(self):
        """Test deleting a worker."""
        worker = WorkerSchema(
            name="John Doe",
            team=ObjectId(),
            acronym="JD",
            acronym_custom=False,
            employment_start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=5,
            annual_leave=20,
            specialties=[ObjectId()],
            deleted=False,
        )
        created = self.repo.create(worker)

        self.repo.delete_worker(created.id)

        assert self.repo.collection.find_one({"_id": ObjectId(created.id)}) is None

    def test_logical_delete_worker(self):
        """Test logically deleting a worker."""
        worker = WorkerSchema(
            name="John Doe",
            team=ObjectId(),
            acronym="JD",
            acronym_custom=False,
            employment_start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            employment_end_date=None,
            weekly_hours=40,
            weekly_hours_desired=40,
            duties_per_month=5,
            annual_leave=20,
            specialties=[ObjectId()],
            deleted=False,
        )
        created = self.repo.create(worker)

        result = self.repo.logical_delete_worker(created.id)

        assert result.deleted is True

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
        assert from_db["deleted"] is True

    def test_get_workers(self):
        """Test getting all workers for a team."""
        team_1_oid = ObjectId()
        team_2_oid = ObjectId()
        workers = [
            WorkerSchema(
                name="John Doe",
                team=team_1_oid,
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
                specialties=[ObjectId()],
                deleted=False,
            ),
            WorkerSchema(
                name="Jane Smith",
                team=team_1_oid,
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
                specialties=[ObjectId()],
                deleted=False,
            ),
            WorkerSchema(
                name="Bob Johnson",
                team=team_2_oid,
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
                specialties=[ObjectId()],
                deleted=False,
            ),
        ]
        self.repo.create_many(workers)

        team1_workers = self.repo.get_workers(str(team_1_oid))
        assert len(team1_workers) == 2

        team2_workers = self.repo.get_workers(str(team_2_oid))
        assert len(team2_workers) == 1

    def test_get_workers_not_deleted(self):
        """Test getting all non-deleted workers for a team."""
        team_1_oid = ObjectId()
        team_2_oid = ObjectId()
        workers = [
            WorkerSchema(
                name="John Doe",
                team=team_1_oid,
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
                specialties=[ObjectId()],
                deleted=False,
            ),
            WorkerSchema(
                name="Jane Smith",
                team=team_1_oid,
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
                specialties=[ObjectId()],
                deleted=True,
            ),
            WorkerSchema(
                name="Bob Johnson",
                team=team_2_oid,
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
                specialties=[ObjectId()],
                deleted=False,
            ),
        ]
        self.repo.create_many(workers)

        team1_workers = self.repo.get_workers_not_deleted(str(team_1_oid))
        assert len(team1_workers) == 1

        team2_workers = self.repo.get_workers_not_deleted(str(team_2_oid))
        assert len(team2_workers) == 1

    def test_get_workers_by_specialty_id(self):
        """Test getting workers by specialty ID."""
        spe_1_oid = ObjectId()
        spe_2_oid = ObjectId()
        workers = [
            WorkerSchema(
                name="John Doe",
                team=ObjectId(),
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
                specialties=[spe_1_oid],
                deleted=False,
            ),
            WorkerSchema(
                name="Jane Smith",
                team=ObjectId(),
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
                specialties=[spe_1_oid],
                deleted=False,
            ),
            WorkerSchema(
                name="Bob Johnson",
                team=ObjectId(),
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
                specialties=[spe_2_oid],
                deleted=False,
            ),
        ]
        self.repo.create_many(workers)

        spec1_workers = self.repo.get_workers_by_specialty_id(str(spe_1_oid))
        assert len(spec1_workers) == 2

        spec2_workers = self.repo.get_workers_by_specialty_id(str(spe_2_oid))
        assert len(spec2_workers) == 1
