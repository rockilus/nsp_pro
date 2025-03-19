import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.shift_demand import (
    ShiftDemandRepository,
)
from shared.database_pymongo.schemas.shift_demand import ShiftDemandSchema
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
            shift_id=str(ObjectId()),
            coverage_id=str(ObjectId()),
        )

        result = self.repo.create_shift_demand(shift_demand)

        assert result.id is not None
        assert result.day_index == 1
        assert result.shift_id == shift_demand.shift_id
        assert result.coverage_id == shift_demand.coverage_id

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["day_index"] == 1
        assert saved_doc["shift"] == ObjectId(shift_demand.shift_id)
        assert saved_doc["coverage"] == ObjectId(shift_demand.coverage_id)

    def test_get_shift_demand_by_id(self):
        """Test getting a shift demand by ID."""
        shift_demand = ShiftDemandSchema(
            day_index=1,
            shift=ObjectId(),
            coverage=ObjectId(),
        )
        created = self.repo.create(shift_demand)

        found = self.repo.get_shift_demand_by_id(created.id)

        assert found is not None
        assert found.id == str(created.id)
        assert found.day_index == 1
        assert found.shift_id == str(shift_demand.shift)
        assert found.coverage_id == str(shift_demand.coverage)

    def test_update_shift_demand(self):
        """Test updating a shift demand."""
        shift_demand = ShiftDemandSchema(
            day_index=1,
            shift=ObjectId(),
            coverage=ObjectId(),
        )
        created = self.repo.create(shift_demand)

        updated_shift_demand = ShiftDemand(
            id=created.id,
            day_index=2,
            shift_id=str(ObjectId()),
            coverage_id=str(ObjectId()),
        )

        result = self.repo.update_shift_demand(updated_shift_demand)

        assert result.day_index == 2
        assert result.shift_id == updated_shift_demand.shift_id
        assert result.coverage_id == updated_shift_demand.coverage_id

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["day_index"] == 2
        assert from_db["shift"] == ObjectId(updated_shift_demand.shift_id)
        assert from_db["coverage"] == ObjectId(updated_shift_demand.coverage_id)

    def test_delete_shift_demand(self):
        """Test deleting a shift demand."""
        shift_demand = ShiftDemandSchema(
            day_index=1,
            shift=ObjectId(),
            coverage=ObjectId(),
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
                shift_id=str(ObjectId()),
                coverage_id=str(ObjectId()),
            ),
            ShiftDemand(
                id=None,
                day_index=2,
                shift_id=str(ObjectId()),
                coverage_id=str(ObjectId()),
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
                            ObjectId(results[0].id),
                            ObjectId(results[1].id),
                        ]
                    }
                }
            )
        )
        assert len(saved_docs) == 2

    def test_get_shift_demands_by_coverage_ids(self):
        """Test getting shift demands by coverage IDs."""
        coverage_1_oid = ObjectId()
        coverage_2_oid = ObjectId()
        coverage_ids = [str(coverage_1_oid), str(coverage_2_oid)]
        shift_demand1 = ShiftDemandSchema(
            day_index=1, shift=ObjectId(), coverage=coverage_1_oid
        )
        shift_demand2 = ShiftDemandSchema(
            day_index=2, shift=ObjectId(), coverage=coverage_2_oid
        )
        self.repo.create(shift_demand1)
        self.repo.create(shift_demand2)

        results = self.repo.get_shift_demands_by_coverage_ids(coverage_ids)

        assert len(results) == 2
        assert results[0].coverage_id in coverage_ids
        assert results[1].coverage_id in coverage_ids

    def test_get_cov_id_to_shift_demands_by_coverage_ids(self):
        """Test getting a mapping of coverage IDs to shift demands."""
        coverage_1_oid = ObjectId()
        coverage_2_oid = ObjectId()
        coverage_ids = [str(coverage_1_oid), str(coverage_2_oid)]
        shift_demand1 = ShiftDemandSchema(
            day_index=1, shift=ObjectId(), coverage=coverage_1_oid
        )
        shift_demand2 = ShiftDemandSchema(
            day_index=2, shift=ObjectId(), coverage=coverage_2_oid
        )
        self.repo.create(shift_demand1)
        self.repo.create(shift_demand2)

        result = self.repo.get_cov_id_to_shift_demands_by_coverage_ids(coverage_ids)

        assert str(coverage_1_oid) in result
        assert str(coverage_2_oid) in result
        assert len(result[str(coverage_1_oid)]) == 1
        assert len(result[str(coverage_2_oid)]) == 1

    def test_delete_shift_demands_by_coverage_id(self):
        """Test deleting shift demands by coverage ID."""
        coverage_oid = ObjectId()
        shift_demand1 = ShiftDemandSchema(
            day_index=1, shift=ObjectId(), coverage=coverage_oid
        )
        shift_demand2 = ShiftDemandSchema(
            day_index=2, shift=ObjectId(), coverage=coverage_oid
        )
        self.repo.create(shift_demand1)
        self.repo.create(shift_demand2)

        self.repo.delete_shift_demands_by_coverage_id(str(coverage_oid))

        assert self.repo.collection.count_documents({"coverage": coverage_oid}) == 0

    def test_delete_shift_demands_by_shift_id(self):
        """Test deleting shift demands by shift ID."""
        shift_oid = ObjectId()
        shift_demand1 = ShiftDemandSchema(
            day_index=1, shift=shift_oid, coverage=ObjectId()
        )
        shift_demand2 = ShiftDemandSchema(
            day_index=2, shift=shift_oid, coverage=ObjectId()
        )
        self.repo.create(shift_demand1)
        self.repo.create(shift_demand2)

        self.repo.delete_shift_demands_by_shift_id(str(shift_oid))

        assert self.repo.collection.count_documents({"shift": shift_oid}) == 0
