from typing import List

from bson import ObjectId

from core import Specialty
from database.db import DB
from errors import (
    handle_create_document_error,
    handle_delete_document_error,
    handle_get_document_error,
    handle_save_document_error,
)
from logger import log_info
from models import Specialty as SpecialtyDocument
from models import Team as TeamDocument


# pylint: disable=R0801
class SpecialtyDB:
    def __init__(self, db: DB):
        self.db = db

    # pylint: disable=too-many-arguments
    def create_specialty(self, specialty: Specialty) -> Specialty:
        de_doc = core_to_doc_specialty(specialty)
        de_doc.id = str(ObjectId())
        try:
            de_saved = de_doc.save()
        except Exception as e:
            log_info("Failed to save dim entry to database")
            handle_save_document_error(e)
        return doc_to_core_specialty(de_saved)

    def get_specialty_by_id(self, specialty_id: str) -> Specialty:
        try:
            # pylint: disable=no-member
            specialty = SpecialtyDocument.objects.get(id=specialty_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get dim entry by id from database")
            handle_get_document_error(e)
        return doc_to_core_specialty(specialty)

    def get_specialties_by_dim_id(self, team_id: str) -> List[Specialty]:
        try:
            # pylint: disable=no-member
            specialties = SpecialtyDocument.objects.filter(team=team_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get dim entries from database")
            handle_get_document_error(e)
        return [doc_to_core_specialty(a) for a in list(specialties)]

    def get_specialties_by_dim_ids(self, team_ids: List[str]) -> List[Specialty]:
        try:
            # pylint: disable=no-member
            specialties = SpecialtyDocument.objects.filter(  # type: ignore
                team__in=team_ids
            )
        except Exception as e:
            log_info("Failed to get dim entries from database")
            handle_get_document_error(e)
        return [doc_to_core_specialty(a) for a in list(specialties)]

    def update_specialty(self, specialty: Specialty) -> Specialty:
        de_doc = core_to_doc_specialty(specialty)
        try:
            # pylint: disable=no-member
            SpecialtyDocument.objects.get(id=de_doc.id)  # type: ignore
        except Exception as e:
            log_info(f"Dim entry with id {de_doc.id} does not exist")
            handle_get_document_error(e)
        try:
            de_saved = de_doc.save()
        except Exception as e:
            log_info("Failed to update dim entry")
            handle_save_document_error(e)
        return doc_to_core_specialty(de_saved)

    def delete_specialty(self, specialty_id: str) -> None:
        try:
            # pylint: disable=no-member
            specialty = SpecialtyDocument.objects.get(id=specialty_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get dim entry by id to delete")
            handle_get_document_error(e)
        try:
            specialty.delete()
        except Exception as e:
            log_info("Failed to delete specialty")
            handle_delete_document_error(e)

    def logical_delete_specialty(self, specialty_id: str) -> None:
        try:
            # pylint: disable=no-member
            de_doc = SpecialtyDocument.objects.get(id=specialty_id)  # type: ignore
        except Exception as e:
            log_info("Failed to get dim entry by id to delete")
            handle_get_document_error(e)
        try:
            de_doc.update(set__deleted=True)
        except Exception as e:
            log_info("Failed to delete specialty")
            handle_delete_document_error(e)


# Mappers
# core to document
def core_to_doc_specialty(dataclass_obj: Specialty) -> SpecialtyDocument:
    try:
        # pylint: disable=no-member
        team = TeamDocument.objects.get(id=dataclass_obj.team_id)  # type: ignore
    except Exception as e:
        log_info("Failed to get team by id")
        handle_get_document_error(e)
    try:
        specialty_doc = SpecialtyDocument(
            id=dataclass_obj.id,
            team=team,
            name=dataclass_obj.name,
            deleted=dataclass_obj.deleted,
        )
    # pylint: disable=broad-except
    except Exception as e:
        log_info("Failed to convert Specialty to SpecialtyDocument")
        handle_create_document_error(e)
    return specialty_doc


# document to core
def doc_to_core_specialty(doc_obj: SpecialtyDocument) -> Specialty:
    doc_dict = doc_obj.to_mongo().to_dict()
    doc_dict["id"] = doc_dict["_id"]
    doc_dict["team_id"] = doc_dict["team"]
    doc_dict.pop("_id")
    doc_dict.pop("team")
    return Specialty(**doc_dict)
