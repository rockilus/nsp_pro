import pytest_asyncio

from shared.database.interface import DatabaseInterface
from shared.database.repositories.dimension import (
    DimensionRepository,
)
from shared.database.schemas.dimension import DimensionSchema
from shared.schemas.core.dimension import (
    Dimension,
    DimensionEntryType,
    DimensionType,
)


class TestDimensionRepository:
    repo: DimensionRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = DimensionRepository(mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("dimensions")  # type: ignore
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_dimension(self):
        """Test creating a dimension."""
        dimension = Dimension(
            id=None,
            team_id="team1",
            dim_types=[DimensionType.WORKER],
            name="Worker Dimension",
            entry_type=DimensionEntryType.STR,
            deleted=False,
        )

        result = self.repo.create_dimension(dimension)

        assert result.id is not None
        assert result.name == "Worker Dimension"
        assert result.team_id == "team1"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["name"] == "Worker Dimension"
        assert saved_doc["team"] == "team1"

    def test_get_dimension_by_id(self):
        """Test getting a dimension by ID."""
        dimension = DimensionSchema(
            team="team1",
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        created = self.repo.create(dimension)

        found = self.repo.get_dimension_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.name == "Worker Dimension"

    def test_update_dimension(self):
        """Test updating a dimension."""
        dimension = DimensionSchema(
            team="team1",
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        created = self.repo.create(dimension)

        updated_dimension = Dimension(
            id=created.id,
            team_id="team1",
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
            team="team1",
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        created = self.repo.create(dimension)

        self.repo.delete_dimension(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_logical_delete_dimension(self):
        """Test logically deleting a dimension."""
        dimension = DimensionSchema(
            team="team1",
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        created = self.repo.create(dimension)

        result = self.repo.logical_delete_dimension(created.id)

        assert result.deleted is True

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["deleted"] is True

    def test_get_dimensions_by_dim_types_not_deleted(self):
        """Test getting non-deleted dimensions by type."""
        dimension1 = DimensionSchema(
            team="team1",
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension 1",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        dimension2 = DimensionSchema(
            team="team1",
            dim_types=[DimensionType.SHIFT.value],
            name="Shift Dimension",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        dimension3 = DimensionSchema(
            team="team1",
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension 2",
            entry_type=DimensionEntryType.STR.value,
            deleted=True,
        )
        self.repo.create(dimension1)
        self.repo.create(dimension2)
        self.repo.create(dimension3)

        results = self.repo.get_dimensions_by_dim_types_not_deleted(
            [DimensionType.WORKER], "team1"
        )

        assert len(results) == 1
        assert results[0].name == "Worker Dimension 1"

    def test_get_dimensions_by_dim_types_and_entry_type(self):
        """Test getting dimensions by type and entry type."""
        dimension1 = DimensionSchema(
            team="team1",
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension 1",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        dimension2 = DimensionSchema(
            team="team1",
            dim_types=[DimensionType.SHIFT.value],
            name="Shift Dimension",
            entry_type=DimensionEntryType.INT.value,
            deleted=False,
        )
        dimension3 = DimensionSchema(
            team="team1",
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension 2",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        self.repo.create(dimension1)
        self.repo.create(dimension2)
        self.repo.create(dimension3)

        results = self.repo.get_dimensions_by_dim_types_and_entry_type(
            [DimensionType.WORKER], DimensionEntryType.STR, "team1"
        )

        assert len(results) == 2
        assert results[0].name == "Worker Dimension 1"
        assert results[1].name == "Worker Dimension 2"

    def test_get_dimensions(self):
        """Test getting all dimensions for a team."""
        dimension1 = DimensionSchema(
            team="team1",
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension 1",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        dimension2 = DimensionSchema(
            team="team1",
            dim_types=[DimensionType.SHIFT.value],
            name="Shift Dimension",
            entry_type=DimensionEntryType.INT.value,
            deleted=False,
        )
        self.repo.create(dimension1)
        self.repo.create(dimension2)

        results = self.repo.get_dimensions("team1")

        assert len(results) == 2
        assert results[0].name == "Worker Dimension 1"
        assert results[1].name == "Shift Dimension"

    def test_get_dimensions_not_deleted(self):
        """Test getting all non-deleted dimensions for a team."""
        dimension1 = DimensionSchema(
            team="team1",
            dim_types=[DimensionType.WORKER.value],
            name="Worker Dimension 1",
            entry_type=DimensionEntryType.STR.value,
            deleted=False,
        )
        dimension2 = DimensionSchema(
            team="team1",
            dim_types=[DimensionType.SHIFT.value],
            name="Shift Dimension",
            entry_type=DimensionEntryType.INT.value,
            deleted=True,
        )
        self.repo.create(dimension1)
        self.repo.create(dimension2)

        results = self.repo.get_dimensions_not_deleted("team1")

        assert len(results) == 1
        assert results[0].name == "Worker Dimension 1"
