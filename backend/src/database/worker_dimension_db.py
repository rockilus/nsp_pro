from typing import List

from bson import ObjectId

from core.worker import WorkerDimension
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Team as TeamDocument
from models import WorkerDimension as WorkerDimensionDocument


class WorkerDimensionDB:
    def __init__(self, db: DB):
        self.db = db

    def create_worker_dimension(
        self, worker_dimension: WorkerDimension
    ) -> WorkerDimension:
        wd_doc = core_to_doc_worker_dimension(worker_dimension)
        wd_doc.id = str(ObjectId())
        try:
            wd_saved = wd_doc.save()
        except Exception as e:
            log_info(f"Failed to save worker dimension to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_worker_dimension(wd_saved)

    def get_worker_dimensions(self, team_id: str) -> List[WorkerDimension]:
        try:
            # pylint: disable=no-member
            worker_dimensions = WorkerDimensionDocument.objects.filter(  # type: ignore
                team=team_id
            )
        except Exception as e:
            log_info(f"Failed to get worker dimensions from database: {e}")
            handle_get_document_error(e)
        return [doc_to_core_worker_dimension(wd) for wd in list(worker_dimensions)]

    def get_worker_dimension_by_id(self, worker_dimension_id: str) -> WorkerDimension:
        try:
            # pylint: disable=no-member
            worker_dimension = WorkerDimensionDocument.objects.get(  # type: ignore
                id=worker_dimension_id
            )
        except Exception as e:
            log_info(f"Failed to get worker dimension by id from database: {e}")
            handle_get_document_error(e)
        return doc_to_core_worker_dimension(worker_dimension)

    def get_worker_dimension_by_name(
        self, worker_dimension_name: str, team_id: str
    ) -> WorkerDimension:
        try:
            # pylint: disable=no-member
            worker_dimension = WorkerDimensionDocument.objects.get(  # type: ignore
                name=worker_dimension_name, team=team_id
            )
        except Exception as e:
            log_info(f"Failed to get worker dimension by name from database: {e}")
            handle_get_document_error(e)
        return doc_to_core_worker_dimension(worker_dimension)

    def get_worker_dimensions_by_entry_type(
        self, entry_type: str, team_id: str
    ) -> List[WorkerDimension]:
        try:
            # pylint: disable=no-member
            worker_dimensions = WorkerDimensionDocument.objects.filter(  # type: ignore
                entry_type=entry_type, team=team_id
            )
        except Exception as e:
            log_info(
                f"Failed to get worker dimensions by entry type from database: {e}"
            )
            handle_get_document_error(e)
        return [doc_to_core_worker_dimension(wd) for wd in list(worker_dimensions)]

    def update_worker_dimension(
        self, worker_dimension: WorkerDimension
    ) -> WorkerDimension:
        wd_doc = core_to_doc_worker_dimension(worker_dimension)
        try:
            wd_saved = wd_doc.save()
        except Exception as e:
            log_info(f"Failed to update worker dimension to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_worker_dimension(wd_saved)

    def delete_worker_dimension(self, worker_dimension_id: str) -> None:
        try:
            # pylint: disable=no-member
            worker_dimension = WorkerDimensionDocument.objects.get(  # type: ignore
                id=worker_dimension_id
            )
        except Exception as e:
            log_info(
                f"Failed to get worker dimension by id to delete from database: {e}"
            )
            handle_get_document_error(e)
        try:
            worker_dimension.delete()
        except Exception as e:
            log_info(f"Failed to delete worker dimension from database: {e}")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_worker_dimension(
    dataclass_obj: WorkerDimension,
) -> WorkerDimensionDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    except Exception as e:
        log_info(f"Failed to get team by id to create worker dimension: {e}")
        handle_get_document_error(e)
    try:
        wd_doc = WorkerDimensionDocument(
            id=dataclass_obj.id,
            team=team,
            name=dataclass_obj.name,
            entry_type=dataclass_obj.entry_type,
            entry_options=dataclass_obj.entry_options,
        )
    except Exception as e:
        log_info(f"Failed to convert WorkerDimension to WorkerDimensionDocument: {e}")
        handle_create_document_error(e)
    return wd_doc


# document to core
def doc_to_core_worker_dimension(
    doc_obj: WorkerDimensionDocument,
) -> WorkerDimension:
    try:
        worker_dimension = WorkerDimension(
            id=doc_obj.id,
            team_id=str(doc_obj.team.id),
            name=doc_obj.name,
            entry_type=doc_obj.entry_type,  # type: ignore
            entry_options=[*doc_obj.entry_options],
        )
    except Exception as e:
        log_info(f"Failed to convert WorkerDimensionDocument to WorkerDimension: {e}")
        handle_create_core_object_error(e)
    return worker_dimension
