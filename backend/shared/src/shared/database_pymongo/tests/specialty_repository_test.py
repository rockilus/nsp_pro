import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.specialty import SpecialtyRepository
from shared.database_pymongo.schemas.specialty import SpecialtySchema
from shared.schemas.schemas.team import Specialty


class TestSpecialtyRepository:
    repo: SpecialtyRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = SpecialtyRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_specialty(self):
        """Test creating a specialty."""
        specialty = Specialty(
            id=None,
            team_id=str(ObjectId()),
            name="Cardiology",
            deleted=False,
        )

        result = self.repo.create_specialty(specialty)

        assert result.id is not None
        assert result.name == "Cardiology"
        assert result.team_id == specialty.team_id

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["name"] == "Cardiology"
        assert saved_doc["team_id"] == ObjectId(specialty.team_id)

    def test_get_specialty_by_id(self):
        """Test getting a specialty by ID."""
        specialty = SpecialtySchema(
            team_id=ObjectId(),
            name="Cardiology",
            deleted=False,
        )
        created = self.repo.create(specialty)

        found = self.repo.get_specialty_by_id(created.id)

        assert found is not None
        assert found.id == str(created.id)
        assert found.name == "Cardiology"

    def test_update_specialty(self):
        """Test updating a specialty."""
        specialty = SpecialtySchema(
            team_id=ObjectId(),
            name="Cardiology",
            deleted=False,
        )
        created = self.repo.create(specialty)

        updated_specialty = Specialty(
            id=created.id,
            team_id=str(ObjectId()),
            name="Updated Cardiology",
            deleted=False,
        )

        result = self.repo.update_specialty(updated_specialty)

        assert result.name == "Updated Cardiology"

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["name"] == "Updated Cardiology"

    def test_delete_specialty(self):
        """Test deleting a specialty."""
        specialty = SpecialtySchema(
            team_id=ObjectId(),
            name="Cardiology",
            deleted=False,
        )
        created = self.repo.create(specialty)

        self.repo.delete_specialty(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_logical_delete_specialty(self):
        """Test logically deleting a specialty."""
        specialty = SpecialtySchema(
            team_id=ObjectId(),
            name="Cardiology",
            deleted=False,
        )
        created = self.repo.create(specialty)

        result = self.repo.logical_delete_specialty(created.id)

        assert result.deleted is True

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["deleted"] is True

    def test_get_specialties_by_team_id(self):
        """Test getting specialties by team ID."""
        team_oid = ObjectId()
        specialties = [
            SpecialtySchema(team_id=team_oid, name="Cardiology", deleted=False),
            SpecialtySchema(team_id=team_oid, name="Neurology", deleted=False),
            SpecialtySchema(team_id=ObjectId(), name="Oncology", deleted=False),
        ]
        self.repo.create_many(specialties)

        result = self.repo.get_specialties_by_team_id(str(team_oid))

        assert len(result) == 2
        assert {s.name for s in result} == {"Cardiology", "Neurology"}

    def test_get_specialties_not_deleted_by_team_id(self):
        """Test getting non-deleted specialties by team ID."""
        team_oid = ObjectId()
        specialties = [
            SpecialtySchema(team_id=team_oid, name="Cardiology", deleted=False),
            SpecialtySchema(team_id=team_oid, name="Neurology", deleted=True),
            SpecialtySchema(team_id=team_oid, name="Oncology", deleted=False),
        ]
        self.repo.create_many(specialties)

        result = self.repo.get_specialties_not_deleted_by_team_id(str(team_oid))

        assert len(result) == 2
        assert {s.name for s in result} == {"Cardiology", "Oncology"}

    def test_get_specialties_by_team_ids(self):
        """Test getting specialties by multiple team IDs."""
        team_1_oid = ObjectId()
        team_2_oid = ObjectId()
        team_ids = [str(team_1_oid), str(team_2_oid)]
        specialties = [
            SpecialtySchema(team_id=team_1_oid, name="Cardiology", deleted=False),
            SpecialtySchema(team_id=ObjectId(), name="Neurology", deleted=False),
            SpecialtySchema(team_id=team_2_oid, name="Oncology", deleted=False),
        ]
        self.repo.create_many(specialties)

        result = self.repo.get_specialties_by_team_ids(team_ids)

        assert len(result) == 2
        assert {s.name for s in result} == {"Cardiology", "Oncology"}
