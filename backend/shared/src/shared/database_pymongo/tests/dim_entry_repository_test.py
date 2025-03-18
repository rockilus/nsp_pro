import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.dim_entry import DimEntryRepository
from shared.database_pymongo.schemas.dimension import DimEntrySchema
from shared.schemas.schemas.dimension import DimEntry


class TestDimEntryRepository:
    repo: DimEntryRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = DimEntryRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_dim_entry(self):
        """Test creating a dim entry."""
        dim_entry = DimEntry(
            id=None,
            dimension_id=str(ObjectId()),
            name="Entry 1",
            deleted=False,
        )

        result = self.repo.create_dim_entry(dim_entry)

        assert result.id is not None
        assert result.name == "Entry 1"
        assert result.dimension_id == dim_entry.dimension_id

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["name"] == "Entry 1"
        assert saved_doc["dimension"] == ObjectId(dim_entry.dimension_id)

    def test_get_dim_entry_by_id(self):
        """Test getting a dim entry by ID."""
        dim_entry = DimEntrySchema(
            dimension=ObjectId(),
            name="Entry 1",
            deleted=False,
        )
        created = self.repo.create(dim_entry)

        found = self.repo.get_dim_entry_by_id(created.id)

        assert found is not None
        assert found.id == str(created.id)
        assert found.name == "Entry 1"

    def test_update_dim_entry(self):
        """Test updating a dim entry."""
        dim_entry = DimEntrySchema(
            dimension=ObjectId(),
            name="Entry 1",
            deleted=False,
        )
        created = self.repo.create(dim_entry)

        updated_dim_entry = DimEntry(
            id=str(created.id),
            dimension_id=str(ObjectId()),
            name="Updated Entry",
            deleted=False,
        )

        result = self.repo.update_dim_entry(updated_dim_entry)

        assert result.name == "Updated Entry"

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["name"] == "Updated Entry"

    def test_delete_dim_entry(self):
        """Test deleting a dim entry."""
        dim_entry = DimEntrySchema(
            dimension=ObjectId(),
            name="Entry 1",
            deleted=False,
        )
        created = self.repo.create(dim_entry)

        self.repo.delete_dim_entry(str(created.id))

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_logical_delete_dim_entry(self):
        """Test logically deleting a dim entry."""
        dim_entry = DimEntrySchema(
            dimension=ObjectId(),
            name="Entry 1",
            deleted=False,
        )
        created = self.repo.create(dim_entry)

        result = self.repo.logical_delete_dim_entry(str(created.id))

        assert result.deleted is True

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["deleted"] is True

    def test_get_dim_entries_by_dim_id(self):
        """Test getting dim entries by dimension ID."""
        dimension_oid = ObjectId()
        dim_entry1 = DimEntrySchema(
            dimension=dimension_oid,
            name="Entry 1",
            deleted=False,
        )
        dim_entry2 = DimEntrySchema(
            dimension=dimension_oid,
            name="Entry 2",
            deleted=False,
        )
        self.repo.create(dim_entry1)
        self.repo.create(dim_entry2)

        entries = self.repo.get_dim_entries_by_dim_id(str(dimension_oid))

        assert len(entries) == 2
        assert entries[0].dimension_id == str(dimension_oid)
        assert entries[1].dimension_id == str(dimension_oid)

    def test_get_dim_entries_by_dim_ids(self):
        """Test getting dim entries by multiple dimension IDs."""
        dimension_1_oid = ObjectId()
        dimension_2_oid = ObjectId()
        dimension_ids = [str(dimension_1_oid), str(dimension_2_oid)]
        dim_entry1 = DimEntrySchema(
            dimension=dimension_1_oid,
            name="Entry 1",
            deleted=False,
        )
        dim_entry2 = DimEntrySchema(
            dimension=dimension_2_oid,
            name="Entry 2",
            deleted=False,
        )
        dim_entry3 = DimEntrySchema(
            dimension=dimension_1_oid,
            name="Entry 3",
            deleted=False,
        )
        self.repo.create(dim_entry1)
        self.repo.create(dim_entry2)
        self.repo.create(dim_entry3)

        entries = self.repo.get_dim_entries_by_dim_ids(dimension_ids)

        assert len(entries) == 3
        assert any(entry.dimension_id == str(dimension_1_oid) for entry in entries)
        assert any(entry.dimension_id == str(dimension_2_oid) for entry in entries)
