from datetime import date, datetime, timezone

import pytest

from shared.database.database import MongoDB
from shared.database.repositories.recurrence_exclusion import (
    RecurrenceExclusionRepository,
)
from shared.database.schemas.recurrence_exclusion import (
    RecurrenceExclusionSchema,
)
from shared.schemas.core.recurrence import RecurrenceExclusion


class TestRecurrenceExclusionRepository:
    repo: RecurrenceExclusionRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = RecurrenceExclusionRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_recurrence_exclusion(self):
        """Test creating a recurrence exclusion."""
        exclusion = RecurrenceExclusion(
            id=None,
            recurrence_rule_id="rule1",
            excluded_date=date(2025, 4, 15),
        )

        result = self.repo.create_recurrence_exclusion(exclusion)

        assert result.id is not None
        assert result.recurrence_rule_id == "rule1"
        assert result.excluded_date == date(2025, 4, 15)

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["recurrence_rule_id"] == "rule1"
        assert (
            saved_doc["excluded_date"]
            == datetime(2025, 4, 15, tzinfo=timezone.utc).timestamp()
        )

    def test_get_recurrence_exclusion_by_id(self):
        """Test getting a recurrence exclusion by ID."""
        exclusion = RecurrenceExclusionSchema(
            recurrence_rule_id="rule1",
            excluded_date=datetime(2025, 4, 15, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(exclusion)

        found = self.repo.get_recurrence_exclusion_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.recurrence_rule_id == "rule1"
        assert (
            found.excluded_date
            == datetime.fromtimestamp(created.excluded_date, tz=timezone.utc).date()
        )

    def test_get_recurrence_exclusions_by_rule_id(self):
        """Test getting recurrence exclusions by rule ID."""
        exclusions = [
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule1",
                excluded_date=datetime(2025, 4, 15, tzinfo=timezone.utc).timestamp(),
            ),
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule1",
                excluded_date=datetime(2025, 4, 16, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(exclusions)

        results = self.repo.get_recurrence_exclusions_by_rule_id("rule1")

        assert len(results) == 2
        assert results[0].recurrence_rule_id == "rule1"
        assert results[1].recurrence_rule_id == "rule1"
        assert (
            results[0].excluded_date
            == datetime.fromtimestamp(
                exclusions[0].excluded_date, tz=timezone.utc
            ).date()
        )
        assert (
            results[1].excluded_date
            == datetime.fromtimestamp(
                exclusions[1].excluded_date, tz=timezone.utc
            ).date()
        )

    def test_get_recurrence_exclusions_by_rule_id_from_date(self):
        """Test getting recurrence exclusions by rule ID from a specific date onward."""
        exclusions = [
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule1",
                excluded_date=datetime(2025, 4, 15, tzinfo=timezone.utc).timestamp(),
            ),
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule1",
                excluded_date=datetime(2025, 4, 16, tzinfo=timezone.utc).timestamp(),
            ),
        ]

        self.repo.create_many(exclusions)

        from_date = date(2025, 4, 16)
        results = self.repo.get_recurrence_exclusions_by_rule_id_from_date(
            "rule1", from_date
        )

        assert len(results) == 1
        assert results[0].excluded_date == from_date

    def test_get_recurrence_exclusions_by_rule_ids(self):
        """Test getting recurrence exclusions by multiple rule IDs."""
        exclusions = [
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule1",
                excluded_date=datetime(2025, 4, 15, tzinfo=timezone.utc).timestamp(),
            ),
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule2",
                excluded_date=datetime(2025, 4, 16, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(exclusions)

        results = self.repo.get_recurrence_exclusions_by_rule_ids(["rule1", "rule2"])

        assert len(results) == 2
        assert results[0].recurrence_rule_id in ["rule1", "rule2"]
        assert results[1].recurrence_rule_id in ["rule1", "rule2"]
        assert (
            results[0].excluded_date
            == datetime.fromtimestamp(
                exclusions[0].excluded_date, tz=timezone.utc
            ).date()
        )
        assert (
            results[1].excluded_date
            == datetime.fromtimestamp(
                exclusions[1].excluded_date, tz=timezone.utc
            ).date()
        )

    def test_get_recurrence_exclusions_by_rule_ids_from_date(self):
        exclusions = [
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule1",
                excluded_date=datetime(2025, 4, 15, tzinfo=timezone.utc).timestamp(),
            ),
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule2",
                excluded_date=datetime(2025, 4, 16, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(exclusions)

        from_date = date(2025, 4, 16)
        results = self.repo.get_recurrence_exclusions_by_rule_ids_from_date(
            ["rule1", "rule2"], from_date
        )

        assert len(results) == 1
        assert results[0].recurrence_rule_id == "rule2"
        assert results[0].excluded_date == from_date

    def test_update_recurrence_exclusion(self):
        """Test updating a recurrence exclusion."""
        exclusion = RecurrenceExclusionSchema(
            recurrence_rule_id="rule1",
            excluded_date=datetime(2025, 4, 15, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(exclusion)

        updated_exclusion = RecurrenceExclusion(
            id=created.id,
            recurrence_rule_id="rule1",
            excluded_date=datetime(2025, 4, 17, tzinfo=timezone.utc),
        )

        result = self.repo.update_recurrence_exclusion(updated_exclusion)

        assert result.excluded_date == date(2025, 4, 17)

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert (
            from_db["excluded_date"]
            == datetime(2025, 4, 17, tzinfo=timezone.utc).timestamp()
        )

    def test_update_recurrence_exclusions(self):
        """Test updating multiple recurrence exclusions."""
        exclusions = [
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule1",
                excluded_date=datetime(2025, 4, 15, tzinfo=timezone.utc).timestamp(),
            ),
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule2",
                excluded_date=datetime(2025, 4, 16, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        created_exclusions = self.repo.create_many(exclusions)

        updated_exclusions = [
            RecurrenceExclusion(
                id=created_exclusions[0].id,
                recurrence_rule_id="rule1",
                excluded_date=date(2025, 4, 17),
            ),
            RecurrenceExclusion(
                id=created_exclusions[1].id,
                recurrence_rule_id="rule2",
                excluded_date=date(2025, 4, 18),
            ),
        ]

        results = self.repo.update_recurrence_exclusions(updated_exclusions)

        assert len(results) == 2
        assert results[0].excluded_date == date(2025, 4, 17)
        assert results[1].excluded_date == date(2025, 4, 18)

        from_db = self.repo.collection.find_one({"_id": created_exclusions[0].id})
        assert (
            from_db["excluded_date"]
            == datetime(2025, 4, 17, tzinfo=timezone.utc).timestamp()
        )

        from_db = self.repo.collection.find_one({"_id": created_exclusions[1].id})
        assert (
            from_db["excluded_date"]
            == datetime(2025, 4, 18, tzinfo=timezone.utc).timestamp()
        )

    def test_delete_recurrence_exclusion_by_id(self):
        """Test deleting a recurrence exclusion by ID."""
        exclusion = RecurrenceExclusionSchema(
            recurrence_rule_id="rule1",
            excluded_date=datetime(2025, 4, 15, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(exclusion)

        self.repo.delete_recurrence_exclusion_by_id(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_delete_recurrence_exclusions_by_rule_id(self):
        """Test deleting recurrence exclusions by rule ID."""
        exclusions = [
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule1",
                excluded_date=datetime(2025, 4, 15, tzinfo=timezone.utc).timestamp(),
            ),
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule1",
                excluded_date=datetime(2025, 4, 16, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(exclusions)

        self.repo.delete_recurrence_exclusions_by_rule_id("rule1")

        assert (
            self.repo.collection.count_documents({"recurrence_rule_id": "rule1"}) == 0
        )

    def test_delete_recurrence_exclusions_by_rule_id_from_date(self):
        exclusions = [
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule1",
                excluded_date=datetime(2025, 4, 15, tzinfo=timezone.utc).timestamp(),
            ),
            RecurrenceExclusionSchema(
                recurrence_rule_id="rule1",
                excluded_date=datetime(2025, 4, 16, tzinfo=timezone.utc).timestamp(),
            ),
        ]
        self.repo.create_many(exclusions)

        from_date = date(2025, 4, 16)
        self.repo.delete_recurrence_exclusions_by_rule_id_from_date("rule1", from_date)

        remaining = self.repo.collection.find_one({"recurrence_rule_id": "rule1"})
        assert remaining is not None
        assert (
            remaining["excluded_date"]
            == datetime(2025, 4, 15, tzinfo=timezone.utc).timestamp()
        )
