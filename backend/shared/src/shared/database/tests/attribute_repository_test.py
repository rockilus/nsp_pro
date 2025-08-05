from datetime import datetime, timezone

import pytest_asyncio

from shared.database.interface import DatabaseInterface
from shared.database.repositories.attribute import AttributeRepository
from shared.database.repositories.dimension import (
    DimensionRepository,
)
from shared.database.repositories.shift import ShiftRepository
from shared.database.schemas.attribute import AttributeSchema
from shared.schemas.core.attribute import Attribute, AttributeOwnerType
from shared.schemas.core.dimension import (
    Dimension,
    DimensionEntryType,
    DimensionType,
)
from shared.schemas.core.shift import (
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Staffing,
)


# pylint: disable=R0801
class TestAttributeRepository:
    repo: AttributeRepository
    shift_repo: ShiftRepository
    dimension_repo: DimensionRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = AttributeRepository(mongodb_container)
        self.shift_repo = ShiftRepository(mongodb_container)
        self.dimension_repo = DimensionRepository(mongodb_container)

        # Yield to test
        yield

        # Cleanup
        collection_names = [
            "attributes",
            "shifts",
            "dimensions",
        ]
        try:
            for name in collection_names:
                collection = db.get_collection(name)
                collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_attribute(self):
        """Test creating an attribute."""
        attribute = Attribute(
            id="test_id",
            value="test_value",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id="owner1",
            dimension_id="dimension1",
            dim_entry_ids=["entry1", "entry2"],
        )

        result = self.repo.create_attribute(attribute)

        assert result.id is not None
        assert result.value == "test_value"
        assert result.owner_id == "owner1"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["value"] == "test_value"
        assert saved_doc["owner"] == "owner1"

    def test_create_attributes(self):
        """Test creating multiple attributes."""
        attributes = [
            Attribute(
                id="attr1",
                value="value1",
                owner_type=AttributeOwnerType.SHIFT,
                owner_id="owner1",
                dimension_id="dimension1",
                dim_entry_ids=["entry1"],
            ),
            Attribute(
                id="attr2",
                value="value2",
                owner_type=AttributeOwnerType.SHIFT,
                owner_id="owner2",
                dimension_id="dimension2",
                dim_entry_ids=["entry2"],
            ),
        ]

        results = self.repo.create_attributes(attributes)

        assert len(results) == 2
        assert results[0].id is not None
        assert results[1].id is not None

    def test_get_attributes_by_owner_ids(self):
        """Test getting attributes by multiple owner IDs."""
        attributes = [
            AttributeSchema(
                value="value1",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner="owner1",
                dimension="dimension1",
                dim_entries=["entry1"],
            ),
            AttributeSchema(
                value="value2",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner="owner2",
                dimension="dimension2",
                dim_entries=["entry2"],
            ),
        ]
        self.repo.create_many(attributes)

        found_attributes = self.repo.get_attributes_by_owner_ids(["owner1", "owner2"])

        assert len(found_attributes) == 2
        assert found_attributes[0].value == "value1"
        assert found_attributes[1].value == "value2"

    def test_get_shifts_id_by_dim_and_attr(self):
        """Test getting shifts by dimension and attribute."""
        # Create dimensions
        dimensions = [
            Dimension(
                id=None,
                team_id="team1",
                dim_types=[DimensionType.SHIFT],
                name="Dimension 1",
                entry_type=DimensionEntryType.STR,
                deleted=False,
            ),
            Dimension(
                id=None,
                team_id="team1",
                dim_types=[DimensionType.SHIFT],
                name="Dimension 2",
                entry_type=DimensionEntryType.STR,
                deleted=False,
            ),
        ]
        created_dimensions = [
            self.dimension_repo.create_dimension(dim) for dim in dimensions
        ]
        target_dimension_id = created_dimensions[0].id

        # Create shifts
        shifts = [
            Shift(
                id=None,
                team_id="team1",
                name="Shift 1",
                acronym="S1",
                acronym_custom=False,
                start_time=datetime(2023, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2023, 1, 1, 16, 0, tzinfo=timezone.utc),
                staffing=[Staffing(specialty_id="spec1", staffing=2)],
                color="#FF0000",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
            Shift(
                id=None,
                team_id="team1",
                name="Shift 2",
                acronym="S2",
                acronym_custom=False,
                start_time=datetime(2023, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2023, 1, 1, 16, 0, tzinfo=timezone.utc),
                staffing=[Staffing(specialty_id="spec1", staffing=2)],
                color="#FF0000",
                shift_type=ShiftType.NORMAL,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
        ]
        created_shifts = self.shift_repo.create_shifts(shifts)
        shift_ids = [shift.id for shift in created_shifts]

        # Create attributes
        attributes = [
            AttributeSchema(
                value="value1",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner=shift_ids[0],
                dimension=target_dimension_id,
                dim_entries=[],
            ),
            AttributeSchema(
                value="value1",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner=shift_ids[1],
                dimension=target_dimension_id,
                dim_entries=[],
            ),
        ]
        self.repo.create_many(attributes)

        result = self.repo.get_shifts_id_by_dim_and_attr()

        assert target_dimension_id in result
        assert "value1" in result[target_dimension_id]
        assert len(result[target_dimension_id]["value1"]) == 2

    def test_get_attributes_by_dim_entry_id(self):
        """Test getting attributes by dimension entry ID."""
        attributes = [
            AttributeSchema(
                value="value1",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner="owner1",
                dimension="dimension1",
                dim_entries=["entry1"],
            ),
            AttributeSchema(
                value="value2",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner="owner2",
                dimension="dimension2",
                dim_entries=["entry1"],
            ),
        ]
        self.repo.create_many(attributes)

        found_attributes = self.repo.get_attributes_by_dim_entry_id("entry1")

        assert len(found_attributes) == 2
        assert found_attributes[0].value == "value1"
        assert found_attributes[1].value == "value2"

    def test_update_attribute(self):
        """Test updating an attribute."""
        attribute = AttributeSchema(
            value="test_value",
            owner_type=AttributeOwnerType.SHIFT.value,
            owner="owner1",
            dimension="dimension1",
            dim_entries=["entry1", "entry2"],
        )
        created = self.repo.create(attribute)

        updated_attribute = Attribute(
            id=created.id,
            value="updated_value",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id="owner1",
            dimension_id="dimension1",
            dim_entry_ids=["entry1", "entry2"],
        )

        result = self.repo.update_attribute(updated_attribute)

        assert result.value == "updated_value"

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["value"] == "updated_value"

    def test_update_attributes(self):
        """Test updating multiple attributes."""
        attributes = [
            AttributeSchema(
                value="value1",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner="owner1",
                dimension="dimension1",
                dim_entries=["entry1"],
            ),
            AttributeSchema(
                value="value2",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner="owner2",
                dimension="dimension2",
                dim_entries=["entry2"],
            ),
        ]
        created_attributes = self.repo.create_many(attributes)

        updated_attributes = [
            Attribute(
                id=created_attributes[0].id,
                value="updated_value1",
                owner_type=AttributeOwnerType.SHIFT,
                owner_id="owner1",
                dimension_id="dimension1",
                dim_entry_ids=["entry1"],
            ),
            Attribute(
                id=created_attributes[1].id,
                value="updated_value2",
                owner_type=AttributeOwnerType.SHIFT,
                owner_id="owner2",
                dimension_id="dimension2",
                dim_entry_ids=["entry2"],
            ),
        ]

        results = self.repo.update_attributes(updated_attributes)

        assert len(results) == 2
        assert results[0].value == "updated_value1"
        assert results[1].value == "updated_value2"

    def test_delete_attributes_by_owner_id(self):
        """Test deleting attributes by owner ID."""
        attribute = AttributeSchema(
            value="test_value",
            owner_type=AttributeOwnerType.SHIFT.value,
            owner="owner1",
            dimension="dimension1",
            dim_entries=["entry1", "entry2"],
        )
        created = self.repo.create(attribute)

        self.repo.delete_attributes_by_owner_id("owner1")

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_delete_attributes_by_dimension_id(self):
        """Test deleting attributes by dimension ID."""
        attribute = AttributeSchema(
            value="test_value",
            owner_type=AttributeOwnerType.SHIFT.value,
            owner="owner1",
            dimension="dimension1",
            dim_entries=["entry1", "entry2"],
        )
        created = self.repo.create(attribute)

        self.repo.delete_attributes_by_dimension_id("dimension1")

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_attributes_by_owner_id(self):
        """Test getting attributes by owner ID."""
        attributes = [
            AttributeSchema(
                value="value1",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner="owner1",
                dimension="dimension1",
                dim_entries=["entry1"],
            ),
            AttributeSchema(
                value="value2",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner="owner1",
                dimension="dimension2",
                dim_entries=["entry2"],
            ),
        ]
        self.repo.create_many(attributes)

        found_attributes = self.repo.get_attributes_by_owner_id("owner1")

        assert len(found_attributes) == 2
        assert found_attributes[0].value == "value1"
        assert found_attributes[1].value == "value2"

    def test_get_attributes_by_dimension_id(self):
        """Test getting attributes by dimension ID."""
        attributes = [
            AttributeSchema(
                value="value1",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner="owner1",
                dimension="dimension1",
                dim_entries=["entry1"],
            ),
            AttributeSchema(
                value="value2",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner="owner2",
                dimension="dimension1",
                dim_entries=["entry2"],
            ),
        ]
        self.repo.create_many(attributes)

        found_attributes = self.repo.get_attributes_by_dimension_id("dimension1")

        assert len(found_attributes) == 2
        assert found_attributes[0].value == "value1"
        assert found_attributes[1].value == "value2"

    def test_get_attribute_by_id(self):
        """Test getting an attribute by ID."""
        attribute = AttributeSchema(
            value="test_value",
            owner_type=AttributeOwnerType.SHIFT.value,
            owner="owner1",
            dimension="dimension1",
            dim_entries=["entry1", "entry2"],
        )
        created = self.repo.create(attribute)

        found = self.repo.get_attribute_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.value == "test_value"
