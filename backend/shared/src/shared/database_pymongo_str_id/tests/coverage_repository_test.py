import pytest

from shared.database_pymongo_str_id.database import MongoDB
from shared.database_pymongo_str_id.repositories.coverage import (
    CoverageRepository,
)
from shared.database_pymongo_str_id.schemas.coverage import CoverageSchema
from shared.schemas.schemas.coverage import Coverage


class TestCoverageRepository:
    repo: CoverageRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = CoverageRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_coverage(self):
        """Test creating a coverage."""
        coverage = Coverage(
            id=None,
            team_id="team1",
            name="Coverage A",
        )

        result = self.repo.create_coverage(coverage)

        assert result.id is not None
        assert result.name == "Coverage A"
        assert result.team_id == "team1"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["name"] == "Coverage A"
        assert saved_doc["team"] == "team1"

    def test_get_coverage_by_id(self):
        """Test getting a coverage by ID."""
        coverage = CoverageSchema(
            team="team1",
            name="Coverage A",
        )
        created = self.repo.create(coverage)

        found = self.repo.get_coverage_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.name == "Coverage A"

    def test_update_coverage(self):
        """Test updating a coverage."""
        coverage = CoverageSchema(
            team="team1",
            name="Coverage A",
        )
        created = self.repo.create(coverage)

        updated_coverage = Coverage(
            id=created.id,
            team_id="team1",
            name="Updated Coverage",
        )

        result = self.repo.update_coverage(updated_coverage)

        assert result.name == "Updated Coverage"

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["name"] == "Updated Coverage"

    def test_delete_coverage(self):
        """Test deleting a coverage."""
        coverage = CoverageSchema(
            team="team1",
            name="Coverage A",
        )
        created = self.repo.create(coverage)

        self.repo.delete_coverage(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_coverages(self):
        """Test getting all coverages for a team."""
        coverages = [
            CoverageSchema(team="team1", name="Coverage A"),
            CoverageSchema(team="team1", name="Coverage B"),
            CoverageSchema(team="team2", name="Coverage C"),
        ]
        self.repo.create_many(coverages)

        team1_coverages = self.repo.get_coverages("team1")
        assert len(team1_coverages) == 2
        assert sorted([c.name for c in team1_coverages]) == [
            "Coverage A",
            "Coverage B",
        ]

        team2_coverages = self.repo.get_coverages("team2")
        assert len(team2_coverages) == 1
        assert team2_coverages[0].name == "Coverage C"
