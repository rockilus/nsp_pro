from datetime import datetime, timezone

import pytest

from shared.database.database import MongoDB
from shared.database.repositories.breach import BreachRepository
from shared.database.schemas.breach import (
    BreachSchema,
    VariableSchema,
)
from shared.schemas.core.breach import Breach, ObjectiveCategory, Variable
import pytest_asyncio

from shared.database.interface import DatabaseInterface


class TestBreachRepository:
    repo: BreachRepository

    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, mongodb_container: DatabaseInterface):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = mongodb_container.get_database()

        # Create repository
        self.repo = BreachRepository(database_interface=mongodb_container)

        # Yield to test
        yield

        # Cleanup
        try:
            collection = db.get_collection("breaches")
            collection.delete_many({})
        except Exception:  # pylint: disable=broad-except
            # If collection doesn't exist, that's fine
            pass

    def test_create_breach(self):
        """Test creating a breach."""
        breach = Breach(
            id=None,
            schedule_id="schedule1",
            objective_id="objective1",
            objective_category=ObjectiveCategory.CONSTRAINT,
            variables=[
                Variable(
                    worker_id="worker1",
                    date=datetime(2023, 1, 1).date(),
                    shift_id="shift1",
                )
            ],
            description="Test breach",
            hard_to_soft=True,
        )

        result = self.repo.create_breach(breach)

        assert result.id is not None
        assert result.schedule_id == "schedule1"
        assert result.objective_id == "objective1"

        saved_doc = self.repo.collection.find_one({"_id": result.id})
        assert saved_doc is not None
        assert saved_doc["schedule"] == "schedule1"
        assert saved_doc["objective_id"] == "objective1"

    def test_get_breach_by_id(self):
        """Test getting a breach by ID."""
        breach = BreachSchema(
            schedule="schedule1",
            objective_id="objective1",
            objective_category=ObjectiveCategory.CONSTRAINT.value,
            variables=[
                VariableSchema(
                    worker="worker1",
                    date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                    shift="shift1",
                )
            ],
            description="Test breach",
            hard_to_soft=True,
        )
        created = self.repo.create(breach)

        found = self.repo.get_breach_by_id(created.id)

        assert found is not None
        assert found.id == created.id
        assert found.schedule_id == "schedule1"

    def test_update_breach(self):
        """Test updating a breach."""
        breach = BreachSchema(
            schedule="schedule1",
            objective_id="objective1",
            objective_category=ObjectiveCategory.CONSTRAINT.value,
            variables=[
                VariableSchema(
                    worker="worker1",
                    date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                    shift="shift1",
                )
            ],
            description="Test breach",
            hard_to_soft=True,
        )
        created = self.repo.create(breach)

        updated_breach = Breach(
            id=created.id,
            schedule_id="schedule1",
            objective_id="objective1",
            objective_category=ObjectiveCategory.REQUEST,
            variables=[
                Variable(
                    worker_id="worker1",
                    date=datetime(2023, 1, 1).date(),
                    shift_id="shift1",
                )
            ],
            description="Updated breach",
            hard_to_soft=False,
        )

        result = self.repo.update_breach(updated_breach)

        assert result.description == "Updated breach"
        assert result.hard_to_soft is False

        from_db = self.repo.collection.find_one({"_id": created.id})
        assert from_db["description"] == "Updated breach"
        assert from_db["hard_to_soft"] is False

    def test_delete_breach(self):
        """Test deleting a breach."""
        breach = BreachSchema(
            schedule="schedule1",
            objective_id="objective1",
            objective_category=ObjectiveCategory.CONSTRAINT.value,
            variables=[
                VariableSchema(
                    worker="worker1",
                    date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                    shift="shift1",
                )
            ],
            description="Test breach",
            hard_to_soft=True,
        )
        created = self.repo.create(breach)

        self.repo.delete_breach(created.id)

        assert self.repo.collection.find_one({"_id": created.id}) is None

    def test_get_breaches_by_schedule_id(self):
        """Test getting breaches by schedule ID."""
        breaches = [
            BreachSchema(
                schedule="schedule1",
                objective_id="objective1",
                objective_category=ObjectiveCategory.CONSTRAINT.value,
                variables=[
                    VariableSchema(
                        worker="worker1",
                        date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                        shift="shift1",
                    )
                ],
                description="Test breach 1",
                hard_to_soft=True,
            ),
            BreachSchema(
                schedule="schedule1",
                objective_id="objective2",
                objective_category=ObjectiveCategory.REQUEST.value,
                variables=[
                    VariableSchema(
                        worker="worker2",
                        date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                        shift="shift2",
                    )
                ],
                description="Test breach 2",
                hard_to_soft=False,
            ),
        ]
        self.repo.create_many(breaches)

        found_breaches = self.repo.get_breaches_by_schedule_id("schedule1")

        assert len(found_breaches) == 2
        assert found_breaches[0].schedule_id == "schedule1"
        assert found_breaches[1].schedule_id == "schedule1"

    def test_create_breaches(self):
        """Test creating multiple breaches."""
        breaches = [
            Breach(
                id=None,
                schedule_id="schedule1",
                objective_id="objective1",
                objective_category=ObjectiveCategory.CONSTRAINT,
                variables=[
                    Variable(
                        worker_id="worker1",
                        date=datetime(2023, 1, 1).date(),
                        shift_id="shift1",
                    )
                ],
                description="Test breach 1",
                hard_to_soft=True,
            ),
            Breach(
                id=None,
                schedule_id="schedule2",
                objective_id="objective2",
                objective_category=ObjectiveCategory.REQUEST,
                variables=[
                    Variable(
                        worker_id="worker2",
                        date=datetime(2023, 1, 2).date(),
                        shift_id="shift2",
                    )
                ],
                description="Test breach 2",
                hard_to_soft=False,
            ),
        ]

        results = self.repo.create_breaches(breaches)

        assert len(results) == 2
        assert results[0].id is not None
        assert results[1].id is not None

    def test_get_breaches(self):
        """Test getting breaches by schedule IDs."""
        breaches = [
            BreachSchema(
                schedule="schedule1",
                objective_id="objective1",
                objective_category=ObjectiveCategory.CONSTRAINT.value,
                variables=[
                    VariableSchema(
                        worker="worker1",
                        date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                        shift="shift1",
                    )
                ],
                description="Test breach 1",
                hard_to_soft=True,
            ),
            BreachSchema(
                schedule="schedule2",
                objective_id="objective2",
                objective_category=ObjectiveCategory.REQUEST.value,
                variables=[
                    VariableSchema(
                        worker="worker2",
                        date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                        shift="shift2",
                    )
                ],
                description="Test breach 2",
                hard_to_soft=False,
            ),
        ]
        self.repo.create_many(breaches)

        found_breaches = self.repo.get_breaches(["schedule1", "schedule2"])

        assert len(found_breaches) == 2
        assert found_breaches[0].schedule_id in ["schedule1", "schedule2"]
        assert found_breaches[1].schedule_id in ["schedule1", "schedule2"]

    def test_get_breaches_by_worker_id(self):
        """Test getting breaches by worker ID."""
        breaches = [
            BreachSchema(
                schedule="schedule1",
                objective_id="objective1",
                objective_category=ObjectiveCategory.CONSTRAINT.value,
                variables=[
                    VariableSchema(
                        worker="worker1",
                        date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                        shift="shift1",
                    )
                ],
                description="Test breach 1",
                hard_to_soft=True,
            ),
            BreachSchema(
                schedule="schedule2",
                objective_id="objective2",
                objective_category=ObjectiveCategory.REQUEST.value,
                variables=[
                    VariableSchema(
                        worker="worker1",
                        date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                        shift="shift2",
                    )
                ],
                description="Test breach 2",
                hard_to_soft=False,
            ),
        ]
        self.repo.create_many(breaches)

        found_breaches = self.repo.get_breaches_by_worker_id("worker1")

        assert len(found_breaches) == 2
        assert found_breaches[0].variables[0].worker_id == "worker1"
        assert found_breaches[1].variables[0].worker_id == "worker1"

    def test_get_breaches_by_shift_id(self):
        """Test getting breaches by shift ID."""
        breaches = [
            BreachSchema(
                schedule="schedule1",
                objective_id="objective1",
                objective_category=ObjectiveCategory.CONSTRAINT.value,
                variables=[
                    VariableSchema(
                        worker="worker1",
                        date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                        shift="shift1",
                    )
                ],
                description="Test breach 1",
                hard_to_soft=True,
            ),
            BreachSchema(
                schedule="schedule2",
                objective_id="objective2",
                objective_category=ObjectiveCategory.REQUEST.value,
                variables=[
                    VariableSchema(
                        worker="worker2",
                        date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                        shift="shift1",
                    )
                ],
                description="Test breach 2",
                hard_to_soft=False,
            ),
        ]
        self.repo.create_many(breaches)

        found_breaches = self.repo.get_breaches_by_shift_id("shift1")

        assert len(found_breaches) == 2
        assert found_breaches[0].variables[0].shift_id == "shift1"
        assert found_breaches[1].variables[0].shift_id == "shift1"

    def test_delete_breaches_by_schedule_id(self):
        """Test deleting breaches by schedule ID."""
        breaches = [
            BreachSchema(
                schedule="schedule1",
                objective_id="objective1",
                objective_category=ObjectiveCategory.CONSTRAINT.value,
                variables=[
                    VariableSchema(
                        worker="worker1",
                        date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                        shift="shift1",
                    )
                ],
                description="Test breach 1",
                hard_to_soft=True,
            ),
            BreachSchema(
                schedule="schedule1",
                objective_id="objective2",
                objective_category=ObjectiveCategory.REQUEST.value,
                variables=[
                    VariableSchema(
                        worker="worker2",
                        date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                        shift="shift2",
                    )
                ],
                description="Test breach 2",
                hard_to_soft=False,
            ),
        ]
        self.repo.create_many(breaches)

        self.repo.delete_breaches_by_schedule_id("schedule1")

        found_breaches = self.repo.get_breaches_by_schedule_id("schedule1")
        assert len(found_breaches) == 0
