# from shared.database import DatabaseCollections
from shared.database_pymongo_str_id.database_collections import (
    DatabaseCollections,
)

# from shared.database_pymongo.database_collections import DatabaseCollections
from shared.schemas import ModelOutput


def save_model_output(
    model_output: ModelOutput, collections: DatabaseCollections
) -> ModelOutput:
    mo_existing = collections.model_output_db.get_model_output(model_output.schedule_id)
    if mo_existing is not None:
        model_output.id = mo_existing.id
        out = collections.model_output_db.update_model_output(model_output)
        return out
    out = collections.model_output_db.create_model_output(model_output)
    return out
