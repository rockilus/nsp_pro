from datetime import datetime, timezone

import pytest
from bson import ObjectId

from shared.database_pymongo.database import MongoDB
from shared.database_pymongo.repositories.model_output import (
    ModelOutputRepository,
)
from shared.database_pymongo.schemas.model_output import ModelOutputSchema
from shared.schemas.schemas.model_output import ModelOutput, ModelOutputStatus


class TestModelOutputRepository:
    repo: ModelOutputRepository

    @pytest.fixture(autouse=True)
    def setup(self, mongodb_container):
        """Setup test environment before each test."""
        assert mongodb_container is not None
        db = MongoDB.get_database()

        # Create repository
        self.repo = ModelOutputRepository()

        # Yield to test
        yield

        # Cleanup
        db.drop_collection(self.repo.collection)

    def test_create_model_output(self):
        """Test creating a model output."""
        model_output = ModelOutput(
            id=None,
            schedule_id="schedule1",
            status=ModelOutputStatus.FEASIBLE,
            var_sol={("a", "b", "c"): 1},
            var_spe_sol={("a", "b", "c", "d"): 2},
            objective_value=100.0,
            wall_time=10.0,
            output_time=datetime(2023, 1, 1, 12, 0, tzinfo=timezone.utc),
        )

        result = self.repo.create_model_output(model_output)

        assert result.id is not None
        assert result.schedule_id == "schedule1"
        assert result.status == ModelOutputStatus.FEASIBLE

        saved_doc = self.repo.collection.find_one({"_id": ObjectId(result.id)})
        assert saved_doc is not None
        assert saved_doc["schedule"] == "schedule1"
        assert saved_doc["status"] == ModelOutputStatus.FEASIBLE.value

    def test_get_model_output(self):
        """Test getting a model output by schedule ID."""
        model_output = ModelOutputSchema(
            schedule="schedule1",
            status=ModelOutputStatus.FEASIBLE.value,
            var_sol={str(("a", "b", "c")): 1},
            var_spe_sol={str(("a", "b", "c", "d")): 2},
            objective_value=100.0,
            wall_time=10.0,
            output_time=datetime(2023, 1, 1, 12, 0, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(model_output)

        found = self.repo.get_model_output("schedule1")

        assert found is not None
        assert found.id == created.id
        assert found.schedule_id == "schedule1"

    def test_update_model_output(self):
        """Test updating a model output."""
        model_output = ModelOutputSchema(
            schedule="schedule1",
            status=ModelOutputStatus.FEASIBLE.value,
            var_sol={str(("a", "b", "c")): 1},
            var_spe_sol={str(("a", "b", "c", "d")): 2},
            objective_value=100.0,
            wall_time=10.0,
            output_time=datetime(2023, 1, 1, 12, 0, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(model_output)

        updated_model_output = ModelOutput(
            id=created.id,
            schedule_id="schedule1",
            status=ModelOutputStatus.OPTIMAL,
            var_sol={("a", "b", "c"): 2},
            var_spe_sol={("a", "b", "c", "d"): 3},
            objective_value=200.0,
            wall_time=20.0,
            output_time=datetime(2023, 1, 1, 13, 0, tzinfo=timezone.utc),
        )

        result = self.repo.update_model_output(updated_model_output)

        assert result.status == ModelOutputStatus.OPTIMAL
        assert result.var_sol[("a", "b", "c")] == 2

        from_db = self.repo.collection.find_one({"_id": ObjectId(created.id)})
        assert from_db["status"] == ModelOutputStatus.OPTIMAL.value
        assert from_db["var_sol"]["('a', 'b', 'c')"] == 2

    def test_delete_model_output(self):
        """Test deleting a model output."""
        model_output = ModelOutputSchema(
            schedule="schedule1",
            status=ModelOutputStatus.FEASIBLE.value,
            var_sol={str(("a", "b", "c")): 1},
            var_spe_sol={str(("a", "b", "c", "d")): 2},
            objective_value=100.0,
            wall_time=10.0,
            output_time=datetime(2023, 1, 1, 12, 0, tzinfo=timezone.utc).timestamp(),
        )
        created = self.repo.create(model_output)

        self.repo.delete_model_output(created.id)

        assert self.repo.collection.find_one({"_id": ObjectId(created.id)}) is None
