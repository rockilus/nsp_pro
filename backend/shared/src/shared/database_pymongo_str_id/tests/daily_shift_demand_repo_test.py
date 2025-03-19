from datetime import datetime, timezone

import pytest

from shared.database_pymongo_str_id.database import MongoDB
from shared.database_pymongo_str_id.repositories.daily_shift_demand import (
    DailyShiftDemandRepository,
)
from shared.database_pymongo_str_id.schemas.daily_shift_demand import (
    DailyShiftDemandSchema,
)
from shared.schemas.schemas.coverage import DailyShiftDemand, DSDSourceType


class TestDailyShiftDemandRepository:
    repo: DailyShiftDemandRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = DailyShiftDemandRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_daily_shift_demand(self):
        """Test creating a daily shift demand."""
        daily_shift_demand = DailyShiftDemand(
            id=None,
            team_id="team1",
            schedule_id="schedule1",
            shift_demand_id="shift_demand1",
            source_type=DSDSourceType.SHIFT_DEMAND,
            date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            shift_id="shift1",
            count=5,
        )

        result = self.repo.create_daily_shift_demand(daily_shift_demand)

        assert result.id is not None
        assert result.team_id == "team1"
        assert result.schedule_id == "schedule1"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["team"] == "team1"
        assert saved_doc["schedule"] == "schedule1"

    def test_get_daily_shift_demand_by_id(self):
        """Test getting a daily shift demand by ID."""
        daily_shift_demand = DailyShiftDemandSchema(
            team="team1",
            schedule="schedule1",
            shift_demand="shift_demand1",
            source_type=DSDSourceType.SHIFT_DEMAND.value,
            date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            shift="shift1",
            count=5,
        )
        created = self.repo.create(daily_shift_demand)

        found = self.repo.get_daily_shift_demand_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.team_id == "team1"

    def test_update_daily_shift_demand(self):
        """Test updating a daily shift demand."""
        daily_shift_demand = DailyShiftDemandSchema(
            team="team1",
            schedule="schedule1",
            shift_demand="shift_demand1",
            source_type=DSDSourceType.SHIFT_DEMAND.value,
            date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            shift="shift1",
            count=5,
        )
        created = self.repo.create(daily_shift_demand)

        updated_demand = DailyShiftDemand(
            id=created.id,
            team_id="team1",
            schedule_id="schedule1",
            shift_demand_id="shift_demand1",
            source_type=DSDSourceType.SHIFT_DEMAND_MODIFY,
            date=datetime(2023, 1, 2, tzinfo=timezone.utc).date(),
            shift_id="shift1",
            count=10,
        )

        result = self.repo.update_daily_shift_demand(updated_demand)

        assert result.count == 10
        assert result.source_type == DSDSourceType.SHIFT_DEMAND_MODIFY

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["count"] == 10
        assert from_db["source_type"] == DSDSourceType.SHIFT_DEMAND_MODIFY.value

    def test_delete_daily_shift_demand(self):
        """Test deleting a daily shift demand."""
        daily_shift_demand = DailyShiftDemandSchema(
            team="team1",
            schedule="schedule1",
            shift_demand="shift_demand1",
            source_type=DSDSourceType.SHIFT_DEMAND.value,
            date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            shift="shift1",
            count=5,
        )
        created = self.repo.create(daily_shift_demand)

        self.repo.delete_daily_shift_demand(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_daily_shift_demands(self):
        """Test getting all daily shift demands for a team."""
        demands = [
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand1",
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                count=5,
            ),
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand2",
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift2",
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        results = self.repo.get_daily_shift_demands("team1")

        assert len(results) == 2
        assert results[0].team_id == "team1"
        assert results[1].team_id == "team1"

    def test_create_daily_shift_demands(self):
        """Test creating multiple daily shift demands."""
        demands = [
            DailyShiftDemand(
                id=None,
                team_id="team1",
                schedule_id="schedule1",
                shift_demand_id="shift_demand1",
                source_type=DSDSourceType.SHIFT_DEMAND,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
                shift_id="shift1",
                count=5,
            ),
            DailyShiftDemand(
                id=None,
                team_id="team1",
                schedule_id="schedule1",
                shift_demand_id="shift_demand2",
                source_type=DSDSourceType.SHIFT_DEMAND,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).date(),
                shift_id="shift2",
                count=3,
            ),
        ]

        results = self.repo.create_daily_shift_demands(demands)

        assert len(results) == 2
        assert results[0].id is not None
        assert results[1].id is not None

        saved_docs = list(self.repo.collection.find({"team": "team1"}))
        assert len(saved_docs) == 2

    def test_get_daily_shift_demands_by_schedule_id(self):
        """Test getting daily shift demands by schedule ID."""
        demands = [
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand1",
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                count=5,
            ),
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand2",
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift2",
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        results = self.repo.get_daily_shift_demands_by_schedule_id("schedule1")

        assert len(results) == 2
        assert results[0].schedule_id == "schedule1"
        assert results[1].schedule_id == "schedule1"

    def test_get_daily_shift_demands_modified_by_schedule_id(self):
        """Test getting modified daily shift demands by schedule ID."""
        demands = [
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand1",
                source_type=DSDSourceType.SHIFT_DEMAND_MODIFY.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                count=5,
            ),
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand2",
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift2",
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        results = self.repo.get_daily_shift_demands_modified_by_schedule_id("schedule1")

        assert len(results) == 1
        assert results[0].source_type == DSDSourceType.SHIFT_DEMAND_MODIFY

    def test_get_daily_shift_demands_by_shift_demand_id(self):
        """Test getting daily shift demands by shift demand ID."""
        demands = [
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand1",
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                count=5,
            ),
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand2",
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift2",
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        results = self.repo.get_daily_shift_demands_by_shift_demand_id(
            ["shift_demand1"]
        )

        assert len(results) == 1
        assert results[0].shift_demand_id == "shift_demand1"

    def test_delete_daily_shift_demands_by_schedule_id(self):
        """Test deleting daily shift demands by schedule ID."""
        demands = [
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand1",
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                count=5,
            ),
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand2",
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift2",
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        self.repo.delete_daily_shift_demands_by_schedule_id("schedule1")

        remaining_docs = list(self.repo.collection.find({"schedule": "schedule1"}))
        assert len(remaining_docs) == 0

    def test_delete_dsds_by_schedule_id_and_source_shift_demand(self):
        """
        Test deleting daily shift demands by schedule ID and source type shift
        demand.
        """
        demands = [
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand1",
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                count=5,
            ),
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand2",
                source_type=DSDSourceType.SHIFT_DEMAND_MODIFY.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift2",
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        self.repo.delete_dsds_by_schedule_id_and_source_shift_demand("schedule1")

        remaining_docs = list(self.repo.collection.find({"schedule": "schedule1"}))
        assert len(remaining_docs) == 1
        assert (
            remaining_docs[0]["source_type"] == DSDSourceType.SHIFT_DEMAND_MODIFY.value
        )

    def test_delete_daily_shift_demands_by_shift_id(self):
        """Test deleting daily shift demands by shift ID."""
        demands = [
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand1",
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift="shift1",
                count=5,
            ),
            DailyShiftDemandSchema(
                team="team1",
                schedule="schedule1",
                shift_demand="shift_demand2",
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift="shift2",
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        self.repo.delete_daily_shift_demands_by_shift_id("shift1")

        remaining_docs = list(self.repo.collection.find({"shift": "shift1"}))
        assert len(remaining_docs) == 0
