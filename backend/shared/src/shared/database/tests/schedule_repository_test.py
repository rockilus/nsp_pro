from datetime import datetime, timezone

import pytest

from shared.database.database import MongoDB
from shared.database.repositories.schedule import (
    ScheduleRepository,
)
from shared.database.schemas.schedule import (
    QuickStaffingSchema,
    ScheduleSchema,
)
from shared.schemas.core.schedule import (
    Schedule,
    ScheduleStatus,
)
import pytest_asyncio

from shared.database.interface import DatabaseInterface


class TestScheduleRepository:
    repo: ScheduleRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = ScheduleRepository(database_interface=mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("schedules")
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_schedule(self):
        """Test creating a schedule."""
        schedule = Schedule(
            id="test_id",
            team_id="team1",
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).date(),
            status=ScheduleStatus.CAMPAIGN,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
            created_by="user1",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        result = self.repo.create_schedule(schedule)

        assert result.id is not None
        assert result.team_id == "team1"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["team"] == "team1"

    def test_get_schedule_by_id(self):
        """Test getting a schedule by ID."""
        schedule = ScheduleSchema(
            team="team1",
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_builds=[],
            quick_staffings=[],
            created_at=datetime.now(timezone.utc).timestamp(),
            updated_at=datetime.now(timezone.utc).timestamp(),
            created_by="user1",
        )
        created = self.repo.create(schedule)

        found = self.repo.get_schedule_by_id(str(created.id))

        assert found is not None
        assert found.id == created.id
        assert found.team_id == "team1"

    def test_update_schedule(self):
        """Test updating a schedule."""
        schedule = ScheduleSchema(
            team="team1",
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_builds=[],
            quick_staffings=[],
            created_at=datetime.now(timezone.utc).timestamp(),
            updated_at=datetime.now(timezone.utc).timestamp(),
            created_by="user1",
        )
        created = self.repo.create(schedule)

        updated_schedule = Schedule(
            id=str(created.id),
            team_id="team1",
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).date(),
            status=ScheduleStatus.VALIDATED,
            missing_coverage_dates=[],
            constraint_build_ids=[],
            quick_staffings=[],
            created_by="user1",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )

        result = self.repo.update_schedule(updated_schedule)

        assert result.status == ScheduleStatus.VALIDATED

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db is not None
        assert from_db["status"] == ScheduleStatus.VALIDATED.value

    def test_delete_schedule(self):
        """Test deleting a schedule."""
        schedule = ScheduleSchema(
            team="team1",
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_builds=[],
            quick_staffings=[],
            created_at=datetime.now(timezone.utc).timestamp(),
            updated_at=datetime.now(timezone.utc).timestamp(),
            created_by="user1",
        )
        created = self.repo.create(schedule)

        self.repo.delete_schedule(str(created.id))

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_schedules(self):
        """Test getting all schedules for a team."""
        schedules = [
            ScheduleSchema(
                team="team1",
                start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                end_date=datetime(
                    2023, 1, 31, tzinfo=timezone.utc
                ).timestamp(),
                status=ScheduleStatus.CAMPAIGN.value,
                missing_coverage_dates=[],
                constraint_builds=[],
                quick_staffings=[],
                created_at=datetime.now(timezone.utc).timestamp(),
                updated_at=datetime.now(timezone.utc).timestamp(),
                created_by="user1",
            ),
            ScheduleSchema(
                team="team1",
                start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                end_date=datetime(
                    2023, 1, 31, tzinfo=timezone.utc
                ).timestamp(),
                status=ScheduleStatus.CAMPAIGN.value,
                missing_coverage_dates=[],
                constraint_builds=[],
                quick_staffings=[],
                created_at=datetime.now(timezone.utc).timestamp(),
                updated_at=datetime.now(timezone.utc).timestamp(),
                created_by="user1",
            ),
        ]
        self.repo.create_many(schedules)

        result = self.repo.get_schedules("team1")

        assert len(result) == 2

    def test_get_schedule_campaign(self):
        """Test getting the campaign schedule for a team."""
        schedule = ScheduleSchema(
            team="team1",
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_builds=[],
            quick_staffings=[],
            created_at=datetime.now(timezone.utc).timestamp(),
            updated_at=datetime.now(timezone.utc).timestamp(),
            created_by="user1",
        )
        self.repo.create(schedule)

        result = self.repo.get_schedule_campaign("team1")

        assert result is not None
        assert result.status == ScheduleStatus.CAMPAIGN

    def test_get_schedule_campaign_by_constraint_build_id(self):
        """Test getting the campaign schedule by constraint build ID for a team."""
        schedule = ScheduleSchema(
            team="team1",
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_builds=["cb1"],
            quick_staffings=[],
            created_at=datetime.now(timezone.utc).timestamp(),
            updated_at=datetime.now(timezone.utc).timestamp(),
            created_by="user1",
        )
        self.repo.create(schedule)

        result = self.repo.get_schedule_campaign_by_constraint_build_id(
            "team1", "cb1"
        )

        assert result is not None
        assert "cb1" in result.constraint_build_ids

    def test_get_schedules_before_date(self):
        """Test getting all schedules before a specific date for a team."""
        schedules = [
            ScheduleSchema(
                team="team1",
                start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                end_date=datetime(
                    2023, 1, 31, tzinfo=timezone.utc
                ).timestamp(),
                status=ScheduleStatus.CAMPAIGN.value,
                missing_coverage_dates=[],
                constraint_builds=[],
                quick_staffings=[],
                created_at=datetime.now(timezone.utc).timestamp(),
                updated_at=datetime.now(timezone.utc).timestamp(),
                created_by="user1",
            ),
            ScheduleSchema(
                team="team1",
                start_date=datetime(
                    2023, 1, 1, tzinfo=timezone.utc
                ).timestamp(),
                end_date=datetime(
                    2023, 1, 31, tzinfo=timezone.utc
                ).timestamp(),
                status=ScheduleStatus.CAMPAIGN.value,
                missing_coverage_dates=[],
                constraint_builds=[],
                quick_staffings=[],
                created_at=datetime.now(timezone.utc).timestamp(),
                updated_at=datetime.now(timezone.utc).timestamp(),
                created_by="user1",
            ),
        ]
        self.repo.create_many(schedules)

        result = self.repo.get_schedules_before_date(
            datetime(2023, 2, 15, tzinfo=timezone.utc).date(), "team1"
        )

        assert len(result) == 2

    def test_get_schedule_quick_staffing_contain_shift_id(self):
        """
        Test getting all schedules containing a specific shift ID in quick staffing.
        """
        schedule = ScheduleSchema(
            team="team1",
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_builds=[],
            quick_staffings=[
                QuickStaffingSchema(
                    worker_id="worker1", shift_id="shift1", target=1
                )
            ],
            created_at=datetime.now(timezone.utc).timestamp(),
            updated_at=datetime.now(timezone.utc).timestamp(),
            created_by="user1",
        )
        self.repo.create(schedule)

        result = self.repo.get_schedule_quick_staffing_contain_shift_id(
            "shift1"
        )

        assert len(result) == 1
        assert result[0].quick_staffings[0].shift_id == "shift1"

    def test_get_schedule_quick_staffing_contain_worker_id(self):
        """
        Test getting all schedules containing a specific worker ID in quick staffing.
        """
        schedule = ScheduleSchema(
            team="team1",
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            end_date=datetime(2023, 1, 31, tzinfo=timezone.utc).timestamp(),
            status=ScheduleStatus.CAMPAIGN.value,
            missing_coverage_dates=[],
            constraint_builds=[],
            quick_staffings=[
                QuickStaffingSchema(
                    worker_id="worker1", shift_id="shift1", target=1
                )
            ],
            created_at=datetime.now(timezone.utc).timestamp(),
            updated_at=datetime.now(timezone.utc).timestamp(),
            created_by="user1",
        )
        self.repo.create(schedule)

        result = self.repo.get_schedule_quick_staffing_contain_worker_id(
            "worker1"
        )

        assert len(result) == 1
        assert result[0].quick_staffings[0].worker_id == "worker1"
