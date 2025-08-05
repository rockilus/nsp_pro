from datetime import date, datetime, timezone

import pytest

from shared.database.database import MongoDB
from shared.database.repositories.shift_demand_exclusion import (
    ShiftDemandExclusionRepository,
)
from shared.database.schemas.shift_demand_exclusion import (
    ShiftDemandExclusionSchema,
)
from shared.schemas.core.shift_demand_exclusion import ShiftDemandExclusion
import pytest_asyncio

from shared.database.interface import DatabaseInterface


class TestShiftDemandExclusionRepository:
    repo: ShiftDemandExclusionRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = ShiftDemandExclusionRepository(
            database_interface=mongodb_container
        )

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("shift_demand_exclusions")
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_shift_demand_exclusion(self):
        """Test creating a shift demand exclusion."""
        exclusion = ShiftDemandExclusion(
            id=None,
            schedule_id="schedule1",
            coverage_selector_id="coverage1",
            shift_demand_id="demand1",
            date=date(2025, 4, 28),
        )

        result = self.repo.create_shift_demand_exclusion(exclusion)

        assert result.id is not None
        assert result.coverage_selector_id == "coverage1"
        assert result.shift_demand_id == "demand1"
        assert result.date == date(2025, 4, 28)

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["coverage_selector_id"] == "coverage1"
        assert saved_doc["shift_demand_id"] == "demand1"

    def test_get_shift_demand_exclusion_by_id(self):
        """Test getting a shift demand exclusion by ID."""
        exclusion = ShiftDemandExclusionSchema(
            schedule_id="schedule1",
            coverage_selector_id="coverage1",
            shift_demand_id="demand1",
            date=datetime(2025, 4, 28, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(exclusion)

        found = self.repo.get_shift_demand_exclusion_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.coverage_selector_id == "coverage1"

    def test_update_shift_demand_exclusion(self):
        """Test updating a shift demand exclusion."""
        exclusion = ShiftDemandExclusionSchema(
            schedule_id="schedule1",
            coverage_selector_id="coverage1",
            shift_demand_id="demand1",
            date=datetime(2025, 4, 28, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(exclusion)

        updated_exclusion = ShiftDemandExclusion(
            id=created.id,
            schedule_id="schedule1",
            coverage_selector_id="coverage2",
            shift_demand_id="demand2",
            date=date(2025, 5, 1),
        )

        result = self.repo.update_shift_demand_exclusion(updated_exclusion)

        assert result.coverage_selector_id == "coverage2"
        assert result.shift_demand_id == "demand2"
        assert result.date == date(2025, 5, 1)

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["coverage_selector_id"] == "coverage2"

    def test_delete_shift_demand_exclusion(self):
        """Test deleting a shift demand exclusion."""
        exclusion = ShiftDemandExclusionSchema(
            schedule_id="schedule1",
            coverage_selector_id="coverage1",
            shift_demand_id="demand1",
            date=datetime(2025, 4, 28, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(exclusion)

        self.repo.delete_shift_demand_exclusion(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_shift_demand_exclusions_by_coverage_selector_id(self):
        """Test retrieving exclusions by coverage ID."""
        exclusion = ShiftDemandExclusionSchema(
            schedule_id="schedule1",
            coverage_selector_id="coverage1",
            shift_demand_id="demand1",
            date=datetime(2025, 4, 28, tzinfo=timezone.utc).timestamp(),
        )
        self.repo.create(exclusion)

        exclusions = (
            self.repo.get_shift_demand_exclusions_by_coverage_selector_id(
                "coverage1"
            )
        )
        assert len(exclusions) == 1
        assert exclusions[0].coverage_selector_id == "coverage1"

    def test_get_shift_demand_exclusions_by_shift_demand_id(self):
        """Test retrieving exclusions by shift demand ID."""
        exclusion = ShiftDemandExclusionSchema(
            schedule_id="schedule1",
            coverage_selector_id="coverage1",
            shift_demand_id="demand1",
            date=datetime(2025, 4, 28, tzinfo=timezone.utc).timestamp(),
        )
        self.repo.create(exclusion)

        exclusions = self.repo.get_shift_demand_exclusions_by_shift_demand_id(
            "demand1"
        )
        assert len(exclusions) == 1
        assert exclusions[0].shift_demand_id == "demand1"

    def test_create_shift_demand_exclusions(self):
        """Test creating multiple shift demand exclusions."""
        exclusions = [
            ShiftDemandExclusion(
                id=None,
                schedule_id="schedule1",
                coverage_selector_id="coverage1",
                shift_demand_id="demand1",
                date=date(2025, 4, 28),
            ),
            ShiftDemandExclusion(
                id=None,
                schedule_id="schedule1",
                coverage_selector_id="coverage1",
                shift_demand_id="demand2",
                date=date(2025, 4, 29),
            ),
        ]

        results = self.repo.create_shift_demand_exclusions(exclusions)

        assert len(results) == 2
        assert results[0].coverage_selector_id == "coverage1"
        assert results[1].shift_demand_id == "demand2"

    def test_update_shift_demand_exclusions(self):
        """Test updating multiple shift demand exclusions."""
        exclusions = [
            ShiftDemandExclusionSchema(
                schedule_id="schedule1",
                coverage_selector_id="coverage1",
                shift_demand_id="demand1",
                date=datetime(2025, 4, 28, tzinfo=timezone.utc).timestamp(),
            ),
            ShiftDemandExclusionSchema(
                schedule_id="schedule1",
                coverage_selector_id="coverage1",
                shift_demand_id="demand2",
                date=datetime(2025, 4, 29, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        created = self.repo.create_many(exclusions)

        updated_exclusions = [
            ShiftDemandExclusion(
                id=created[0].id,
                schedule_id="schedule1",
                coverage_selector_id="coverage2",
                shift_demand_id="demand1",
                date=date(2025, 5, 1),
            ),
            ShiftDemandExclusion(
                id=created[1].id,
                schedule_id="schedule1",
                coverage_selector_id="coverage2",
                shift_demand_id="demand2",
                date=date(2025, 5, 2),
            ),
        ]

        results = self.repo.update_shift_demand_exclusions(updated_exclusions)

        assert len(results) == 2
        assert results[0].coverage_selector_id == "coverage2"
        assert results[1].date == date(2025, 5, 2)

    def test_delete_shift_demand_exclusions_by_coverage_selector_id(self):
        """Test deleting shift demand exclusions by coverage ID."""
        exclusions = [
            ShiftDemandExclusionSchema(
                schedule_id="schedule1",
                coverage_selector_id="coverage1",
                shift_demand_id="demand1",
                date=datetime(2025, 4, 28, tzinfo=timezone.utc).timestamp(),
            ),
            ShiftDemandExclusionSchema(
                schedule_id="schedule1",
                coverage_selector_id="coverage1",
                shift_demand_id="demand2",
                date=datetime(2025, 4, 29, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(exclusions)

        self.repo.delete_shift_demand_exclusions_by_coverage_selector_id(
            "coverage1"
        )

        remaining_count = self.repo.collection.count_documents(
            {"coverage_selector_id": "coverage1"}
        )
        assert remaining_count == 0

    def test_delete_shift_demand_exclusions_by_shift_demand_id(self):
        """Test deleting shift demand exclusions by shift demand ID."""
        exclusions = [
            ShiftDemandExclusionSchema(
                schedule_id="schedule1",
                coverage_selector_id="coverage1",
                shift_demand_id="demand1",
                date=datetime(2025, 4, 28, tzinfo=timezone.utc).timestamp(),
            ),
            ShiftDemandExclusionSchema(
                schedule_id="schedule1",
                coverage_selector_id="coverage2",
                shift_demand_id="demand1",
                date=datetime(2025, 4, 29, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(exclusions)

        self.repo.delete_shift_demand_exclusions_by_shift_demand_id("demand1")

        remaining_count = self.repo.collection.count_documents(
            {"shift_demand_id": "demand1"}
        )
        assert remaining_count == 0

    def test_get_shift_demand_exclusions_by_schedule_id(self):
        """Test retrieving exclusions by schedule ID."""
        exclusions = [
            ShiftDemandExclusionSchema(
                schedule_id="schedule1",
                coverage_selector_id="coverage1",
                shift_demand_id="demand1",
                date=datetime(2025, 4, 28, tzinfo=timezone.utc).timestamp(),
            ),
            ShiftDemandExclusionSchema(
                schedule_id="schedule1",
                coverage_selector_id="coverage2",
                shift_demand_id="demand2",
                date=datetime(2025, 4, 29, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(exclusions)

        results = self.repo.get_shift_demand_exclusions_by_schedule_id(
            "schedule1"
        )

        assert len(results) == 2
        assert results[0].schedule_id == "schedule1"
        assert results[1].schedule_id == "schedule1"

    def test_delete_shift_demand_exclusions_by_schedule_id(self):
        """Test deleting shift demand exclusions by schedule ID."""
        exclusions = [
            ShiftDemandExclusionSchema(
                schedule_id="schedule1",
                coverage_selector_id="coverage1",
                shift_demand_id="demand1",
                date=datetime(2025, 4, 28, tzinfo=timezone.utc).timestamp(),
            ),
            ShiftDemandExclusionSchema(
                schedule_id="schedule1",
                coverage_selector_id="coverage2",
                shift_demand_id="demand2",
                date=datetime(2025, 4, 29, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(exclusions)

        self.repo.delete_shift_demand_exclusions_by_schedule_id("schedule1")

        remaining_count = self.repo.collection.count_documents(
            {"schedule_id": "schedule1"}
        )
        assert remaining_count == 0

    def test_delete_shift_demand_exclusions_by_shift_demand_ids(self):
        """Test deleting shift demand exclusions by a list of shift demand IDs."""
        exclusions = [
            ShiftDemandExclusionSchema(
                schedule_id="schedule1",
                coverage_selector_id="coverage1",
                shift_demand_id="demand1",
                date=datetime(2025, 4, 28, tzinfo=timezone.utc).timestamp(),
            ),
            ShiftDemandExclusionSchema(
                schedule_id="schedule1",
                coverage_selector_id="coverage2",
                shift_demand_id="demand2",
                date=datetime(2025, 4, 29, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(exclusions)

        self.repo.delete_shift_demand_exclusions_by_shift_demand_ids(
            ["demand1", "demand2"]
        )

        remaining_count = self.repo.collection.count_documents(
            {"shift_demand_id": {"$in": ["demand1", "demand2"]}}
        )
        assert remaining_count == 0
