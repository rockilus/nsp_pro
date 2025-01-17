from typing import List

from bson import ObjectId

from shared.database.databases.db import DB
from shared.database.errors.document_error_handlers import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from shared.database.models.link_shift import LinkShift as LinkShiftDocument
from shared.database.models.shift import Shift as ShiftDocument
from shared.database.models.team import Team as TeamDocument
from shared.logger.logger import log_info
from shared.schemas.schemas.shift import LinkShift


class LinkShiftDB:
    def __init__(self, db: DB):
        self.db = db

    def create_link_shift(self, link_shift: LinkShift) -> LinkShift:
        ls_doc = core_to_doc_link_shift(link_shift)
        ls_doc.id = str(ObjectId())
        try:
            ls_saved = ls_doc.save()
        except Exception as e:
            log_info("Failed to save link_shift to database")
            handle_save_document_error(e)
        return doc_to_core_link_shift(ls_saved)

    def get_link_shifts(self, team_id: str) -> List[LinkShift]:
        try:
            # pylint: disable=no-member
            ls_doc = LinkShiftDocument.objects.filter(team=team_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get link_shifts from database")
            handle_get_document_error(e)
        return [doc_to_core_link_shift(ls) for ls in list(ls_doc)]

    def get_link_shift_by_id(self, link_shift_id: str) -> LinkShift:
        try:
            # pylint: disable=no-member
            ls_doc = LinkShiftDocument.objects.get(id=link_shift_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get link_shift by id from database")
            handle_get_document_error(e)
        return doc_to_core_link_shift(ls_doc)

    def get_link_shifts_by_shift_id(self, shift_id: str) -> List[LinkShift]:
        try:
            # pylint: disable=no-member
            ls_docs = LinkShiftDocument.objects.filter(shifts__in=[shift_id])  # type: ignore        except Exception as e:
            log_info("Failed to get link_shifts by shift_id from database")
            handle_get_document_error(e)
        except Exception as e:
            log_info("Failed to get link_shifts by shift_id from database")
            handle_get_document_error(e)
        return [doc_to_core_link_shift(ls) for ls in list(ls_docs)]

    def update_link_shift(self, link_shift: LinkShift) -> LinkShift:
        ls_doc = core_to_doc_link_shift(link_shift)
        try:
            # pylint: disable=no-member
            LinkShiftDocument.objects.get(id=link_shift.id)  # type: ignore
        except Exception as e:
            log_info(f"LinkShift with id {ls_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            ls_saved = ls_doc.save()
        except Exception as e:
            log_info("Failed to update link_shift to database")
            handle_save_document_error(e)
        return doc_to_core_link_shift(ls_saved)

    def delete_link_shift(self, link_shift_id: str) -> None:
        try:
            # pylint: disable=no-member
            ls_doc = LinkShiftDocument.objects.get(id=link_shift_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get link_shift by id to delete from database")
            handle_get_document_error(e)
        try:
            ls_doc.delete()
        except Exception as e:
            log_info("Failed to delete link_shift from database")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_link_shift(dataclass_obj: LinkShift) -> LinkShiftDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
        shifts = ShiftDocument.objects.filter(  # type: ignore
            id__in=dataclass_obj.shift_ids
        )
    except Exception as e:
        log_info("Failed to get team by id to create link_shift")
        handle_get_document_error(e)
    try:
        ls_doc = LinkShiftDocument(
            id=dataclass_obj.id,
            team=team,
            shifts=shifts,
        )
    except Exception as e:
        log_info("Failed to convert LinkShift to LinkShiftDocument")
        handle_create_document_error(e)
    return ls_doc


# document to core
def doc_to_core_link_shift(doc_obj: LinkShiftDocument) -> LinkShift:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["team_id"] = doc_dict["team"]
    doc_dict["shift_ids"] = doc_dict["shifts"]
    doc_dict.pop("_id")
    doc_dict.pop("team")
    doc_dict.pop("shifts")
    return LinkShift(**doc_dict)
