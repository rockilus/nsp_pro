from typing import List

from bson import ObjectId

from core.shift import ShiftDimension
from database.db import DB
from errors import (
    handle_create_core_object_error,
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from models import ShiftDimension as ShiftDimensionDocument
from models import Team as TeamDocument
from services.logging import log_info


class ShiftDimensionDB:
    def __init__(self, db: DB):
        self.db = db

    def create_shift_dimension(self, shift_dimension: ShiftDimension) -> ShiftDimension:
        sd_doc = core_to_doc_shift_dimension(shift_dimension)
        sd_doc.id = str(ObjectId())
        try:
            sd_saved = sd_doc.save()
        except Exception as e:
            log_info(f"Failed to save shift dimension to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_shift_dimension(sd_saved)

    def get_shift_dimensions(self, team_id: str) -> List[ShiftDimension]:
        try:
            # pylint: disable=no-member
            shift_dimensions = ShiftDimensionDocument.objects.filter(  # type: ignore
                team=team_id
            )
        except Exception as e:
            log_info(f"Failed to get shift dimensions from database: {e}")
            handle_get_document_error(e)
        return [doc_to_core_shift_dimension(sd) for sd in list(shift_dimensions)]

    def get_shift_dimension_by_id(self, shift_dimension_id: str) -> ShiftDimension:
        try:
            # pylint: disable=no-member
            shift_dimension = ShiftDimensionDocument.objects.get(  # type: ignore
                id=shift_dimension_id
            )
        except Exception as e:
            log_info(f"Failed to get shift dimension by id from database: {e}")
            handle_get_document_error(e)
        return doc_to_core_shift_dimension(shift_dimension)

    def get_shift_dimensions_by_entry_type(
        self, entry_type: str, team_id: str
    ) -> List[ShiftDimension]:
        try:
            # pylint: disable=no-member
            shift_dimensions = ShiftDimensionDocument.objects.filter(  # type: ignore
                entry_type=entry_type, team=team_id
            )
        except Exception as e:
            log_info(f"Failed to get shift dimensions by entry type from database: {e}")
            handle_get_document_error(e)
        return [doc_to_core_shift_dimension(sd) for sd in list(shift_dimensions)]

    def update_shift_dimension(self, shift_dimension: ShiftDimension) -> ShiftDimension:
        sd_doc = core_to_doc_shift_dimension(shift_dimension)
        try:
            sd_saved = sd_doc.save()
        except Exception as e:
            log_info(f"Failed to update shift dimension to database: {e}")
            handle_save_document_error(e)
        return doc_to_core_shift_dimension(sd_saved)

    def delete_shift_dimension(self, shift_dimension_id: str) -> None:
        try:
            # pylint: disable=no-member
            shift_dimension = ShiftDimensionDocument.objects.get(  # type: ignore
                id=shift_dimension_id
            )
        except Exception as e:
            log_info(f"Failed to get shift dimension by id to delete: {e}")
            handle_get_document_error(e)
        try:
            shift_dimension.delete()
        except Exception as e:
            log_info(f"Failed to delete shift dimension: {e}")
            handle_delete_document_error(e)


# Mappers
# core to document
# pylint: disable=R0801
def core_to_doc_shift_dimension(
    dataclass_obj: ShiftDimension,
) -> ShiftDimensionDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    except Exception as e:
        log_info(f"Failed to get team from database: {e}")
        handle_get_document_error(e)
    try:
        sd_doc = ShiftDimensionDocument(
            # pylint: disable=R0801
            id=dataclass_obj.id,
            team=team,
            name=dataclass_obj.name,
            entry_type=dataclass_obj.entry_type,
            entry_options=dataclass_obj.entry_options,
        )
    except Exception as e:
        log_info(f"Failed to convert ShiftDimension to ShiftDimensionDocument: {e}")
        handle_create_document_error(e)
    return sd_doc


# document to core
def doc_to_core_shift_dimension(
    doc_obj: ShiftDimensionDocument,
) -> ShiftDimension:
    try:
        shift_dimension = ShiftDimension(
            # pylint: disable=R0801
            id=doc_obj.id,
            team_id=doc_obj.team.id,
            name=doc_obj.name,
            entry_type=doc_obj.entry_type,  # type: ignore
            entry_options=[*doc_obj.entry_options],
        )
    except Exception as e:
        log_info(f"Failed to convert ShiftDimensionDocument to ShiftDimension: {e}")
        handle_create_core_object_error(e)
    return shift_dimension
