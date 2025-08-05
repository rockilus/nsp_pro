from datetime import datetime, timezone

import pytest
import pytest_asyncio

from shared.database.interface import DatabaseInterface
from shared.database.repositories.shift import ShiftRepository
from shared.database.schemas.shift import (
    ShiftSchema,
    StaffingSchema,
)
from shared.schemas.core.shift import (
    Shift,
    ShiftLeaveType,
    ShiftRestType,
    ShiftType,
    Staffing,
)


class TestShiftRepository:
    repo: ShiftRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = ShiftRepository(mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("shifts")
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_shift(self):
        """Test creating a shift."""
        shift = Shift(
            id="shift1",
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

        saved_doc = self.repo.collection.find_one({"_id": result.id})
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

        assert created.id is not None
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

        from_db = self.repo.collection.find_one({"_id": created.id})
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

        assert self.repo.collection.find_one({"_id": created.id}) is None

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

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["deleted"] is True

    def test_get_recuperation_shift(self):
        """Test retrieving a recuperation shift by shift ID."""
        duty_shift = ShiftSchema(
            team="team1",
            name="Duty Shift",
            acronym="DS",
            acronym_custom=False,
            start_time=1672560000.0,
            end_time=1672588800.0,
            staffing=[StaffingSchema(specialty="spec1", staffing=2)],
            color="#FF0000",
            shift_type=ShiftType.DUTY.value,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty=None,
            deleted=False,
        )
        created_duty = self.repo.create(duty_shift)

        # Test when recuperation shift exists
        recuperation_shift = ShiftSchema(
            team="team1",
            name="Recuperation Shift",
            acronym="RS",
            acronym_custom=False,
            start_time=1672590000.0,
            end_time=1672618800.0,
            staffing=[StaffingSchema(specialty="spec1", staffing=1)],
            color="#00FF00",
            shift_type=ShiftType.REST.value,
            rest_type=ShiftRestType.RECUPERATION.value,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=8,
            recuperation_duty=created_duty.id,
            deleted=False,
        )
        created_recuperation = self.repo.create(recuperation_shift)

        result = self.repo.get_recuperation_shift(created_duty.id)

        assert result is not None
        assert result.id == created_recuperation.id
        assert result.name == "Recuperation Shift"
        assert result.recuperation_duty_id == created_duty.id

        # Test when no recuperation shift exists
        result = self.repo.get_recuperation_shift("nonexistent_id")
        assert result is None

    def test_create_shifts(self):
        """Test creating multiple shifts."""
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
                start_time=datetime(2023, 1, 2, 8, 0, tzinfo=timezone.utc),
                end_time=datetime(2023, 1, 2, 16, 0, tzinfo=timezone.utc),
                staffing=[Staffing(specialty_id="spec2", staffing=3)],
                color="#00FF00",
                shift_type=ShiftType.DUTY,
                rest_type=ShiftRestType.NONE,
                leave_type=ShiftLeaveType.NONE,
                recuperation_time=0,
                recuperation_duty_id=None,
                deleted=False,
            ),
        ]

        results = self.repo.create_shifts(shifts)

        assert len(results) == 2
        assert results[0].name == "Shift 1"
        assert results[1].name == "Shift 2"

    def test_get_shifts(self):
        """Test retrieving all shifts for a team."""
        shift = ShiftSchema(
            team="team1",
            name="Shift 1",
            acronym="S1",
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
        self.repo.create(shift)

        shifts = self.repo.get_shifts("team1")
        assert len(shifts) == 1
        assert shifts[0].name == "Shift 1"

    def test_get_shifts_not_deleted(self):
        """Test retrieving non-deleted shifts for a team."""
        shift = ShiftSchema(
            team="team1",
            name="Shift 1",
            acronym="S1",
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
            deleted=True,
        )
        self.repo.create(shift)

        shifts = self.repo.get_shifts_not_deleted("team1")
        assert len(shifts) == 0

    def test_get_work_shifts(self):
        """Test retrieving work shifts for a team."""
        shift = ShiftSchema(
            team="team1",
            name="Work Shift",
            acronym="WS",
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
        self.repo.create(shift)

        shifts = self.repo.get_work_shifts("team1")
        assert len(shifts) == 1
        assert shifts[0].name == "Work Shift"

    def test_get_work_shifts_not_deleted(self):
        """Test retrieving non-deleted work shifts for a team."""
        shift = ShiftSchema(
            team="team1",
            name="Work Shift",
            acronym="WS",
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
            deleted=True,
        )
        self.repo.create(shift)

        shifts = self.repo.get_work_shifts_not_deleted("team1")
        assert len(shifts) == 0

    def test_get_rest_shifts(self):
        """Test retrieving rest shifts for a team."""
        shift = ShiftSchema(
            team="team1",
            name="Rest Shift",
            acronym="RS",
            acronym_custom=False,
            start_time=1672560000.0,
            end_time=1672588800.0,
            staffing=[StaffingSchema(specialty="spec1", staffing=2)],
            color="#FF0000",
            shift_type=ShiftType.REST.value,
            rest_type=ShiftRestType.OFF,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty=None,
            deleted=False,
        )
        self.repo.create(shift)

        shifts = self.repo.get_rest_shifts("team1")
        assert len(shifts) == 1
        assert shifts[0].name == "Rest Shift"

    def test_update_shifts(self):
        """Test updating multiple shifts."""
        shift = ShiftSchema(
            team="team1",
            name="Shift 1",
            acronym="S1",
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

        results = self.repo.update_shifts([updated_shift])
        assert len(results) == 1
        assert results[0].name == "Updated Shift"

    def test_logical_delete_shift_recup(self):
        """Test logically deleting recuperation shifts."""
        duty_shift = ShiftSchema(
            team="team1",
            name="Duty Shift",
            acronym="DS",
            acronym_custom=False,
            start_time=1672560000.0,
            end_time=1672588800.0,
            staffing=[StaffingSchema(specialty="spec1", staffing=2)],
            color="#FF0000",
            shift_type=ShiftType.DUTY.value,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty=None,
            deleted=False,
        )
        created_duty = self.repo.create(duty_shift)

        recuperation_shift = ShiftSchema(
            team="team1",
            name="Recuperation Shift",
            acronym="RS",
            acronym_custom=False,
            start_time=1672590000.0,
            end_time=1672618800.0,
            staffing=[StaffingSchema(specialty="spec1", staffing=1)],
            color="#00FF00",
            shift_type=ShiftType.REST.value,
            rest_type=ShiftRestType.RECUPERATION.value,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=8,
            recuperation_duty=created_duty.id,
            deleted=False,
        )
        self.repo.create(recuperation_shift)

        self.repo.logical_delete_shift_recup(created_duty.id)

        from_db = self.repo.collection.find_one(
            {"recuperation_duty": created_duty.id}
        )
        assert from_db["deleted"] is True

    def test_get_recuperation_shifts(self):
        """Test retrieving recuperation shifts by a list of shift IDs."""
        duty_shift_1 = ShiftSchema(
            team="team1",
            name="Duty Shift 1",
            acronym="DS1",
            acronym_custom=False,
            start_time=1672560000.0,
            end_time=1672588800.0,
            staffing=[StaffingSchema(specialty="spec1", staffing=2)],
            color="#FF0000",
            shift_type=ShiftType.DUTY.value,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty=None,
            deleted=False,
        )
        duty_shift_2 = ShiftSchema(
            team="team1",
            name="Duty Shift 2",
            acronym="DS2",
            acronym_custom=False,
            start_time=1672560000.0,
            end_time=1672588800.0,
            staffing=[StaffingSchema(specialty="spec2", staffing=3)],
            color="#00FF00",
            shift_type=ShiftType.DUTY.value,
            rest_type=ShiftRestType.NONE,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=0,
            recuperation_duty=None,
            deleted=False,
        )
        created_duty_1 = self.repo.create(duty_shift_1)
        created_duty_2 = self.repo.create(duty_shift_2)

        recuperation_shift_1 = ShiftSchema(
            team="team1",
            name="Recuperation Shift 1",
            acronym="RS1",
            acronym_custom=False,
            start_time=1672590000.0,
            end_time=1672618800.0,
            staffing=[StaffingSchema(specialty="spec1", staffing=1)],
            color="#0000FF",
            shift_type=ShiftType.REST.value,
            rest_type=ShiftRestType.RECUPERATION.value,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=8,
            recuperation_duty=created_duty_1.id,
            deleted=False,
        )
        recuperation_shift_2 = ShiftSchema(
            team="team1",
            name="Recuperation Shift 2",
            acronym="RS2",
            acronym_custom=False,
            start_time=1672590000.0,
            end_time=1672618800.0,
            staffing=[StaffingSchema(specialty="spec2", staffing=1)],
            color="#FFFF00",
            shift_type=ShiftType.REST.value,
            rest_type=ShiftRestType.RECUPERATION.value,
            leave_type=ShiftLeaveType.NONE,
            recuperation_time=8,
            recuperation_duty=created_duty_2.id,
            deleted=False,
        )
        self.repo.create(recuperation_shift_1)
        self.repo.create(recuperation_shift_2)

        result = self.repo.get_recuperation_shifts(
            [created_duty_1.id, created_duty_2.id]
        )

        assert len(result) == 2
        assert result[0].name == "Recuperation Shift 1"
        assert result[1].name == "Recuperation Shift 2"
