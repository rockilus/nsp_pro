from typing import List

from bson import ObjectId

from core import DimEntry
from database.db import DB
from errors import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Dimension as DimensionDocument
from models import DimEntry as DimEntryDocument


class DimEntryDB:
    def __init__(self, db: DB):
        self.db = db

    # pylint: disable=too-many-arguments
    def create_dim_entry(self, dim_entry: DimEntry) -> DimEntry:
        de_doc = core_to_doc_dim_entry(dim_entry)
        de_doc.id = str(ObjectId())
        try:
            de_saved = de_doc.save()
        except Exception as e:
            log_info("Failed to save dim entry to database")
            handle_save_document_error(e)
        return doc_to_core_dim_entry(de_saved)

    def get_dim_entry_by_id(self, dim_entry_id: str) -> DimEntry:
        try:
            # pylint: disable=no-member
            dim_entry = DimEntryDocument.objects.get(id=dim_entry_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get dim entry by id from database")
            handle_get_document_error(e)
        return doc_to_core_dim_entry(dim_entry)

    def get_dim_entries_by_dim_id(self, dimension_id: str) -> List[DimEntry]:
        try:
            # pylint: disable=no-member
            dim_entries = DimEntryDocument.objects.filter(  # type: ignore
                dimension=dimension_id
            )
        except Exception as e:
            log_info("Failed to get dim entries from database")
            handle_get_document_error(e)
        return [doc_to_core_dim_entry(a) for a in list(dim_entries)]

    def get_dim_entries_by_dim_ids(self, dimension_ids: List[str]) -> List[DimEntry]:
        try:
            # pylint: disable=no-member
            dim_entries = DimEntryDocument.objects.filter(  # type: ignore
                dimension__in=dimension_ids
            )
        except Exception as e:
            log_info("Failed to get dim entries from database")
            handle_get_document_error(e)
        return [doc_to_core_dim_entry(a) for a in list(dim_entries)]

    def update_dim_entry(self, dim_entry: DimEntry) -> DimEntry:
        de_doc = core_to_doc_dim_entry(dim_entry)
        try:
            # pylint: disable=no-member
            DimEntryDocument.objects.get(id=de_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Dim entry with id {de_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            de_saved = de_doc.save()
        except Exception as e:
            log_info("Failed to update dim entry")
            handle_save_document_error(e)
        return doc_to_core_dim_entry(de_saved)

    def delete_dim_entry(self, dim_entry_id: str) -> None:
        try:
            # pylint: disable=no-member
            dim_entry = DimEntryDocument.objects.get(id=dim_entry_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get dim entry by id to delete")
            handle_get_document_error(e)
        try:
            dim_entry.delete()
        except Exception as e:
            log_info("Failed to delete dim_entry")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_dim_entry(dataclass_obj: DimEntry) -> DimEntryDocument:
    try:
        # pylint: disable=no-member
        dimension = DimensionDocument.objects.get(  # type: ignore
            id=dataclass_obj.dimension_id
        )
    except Exception as e:
        log_info("Failed to get dimension by id")
        handle_get_document_error(e)
    try:
        dim_entry_doc = DimEntryDocument(
            id=dataclass_obj.id,
            dimension=dimension,
            name=dataclass_obj.name,
        )
    # pylint: disable=broad-except
    except Exception as e:
        log_info("Failed to convert DimEntry to DimEntryDocument")
        handle_create_document_error(e)
    return dim_entry_doc


# document to core
def doc_to_core_dim_entry(doc_obj: DimEntryDocument) -> DimEntry:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["dimension_id"] = doc_dict["dimension"]
    doc_dict.pop("_id")
    doc_dict.pop("dimension")
    return DimEntry(**doc_dict)
