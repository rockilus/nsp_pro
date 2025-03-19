import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.dimension import DimensionRepository
from shared.database_pymongo.schemas.dimension import DimensionSchema
from shared.schemas.schemas.dimension import (
    Dimension,
    DimensionEntryType,
    DimensionType,
)


class TestDimensionRepository:
    repo: DimensionRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = DimensionRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_dimension(self):
        """Test creating a dimension."""
        dimension = Dimension(
            id=None,
            team_id=str(ObjectId()),
            dim_types=[DimensionType.WORKER],
            name="Worker Dimension",
            entry_type=DimensionEntryType.STR,
            deleted=False,
        )

        result = self.repo.create_dimension(dimension)

        assert result.id is not None
        assert result.name == "Worker Dimension"
        assert result.team_id == dimension.team_id

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["name"] == "Worker Dimension"
        assert saved_doc["team"] == ObjectId(dimension.team_id)

    def test_get_dimension_by_id(self):
        """Test getting a dimension by ID."""
        dimension = DimensionSchema(
            team=ObjectId(),
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        created = self.repo.create(dimension)

        found = self.repo.get_dimension_by_id(created.id)

        assert found is not None
        assert found.id == str(created.id)
        assert found.name == "Worker Dimension"

    def test_update_dimension(self):
        """Test updating a dimension."""
        dimension = DimensionSchema(
            team=ObjectId(),
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        created = self.repo.create(dimension)

        updated_dimension = Dimension(
            id=str(created.id),
            team_id=ObjectId(),
            dim_types=[DimensionType.SHIFT],
            name="Updated Dimension",
            entry_type=DimensionEntryType.INT,
            deleted=False,
        )

        result = self.repo.update_dimension(updated_dimension)

        assert result.name == "Updated Dimension"
        assert result.entry_type == DimensionEntryType.INT

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["name"] == "Updated Dimension"
        assert from_db["entry_type"] == DimensionEntryType.INT.value

    def test_delete_dimension(self):
        """Test deleting a dimension."""
        dimension = DimensionSchema(
            team=ObjectId(),
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        created = self.repo.create(dimension)

        self.repo.delete_dimension(str(created.id))

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_logical_delete_dimension(self):
        """Test logically deleting a dimension."""
        dimension = DimensionSchema(
            team=ObjectId(),
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        created = self.repo.create(dimension)

        result = self.repo.logical_delete_dimension(str(created.id))

        assert result.deleted is True

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["deleted"] is True

    def test_get_dimensions_by_dim_types_not_deleted(self):
        """Test getting non-deleted dimensions by type."""
        team_oid = ObjectId()
        dimension1 = DimensionSchema(
            team=team_oid,
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension 1",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        dimension2 = DimensionSchema(
            team=team_oid,
            dim_types=[DimensionType.SHIFT.value],
            name="Shift Dimension",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        dimension3 = DimensionSchema(
            team=team_oid,
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension 2",
            entry_type=DimensionEntryType.STR.value,
            deleted=True,
        )
        self.repo.create(dimension1)
        self.repo.create(dimension2)
        self.repo.create(dimension3)

        results = self.repo.get_dimensions_by_dim_types_not_deleted(
            [DimensionType.WORKER], str(team_oid)
        )

        assert len(results) == 1
        assert results[0].name == "Worker Dimension 1"

    def test_get_dimensions_by_dim_types_and_entry_type(self):
        """Test getting dimensions by type and entry type."""
        team_oid = ObjectId()
        dimension1 = DimensionSchema(
            team=team_oid,
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension 1",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        dimension2 = DimensionSchema(
            team=team_oid,
            dim_types=[DimensionType.SHIFT.value],
            name="Shift Dimension",
            entry_type=DimensionEntryType.INT.value,
            deleted=False,
        )
        dimension3 = DimensionSchema(
            team=team_oid,
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension 2",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        self.repo.create(dimension1)
        self.repo.create(dimension2)
        self.repo.create(dimension3)

        results = self.repo.get_dimensions_by_dim_types_and_entry_type(
            [DimensionType.WORKER],
            DimensionEntryType.STR,
            str(team_oid),
        )

        assert len(results) == 2
        assert results[0].name == "Worker Dimension 1"
        assert results[1].name == "Worker Dimension 2"

    def test_get_dimensions(self):
        """Test getting all dimensions for a team."""
        team_oid = ObjectId()
        dimension1 = DimensionSchema(
            team=team_oid,
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension 1",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        dimension2 = DimensionSchema(
            team=team_oid,
            dim_types=[DimensionType.SHIFT.value],
            name="Shift Dimension",
            entry_type=DimensionEntryType.INT.value,
            deleted=False,
        )
        self.repo.create(dimension1)
        self.repo.create(dimension2)

        results = self.repo.get_dimensions(str(team_oid))

        assert len(results) == 2
        assert results[0].name == "Worker Dimension 1"
        assert results[1].name == "Shift Dimension"

    def test_get_dimensions_not_deleted(self):
        """Test getting all non-deleted dimensions for a team."""
        team_oid = ObjectId()
        dimension1 = DimensionSchema(
            team=team_oid,
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension 1",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        dimension2 = DimensionSchema(
            team=team_oid,
            dim_types=[DimensionType.SHIFT.value],
            name="Shift Dimension",
            entry_type=DimensionEntryType.INT.value,
            deleted=True,
        )
        self.repo.create(dimension1)
        self.repo.create(dimension2)

        results = self.repo.get_dimensions_not_deleted(str(team_oid))

        assert len(results) == 1
        assert results[0].name == "Worker Dimension 1"
