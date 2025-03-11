from datetime import datetime, timezone

import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.shift import ShiftRepository
from shared.database_pymongo.schemas.shift import ShiftSchema, StaffingSchema
from shared.schemas.schemas.shift import (
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Staffing,
)


class TestShiftRepository:
    repo: ShiftRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = ShiftRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_shift(self):
        """Test creating a shift."""
        shift = Shift(
            id=None,
            team_id="team1",
            name="Morning Shift",
            acronym="MS",
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
        )

        result = self.repo.create_shift(shift)

        assert result.id is not None
        assert result.name == "Morning Shift"
        assert result.team_id == "team1"

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["name"] == "Morning Shift"
        assert saved_doc["team"] == "team1"

    def test_get_shift_by_id(self):
        """Test getting a shift by ID."""
        shift = ShiftSchema(
            team="team1",
            name="Morning Shift",
            acronym="MS",
            acronym_custom=False,
            start_time=1672560000.0,
            end_time=1672588800.0,
            staffing=[StaffingSchema(specialty="spec1", staffing=2)],
            color="#FF0000",
            shift_type=ShiftType.NORMAL.value,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty=None,
            deleted=False,
        )
        created = self.repo.create(shift)

        found = self.repo.get_shift_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.name == "Morning Shift"

    def test_update_shift(self):
        """Test updating a shift."""
        shift = ShiftSchema(
            team="team1",
            name="Morning Shift",
            acronym="MS",
            acronym_custom=False,
            start_time=1672560000.0,
            end_time=1672588800.0,
            staffing=[StaffingSchema(specialty="spec1", staffing=2)],
            color="#FF0000",
            shift_type=ShiftType.NORMAL.value,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty=None,
            deleted=False,
        )
        created = self.repo.create(shift)

        updated_shift = Shift(
            id=created.id,
            team_id="team1",
            name="Updated Shift",
            acronym="US",
            acronym_custom=True,
            start_time=datetime(2023, 1, 1, 9, 0, tzinfo=timezone.utc),
            end_time=datetime(2023, 1, 1, 17, 0, tzinfo=timezone.utc),
            staffing=[Staffing(specialty_id="spec1", staffing=3)],
            color="#00FF00",
            shift_type=ShiftType.DUTY,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty_id=None,
            deleted=False,
        )

        result = self.repo.update_shift(updated_shift)

        assert result.name == "Updated Shift"
        assert result.acronym == "US"
        assert result.staffing[0].staffing == 3

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
        assert from_db["name"] == "Updated Shift"
        assert from_db["acronym"] == "US"
        assert from_db["staffing"][0]["staffing"] == 3

    def test_delete_shift(self):
        """Test deleting a shift."""
        shift = ShiftSchema(
            team="team1",
            name="Morning Shift",
            acronym="MS",
            acronym_custom=False,
            start_time=1672560000.0,
            end_time=1672588800.0,
            staffing=[StaffingSchema(specialty="spec1", staffing=2)],
            color="#FF0000",
            shift_type=ShiftType.NORMAL.value,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty=None,
            deleted=False,
        )
        created = self.repo.create(shift)

        self.repo.delete_shift(created.id)

        assert self.repo.collection.find_one({"_id": ObjectId(created.id)}) is None

    def test_logical_delete_shift(self):
        """Test logically deleting a shift."""
        shift = ShiftSchema(
            team="team1",
            name="Morning Shift",
            acronym="MS",
            acronym_custom=False,
            start_time=1672560000.0,
            end_time=1672588800.0,
            staffing=[StaffingSchema(specialty="spec1", staffing=2)],
            color="#FF0000",
            shift_type=ShiftType.NORMAL.value,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty=None,
            deleted=False,
        )
        created = self.repo.create(shift)

        result = self.repo.logical_delete_shift(created.id)

        assert result.deleted is True

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
        assert from_db["deleted"] is True
