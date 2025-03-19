import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.link_shift import LinkShiftRepository
from shared.database_pymongo.schemas.link_shift import LinkShiftSchema
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
            team_id=str(ObjectId()),
            shift_ids=[str(ObjectId()), str(ObjectId())],
        )

        result = self.repo.create_link_shift(link_shift)

        assert result.id is not None
        assert result.team_id == link_shift.team_id
        assert result.shift_ids == link_shift.shift_ids

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["team"] == ObjectId(link_shift.team_id)
        assert saved_doc["shifts"] == [
            ObjectId(shift_id) for shift_id in link_shift.shift_ids
        ]

    def test_get_link_shifts(self):
        """Test getting all link shifts for a team."""
        team_1_oid = ObjectId()
        link_shift1 = LinkShiftSchema(team=team_1_oid, shifts=[ObjectId(), ObjectId()])
        link_shift2 = LinkShiftSchema(team=team_1_oid, shifts=[ObjectId(), ObjectId()])
        self.repo.create(link_shift1)
        self.repo.create(link_shift2)

        result = self.repo.get_link_shifts(str(team_1_oid))

        assert len(result) == 2
        assert result[0].team_id == str(team_1_oid)
        assert result[1].team_id == str(team_1_oid)

    def test_get_link_shift_by_id(self):
        """Test getting a link shift by ID."""
        link_shift = LinkShiftSchema(team=ObjectId(), shifts=[ObjectId(), ObjectId()])
        created = self.repo.create(link_shift)

        found = self.repo.get_link_shift_by_id(str(created.id))

        assert found is not None
        assert found.id == str(created.id)
        assert found.team_id == str(link_shift.team)

    def test_update_link_shift(self):
        """Test updating a link shift."""
        link_shift = LinkShiftSchema(team=ObjectId(), shifts=[ObjectId(), ObjectId()])
        created = self.repo.create(link_shift)

        updated_link_shift = LinkShift(
            id=created.id,
            team_id=str(ObjectId()),
            shift_ids=[str(ObjectId()), str(ObjectId())],
        )

        result = self.repo.update_link_shift(updated_link_shift)

        assert result.shift_ids == updated_link_shift.shift_ids

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["shifts"] == [
            ObjectId(shift_id) for shift_id in updated_link_shift.shift_ids
        ]

    def test_delete_link_shift(self):
        """Test deleting a link shift."""
        link_shift = LinkShiftSchema(team=ObjectId(), shifts=[ObjectId(), ObjectId()])
        created = self.repo.create(link_shift)

        self.repo.delete_link_shift(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_link_shifts_by_shift_id(self):
        """Test getting all link shifts associated with a specific shift ID."""
        shift_oid = ObjectId()
        link_shift1 = LinkShiftSchema(team=ObjectId(), shifts=[ObjectId(), shift_oid])
        link_shift2 = LinkShiftSchema(team=ObjectId(), shifts=[shift_oid, ObjectId()])
        link_shift3 = LinkShiftSchema(team=ObjectId(), shifts=[ObjectId(), ObjectId()])
        created_1 = self.repo.create(link_shift1)
        created_2 = self.repo.create(link_shift2)
        self.repo.create(link_shift3)

        result = self.repo.get_link_shifts_by_shift_id(str(shift_oid))

        assert len(result) == 2
        assert result[0].id == str(created_1.id)
        assert result[1].id == str(created_2.id)
        assert all(str(shift_oid) in link_shift.shift_ids for link_shift in result)
