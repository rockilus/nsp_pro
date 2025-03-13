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
            schedule_id="schedule1",
            coverage_id="coverage1",
            full_period=True,
            start_date=datetime(2023, 1, 1).date(),
            end_date=datetime(2023, 12, 31).date(),
        )

        result = self.repo.create_coverage_selector(coverage_selector)

        assert result.id is not None
        assert result.schedule_id == "schedule1"
        assert result.coverage_id == "coverage1"

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["schedule"] == "schedule1"
        assert saved_doc["coverage"] == "coverage1"

    def test_get_coverage_selector_by_id(self):
        """Test getting a coverage selector by ID."""
        coverage_selector = CoverageSelectorSchema(
            schedule="schedule1",
            coverage="coverage1",
            full_period=True,
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
        )
        created = self.repo.create(coverage_selector)

        found = self.repo.get_coverage_selector_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.schedule_id == "schedule1"

    def test_update_coverage_selector(self):
        """Test updating a coverage selector."""
        coverage_selector = CoverageSelectorSchema(
            schedule="schedule1",
            coverage="coverage1",
            full_period=True,
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
        )
        created = self.repo.create(coverage_selector)

        updated_coverage_selector = CoverageSelector(
            id=created.id,
            schedule_id="schedule1",
            coverage_id="coverage2",
            full_period=False,
            start_date=datetime(2023, 2, 1).date(),
            end_date=datetime(2023, 11, 30).date(),
        )

        result = self.repo.update_coverage_selector(updated_coverage_selector)

        assert result.coverage_id == "coverage2"
        assert result.full_period is False

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
        assert from_db["coverage"] == "coverage2"
        assert from_db["full_period"] is False

    def test_delete_coverage_selector(self):
        """Test deleting a coverage selector."""
        coverage_selector = CoverageSelectorSchema(
            schedule="schedule1",
            coverage="coverage1",
            full_period=True,
            start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
            end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
        )
        created = self.repo.create(coverage_selector)

        self.repo.delete_coverage_selector(created.id)

        assert self.repo.collection.find_one({"_id": ObjectId(created.id)}) is None

    def test_get_coverage_selectors(self):
        """Test getting all coverage selectors for a schedule."""
        coverage_selectors = [
            CoverageSelectorSchema(
                schedule="schedule1",
                coverage="coverage1",
                full_period=True,
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
            ),
            CoverageSelectorSchema(
                schedule="schedule1",
                coverage="coverage2",
                full_period=False,
                start_date=datetime(2023, 2, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 11, 30, tzinfo=timezone.utc),
            ),
        ]
        self.repo.create_many(coverage_selectors)

        results = self.repo.get_coverage_selectors("schedule1")

        assert len(results) == 2
        assert results[0].schedule_id == "schedule1"
        assert results[1].schedule_id == "schedule1"

    def test_get_coverage_selectors_by_schedule_id_full_period(self):
        """Test getting all coverage selectors for a schedule with full period."""
        coverage_selectors = [
            CoverageSelectorSchema(
                schedule="schedule1",
                coverage="coverage1",
                full_period=True,
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
            ),
            CoverageSelectorSchema(
                schedule="schedule1",
                coverage="coverage2",
                full_period=False,
                start_date=datetime(2023, 2, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 11, 30, tzinfo=timezone.utc),
            ),
        ]
        self.repo.create_many(coverage_selectors)

        results = self.repo.get_coverage_selectors_by_schedule_id_full_period(
            "schedule1"
        )

        assert len(results) == 1
        assert results[0].full_period is True

    def test_update_coverage_selectors(self):
        """Test updating multiple coverage selectors."""
        coverage_selectors = [
            CoverageSelectorSchema(
                schedule="schedule1",
                coverage="coverage1",
                full_period=True,
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
            ),
            CoverageSelectorSchema(
                schedule="schedule1",
                coverage="coverage2",
                full_period=False,
                start_date=datetime(2023, 2, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 11, 30, tzinfo=timezone.utc),
            ),
        ]
        created_selectors = self.repo.create_many(coverage_selectors)

        updated_selectors = [
            CoverageSelector(
                id=created_selectors[0].id,
                schedule_id="schedule1",
                coverage_id="updated_coverage1",
                full_period=False,
                start_date=datetime(2023, 3, 1).date(),
                end_date=datetime(2023, 10, 31).date(),
            ),
            CoverageSelector(
                id=created_selectors[1].id,
                schedule_id="schedule1",
                coverage_id="updated_coverage2",
                full_period=True,
                start_date=datetime(2023, 4, 1).date(),
                end_date=datetime(2023, 9, 30).date(),
            ),
        ]

        results = self.repo.update_coverage_selectors(updated_selectors)

        assert len(results) == 2
        assert results[0].coverage_id == "updated_coverage1"
        assert results[1].coverage_id == "updated_coverage2"

        from_db_1 = self.repo.collection.find_one({"_id": ObjectId(results[0].id)})
        from_db_2 = self.repo.collection.find_one({"_id": ObjectId(results[1].id)})
        assert from_db_1["coverage"] == "updated_coverage1"
        assert from_db_2["coverage"] == "updated_coverage2"

    def test_delete_coverage_selectors_by_coverage_id(self):
        """Test deleting all coverage selectors associated with a coverage ID."""
        coverage_selectors = [
            CoverageSelectorSchema(
                schedule="schedule1",
                coverage="coverage1",
                full_period=True,
                start_date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 12, 31, tzinfo=timezone.utc),
            ),
            CoverageSelectorSchema(
                schedule="schedule2",
                coverage="coverage1",
                full_period=False,
                start_date=datetime(2023, 2, 1, tzinfo=timezone.utc),
                end_date=datetime(2023, 11, 30, tzinfo=timezone.utc),
            ),
        ]
        self.repo.create_many(coverage_selectors)

        self.repo.delete_coverage_selectors_by_coverage_id("coverage1")

        assert self.repo.collection.find_one({"coverage": "coverage1"}) is None
