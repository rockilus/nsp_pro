import pytest

from shared.database.database import MongoDB
from shared.database.repositories.shift_demand import (
    ShiftDemandRepository,
)
from shared.database.schemas.shift_demand import (
    ShiftDemandSchema,
)
from shared.schemas.schemas.coverage import ShiftDemand


class TestShiftDemandRepository:
    repo: ShiftDemandRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = ShiftDemandRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_shift_demand(self):
        """Test creating a shift demand."""
        shift_demand = ShiftDemand(
            id=None,
            day_index=1,
            shift_id="shift1",
            coverage_id="coverage1",
        )

        result = self.repo.create_shift_demand(shift_demand)

        assert result.id is not None
        assert result.day_index == 1
        assert result.shift_id == "shift1"
        assert result.coverage_id == "coverage1"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["day_index"] == 1
        assert saved_doc["shift"] == "shift1"
        assert saved_doc["coverage"] == "coverage1"

    def test_get_shift_demand_by_id(self):
        """Test getting a shift demand by ID."""
        shift_demand = ShiftDemandSchema(
            day_index=1,
            shift="shift1",
            coverage="coverage1",
        )
        created = self.repo.create(shift_demand)

        found = self.repo.get_shift_demand_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.day_index == 1
        assert found.shift_id == "shift1"
        assert found.coverage_id == "coverage1"

    def test_update_shift_demand(self):
        """Test updating a shift demand."""
        shift_demand = ShiftDemandSchema(
            day_index=1,
            shift="shift1",
            coverage="coverage1",
        )
        created = self.repo.create(shift_demand)

        updated_shift_demand = ShiftDemand(
            id=created.id,
            day_index=2,
            shift_id="shift2",
            coverage_id="coverage2",
        )

        result = self.repo.update_shift_demand(updated_shift_demand)

        assert result.day_index == 2
        assert result.shift_id == "shift2"
        assert result.coverage_id == "coverage2"

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["day_index"] == 2
        assert from_db["shift"] == "shift2"
        assert from_db["coverage"] == "coverage2"

    def test_delete_shift_demand(self):
        """Test deleting a shift demand."""
        shift_demand = ShiftDemandSchema(
            day_index=1,
            shift="shift1",
            coverage="coverage1",
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
            ),
            ShiftDemand(
                id=None,
                day_index=2,
                shift_id="shift2",
                coverage_id="coverage2",
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
            day_index=1, shift="shift1", coverage="coverage1"
        )
        shift_demand2 = ShiftDemandSchema(
            day_index=2, shift="shift2", coverage="coverage2"
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
            day_index=1, shift="shift1", coverage="coverage1"
        )
        shift_demand2 = ShiftDemandSchema(
            day_index=2, shift="shift2", coverage="coverage2"
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
            day_index=1, shift="shift1", coverage="coverage1"
        )
        shift_demand2 = ShiftDemandSchema(
            day_index=2, shift="shift2", coverage="coverage1"
        )
        self.repo.create(shift_demand1)
        self.repo.create(shift_demand2)

        self.repo.delete_shift_demands_by_coverage_id("coverage1")

        assert self.repo.collection.count_documents({"coverage": "coverage1"}) == 0

    def test_delete_shift_demands_by_shift_id(self):
        """Test deleting shift demands by shift ID."""
        shift_demand1 = ShiftDemandSchema(
            day_index=1, shift="shift1", coverage="coverage1"
        )
        shift_demand2 = ShiftDemandSchema(
            day_index=2, shift="shift1", coverage="coverage2"
        )
        self.repo.create(shift_demand1)
        self.repo.create(shift_demand2)

        self.repo.delete_shift_demands_by_shift_id("shift1")

        assert self.repo.collection.count_documents({"shift": "shift1"}) == 0
