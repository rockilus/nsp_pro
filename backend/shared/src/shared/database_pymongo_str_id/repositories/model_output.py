from typing import Optional

from shared.database_pymongo_str_id.repositories.base import BaseRepository
from shared.database_pymongo_str_id.schemas.model_output import (
    ModelOutputSchema,
)
from shared.schemas.schemas.model_output import ModelOutput


class ModelOutputRepository(BaseRepository[ModelOutputSchema]):
    """Repository for model output documents using PyMongo."""

    def __init__(self):
        super().__init__("model_outputs", ModelOutputSchema)

    def create_model_output(self, model_output: ModelOutput) -> ModelOutput:
        """Create a new model output."""
        model_output_schema = ModelOutputSchema.from_core(model_output)
        result = self.create(model_output_schema)
        return result.to_core()

    def get_model_output(self, schedule_id: str) -> Optional[ModelOutput]:
        """Get a model output by schedule ID."""
        model_output = self.collection.find_one({"schedule": schedule_id})
        return (
            ModelOutputSchema.from_mongo(model_output).to_core()
            if model_output
            else None
        )

    def update_model_output(self, model_output: ModelOutput) -> ModelOutput:
        """Update a model output."""
        model_output_schema = ModelOutputSchema.from_core(model_output)
        model_output_updated = self.update(model_output_schema)
        assert model_output_updated is not None
        return model_output_updated.to_core()

    def delete_model_output(self, model_output_id: str) -> None:
        """Delete a model output by its ID."""
        result = self.delete(model_output_id)
        if result is False:
            raise Exception(
                f"ModelOutput with id {model_output_id} not found or already deleted"
            )
