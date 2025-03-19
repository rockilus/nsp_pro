from datetime import datetime, timezone

import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.coverage_selector import (
    CoverageSelectorRepository,
)
from shared.database_pymongo.schemas.coverage_selector import (
    CoverageSelectorSchema,
)
from shared.schemas.schemas.coverage import CoverageSelector


class TestCoverageSelectorRepository:
    repo: CoverageSelectorRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = CoverageSelectorRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_coverage_selector(self):
        """Test creating a coverage selector."""
        coverage_selector = CoverageSelector(
            id=None,
            schedule_id=str(ObjectId()),
            coverage_id=str(ObjectId()),
            full_period=True,
            start_date=datetime(2023, 1, 1).date(),
            end_date=datetime(2023, 12, 31).date(),
        )

        result = self.repo.create_coverage_selector(coverage_selector)

        assert result.id is not None
        assert result.schedule_id == coverage_selector.schedule_id
        assert result.coverage_id == coverage_selector.coverage_id

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["schedule"] == ObjectId(coverage_selector.schedule_id)
        assert saved_doc["coverage"] == ObjectId(coverage_selector.coverage_id)

    def test_get_coverage_selector_by_id(self):
        """Test getting a coverage selector by ID."""
        coverage_selector = CoverageSelectorSchema(
            schedule=ObjectId(),
            coverage=ObjectId(),
            full_period=True,
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
        )
        created = self.repo.create(coverage_selector)

        found = self.repo.get_coverage_selector_by_id(str(created.id))

        assert found is not None
        assert found.id == str(created.id)
        assert found.schedule_id == str(coverage_selector.schedule)
        assert found.coverage_id == str(coverage_selector.coverage)

    def test_update_coverage_selector(self):
        """Test updating a coverage selector."""
        coverage_selector = CoverageSelectorSchema(
            schedule=ObjectId(),
            coverage=ObjectId(),
            full_period=True,
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
        )
        created = self.repo.create(coverage_selector)

        updated_coverage_selector = CoverageSelector(
            id=str(created.id),
            schedule_id=str(ObjectId()),
            coverage_id=str(ObjectId()),
            full_period=False,
            start_date=datetime(2023, 2, 1).date(),
            end_date=datetime(2023, 11, 30).date(),
        )

        result = self.repo.update_coverage_selector(updated_coverage_selector)

        assert result.coverage_id == updated_coverage_selector.coverage_id
        assert result.full_period is False
        assert result.schedule_id == updated_coverage_selector.schedule_id

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
        assert from_db["coverage"] == ObjectId(updated_coverage_selector.coverage_id)
        assert from_db["full_period"] is False
        assert from_db["schedule"] == ObjectId(updated_coverage_selector.schedule_id)

    def test_delete_coverage_selector(self):
        """Test deleting a coverage selector."""
        coverage_selector = CoverageSelectorSchema(
            schedule=ObjectId(),
            coverage=ObjectId(),
            full_period=True,
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
        )
        created = self.repo.create(coverage_selector)

        self.repo.delete_coverage_selector(created.id)

        assert self.repo.collection.find_one({"_id": ObjectId(created.id)}) is None

    def test_get_coverage_selectors(self):
        """Test getting all coverage selectors for a schedule."""
        schedule_oid = ObjectId()
        coverage_selectors = [
            CoverageSelectorSchema(
                schedule=schedule_oid,
                coverage=ObjectId(),
                full_period=True,
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
            ),
            CoverageSelectorSchema(
                schedule=schedule_oid,
                coverage=ObjectId(),
                full_period=False,
                start_date=datetime(2023, 2, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 11, 30, tzinfo=timezone.utc),
            ),
        ]
        self.repo.create_many(coverage_selectors)

        results = self.repo.get_coverage_selectors(str(schedule_oid))

        assert len(results) == 2
        assert results[0].schedule_id == str(schedule_oid)
        assert results[1].schedule_id == str(schedule_oid)

    def test_get_coverage_selectors_by_schedule_id_full_period(self):
        """Test getting all coverage selectors for a schedule with full period."""
        schedule_oid = ObjectId()
        coverage_selectors = [
            CoverageSelectorSchema(
                schedule=schedule_oid,
                coverage=ObjectId(),
                full_period=True,
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
            ),
            CoverageSelectorSchema(
                schedule=ObjectId(),
                coverage=ObjectId(),
                full_period=False,
                start_date=datetime(2023, 2, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 11, 30, tzinfo=timezone.utc),
            ),
        ]
        self.repo.create_many(coverage_selectors)

        results = self.repo.get_coverage_selectors_by_schedule_id_full_period(
            str(schedule_oid)
        )

        assert len(results) == 1
        assert results[0].full_period is True

    def test_update_coverage_selectors(self):
        """Test updating multiple coverage selectors."""
        coverage_selectors = [
            CoverageSelectorSchema(
                schedule=ObjectId(),
                coverage=ObjectId(),
                full_period=True,
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
            ),
            CoverageSelectorSchema(
                schedule=ObjectId(),
                coverage=ObjectId(),
                full_period=False,
                start_date=datetime(2023, 2, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 11, 30, tzinfo=timezone.utc),
            ),
        ]
        created_selectors = self.repo.create_many(coverage_selectors)

        updated_selectors = [
            CoverageSelector(
                id=created_selectors[0].id,
                schedule_id=str(ObjectId()),
                coverage_id=str(ObjectId()),
                full_period=False,
                start_date=datetime(2023, 3, 1).date(),
                end_date=datetime(2023, 10, 31).date(),
            ),
            CoverageSelector(
                id=created_selectors[1].id,
                schedule_id=str(ObjectId()),
                coverage_id=str(ObjectId()),
                full_period=True,
                start_date=datetime(2023, 4, 1).date(),
                end_date=datetime(2023, 9, 30).date(),
            ),
        ]

        results = self.repo.update_coverage_selectors(updated_selectors)

        assert len(results) == 2
        assert results[0].coverage_id == updated_selectors[0].coverage_id
        assert results[1].coverage_id == updated_selectors[1].coverage_id

        from_db_1 = self.repo.collection.find_one({"_id": ObjectId(results[0].id)})
        from_db_2 = self.repo.collection.find_one({"_id": ObjectId(results[1].id)})
        assert from_db_1["coverage"] == ObjectId(updated_selectors[0].coverage_id)
        assert from_db_2["coverage"] == ObjectId(updated_selectors[1].coverage_id)

    def test_delete_coverage_selectors_by_coverage_id(self):
        """Test deleting all coverage selectors associated with a coverage ID."""
        coverage_oid = ObjectId()
        coverage_selectors = [
            CoverageSelectorSchema(
                schedule=ObjectId(),
                coverage=coverage_oid,
                full_period=True,
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
            ),
            CoverageSelectorSchema(
                schedule=ObjectId(),
                coverage=coverage_oid,
                full_period=False,
                start_date=datetime(2023, 2, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 11, 30, tzinfo=timezone.utc),
            ),
        ]
        self.repo.create_many(coverage_selectors)

        self.repo.delete_coverage_selectors_by_coverage_id(str(coverage_oid))

        assert self.repo.collection.find_one({"coverage": coverage_oid}) is None
