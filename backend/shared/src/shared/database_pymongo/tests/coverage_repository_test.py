import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.coverage import CoverageRepository
from shared.database_pymongo.schemas.coverage import CoverageSchema
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
            team_id=str(ObjectId()),
            name="Coverage A",
        )

        result = self.repo.create_coverage(coverage)

        assert result.id is not None
        assert result.name == "Coverage A"
        assert result.team_id == coverage.team_id

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["name"] == "Coverage A"
        assert saved_doc["team"] == ObjectId(coverage.team_id)

    def test_get_coverage_by_id(self):
        """Test getting a coverage by ID."""
        coverage = CoverageSchema(
            team=ObjectId(),
            name="Coverage A",
        )
        created = self.repo.create(coverage)

        found = self.repo.get_coverage_by_id(created.id)

        assert found is not None
        assert found.id == str(created.id)
        assert found.name == "Coverage A"

    def test_update_coverage(self):
        """Test updating a coverage."""
        coverage = CoverageSchema(
            team=ObjectId(),
            name="Coverage A",
        )
        created = self.repo.create(coverage)

        updated_coverage = Coverage(
            id=created.id,
            team_id=str(ObjectId()),
            name="Updated Coverage",
        )

        result = self.repo.update_coverage(updated_coverage)

        assert result.name == "Updated Coverage"
        assert result.team_id == updated_coverage.team_id

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
        assert from_db["name"] == "Updated Coverage"
        assert from_db["team"] == ObjectId(updated_coverage.team_id)

    def test_delete_coverage(self):
        """Test deleting a coverage."""
        coverage = CoverageSchema(
            team=ObjectId(),
            name="Coverage A",
        )
        created = self.repo.create(coverage)

        self.repo.delete_coverage(created.id)

        assert self.repo.collection.find_one({"_id": ObjectId(created.id)}) is None

    def test_get_coverages(self):
        """Test getting all coverages for a team."""
        team_1_oid = ObjectId()
        team_2_oid = ObjectId()
        coverages = [
            CoverageSchema(team=team_1_oid, name="Coverage A"),
            CoverageSchema(team=team_1_oid, name="Coverage B"),
            CoverageSchema(team=team_2_oid, name="Coverage C"),
        ]
        self.repo.create_many(coverages)

        team1_coverages = self.repo.get_coverages(str(team_1_oid))
        assert len(team1_coverages) == 2
        assert sorted([c.name for c in team1_coverages]) == [
            "Coverage A",
            "Coverage B",
        ]

        team2_coverages = self.repo.get_coverages(str(team_2_oid))
        assert len(team2_coverages) == 1
        assert team2_coverages[0].name == "Coverage C"
