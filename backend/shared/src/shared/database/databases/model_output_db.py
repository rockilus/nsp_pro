from datetime import datetime, timezone

from bson import ObjectId

from shared.database.databases.db import DB
from shared.database.errors.document_error_handlers import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from shared.database.models.model_output import ModelOutput as ModelOutputDocument
from shared.database.models.schedule import Schedule as ScheduleDocument
from shared.logger.logger import log_info
from shared.schemas.schemas.model_output import ModelOutput, ModelOutputStatus


class ModelOutputDB:
    def __init__(self, db: DB):
        self.db = db

    def create_model_output(self, model_output: ModelOutput) -> ModelOutput:
        mo_doc = core_to_doc_model_output(model_output)
        mo_doc.id = str(ObjectId())
        try:
            mo_saved = mo_doc.save()
        except Exception as e:
            log_info("Failed to save model_output to database")
            handle_save_document_error(e)
        return doc_to_core_model_output(mo_saved)

    def get_model_output(self, schedule_id: str) -> ModelOutput | None:
        try:
            # pylint: disable=no-member
            model_output = ModelOutputDocument.objects.get(  # type: ignore
                schedule=schedule_id
            )
        except Exception as e:
            log_info("Failed to get model_output from database")
            handle_get_document_error(e)
        return doc_to_core_model_output(model_output)

    def update_model_output(self, model_output: ModelOutput) -> ModelOutput:
        mo_doc = core_to_doc_model_output(model_output)
        try:
            # pylint: disable=no-member
            ModelOutputDocument.objects.get(id=mo_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"ModelOutput with id {mo_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            mo_saved = mo_doc.save()
        except Exception as e:
            log_info("Failed to update model_output in database")
            handle_save_document_error(e)
        return doc_to_core_model_output(mo_saved)

    def delete_model_output(self, model_output_id: str) -> None:
        try:
            # pylint: disable=no-member
            model_output = ModelOutputDocument.objects.get(  # type: ignore
                id=model_output_id
            )
        except Exception as e:
            log_info("Failed to get model_output by id to delete from database")
            handle_get_document_error(e)
        try:
            model_output.delete()
        except Exception as e:
            log_info("Failed to delete model_output from database")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_model_output(
    dataclass_obj: ModelOutput,
) -> ModelOutputDocument:
    try:
        # pylint: disable=no-member
        schedule = ScheduleDocument.objects.get(  # type: ignore
            id=dataclass_obj.schedule_id
        )
    except Exception as e:
        log_info("Failed to get team by id")
        handle_get_document_error(e)
    try:
        s_doc = ModelOutputDocument(
            id=dataclass_obj.id,
            schedule=schedule,
            status=dataclass_obj.status.value,
            var_sol=dataclass_obj.var_sol,
            var_spe_sol=dataclass_obj.var_spe_sol,
            objective_value=dataclass_obj.objective_value,
            wall_time=dataclass_obj.wall_time,
            output_time=dataclass_obj.output_time.timestamp(),
        )
    except Exception as e:
        log_info("Failed to convert ModelOutput to ModelOutputDocument")
        handle_create_document_error(e)
    return s_doc


# document to core
def doc_to_core_model_output(doc_obj: ModelOutputDocument) -> ModelOutput:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["schedule_id"] = doc_dict["schedule"]
    doc_dict["status"] = ModelOutputStatus(doc_dict["status"])
    doc_dict["output_time"] = datetime.fromtimestamp(
        doc_dict["output_time"], timezone.utc
    ).date()
    doc_dict.pop("_id")
    doc_dict.pop("schedule")
    return ModelOutput(**doc_dict)
