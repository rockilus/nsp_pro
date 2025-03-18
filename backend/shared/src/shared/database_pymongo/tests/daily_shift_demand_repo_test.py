from datetime import datetime, timezone

import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.daily_shift_demand import (
    DailyShiftDemandRepository,
)
from shared.database_pymongo.schemas.daily_shift_demand import (
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
            team_id=str(ObjectId()),
            schedule_id=str(ObjectId()),
            shift_demand_id=str(ObjectId()),
            source_type=DSDSourceType.SHIFT_DEMAND,
            date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
            shift_id=str(ObjectId()),
            count=5,
        )

        result = self.repo.create_daily_shift_demand(daily_shift_demand)

        assert result.id is not None
        assert result.team_id == daily_shift_demand.team_id
        assert result.schedule_id == daily_shift_demand.schedule_id

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["team"] == ObjectId(daily_shift_demand.team_id)
        assert saved_doc["schedule"] == ObjectId(daily_shift_demand.schedule_id)

    def test_get_daily_shift_demand_by_id(self):
        """Test getting a daily shift demand by ID."""
        daily_shift_demand = DailyShiftDemandSchema(
            team=ObjectId(),
            schedule=ObjectId(),
            shift_demand=ObjectId(),
            source_type=DSDSourceType.SHIFT_DEMAND.value,
            date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            shift=ObjectId(),
            count=5,
        )
        created = self.repo.create(daily_shift_demand)

        found = self.repo.get_daily_shift_demand_by_id(created.id)

        assert found is not None
        assert found.id == str(created.id)
        assert found.team_id == str(daily_shift_demand.team)

    def test_update_daily_shift_demand(self):
        """Test updating a daily shift demand."""
        daily_shift_demand = DailyShiftDemandSchema(
            team=ObjectId(),
            schedule=ObjectId(),
            shift_demand=ObjectId(),
            source_type=DSDSourceType.SHIFT_DEMAND.value,
            date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            shift=ObjectId(),
            count=5,
        )
        created = self.repo.create(daily_shift_demand)

        updated_demand = DailyShiftDemand(
            id=created.id,
            team_id=str(ObjectId()),
            schedule_id=str(ObjectId()),
            shift_demand_id=str(ObjectId()),
            source_type=DSDSourceType.SHIFT_DEMAND_MODIFY,
            date=datetime(2023, 1, 2, tzinfo=timezone.utc).date(),
            shift_id=str(ObjectId()),
            count=10,
        )

        result = self.repo.update_daily_shift_demand(updated_demand)

        assert result.count == 10
        assert result.source_type == DSDSourceType.SHIFT_DEMAND_MODIFY

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
        assert from_db["count"] == 10
        assert from_db["source_type"] == DSDSourceType.SHIFT_DEMAND_MODIFY.value

    def test_delete_daily_shift_demand(self):
        """Test deleting a daily shift demand."""
        daily_shift_demand = DailyShiftDemandSchema(
            team=ObjectId(),
            schedule=ObjectId(),
            shift_demand=ObjectId(),
            source_type=DSDSourceType.SHIFT_DEMAND.value,
            date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
            shift=ObjectId(),
            count=5,
        )
        created = self.repo.create(daily_shift_demand)

        self.repo.delete_daily_shift_demand(created.id)

        assert self.repo.collection.find_one({"_id": ObjectId(created.id)}) is None

    def test_get_daily_shift_demands(self):
        """Test getting all daily shift demands for a team."""
        team_oid = ObjectId()
        demands = [
            DailyShiftDemandSchema(
                team=team_oid,
                schedule=ObjectId(),
                shift_demand=ObjectId(),
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                count=5,
            ),
            DailyShiftDemandSchema(
                team=team_oid,
                schedule=ObjectId(),
                shift_demand=ObjectId(),
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        results = self.repo.get_daily_shift_demands(str(team_oid))

        assert len(results) == 2
        assert results[0].team_id == str(team_oid)
        assert results[1].team_id == str(team_oid)

    def test_create_daily_shift_demands(self):
        """Test creating multiple daily shift demands."""
        team_oid = ObjectId()
        demands = [
            DailyShiftDemand(
                id=None,
                team_id=str(team_oid),
                schedule_id=str(ObjectId()),
                shift_demand_id=str(ObjectId()),
                source_type=DSDSourceType.SHIFT_DEMAND,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).date(),
                shift_id=str(ObjectId()),
                count=5,
            ),
            DailyShiftDemand(
                id=None,
                team_id=str(team_oid),
                schedule_id=str(ObjectId()),
                shift_demand_id=str(ObjectId()),
                source_type=DSDSourceType.SHIFT_DEMAND,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).date(),
                shift_id=str(ObjectId()),
                count=3,
            ),
        ]

        results = self.repo.create_daily_shift_demands(demands)

        assert len(results) == 2
        assert results[0].id is not None
        assert results[1].id is not None

        saved_docs = list(self.repo.collection.find({"team": team_oid}))
        assert len(saved_docs) == 2

    def test_get_daily_shift_demands_by_schedule_id(self):
        """Test getting daily shift demands by schedule ID."""
        schedule_oid = ObjectId()
        demands = [
            DailyShiftDemandSchema(
                team=ObjectId(),
                schedule=schedule_oid,
                shift_demand=ObjectId(),
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                count=5,
            ),
            DailyShiftDemandSchema(
                team=ObjectId(),
                schedule=schedule_oid,
                shift_demand=ObjectId(),
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        results = self.repo.get_daily_shift_demands_by_schedule_id(str(schedule_oid))

        assert len(results) == 2
        assert results[0].schedule_id == str(schedule_oid)
        assert results[1].schedule_id == str(schedule_oid)

    def test_get_daily_shift_demands_modified_by_schedule_id(self):
        """Test getting modified daily shift demands by schedule ID."""
        schedule_oid = ObjectId()
        demands = [
            DailyShiftDemandSchema(
                team=ObjectId(),
                schedule=schedule_oid,
                shift_demand=ObjectId(),
                source_type=DSDSourceType.SHIFT_DEMAND_MODIFY.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                count=5,
            ),
            DailyShiftDemandSchema(
                team=ObjectId(),
                schedule=schedule_oid,
                shift_demand=ObjectId(),
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        results = self.repo.get_daily_shift_demands_modified_by_schedule_id(
            str(schedule_oid)
        )

        assert len(results) == 1
        assert results[0].source_type == DSDSourceType.SHIFT_DEMAND_MODIFY

    def test_get_daily_shift_demands_by_shift_demand_id(self):
        """Test getting daily shift demands by shift demand ID."""
        shift_demand_oid = ObjectId()
        demands = [
            DailyShiftDemandSchema(
                team=ObjectId(),
                schedule=ObjectId(),
                shift_demand=shift_demand_oid,
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                count=5,
            ),
            DailyShiftDemandSchema(
                team=ObjectId(),
                schedule=ObjectId(),
                shift_demand=ObjectId(),
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        results = self.repo.get_daily_shift_demands_by_shift_demand_id(
            [str(shift_demand_oid)]
        )

        assert len(results) == 1
        assert results[0].shift_demand_id == str(shift_demand_oid)

    def test_delete_daily_shift_demands_by_schedule_id(self):
        """Test deleting daily shift demands by schedule ID."""
        schedule_oid = ObjectId()
        demands = [
            DailyShiftDemandSchema(
                team=ObjectId(),
                schedule=schedule_oid,
                shift_demand=ObjectId(),
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                count=5,
            ),
            DailyShiftDemandSchema(
                team=ObjectId(),
                schedule=schedule_oid,
                shift_demand=ObjectId(),
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        self.repo.delete_daily_shift_demands_by_schedule_id(str(schedule_oid))

        remaining_docs = list(self.repo.collection.find({"schedule": schedule_oid}))
        assert len(remaining_docs) == 0

    def test_delete_dsds_by_schedule_id_and_source_shift_demand(self):
        """
        Test deleting daily shift demands by schedule ID and source type shift
        demand.
        """
        schedule_oid = ObjectId()
        demands = [
            DailyShiftDemandSchema(
                team=ObjectId(),
                schedule=schedule_oid,
                shift_demand=ObjectId(),
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                count=5,
            ),
            DailyShiftDemandSchema(
                team=ObjectId(),
                schedule=schedule_oid,
                shift_demand=ObjectId(),
                source_type=DSDSourceType.SHIFT_DEMAND_MODIFY.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=ObjectId(),
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        self.repo.delete_dsds_by_schedule_id_and_source_shift_demand(str(schedule_oid))

        remaining_docs = list(self.repo.collection.find())
        assert len(remaining_docs) == 1
        assert (
            remaining_docs[0]["source_type"] == DSDSourceType.SHIFT_DEMAND_MODIFY.value
        )

    def test_delete_daily_shift_demands_by_shift_id(self):
        """Test deleting daily shift demands by shift ID."""
        shift_oid = ObjectId()
        demands = [
            DailyShiftDemandSchema(
                team=ObjectId(),
                schedule=ObjectId(),
                shift_demand=ObjectId(),
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 1, tzinfo=timezone.utc).timestamp(),
                shift=shift_oid,
                count=5,
            ),
            DailyShiftDemandSchema(
                team=ObjectId(),
                schedule=ObjectId(),
                shift_demand=ObjectId(),
                source_type=DSDSourceType.SHIFT_DEMAND.value,
                date=datetime(2023, 1, 2, tzinfo=timezone.utc).timestamp(),
                shift=shift_oid,
                count=3,
            ),
        ]
        self.repo.create_many(demands)

        self.repo.delete_daily_shift_demands_by_shift_id(str(shift_oid))

        remaining_docs = list(self.repo.collection.find({"shift": shift_oid}))
        assert len(remaining_docs) == 0
