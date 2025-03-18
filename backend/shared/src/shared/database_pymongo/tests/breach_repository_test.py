from datetime import datetime, timezone

import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.breach import BreachRepository
from shared.database_pymongo.schemas.breach import BreachSchema, VariableSchema
from shared.schemas.schemas.schedule import Breach, ObjectiveCategory, Variable


class TestBreachRepository:
    repo: BreachRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = BreachRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_breach(self):
        """Test creating a breach."""
        breach = Breach(
            id=None,
            schedule_id=str(ObjectId()),
            objective_id=str(ObjectId()),
            objective_category=ObjectiveCategory.CONSTRAINT,
            variables=[
                Variable(
                    worker_id=str(ObjectId()),
                    date=datetime(2023, 1, 1).date(),
                    shift_id=str(ObjectId()),
                )
            ],
            description="Test breach",
            hard_to_soft=True,
        )

        result = self.repo.create_breach(breach)

        assert result.id is not None
        assert result.schedule_id == breach.schedule_id
        assert result.objective_id == breach.objective_id

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["schedule"] == ObjectId(breach.schedule_id)
        assert saved_doc["objective_id"] == ObjectId(breach.objective_id)

    def test_get_breach_by_id(self):
        """Test getting a breach by ID."""
        breach = BreachSchema(
            schedule=ObjectId(),
            objective_id=ObjectId(),
            objective_category=ObjectiveCategory.CONSTRAINT.value,
            variables=[
                VariableSchema(
                    worker=ObjectId(),
                    date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                    shift=ObjectId(),
                )
            ],
            description="Test breach",
            hard_to_soft=True,
        )
        created = self.repo.create(breach)

        found = self.repo.get_breach_by_id(str(created.id))

        assert found is not None
        assert found.id == str(created.id)
        assert found.schedule_id == str(breach.schedule)

    def test_update_breach(self):
        """Test updating a breach."""
        breach = BreachSchema(
            schedule=ObjectId(),
            objective_id=ObjectId(),
            objective_category=ObjectiveCategory.CONSTRAINT.value,
            variables=[
                VariableSchema(
                    worker=ObjectId(),
                    date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                    shift=ObjectId(),
                )
            ],
            description="Test breach",
            hard_to_soft=True,
        )
        created = self.repo.create(breach)

        updated_breach = Breach(
            id=str(created.id),
            schedule_id=str(ObjectId()),
            objective_id=str(ObjectId()),
            objective_category=ObjectiveCategory.REQUEST,
            variables=[
                Variable(
                    worker_id=str(ObjectId()),
                    date=datetime(2023, 1, 1).date(),
                    shift_id=str(ObjectId()),
                )
            ],
            description="Updated breach",
            hard_to_soft=False,
        )

        result = self.repo.update_breach(updated_breach)

        assert result.description == "Updated breach"
        assert result.hard_to_soft is False

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
        assert from_db["description"] == "Updated breach"
        assert from_db["hard_to_soft"] is False

    def test_delete_breach(self):
        """Test deleting a breach."""
        breach = BreachSchema(
            schedule=ObjectId(),
            objective_id=ObjectId(),
            objective_category=ObjectiveCategory.CONSTRAINT.value,
            variables=[
                VariableSchema(
                    worker=ObjectId(),
                    date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                    shift=ObjectId(),
                )
            ],
            description="Test breach",
            hard_to_soft=True,
        )
        created = self.repo.create(breach)

        self.repo.delete_breach(str(created.id))

        assert self.repo.collection.find_one({"_id": ObjectId(created.id)}) is None

    def test_get_breaches_by_schedule_id(self):
        """Test getting breaches by schedule ID."""
        schedule_oid = ObjectId()
        breaches = [
            BreachSchema(
                schedule=schedule_oid,
                objective_id=ObjectId(),
                objective_category=ObjectiveCategory.CONSTRAINT.value,
                variables=[
                    VariableSchema(
                        worker=ObjectId(),
                        date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                        shift=ObjectId(),
                    )
                ],
                description="Test breach 1",
                hard_to_soft=True,
            ),
            BreachSchema(
                schedule=schedule_oid,
                objective_id=ObjectId(),
                objective_category=ObjectiveCategory.REQUEST.value,
                variables=[
                    VariableSchema(
                        worker=ObjectId(),
                        date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                        shift=ObjectId(),
                    )
                ],
                description="Test breach 2",
                hard_to_soft=False,
            ),
        ]
        self.repo.create_many(breaches)

        found_breaches = self.repo.get_breaches_by_schedule_id(str(schedule_oid))

        assert len(found_breaches) == 2
        assert found_breaches[0].schedule_id == str(schedule_oid)
        assert found_breaches[1].schedule_id == str(schedule_oid)

    def test_create_breaches(self):
        """Test creating multiple breaches."""
        breaches = [
            Breach(
                id=None,
                schedule_id=str(ObjectId()),
                objective_id=str(ObjectId()),
                objective_category=ObjectiveCategory.CONSTRAINT,
                variables=[
                    Variable(
                        worker_id=str(ObjectId()),
                        date=datetime(2023, 1, 1).date(),
                        shift_id=str(ObjectId()),
                    )
                ],
                description="Test breach 1",
                hard_to_soft=True,
            ),
            Breach(
                id=None,
                schedule_id=str(ObjectId()),
                objective_id=str(ObjectId()),
                objective_category=ObjectiveCategory.REQUEST,
                variables=[
                    Variable(
                        worker_id=str(ObjectId()),
                        date=datetime(2023, 1, 2).date(),
                        shift_id=str(ObjectId()),
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
        schedule_1_oid = ObjectId()
        schedule_2_oid = ObjectId()
        schedule_ids = [str(schedule_1_oid), str(schedule_2_oid)]
        breaches = [
            BreachSchema(
                schedule=schedule_1_oid,
                objective_id=ObjectId(),
                objective_category=ObjectiveCategory.CONSTRAINT.value,
                variables=[
                    VariableSchema(
                        worker=ObjectId(),
                        date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                        shift=ObjectId(),
                    )
                ],
                description="Test breach 1",
                hard_to_soft=True,
            ),
            BreachSchema(
                schedule=schedule_2_oid,
                objective_id=ObjectId(),
                objective_category=ObjectiveCategory.REQUEST.value,
                variables=[
                    VariableSchema(
                        worker=ObjectId(),
                        date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                        shift=ObjectId(),
                    )
                ],
                description="Test breach 2",
                hard_to_soft=False,
            ),
        ]
        self.repo.create_many(breaches)

        found_breaches = self.repo.get_breaches(schedule_ids)

        assert len(found_breaches) == 2
        assert found_breaches[0].schedule_id in schedule_ids
        assert found_breaches[1].schedule_id in schedule_ids

    def test_get_breaches_by_worker_id(self):
        """Test getting breaches by worker ID."""
        worker_oid = ObjectId()
        breaches = [
            BreachSchema(
                schedule=ObjectId(),
                objective_id=ObjectId(),
                objective_category=ObjectiveCategory.CONSTRAINT.value,
                variables=[
                    VariableSchema(
                        worker=worker_oid,
                        date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                        shift=ObjectId(),
                    )
                ],
                description="Test breach 1",
                hard_to_soft=True,
            ),
            BreachSchema(
                schedule=ObjectId(),
                objective_id=ObjectId(),
                objective_category=ObjectiveCategory.REQUEST.value,
                variables=[
                    VariableSchema(
                        worker=worker_oid,
                        date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                        shift=ObjectId(),
                    )
                ],
                description="Test breach 2",
                hard_to_soft=False,
            ),
        ]
        self.repo.create_many(breaches)

        found_breaches = self.repo.get_breaches_by_worker_id(str(worker_oid))

        assert len(found_breaches) == 2
        assert found_breaches[0].variables[0].worker_id == str(worker_oid)
        assert found_breaches[1].variables[0].worker_id == str(worker_oid)

    def test_get_breaches_by_shift_id(self):
        """Test getting breaches by shift ID."""
        shift_oid = ObjectId()
        breaches = [
            BreachSchema(
                schedule=ObjectId(),
                objective_id=ObjectId(),
                objective_category=ObjectiveCategory.CONSTRAINT.value,
                variables=[
                    VariableSchema(
                        worker=ObjectId(),
                        date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                        shift=shift_oid,
                    )
                ],
                description="Test breach 1",
                hard_to_soft=True,
            ),
            BreachSchema(
                schedule=ObjectId(),
                objective_id=ObjectId(),
                objective_category=ObjectiveCategory.REQUEST.value,
                variables=[
                    VariableSchema(
                        worker=ObjectId(),
                        date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                        shift=shift_oid,
                    )
                ],
                description="Test breach 2",
                hard_to_soft=False,
            ),
        ]
        self.repo.create_many(breaches)

        found_breaches = self.repo.get_breaches_by_shift_id(str(shift_oid))

        assert len(found_breaches) == 2
        assert found_breaches[0].variables[0].shift_id == str(shift_oid)
        assert found_breaches[1].variables[0].shift_id == str(shift_oid)

    def test_delete_breaches_by_schedule_id(self):
        """Test deleting breaches by schedule ID."""
        schedule_oid = ObjectId()
        breaches = [
            BreachSchema(
                schedule=schedule_oid,
                objective_id=ObjectId(),
                objective_category=ObjectiveCategory.CONSTRAINT.value,
                variables=[
                    VariableSchema(
                        worker=ObjectId(),
                        date=datetime(2023, 1, 1, tzinfo=timezone.utc),
                        shift=ObjectId(),
                    )
                ],
                description="Test breach 1",
                hard_to_soft=True,
            ),
            BreachSchema(
                schedule=schedule_oid,
                objective_id=ObjectId(),
                objective_category=ObjectiveCategory.REQUEST.value,
                variables=[
                    VariableSchema(
                        worker=ObjectId(),
                        date=datetime(2023, 1, 2, tzinfo=timezone.utc),
                        shift=ObjectId(),
                    )
                ],
                description="Test breach 2",
                hard_to_soft=False,
            ),
        ]
        self.repo.create_many(breaches)

        self.repo.delete_breaches_by_schedule_id(str(schedule_oid))

        found_breaches = self.repo.get_breaches_by_schedule_id(str(schedule_oid))
        assert len(found_breaches) == 0
