import pytest

from shared.database.database import MongoDB
from shared.database.repositories.dim_entry import (
    DimEntryRepository,
)
from shared.database.schemas.dim_entry import DimEntrySchema
from shared.schemas.core.dim_entry import DimEntry
import pytest_asyncio

from shared.database.interface import DatabaseInterface


class TestDimEntryRepository:
    repo: DimEntryRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = DimEntryRepository(database_interface=mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("dim_entries")
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_dim_entry(self):
        """Test creating a dim entry."""
        dim_entry = DimEntry(
            id=None,
            dimension_id="dim1",
            name="Entry 1",
            deleted=False,
        )

        result = self.repo.create_dim_entry(dim_entry)

        assert result.id is not None
        assert result.name == "Entry 1"
        assert result.dimension_id == "dim1"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["name"] == "Entry 1"
        assert saved_doc["dimension"] == "dim1"

    def test_get_dim_entry_by_id(self):
        """Test getting a dim entry by ID."""
        dim_entry = DimEntrySchema(
            dimension="dim1",
            name="Entry 1",
            deleted=False,
        )
        created = self.repo.create(dim_entry)

        found = self.repo.get_dim_entry_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.name == "Entry 1"

    def test_update_dim_entry(self):
        """Test updating a dim entry."""
        dim_entry = DimEntrySchema(
            dimension="dim1",
            name="Entry 1",
            deleted=False,
        )
        created = self.repo.create(dim_entry)

        updated_dim_entry = DimEntry(
            id=created.id,
            dimension_id="dim1",
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
            dimension="dim1",
            name="Entry 1",
            deleted=False,
        )
        created = self.repo.create(dim_entry)

        self.repo.delete_dim_entry(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_logical_delete_dim_entry(self):
        """Test logically deleting a dim entry."""
        dim_entry = DimEntrySchema(
            dimension="dim1",
            name="Entry 1",
            deleted=False,
        )
        created = self.repo.create(dim_entry)

        result = self.repo.logical_delete_dim_entry(created.id)

        assert result.deleted is True

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["deleted"] is True

    def test_get_dim_entries_by_dim_id(self):
        """Test getting dim entries by dimension ID."""
        dim_entry1 = DimEntrySchema(
            dimension="dim1",
            name="Entry 1",
            deleted=False,
        )
        dim_entry2 = DimEntrySchema(
            dimension="dim1",
            name="Entry 2",
            deleted=False,
        )
        self.repo.create(dim_entry1)
        self.repo.create(dim_entry2)

        entries = self.repo.get_dim_entries_by_dim_id("dim1")

        assert len(entries) == 2
        assert entries[0].dimension_id == "dim1"
        assert entries[1].dimension_id == "dim1"

    def test_get_dim_entries_by_dim_ids(self):
        """Test getting dim entries by multiple dimension IDs."""
        dim_entry1 = DimEntrySchema(
            dimension="dim1",
            name="Entry 1",
            deleted=False,
        )
        dim_entry2 = DimEntrySchema(
            dimension="dim2",
            name="Entry 2",
            deleted=False,
        )
        dim_entry3 = DimEntrySchema(
            dimension="dim1",
            name="Entry 3",
            deleted=False,
        )
        self.repo.create(dim_entry1)
        self.repo.create(dim_entry2)
        self.repo.create(dim_entry3)

        entries = self.repo.get_dim_entries_by_dim_ids(["dim1", "dim2"])

        assert len(entries) == 3
        assert any(entry.dimension_id == "dim1" for entry in entries)
        assert any(entry.dimension_id == "dim2" for entry in entries)
