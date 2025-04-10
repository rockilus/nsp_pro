from datetime import datetime, timezone

import pytest

from shared.database.database import MongoDB
from shared.database.repositories.recurrence import RecurrenceRepository
from shared.database.schemas.recurrence import RecurrenceRuleSchema
from shared.schemas.core.recurrence import (
    FrequencyType,
    RecurrenceEndType,
    RecurrenceRule,
    RecurrenceType,
)


class TestRecurrenceRepository:
    repo: RecurrenceRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = RecurrenceRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_recurrence(self):
        """Test creating a recurrence rule."""
        recurrence = RecurrenceRule(
            id=None,
            team_id="team1",
            recurrence_type=RecurrenceType.ASSIGNMENT,
            assignment_id="assignment1",
            daily_shift_demand_id=None,
            repeat_every=1,
            frequency_type=FrequencyType.WEEK,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.NEVER,
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            end_date=None,
            number_of_occurrences=None,
        )

        result = self.repo.create_recurrence(recurrence)

        assert result.id is not None
        assert result.team_id == "team1"
        assert result.recurrence_type == RecurrenceType.ASSIGNMENT

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["team_id"] == "team1"

    def test_get_recurrence_by_id(self):
        """Test getting a recurrence rule by ID."""
        recurrence = RecurrenceRuleSchema(
            team_id="team1",
            recurrence_type=RecurrenceType.ASSIGNMENT.value,
            assignment_id="assignment1",
            daily_shift_demand_id=None,
            repeat_every=1,
            frequency_type=FrequencyType.WEEK.value,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.NEVER.value,
            start_date=1672531200.0,
            end_date=None,
            number_of_occurrences=None,
        )
        created = self.repo.create(recurrence)

        found = self.repo.get_recurrence_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.team_id == "team1"

    def test_update_recurrence(self):
        """Test updating a recurrence rule."""
        recurrence = RecurrenceRuleSchema(
            team_id="team1",
            recurrence_type=RecurrenceType.ASSIGNMENT.value,
            assignment_id="assignment1",
            daily_shift_demand_id=None,
            repeat_every=1,
            frequency_type=FrequencyType.WEEK.value,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.NEVER.value,
            start_date=1672531200.0,
            end_date=None,
            number_of_occurrences=None,
        )
        created = self.repo.create(recurrence)

        updated_recurrence = RecurrenceRule(
            id=created.id,
            team_id="team1",
            recurrence_type=RecurrenceType.DAILY_SHIFT_DEMAND,
            assignment_id=None,
            daily_shift_demand_id="demand1",
            repeat_every=2,
            frequency_type=FrequencyType.DAY,
            week_days=[],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.END_DATE,
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
            number_of_occurrences=None,
        )

        result = self.repo.update_recurrence(updated_recurrence)

        assert result.recurrence_type == RecurrenceType.DAILY_SHIFT_DEMAND
        assert result.daily_shift_demand_id == "demand1"
        assert result.repeat_every == 2

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["daily_shift_demand_id"] == "demand1"

    def test_delete_recurrence(self):
        """Test deleting a recurrence rule."""
        recurrence = RecurrenceRuleSchema(
            team_id="team1",
            recurrence_type=RecurrenceType.ASSIGNMENT.value,
            assignment_id="assignment1",
            daily_shift_demand_id=None,
            repeat_every=1,
            frequency_type=FrequencyType.WEEK.value,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.NEVER.value,
            start_date=1672531200.0,
            end_date=None,
            number_of_occurrences=None,
        )
        created = self.repo.create(recurrence)

        self.repo.delete_recurrence(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_recurrences_by_team_id(self):
        """Test retrieving all recurrence rules for a team."""
        recurrence1 = RecurrenceRuleSchema(
            team_id="team1",
            recurrence_type=RecurrenceType.ASSIGNMENT.value,
            assignment_id="assignment1",
            daily_shift_demand_id=None,
            repeat_every=1,
            frequency_type=FrequencyType.WEEK.value,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.NEVER.value,
            start_date=1672531200.0,
            end_date=None,
            number_of_occurrences=None,
        )
        recurrence2 = RecurrenceRuleSchema(
            team_id="team1",
            recurrence_type=RecurrenceType.DAILY_SHIFT_DEMAND.value,
            assignment_id=None,
            daily_shift_demand_id="demand1",
            repeat_every=2,
            frequency_type=FrequencyType.DAY.value,
            week_days=[],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.END_DATE.value,
            start_date=1672531200.0,
            end_date=1675123200.0,
            number_of_occurrences=None,
        )
        self.repo.create_many([recurrence1, recurrence2])

        recurrences = self.repo.get_recurrences_by_team_id("team1")
        assert len(recurrences) == 2
        assert recurrences[0].team_id == "team1"
        assert recurrences[1].team_id == "team1"
