from datetime import datetime, timezone

import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.attribute import AttributeRepository
from shared.database_pymongo.repositories.dimension import DimensionRepository
from shared.database_pymongo.repositories.shift import ShiftRepository
from shared.database_pymongo.schemas.attribute import AttributeSchema
from shared.schemas.schemas.attribute import Attribute, AttributeOwnerType
from shared.schemas.schemas.dimension import (
    Dimension,
    DimensionEntryType,
    DimensionType,
)
from shared.schemas.schemas.shift import (
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

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = AttributeRepository()
        self.shift_repo = ShiftRepository()
        self.dimension_repo = DimensionRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)
        db.drop_collection(self.shift_repo.collection)
        db.drop_collection(self.dimension_repo.collection)

    def test_create_attribute(self):
        """Test creating an attribute."""
        attribute = Attribute(
            id=None,
            value="test_value",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=str(ObjectId()),
            dimension_id=str(ObjectId()),
            dim_entry_ids=[str(ObjectId()), str(ObjectId())],
        )

        result = self.repo.create_attribute(attribute)

        assert result.id is not None
        assert result.value == "test_value"
        assert result.owner_id == attribute.owner_id

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["value"] == "test_value"
        assert saved_doc["owner"] == ObjectId(attribute.owner_id)

    def test_create_attributes(self):
        """Test creating multiple attributes."""
        attributes = [
            Attribute(
                id=None,
                value="value1",
                owner_type=AttributeOwnerType.SHIFT,
                owner_id=ObjectId(),
                dimension_id=ObjectId(),
                dim_entry_ids=[str(ObjectId())],
            ),
            Attribute(
                id=None,
                value="value2",
                owner_type=AttributeOwnerType.SHIFT,
                owner_id=ObjectId(),
                dimension_id=ObjectId(),
                dim_entry_ids=[str(ObjectId())],
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
                owner=ObjectId(),
                dimension=ObjectId(),
                dim_entries=[ObjectId()],
            ),
            AttributeSchema(
                value="value2",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner=ObjectId(),
                dimension=ObjectId(),
                dim_entries=[ObjectId()],
            ),
        ]
        self.repo.create_many(attributes)

        owner_ids = [str(attr.owner) for attr in attributes]
        found_attributes = self.repo.get_attributes_by_owner_ids(owner_ids)

        assert len(found_attributes) == 2
        assert found_attributes[0].value == "value1"
        assert found_attributes[1].value == "value2"

    def test_get_shifts_id_by_dim_and_attr(self):
        """Test getting shifts by dimension and attribute."""
        team_oid = ObjectId()
        # Create dimensions
        dimensions = [
            Dimension(
                id=None,
                team_id=str(team_oid),
                dim_types=[DimensionType.SHIFT],
                name="Dimension 1",
                entry_type=DimensionEntryType.STR,
                deleted=False,
            ),
            Dimension(
                id=None,
                team_id=str(team_oid),
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
                team_id=str(team_oid),
                name="Shift 1",
                acronym="S1",
                acronym_custom=False,
                start_time=datetime(2023, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2023, 1, 1, 16, 0, tzinfo=timezone.utc),
                staffing=[Staffing(specialty_id=str(ObjectId()), staffing=2)],
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
                team_id=str(team_oid),
                name="Shift 2",
                acronym="S2",
                acronym_custom=False,
                start_time=datetime(2023, 1, 1, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2023, 1, 1, 16, 0, tzinfo=timezone.utc),
                staffing=[Staffing(specialty_id=str(ObjectId()), staffing=2)],
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
                owner=ObjectId(shift_ids[0]),
                dimension=ObjectId(target_dimension_id),
                dim_entries=[],
            ),
            AttributeSchema(
                value="value1",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner=ObjectId(shift_ids[1]),
                dimension=ObjectId(target_dimension_id),
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
        dim_entry_oid = ObjectId()
        attributes = [
            AttributeSchema(
                value="value1",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner=ObjectId(),
                dimension=ObjectId(),
                dim_entries=[dim_entry_oid],
            ),
            AttributeSchema(
                value="value2",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner=ObjectId(),
                dimension=ObjectId(),
                dim_entries=[dim_entry_oid],
            ),
        ]
        self.repo.create_many(attributes)

        found_attributes = self.repo.get_attributes_by_dim_entry_id(str(dim_entry_oid))

        assert len(found_attributes) == 2
        assert found_attributes[0].value == "value1"
        assert found_attributes[1].value == "value2"

    def test_update_attribute(self):
        """Test updating an attribute."""
        attribute = AttributeSchema(
            value="test_value",
            owner_type=AttributeOwnerType.SHIFT.value,
            owner=ObjectId(),
            dimension=ObjectId(),
            dim_entries=[ObjectId(), ObjectId()],
        )
        created = self.repo.create(attribute)

        updated_attribute = Attribute(
            id=created.id,
            value="updated_value",
            owner_type=AttributeOwnerType.SHIFT,
            owner_id=created.owner,
            dimension_id=created.dimension,
            dim_entry_ids=created.dim_entries,
        )

        result = self.repo.update_attribute(updated_attribute)

        assert result.value == "updated_value"

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
        assert from_db["value"] == "updated_value"

    def test_update_attributes(self):
        """Test updating multiple attributes."""
        attributes = [
            AttributeSchema(
                value="value1",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner=ObjectId(),
                dimension=ObjectId(),
                dim_entries=[ObjectId()],
            ),
            AttributeSchema(
                value="value2",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner=ObjectId(),
                dimension=ObjectId(),
                dim_entries=[ObjectId()],
            ),
        ]
        created_attributes = self.repo.create_many(attributes)

        updated_attributes = [
            Attribute(
                id=created_attributes[0].id,
                value="updated_value1",
                owner_type=AttributeOwnerType.SHIFT,
                owner_id=created_attributes[0].owner,
                dimension_id=created_attributes[0].dimension,
                dim_entry_ids=created_attributes[0].dim_entries,
            ),
            Attribute(
                id=created_attributes[1].id,
                value="updated_value2",
                owner_type=AttributeOwnerType.SHIFT,
                owner_id=created_attributes[1].owner,
                dimension_id=created_attributes[1].dimension,
                dim_entry_ids=created_attributes[1].dim_entries,
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
            owner=ObjectId(),
            dimension=ObjectId(),
            dim_entries=[ObjectId(), ObjectId()],
        )
        created = self.repo.create(attribute)

        self.repo.delete_attributes_by_owner_id(str(attribute.owner))

        assert self.repo.collection.find_one({"_id": ObjectId(created.id)}) is None

    def test_delete_attributes_by_dimension_id(self):
        """Test deleting attributes by dimension ID."""
        attribute = AttributeSchema(
            value="test_value",
            owner_type=AttributeOwnerType.SHIFT.value,
            owner=ObjectId(),
            dimension=ObjectId(),
            dim_entries=[ObjectId(), ObjectId()],
        )
        created = self.repo.create(attribute)

        self.repo.delete_attributes_by_dimension_id(str(attribute.dimension))

        assert self.repo.collection.find_one({"_id": ObjectId(created.id)}) is None

    def test_get_attributes_by_owner_id(self):
        """Test getting attributes by owner ID."""
        owner_oid = ObjectId()
        attributes = [
            AttributeSchema(
                value="value1",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner=owner_oid,
                dimension=ObjectId(),
                dim_entries=[ObjectId()],
            ),
            AttributeSchema(
                value="value2",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner=owner_oid,
                dimension=ObjectId(),
                dim_entries=[ObjectId()],
            ),
        ]
        self.repo.create_many(attributes)

        found_attributes = self.repo.get_attributes_by_owner_id(str(owner_oid))

        assert len(found_attributes) == 2
        assert found_attributes[0].value == "value1"
        assert found_attributes[1].value == "value2"

    def test_get_attributes_by_dimension_id(self):
        """Test getting attributes by dimension ID."""
        dimension_oid = ObjectId()
        attributes = [
            AttributeSchema(
                value="value1",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner=ObjectId(),
                dimension=dimension_oid,
                dim_entries=[ObjectId()],
            ),
            AttributeSchema(
                value="value2",
                owner_type=AttributeOwnerType.SHIFT.value,
                owner=ObjectId(),
                dimension=dimension_oid,
                dim_entries=[ObjectId()],
            ),
        ]
        self.repo.create_many(attributes)

        found_attributes = self.repo.get_attributes_by_dimension_id(str(dimension_oid))

        assert len(found_attributes) == 2
        assert found_attributes[0].value == "value1"
        assert found_attributes[1].value == "value2"

    def test_get_attribute_by_id(self):
        """Test getting an attribute by ID."""
        attribute = AttributeSchema(
            value="test_value",
            owner_type=AttributeOwnerType.SHIFT.value,
            owner=ObjectId(),
            dimension=ObjectId(),
            dim_entries=[ObjectId(), ObjectId()],
        )
        created = self.repo.create(attribute)

        found = self.repo.get_attribute_by_id(str(created.id))

        assert found is not None
        assert found.id == str(created.id)
        assert found.value == "test_value"
