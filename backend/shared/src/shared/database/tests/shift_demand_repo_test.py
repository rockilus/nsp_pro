from datetime import datetime, timezone

import pytest_asyncio

from shared.database.interface import DatabaseInterface
from shared.database.repositories.shift_demand import (
    ShiftDemandRepository,
)
from shared.database.schemas.shift_demand import (
    ShiftDemandSchema,
)
from shared.schemas.core.shift_demand import ShiftDemand


class TestShiftDemandRepository:
    repo: ShiftDemandRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = ShiftDemandRepository(database_interface=mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("shift_demands")
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_shift_demand(self):
        """Test creating a shift demand."""
        shift_demand = ShiftDemand(
            id=None,
            day_index=1,
            shift_id="shift1",
            coverage_id="coverage1",
            last_modified=datetime.now(timezone.utc),
        )

        result = self.repo.create_shift_demand(shift_demand)

        assert result.id is not None
        assert result.day_index == 1
        assert result.shift_id == "shift1"
        assert result.coverage_id == "coverage1"
        assert result.last_modified is not None

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["day_index"] == 1
        assert saved_doc["shift"] == "shift1"
        assert saved_doc["coverage"] == "coverage1"
        assert saved_doc["last_modified"] is not None

    def test_get_shift_demand_by_id(self):
        """Test getting a shift demand by ID."""
        shift_demand = ShiftDemandSchema(
            day_index=1,
            shift="shift1",
            coverage="coverage1",
            last_modified=datetime.now(timezone.utc).timestamp(),
        )
        created = self.repo.create(shift_demand)

        found = self.repo.get_shift_demand_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.day_index == 1
        assert found.shift_id == "shift1"
        assert found.coverage_id == "coverage1"
        assert found.last_modified is not None

    def test_update_shift_demand(self):
        """Test updating a shift demand."""
        shift_demand = ShiftDemandSchema(
            day_index=1,
            shift="shift1",
            coverage="coverage1",
            last_modified=datetime.now(timezone.utc).timestamp(),
        )
        created = self.repo.create(shift_demand)

        updated_shift_demand = ShiftDemand(
            id=created.id,
            day_index=2,
            shift_id="shift2",
            coverage_id="coverage2",
            last_modified=datetime.now(timezone.utc),
        )

        result = self.repo.update_shift_demand(updated_shift_demand)

        assert result.day_index == 2
        assert result.shift_id == "shift2"
        assert result.coverage_id == "coverage2"
        assert result.last_modified is not None

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["day_index"] == 2
        assert from_db["shift"] == "shift2"
        assert from_db["coverage"] == "coverage2"
        assert from_db["last_modified"] is not None

    def test_delete_shift_demand(self):
        """Test deleting a shift demand."""
        shift_demand = ShiftDemandSchema(
            day_index=1,
            shift="shift1",
            coverage="coverage1",
            last_modified=datetime.now(timezone.utc).timestamp(),
        )
        created = self.repo.create(shift_demand)

        self.repo.delete_shift_demand(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_create_shift_demands(self):
        """Test creating multiple shift demands."""
        shift_demands = [
            ShiftDemand(
                id=None,
                day_index=1,
                shift_id="shift1",
                coverage_id="coverage1",
                last_modified=datetime.now(timezone.utc),
            ),
            ShiftDemand(
                id=None,
                day_index=2,
                shift_id="shift2",
                coverage_id="coverage2",
                last_modified=datetime.now(timezone.utc),
            ),
        ]

        results = self.repo.create_shift_demands(shift_demands)

        assert len(results) == 2
        assert results[0].id is not None
        assert results[1].id is not None

        saved_docs = list(
            self.repo.collection.find(
                {
                    "_id": {
                        "$in": [
                            results[0].id,
                            results[1].id,
                        ]
                    }
                }
            )
        )
        assert len(saved_docs) == 2

    def test_get_shift_demands_by_coverage_ids(self):
        """Test getting shift demands by coverage IDs."""
        shift_demand1 = ShiftDemandSchema(
            day_index=1,
            shift="shift1",
            coverage="coverage1",
            last_modified=datetime.now(timezone.utc).timestamp(),
        )
        shift_demand2 = ShiftDemandSchema(
            day_index=2,
            shift="shift2",
            coverage="coverage2",
            last_modified=datetime.now(timezone.utc).timestamp(),
        )
        self.repo.create(shift_demand1)
        self.repo.create(shift_demand2)

        results = self.repo.get_shift_demands_by_coverage_ids(
            ["coverage1", "coverage2"]
        )

        assert len(results) == 2
        assert results[0].coverage_id in ["coverage1", "coverage2"]
        assert results[1].coverage_id in ["coverage1", "coverage2"]

    def test_get_cov_id_to_shift_demands_by_coverage_ids(self):
        """Test getting a mapping of coverage IDs to shift demands."""
        shift_demand1 = ShiftDemandSchema(
            day_index=1,
            shift="shift1",
            coverage="coverage1",
            last_modified=datetime.now(timezone.utc).timestamp(),
        )
        shift_demand2 = ShiftDemandSchema(
            day_index=2,
            shift="shift2",
            coverage="coverage2",
            last_modified=datetime.now(timezone.utc).timestamp(),
        )
        self.repo.create(shift_demand1)
        self.repo.create(shift_demand2)

        result = self.repo.get_cov_id_to_shift_demands_by_coverage_ids(
            ["coverage1", "coverage2"]
        )

        assert "coverage1" in result
        assert "coverage2" in result
        assert len(result["coverage1"]) == 1
        assert len(result["coverage2"]) == 1

    def test_delete_shift_demands_by_coverage_id(self):
        """Test deleting shift demands by coverage ID."""
        shift_demand1 = ShiftDemandSchema(
            day_index=1,
            shift="shift1",
            coverage="coverage1",
            last_modified=datetime.now(timezone.utc).timestamp(),
        )
        shift_demand2 = ShiftDemandSchema(
            day_index=2,
            shift="shift2",
            coverage="coverage1",
            last_modified=datetime.now(timezone.utc).timestamp(),
        )
        self.repo.create(shift_demand1)
        self.repo.create(shift_demand2)

        self.repo.delete_shift_demands_by_coverage_id("coverage1")

        assert self.repo.collection.count_documents({"coverage": "coverage1"}) == 0

    def test_delete_shift_demands_by_shift_id(self):
        """Test deleting shift demands by shift ID."""
        shift_demand1 = ShiftDemandSchema(
            day_index=1,
            shift="shift1",
            coverage="coverage1",
            last_modified=datetime.now(timezone.utc).timestamp(),
        )
        shift_demand2 = ShiftDemandSchema(
            day_index=2,
            shift="shift1",
            coverage="coverage2",
            last_modified=datetime.now(timezone.utc).timestamp(),
        )
        self.repo.create(shift_demand1)
        self.repo.create(shift_demand2)

        self.repo.delete_shift_demands_by_shift_id("shift1")

        assert self.repo.collection.count_documents({"shift": "shift1"}) == 0
