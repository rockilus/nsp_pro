import pytest

from shared.database_pymongo_str_id.database import MongoDB
from shared.database_pymongo_str_id.repositories.link_shift import (
    LinkShiftRepository,
)
from shared.database_pymongo_str_id.schemas.link_shift import LinkShiftSchema
from shared.schemas.schemas.shift import LinkShift


class TestLinkShiftRepository:
    repo: LinkShiftRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = LinkShiftRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_link_shift(self):
        """Test creating a link shift."""
        link_shift = LinkShift(
            id=None,
            team_id="team1",
            shift_ids=["shift1", "shift2"],
        )

        result = self.repo.create_link_shift(link_shift)

        assert result.id is not None
        assert result.team_id == "team1"
        assert result.shift_ids == ["shift1", "shift2"]

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["team"] == "team1"
        assert saved_doc["shifts"] == ["shift1", "shift2"]

    def test_get_link_shifts(self):
        """Test getting all link shifts for a team."""
        link_shift1 = LinkShiftSchema(team="team1", shifts=["shift1", "shift2"])
        link_shift2 = LinkShiftSchema(team="team1", shifts=["shift3", "shift4"])
        self.repo.create(link_shift1)
        self.repo.create(link_shift2)

        result = self.repo.get_link_shifts("team1")

        assert len(result) == 2
        assert result[0].team_id == "team1"
        assert result[1].team_id == "team1"

    def test_get_link_shift_by_id(self):
        """Test getting a link shift by ID."""
        link_shift = LinkShiftSchema(team="team1", shifts=["shift1", "shift2"])
        created = self.repo.create(link_shift)

        found = self.repo.get_link_shift_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.team_id == "team1"

    def test_update_link_shift(self):
        """Test updating a link shift."""
        link_shift = LinkShiftSchema(team="team1", shifts=["shift1", "shift2"])
        created = self.repo.create(link_shift)

        updated_link_shift = LinkShift(
            id=created.id,
            team_id="team1",
            shift_ids=["shift1", "shift3"],
        )

        result = self.repo.update_link_shift(updated_link_shift)

        assert result.shift_ids == ["shift1", "shift3"]

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["shifts"] == ["shift1", "shift3"]

    def test_delete_link_shift(self):
        """Test deleting a link shift."""
        link_shift = LinkShiftSchema(team="team1", shifts=["shift1", "shift2"])
        created = self.repo.create(link_shift)

        self.repo.delete_link_shift(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_link_shifts_by_shift_id(self):
        """Test getting all link shifts associated with a specific shift ID."""
        link_shift1 = LinkShiftSchema(team="team1", shifts=["shift1", "shift2"])
        link_shift2 = LinkShiftSchema(team="team1", shifts=["shift2", "shift3"])
        link_shift3 = LinkShiftSchema(team="team2", shifts=["shift1", "shift4"])
        self.repo.create(link_shift1)
        self.repo.create(link_shift2)
        self.repo.create(link_shift3)

        result = self.repo.get_link_shifts_by_shift_id("shift2")

        assert len(result) == 2
        assert result[0].shift_ids == ["shift1", "shift2"]
        assert result[1].shift_ids == ["shift2", "shift3"]
