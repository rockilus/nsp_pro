from datetime import datetime, timedelta, timezone

import pytest

from shared.database.database import MongoDB
from shared.database.repositories.recurrence import RecurrenceRepository
from shared.database.schemas.recurrence import (
    OccurrenceInfoSchema,
    RecurrenceRuleSchema,
)
from shared.schemas.core.recurrence import (
    FrequencyType,
    OccurrenceInfo,
    OccurrenceType,
    RecurrenceEndType,
    RecurrenceRule,
)
import pytest_asyncio

from shared.database.interface import DatabaseInterface


class TestRecurrenceRepository:
    repo: RecurrenceRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = RecurrenceRepository(database_interface=mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("recurrences")
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_recurrence(self):
        """Test creating a recurrence rule."""
        recurrence = RecurrenceRule(
            id=None,
            team_id="team1",
            occurrence_type=OccurrenceType.ASSIGNMENT,
            occurrence_info=OccurrenceInfo(
                worker_id=None,
                shift_id="shift1",
                count=None,
            ),
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
        assert result.occurrence_type == OccurrenceType.ASSIGNMENT

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["team_id"] == "team1"

    def test_get_recurrence_by_id(self):
        """Test getting a recurrence rule by ID."""
        recurrence = RecurrenceRuleSchema(
            team_id="team1",
            occurrence_type=OccurrenceType.ASSIGNMENT.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift1",
                count=None,
            ),
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
            occurrence_type=OccurrenceType.ASSIGNMENT.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift1",
                count=None,
            ),
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
            occurrence_type=OccurrenceType.DAILY_SHIFT_DEMAND,
            occurrence_info=OccurrenceInfo(
                worker_id=None,
                shift_id="shift2",
                count=None,
            ),
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

        assert result.occurrence_type == OccurrenceType.DAILY_SHIFT_DEMAND
        assert (
            result.occurrence_info.shift_id
            == updated_recurrence.occurrence_info.shift_id
        )
        assert result.repeat_every == 2

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert (
            from_db["occurrence_info"]["shift_id"]
            == updated_recurrence.occurrence_info.shift_id
        )

    def test_delete_recurrence(self):
        """Test deleting a recurrence rule."""
        recurrence = RecurrenceRuleSchema(
            team_id="team1",
            occurrence_type=OccurrenceType.ASSIGNMENT.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift1",
                count=None,
            ),
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
            occurrence_type=OccurrenceType.ASSIGNMENT.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift1",
                count=None,
            ),
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
            occurrence_type=OccurrenceType.DAILY_SHIFT_DEMAND.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift1",
                count=None,
            ),
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

    # pylint: disable=too-many-locals
    def test_get_recurrences_by_team_and_date_range(self):
        """Test retrieving recurrence rules by team ID and date range."""

        # Request
        team_id = "team1"
        start_date_request = datetime(2025, 1, 1, tzinfo=timezone.utc)
        end_date_request = datetime(2025, 12, 31, tzinfo=timezone.utc)

        # Recurrences
        # recurrence.team_id not same team id - OK
        team_id_other = "team2"
        # recurrence.start_date after end date and recurrence.end_date is None - OK
        # recurrence.start_date and recurrence.end_date after end date - OK
        start_date_after = end_date_request + timedelta(days=1)
        end_date_after = end_date_request + timedelta(days=2)
        # recurrence.end_date before start date - OK
        # recurrence.start_date before end date, and recurrence.end_date is None - OK
        start_date_before = start_date_request - timedelta(days=2)
        end_date_before = start_date_request - timedelta(days=1)
        # recurrence.start_date before end date, and recurrence.end in period - OK
        # recurrence.start_date in, and recurrence.end in period - OK
        # recurrence.start_date in, and recurrence.end after end date - OK
        # recurrence.start_date in, and recurrence.end None - OK
        start_date_in = start_date_request + timedelta(days=1)
        end_date_in = start_date_request + timedelta(days=2)

        # recurrence.team_id not same team id
        recurrence_team_id_other = RecurrenceRuleSchema(
            team_id=team_id_other,
            occurrence_type=OccurrenceType.ASSIGNMENT.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift1",
                count=None,
            ),
            repeat_every=1,
            frequency_type=FrequencyType.WEEK.value,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.NEVER.value,
            start_date=start_date_in.timestamp(),
            end_date=end_date_in.timestamp(),
            number_of_occurrences=None,
        )

        # recurrence.start_date after end date and recurrence.end_date is None
        recurrence_after_none = RecurrenceRuleSchema(
            team_id=team_id,
            occurrence_type=OccurrenceType.ASSIGNMENT.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift2",
                count=None,
            ),
            repeat_every=1,
            frequency_type=FrequencyType.WEEK.value,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.NEVER.value,
            start_date=start_date_after.timestamp(),
            end_date=None,
            number_of_occurrences=None,
        )

        # recurrence.start_date and recurrence.end_date after end date
        recurrence_after_after = RecurrenceRuleSchema(
            team_id=team_id,
            occurrence_type=OccurrenceType.ASSIGNMENT.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift3",
                count=None,
            ),
            repeat_every=1,
            frequency_type=FrequencyType.WEEK.value,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.END_DATE.value,
            start_date=start_date_after.timestamp(),
            end_date=end_date_after.timestamp(),
            number_of_occurrences=None,
        )

        # recurrence.end_date before start date
        recurrence_before_before = RecurrenceRuleSchema(
            team_id=team_id,
            occurrence_type=OccurrenceType.ASSIGNMENT.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift4",
                count=None,
            ),
            repeat_every=1,
            frequency_type=FrequencyType.WEEK.value,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.END_DATE.value,
            start_date=start_date_before.timestamp(),
            end_date=end_date_before.timestamp(),
            number_of_occurrences=None,
        )

        # recurrence.start_date before end date, and recurrence.end_date is None
        recurrence_before_none = RecurrenceRuleSchema(
            team_id=team_id,
            occurrence_type=OccurrenceType.ASSIGNMENT.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift5",
                count=None,
            ),
            repeat_every=1,
            frequency_type=FrequencyType.WEEK.value,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.END_DATE.value,
            start_date=start_date_before.timestamp(),
            end_date=None,
            number_of_occurrences=None,
        )

        # recurrence.start_date before end date, and recurrence.end in period
        recurrence_before_in = RecurrenceRuleSchema(
            team_id=team_id,
            occurrence_type=OccurrenceType.ASSIGNMENT.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift6",
                count=None,
            ),
            repeat_every=1,
            frequency_type=FrequencyType.WEEK.value,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.NEVER.value,
            start_date=start_date_before.timestamp(),
            end_date=end_date_in.timestamp(),
            number_of_occurrences=None,
        )

        # recurrence.start_date in, and recurrence.end in period
        recurrence_in_in = RecurrenceRuleSchema(
            team_id=team_id,
            occurrence_type=OccurrenceType.ASSIGNMENT.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift7",
                count=None,
            ),
            repeat_every=1,
            frequency_type=FrequencyType.WEEK.value,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.NEVER.value,
            start_date=start_date_in.timestamp(),
            end_date=end_date_in.timestamp(),
            number_of_occurrences=None,
        )

        # recurrence.start_date in, and recurrence.end after end date
        recurrence_in_after = RecurrenceRuleSchema(
            team_id=team_id,
            occurrence_type=OccurrenceType.ASSIGNMENT.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift8",
                count=None,
            ),
            repeat_every=1,
            frequency_type=FrequencyType.WEEK.value,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.NEVER.value,
            start_date=start_date_in.timestamp(),
            end_date=end_date_after.timestamp(),
            number_of_occurrences=None,
        )

        # recurrence.start_date in, and recurrence.end None
        recurrence_in_none = RecurrenceRuleSchema(
            team_id=team_id,
            occurrence_type=OccurrenceType.ASSIGNMENT.value,
            occurrence_info=OccurrenceInfoSchema(
                worker_id=None,
                shift_id="shift9",
                count=None,
            ),
            repeat_every=1,
            frequency_type=FrequencyType.WEEK.value,
            week_days=[1, 3, 5],
            month_repeat_type=None,
            recurrence_end_type=RecurrenceEndType.NEVER.value,
            start_date=start_date_in.timestamp(),
            end_date=None,
            number_of_occurrences=None,
        )

        _ = self.repo.create_many(
            [
                recurrence_team_id_other,
                recurrence_after_none,
                recurrence_after_after,
                recurrence_before_before,
            ]
        )
        recurrences_in = self.repo.create_many(
            [
                recurrence_before_none,
                recurrence_before_in,
                recurrence_in_in,
                recurrence_in_after,
                recurrence_in_none,
            ]
        )

        recurrences = self.repo.get_recurrences_by_team_and_date_range(
            team_id=team_id,
            start_date=start_date_request,
            end_date=end_date_request,
        )

        recurrence_in_ids = [recurrence.id for recurrence in recurrences_in]

        assert len(recurrences) == len(recurrences_in)
        assert all(
            recurrence.id in recurrence_in_ids for recurrence in recurrences
        )
