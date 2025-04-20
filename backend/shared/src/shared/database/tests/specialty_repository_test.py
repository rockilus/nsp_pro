import pytest

from shared.database.database import MongoDB
from shared.database.repositories.specialty import (
    SpecialtyRepository,
)
from shared.database.schemas.specialty import SpecialtySchema
from shared.schemas.core.specialty import Specialty


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
            team_id="team1",
            name="Cardiology",
            deleted=False,
        )

        result = self.repo.create_specialty(specialty)

        assert result.id is not None
        assert result.name == "Cardiology"
        assert result.team_id == "team1"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["name"] == "Cardiology"
        assert saved_doc["team"] == "team1"

    def test_get_specialty_by_id(self):
        """Test getting a specialty by ID."""
        specialty = SpecialtySchema(
            team="team1",
            name="Cardiology",
            deleted=False,
        )
        created = self.repo.create(specialty)

        found = self.repo.get_specialty_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.name == "Cardiology"

    def test_update_specialty(self):
        """Test updating a specialty."""
        specialty = SpecialtySchema(
            team="team1",
            name="Cardiology",
            deleted=False,
        )
        created = self.repo.create(specialty)

        updated_specialty = Specialty(
            id=created.id,
            team_id="team1",
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
            team="team1",
            name="Cardiology",
            deleted=False,
        )
        created = self.repo.create(specialty)

        self.repo.delete_specialty(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_logical_delete_specialty(self):
        """Test logically deleting a specialty."""
        specialty = SpecialtySchema(
            team="team1",
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
        specialties = [
            SpecialtySchema(team="team1", name="Cardiology", deleted=False),
            SpecialtySchema(team="team1", name="Neurology", deleted=False),
            SpecialtySchema(team="team2", name="Oncology", deleted=False),
        ]
        self.repo.create_many(specialties)

        result = self.repo.get_specialties_by_team_id("team1")

        assert len(result) == 2
        assert {s.name for s in result} == {"Cardiology", "Neurology"}

    def test_get_specialties_not_deleted_by_team_id(self):
        """Test getting non-deleted specialties by team ID."""
        specialties = [
            SpecialtySchema(team="team1", name="Cardiology", deleted=False),
            SpecialtySchema(team="team1", name="Neurology", deleted=True),
            SpecialtySchema(team="team1", name="Oncology", deleted=False),
        ]
        self.repo.create_many(specialties)

        result = self.repo.get_specialties_not_deleted_by_team_id("team1")

        assert len(result) == 2
        assert {s.name for s in result} == {"Cardiology", "Oncology"}

    def test_get_specialties_by_team_ids(self):
        """Test getting specialties by multiple team IDs."""
        specialties = [
            SpecialtySchema(team="team1", name="Cardiology", deleted=False),
            SpecialtySchema(team="team2", name="Neurology", deleted=False),
            SpecialtySchema(team="team3", name="Oncology", deleted=False),
        ]
        self.repo.create_many(specialties)

        result = self.repo.get_specialties_by_team_ids(["team1", "team3"])

        assert len(result) == 2
        assert {s.name for s in result} == {"Cardiology", "Oncology"}
